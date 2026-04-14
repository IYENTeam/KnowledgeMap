/**
 * Canvas JSON → React Flow 변환
 *
 * Obsidian Canvas 포맷 (jsoncanvas.org) 을 React Flow 노드/엣지로 변환합니다.
 */

import type { Node, Edge } from '@xyflow/react'
import { MarkerType } from '@xyflow/react'
import type {
  CanvasDocument,
  CanvasNode,
  CanvasEdge,
  TextNode,
  FileNode,
  LinkNode,
  GroupNode,
} from '@knowledgeos/types/canvas.js'
import { colorToHex } from './color-map'

// ── Node data types ──────────────────────────────────────────────

export interface TextNodeData {
  text: string
  color?: string
  [key: string]: unknown
}

export interface FileNodeData {
  file: string
  subpath?: string
  color?: string
  [key: string]: unknown
}

export interface LinkNodeData {
  url: string
  color?: string
  [key: string]: unknown
}

export interface GroupNodeData {
  label?: string
  color?: string
  [key: string]: unknown
}

// ── Custom node type names ───────────────────────────────────────

export const NODE_TYPES = {
  text: 'textNode',
  file: 'fileNode',
  link: 'linkNode',
  group: 'groupNode',
} as const

// ── Conversion ───────────────────────────────────────────────────

export function convertCanvas(doc: CanvasDocument): {
  nodes: Node[]
  edges: Edge[]
} {
  const canvasNodes = doc.nodes ?? []
  const canvasEdges = doc.edges ?? []

  // Sort: groups first (they become parent containers)
  const groups = canvasNodes.filter((n) => n.type === 'group') as GroupNode[]
  const nonGroups = canvasNodes.filter((n) => n.type !== 'group')

  // Build React Flow group nodes
  const rfGroupNodes: Node[] = groups.map((g) => convertGroupNode(g))

  // Build React Flow content nodes, detecting group containment
  const rfContentNodes: Node[] = nonGroups.map((n) => {
    const parentGroup = findContainingGroup(n, groups)
    return convertContentNode(n, parentGroup)
  })

  // Groups must come before their children in the array
  const rfNodes = [...rfGroupNodes, ...rfContentNodes]

  const rfEdges = canvasEdges.map(convertEdge)

  return { nodes: rfNodes, edges: rfEdges }
}

// ── Node converters ──────────────────────────────────────────────

function convertContentNode(
  node: CanvasNode,
  parentGroup: GroupNode | null,
): Node {
  const position = parentGroup
    ? { x: node.x - parentGroup.x, y: node.y - parentGroup.y }
    : { x: node.x, y: node.y }

  const base = {
    id: node.id,
    position,
    style: { width: node.width, height: node.height },
    ...(parentGroup ? { parentId: parentGroup.id, extent: 'parent' as const } : {}),
  }

  switch (node.type) {
    case 'text': {
      const tn = node as TextNode
      return {
        ...base,
        type: NODE_TYPES.text,
        data: { text: tn.text, color: tn.color } satisfies TextNodeData,
      }
    }
    case 'file': {
      const fn = node as FileNode
      return {
        ...base,
        type: NODE_TYPES.file,
        data: { file: fn.file, subpath: fn.subpath, color: fn.color } satisfies FileNodeData,
      }
    }
    case 'link': {
      const ln = node as LinkNode
      return {
        ...base,
        type: NODE_TYPES.link,
        data: { url: ln.url, color: ln.color } satisfies LinkNodeData,
      }
    }
    default:
      return {
        ...base,
        type: NODE_TYPES.text,
        data: { text: '(unknown node)', color: node.color } satisfies TextNodeData,
      }
  }
}

function convertGroupNode(group: GroupNode): Node {
  return {
    id: group.id,
    type: NODE_TYPES.group,
    position: { x: group.x, y: group.y },
    style: { width: group.width, height: group.height },
    data: { label: group.label, color: group.color } satisfies GroupNodeData,
  }
}

// ── Edge converter ───────────────────────────────────────────────

function convertEdge(edge: CanvasEdge): Edge {
  return {
    id: edge.id,
    source: edge.fromNode,
    target: edge.toNode,
    // Prefer explicit sides when given; otherwise let React Flow pick via handle IDs at all 4 sides
    sourceHandle: edge.fromSide ?? undefined,
    targetHandle: edge.toSide ?? undefined,
    type: 'labeled',
    data: { label: edge.label, color: edge.color },
    style: { stroke: colorToHex(edge.color) },
    markerEnd: { type: MarkerType.ArrowClosed, color: colorToHex(edge.color) },
  }
}

// ── Group containment detection ──────────────────────────────────

function findContainingGroup(
  node: CanvasNode,
  groups: GroupNode[],
): GroupNode | null {
  let bestGroup: GroupNode | null = null
  let bestArea = Infinity

  for (const group of groups) {
    // Check if node is spatially inside group
    if (
      node.x >= group.x &&
      node.y >= group.y &&
      node.x + node.width <= group.x + group.width &&
      node.y + node.height <= group.y + group.height
    ) {
      const area = group.width * group.height
      if (area < bestArea) {
        bestGroup = group
        bestArea = area
      }
    }
  }

  return bestGroup
}

// ── Validation ───────────────────────────────────────────────────

export function validateCanvasJson(data: unknown): data is CanvasDocument {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.nodes)) return false
  if (!Array.isArray(obj.edges)) return false

  for (const node of obj.nodes) {
    if (typeof node !== 'object' || !node) return false
    const n = node as Record<string, unknown>
    if (typeof n.id !== 'string') return false
    if (typeof n.x !== 'number' || typeof n.y !== 'number') return false
    if (typeof n.width !== 'number' || typeof n.height !== 'number') return false
  }

  for (const edge of obj.edges) {
    if (typeof edge !== 'object' || !edge) return false
    const e = edge as Record<string, unknown>
    if (typeof e.id !== 'string') return false
    if (typeof e.fromNode !== 'string' || typeof e.toNode !== 'string') return false
  }

  return true
}
