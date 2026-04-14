import { useCallback, useMemo, useState, forwardRef, useImperativeHandle } from 'react'
import type { CanvasNode as CNode, CanvasEdge as CEdge } from '@knowledgeos/types/canvas.js'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeMouseHandler,
  type OnConnect,
  type EdgeMouseHandler,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { CanvasDocument } from '@knowledgeos/types/canvas.js'
import { convertCanvas, NODE_TYPES, type TextNodeData } from '@/lib/canvas-to-reactflow'
import { colorToHex } from '@/lib/color-map'
import { TextNode } from './nodes/TextNode'
import { FileNode } from './nodes/FileNode'
import { LinkNode } from './nodes/LinkNode'
import { GroupNode } from './nodes/GroupNode'
import { LabeledEdge } from './edges/LabeledEdge'
import { Sidebar } from './Sidebar'
import { EdgeEditor } from './EdgeEditor'
import { Toolbar } from './Toolbar'
import { ContextMenu, type ContextMenuState } from './ContextMenu'
import { ShortcutsHelp } from './ShortcutsHelp'
import { useUndoRedo } from '@/hooks/useUndoRedo'
import { useClipboard } from '@/hooks/useClipboard'
import { expandNode } from '@/lib/staged-decompose'
import { exportToHtml } from '@/lib/html-export'
import { useTheme } from '@/hooks/useTheme'

const nodeTypes = {
  [NODE_TYPES.text]: TextNode,
  [NODE_TYPES.file]: FileNode,
  [NODE_TYPES.link]: LinkNode,
  [NODE_TYPES.group]: GroupNode,
}

const edgeTypes = {
  labeled: LabeledEdge,
}

interface CanvasViewerProps {
  canvas: CanvasDocument
  onExport?: (doc: CanvasDocument) => void
  onSave?: (doc: CanvasDocument) => void | Promise<void>
  onSaveAs?: (doc: CanvasDocument) => void | Promise<void>
  onDirty?: () => void
  apiKey?: string | null
  originalSource?: string
}

/**
 * Imperative handle exposed via forwardRef — used by App to push streaming
 * decompose results into the live canvas without rebuilding from scratch.
 */
export interface CanvasViewerHandle {
  appendCanvasItems: (nodes: CNode[], edges: CEdge[]) => void
}

let nodeIdCounter = 1000
let edgeIdCounter = 1000
function generateNodeId(): string {
  return `node-${++nodeIdCounter}`
}
function generateEdgeId(): string {
  return `edge-${++edgeIdCounter}`
}

function CanvasViewerInner(
  { canvas, onExport, onSave, onSaveAs, onDirty, apiKey, originalSource }: CanvasViewerProps,
  ref: React.Ref<CanvasViewerHandle>,
) {
  const initial = useMemo(() => convertCanvas(canvas), [canvas])
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null)
  const [expandError, setExpandError] = useState<string | null>(null)
  const { screenToFlowPosition, fitView } = useReactFlow()

  const { takeSnapshot, undo, redo } = useUndoRedo()
  const { copy, paste } = useClipboard()
  const { theme } = useTheme()

  const snap = useCallback(() => {
    takeSnapshot(nodes, edges)
    onDirty?.()
  }, [takeSnapshot, nodes, edges, onDirty])

  // Imperative API — used by App to push streaming decompose results into the canvas.
  useImperativeHandle(
    ref,
    () => ({
      appendCanvasItems: (newNodes: CNode[], newEdges: CEdge[]) => {
        const rfNodes: Node[] = newNodes.map((n) => ({
          id: n.id,
          type: NODE_TYPES.text,
          position: { x: n.x, y: n.y },
          style: { width: n.width, height: n.height },
          data: {
            text: n.type === 'text' ? (n as { text: string }).text : '',
            color: n.color,
          },
        }))
        const rfEdges: Edge[] = newEdges.map((e) => ({
          id: e.id,
          source: e.fromNode,
          target: e.toNode,
          type: 'labeled',
          data: { color: e.color, label: e.label },
          markerEnd: { type: MarkerType.ArrowClosed, color: colorToHex(e.color) },
          style: { stroke: colorToHex(e.color) },
        }))
        setNodes((nds) => [...nds, ...rfNodes])
        setEdges((eds) => [...eds, ...rfEdges])
      },
    }),
    [setNodes, setEdges],
  )

  // ── Interactions ───────────────────────────────────────────────

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    setSelectedNode(node)
    setSelectedEdge(null)
    setContextMenu(null)
  }, [])

  const onEdgeClick: EdgeMouseHandler = useCallback((_e, edge) => {
    setSelectedEdge(edge)
    setSelectedNode(null)
    setContextMenu(null)
  }, [])

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_e, node) => {
    if (node.type === NODE_TYPES.text) {
      setEditingNodeId(node.id)
      setSelectedNode(node)
    }
  }, [])

  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Only act on direct pane clicks, not bubbled from nodes
      const target = event.target as HTMLElement
      if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) return

      snap()
      const W = 350
      const H = 150
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      // Center the node at the click point
      const position = { x: flowPos.x - W / 2, y: flowPos.y - H / 2 }

      const id = generateNodeId()
      const newNode: Node = {
        id,
        type: NODE_TYPES.text,
        position,
        style: { width: W, height: H },
        data: { text: '## New Node\n\nDouble-click to edit', color: '6' } satisfies TextNodeData,
      }
      setNodes((nds) => [...nds, newNode])
      setEditingNodeId(id)
      setSelectedNode(newNode)
    },
    [screenToFlowPosition, setNodes, snap],
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
    setEditingNodeId(null)
    setContextMenu(null)
  }, [])

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      snap()
      const edgeId = generateEdgeId()
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: edgeId,
            type: 'labeled',
            data: { label: '', color: undefined },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      )
    },
    [setEdges, snap],
  )

  // ── Context menu ───────────────────────────────────────────────

  const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      nodeId: node.id,
      nodeType: node.type,
    })
    setSelectedNode(node)
  }, [])

  const onEdgeContextMenu: EdgeMouseHandler = useCallback((event, edge) => {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'edge',
      edgeId: edge.id,
    })
  }, [])

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'pane',
    })
  }, [])

  const handleContextAction = useCallback(
    (action: string, payload?: Record<string, string>) => {
      setContextMenu(null)

      switch (action) {
        case 'edit':
          if (contextMenu?.nodeId) setEditingNodeId(contextMenu.nodeId)
          break

        case 'duplicate':
          if (contextMenu?.nodeId) {
            snap()
            const original = nodes.find((n) => n.id === contextMenu.nodeId)
            if (original) {
              setNodes((nds) => [
                ...nds,
                {
                  ...structuredClone(original),
                  id: generateNodeId(),
                  position: { x: original.position.x + 40, y: original.position.y + 40 },
                  selected: false,
                },
              ])
            }
          }
          break

        case 'copy':
          copy(nodes)
          break

        case 'paste':
          snap()
          paste(setNodes)
          break

        case 'color':
          if (contextMenu?.nodeId && payload?.color) {
            snap()
            setNodes((nds) =>
              nds.map((n) =>
                n.id === contextMenu.nodeId
                  ? { ...n, data: { ...n.data, color: payload.color } }
                  : n,
              ),
            )
          }
          break

        case 'delete':
          if (contextMenu?.nodeId) {
            snap()
            setNodes((nds) => nds.filter((n) => n.id !== contextMenu.nodeId))
            setEdges((eds) =>
              eds.filter(
                (e) => e.source !== contextMenu.nodeId && e.target !== contextMenu.nodeId,
              ),
            )
            setSelectedNode(null)
          }
          break

        case 'deleteEdge':
          if (contextMenu?.edgeId) {
            snap()
            setEdges((eds) => eds.filter((e) => e.id !== contextMenu.edgeId))
            setSelectedEdge(null)
          }
          break

        case 'addText': {
          snap()
          const W = 350, H = 150
          const flowPos = screenToFlowPosition({ x: contextMenu!.x, y: contextMenu!.y })
          const pos = { x: flowPos.x - W / 2, y: flowPos.y - H / 2 }
          const id = generateNodeId()
          setNodes((nds) => [
            ...nds,
            {
              id,
              type: NODE_TYPES.text,
              position: pos,
              style: { width: W, height: H },
              data: { text: '## New Node\n\nDouble-click to edit', color: '6' },
            },
          ])
          setEditingNodeId(id)
          break
        }

        case 'fitView':
          fitView({ padding: 0.15 })
          break

        case 'expand':
          if (contextMenu?.nodeId && apiKey) {
            void handleExpandNode(contextMenu.nodeId)
          }
          break
      }
    },
    [contextMenu, nodes, setNodes, setEdges, snap, copy, paste, screenToFlowPosition, fitView, apiKey],
  )

  // ── AI expansion ───────────────────────────────────────────────

  const handleExpandNode = useCallback(
    async (nodeId: string) => {
      if (!apiKey) return
      const target = nodes.find((n) => n.id === nodeId)
      if (!target) return
      const text = (target.data as { text?: string }).text ?? ''
      if (!text.trim()) return

      setExpandError(null)
      setExpandingNodeId(nodeId)
      snap()

      try {
        const siblingCount = edges.filter((e) => e.source === nodeId).length
        const result = await expandNode(
          apiKey,
          originalSource ?? '',
          { id: nodeId, text, position: target.position },
          siblingCount,
        )

        // Convert canvas nodes/edges to React Flow format
        const newRfNodes: Node[] = result.nodes.map((n) => ({
          id: n.id,
          type: NODE_TYPES.text,
          position: { x: n.x, y: n.y },
          style: { width: n.width, height: n.height },
          data: {
            text: n.type === 'text' ? (n as { text: string }).text : '',
            color: n.color,
          },
        }))

        const newRfEdges = result.edges.map((e) => ({
          id: e.id,
          source: e.fromNode,
          target: e.toNode,
          type: 'labeled',
          data: { color: e.color },
          markerEnd: { type: MarkerType.ArrowClosed, color: colorToHex(e.color) },
          style: { stroke: colorToHex(e.color) },
        }))

        setNodes((nds) => [...nds, ...newRfNodes])
        setEdges((eds) => [...eds, ...newRfEdges])
      } catch (e) {
        setExpandError(e instanceof Error ? e.message : String(e))
      } finally {
        setExpandingNodeId(null)
      }
    },
    [apiKey, nodes, edges, originalSource, setNodes, setEdges, snap],
  )

  // ── Edge editing ───────────────────────────────────────────────

  const onEdgeUpdate = useCallback(
    (edgeId: string, data: { label?: string; color?: string }) => {
      snap()
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id !== edgeId) return e
          const newData = { ...(e.data as object), ...data }
          const colorValue = 'color' in data ? data.color : (e.data as { color?: string })?.color
          return {
            ...e,
            data: newData,
            style: { ...e.style, stroke: colorToHex(colorValue) },
            markerEnd: { type: MarkerType.ArrowClosed, color: colorToHex(colorValue) },
          }
        }),
      )
      // Update selectedEdge reference
      setSelectedEdge((prev) =>
        prev && prev.id === edgeId
          ? { ...prev, data: { ...(prev.data as object), ...data } }
          : prev,
      )
    },
    [setEdges, snap],
  )

  const onDeleteEdge = useCallback(
    (edgeId: string) => {
      snap()
      setEdges((eds) => eds.filter((e) => e.id !== edgeId))
      setSelectedEdge(null)
    },
    [setEdges, snap],
  )

  // ── Keyboard shortcuts ─────────────────────────────────────────

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const ctrl = event.ctrlKey || event.metaKey

      if (event.key === '?' && !ctrl) {
        setShowShortcuts((v) => !v)
        return
      }

      if (event.key === 'Escape') {
        setEditingNodeId(null)
        setSelectedNode(null)
        setSelectedEdge(null)
        setContextMenu(null)
        setShowShortcuts(false)
        return
      }

      if (ctrl && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo(nodes, edges, setNodes, setEdges)
        return
      }

      if (ctrl && (event.key === 'Z' || event.key === 'y')) {
        event.preventDefault()
        redo(nodes, edges, setNodes, setEdges)
        return
      }

      if (ctrl && event.key === 'c') {
        copy(nodes)
        return
      }

      if (ctrl && event.key === 'v') {
        event.preventDefault()
        snap()
        paste(setNodes)
        return
      }

      if (ctrl && event.key === 'd') {
        event.preventDefault()
        snap()
        const selected = nodes.filter((n) => n.selected)
        setNodes((nds) => [
          ...nds.map((n) => ({ ...n, selected: false })),
          ...selected.map((n) => ({
            ...structuredClone(n),
            id: generateNodeId(),
            position: { x: n.position.x + 40, y: n.position.y + 40 },
            selected: true,
          })),
        ])
        return
      }

      if (ctrl && event.key === 's') {
        event.preventDefault()
        if (event.shiftKey && onSaveAs) {
          void handleSaveAs()
        } else if (onSave) {
          void handleSave()
        } else if (onExport) {
          handleExport()
        }
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (editingNodeId) return
        snap()
        setNodes((nds) => nds.filter((n) => !n.selected))
        setEdges((eds) => eds.filter((e) => !e.selected))
        setSelectedNode(null)
        setSelectedEdge(null)
      }
    },
    [editingNodeId, nodes, edges, setNodes, setEdges, snap, undo, redo, copy, paste, onExport],
  )

  // ── Node updates ───────────────────────────────────────────────

  const onNodeTextChange = useCallback(
    (nodeId: string, newText: string) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, text: newText } } : n)),
      )
    },
    [setNodes],
  )

  const onFinishEdit = useCallback(() => {
    snap()
    setEditingNodeId(null)
  }, [snap])

  const onNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      snap()
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
      )
    },
    [setNodes, snap],
  )

  const onDeleteNode = useCallback(
    (nodeId: string) => {
      snap()
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
      setSelectedNode(null)
    },
    [setNodes, setEdges, snap],
  )

  const onAddNode = useCallback(
    (color: string) => {
      snap()
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
      const id = generateNodeId()
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: NODE_TYPES.text,
          position,
          style: { width: 350, height: 150 },
          data: { text: '## New Node\n\nDouble-click to edit', color },
        },
      ])
      setEditingNodeId(id)
    },
    [screenToFlowPosition, setNodes, snap],
  )

  const onNodeDragStart = useCallback(() => {
    snap()
  }, [snap])

  // ── Export ─────────────────────────────────────────────────────

  // Build a CanvasDocument snapshot from current RF state (used by save/export)
  const buildCanvasDoc = useCallback((): CanvasDocument => {
    const canvasNodes = nodes.map((n) => {
      const base = {
        id: n.id,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
        width: (n.style?.width as number) ?? 350,
        height: (n.style?.height as number) ?? 150,
        color: (n.data as Record<string, unknown>).color as string | undefined,
      }
      switch (n.type) {
        case NODE_TYPES.text:
          return { ...base, type: 'text' as const, text: (n.data as TextNodeData).text }
        case NODE_TYPES.link:
          return { ...base, type: 'link' as const, url: (n.data as { url: string }).url }
        case NODE_TYPES.file:
          return { ...base, type: 'file' as const, file: (n.data as { file: string }).file }
        case NODE_TYPES.group:
          return { ...base, type: 'group' as const, label: (n.data as { label?: string }).label }
        default:
          return { ...base, type: 'text' as const, text: '' }
      }
    })
    const canvasEdges = edges.map((e) => {
      const data = e.data as { label?: string; color?: string } | undefined
      return {
        id: e.id,
        fromNode: e.source,
        toNode: e.target,
        ...(e.sourceHandle ? { fromSide: e.sourceHandle as 'top' | 'right' | 'bottom' | 'left' } : {}),
        ...(e.targetHandle ? { toSide: e.targetHandle as 'top' | 'right' | 'bottom' | 'left' } : {}),
        ...(data?.label ? { label: data.label } : {}),
        ...(data?.color ? { color: data.color } : {}),
      }
    })
    return { nodes: canvasNodes, edges: canvasEdges }
  }, [nodes, edges])

  const handleExport = useCallback(() => {
    if (!onExport) return
    onExport(buildCanvasDoc())
  }, [buildCanvasDoc, onExport])

  const handleSave = useCallback(async () => {
    if (onSave) await onSave(buildCanvasDoc())
  }, [buildCanvasDoc, onSave])

  const handleSaveAs = useCallback(async () => {
    if (onSaveAs) await onSaveAs(buildCanvasDoc())
  }, [buildCanvasDoc, onSaveAs])

  // ── Deepen: expand all leaf nodes with AI ──────────────────────

  const [deepening, setDeepening] = useState(false)

  const handleDeepen = useCallback(async () => {
    if (!apiKey || deepening) return
    // Leaf = node with no outgoing edges (only incoming)
    const hasOutgoing = new Set(edges.map((e) => e.source))
    const leaves = nodes.filter(
      (n) => n.type === NODE_TYPES.text && !hasOutgoing.has(n.id) && n.id !== 'topic-1',
    )
    if (leaves.length === 0) return

    setDeepening(true)
    snap()

    try {
      const results = await Promise.all(
        leaves.map(async (leaf) => {
          const text = (leaf.data as { text?: string }).text ?? ''
          if (!text.trim()) return { nodes: [], edges: [] }
          const siblingCount = edges.filter((e) => e.source === leaf.id).length
          try {
            return await expandNode(
              apiKey,
              originalSource ?? '',
              { id: leaf.id, text, position: leaf.position },
              siblingCount,
            )
          } catch (e) {
            console.warn(`[deepen] Failed for ${leaf.id}:`, e)
            return { nodes: [], edges: [] }
          }
        }),
      )

      const newRfNodes: Node[] = []
      const newRfEdges: Edge[] = []
      for (const r of results) {
        for (const n of r.nodes) {
          newRfNodes.push({
            id: n.id,
            type: NODE_TYPES.text,
            position: { x: n.x, y: n.y },
            style: { width: n.width, height: n.height },
            data: {
              text: n.type === 'text' ? (n as { text: string }).text : '',
              color: n.color,
            },
          })
        }
        for (const e of r.edges) {
          newRfEdges.push({
            id: e.id,
            source: e.fromNode,
            target: e.toNode,
            type: 'labeled',
            data: { color: e.color },
            markerEnd: { type: MarkerType.ArrowClosed, color: colorToHex(e.color) },
            style: { stroke: colorToHex(e.color) },
          })
        }
      }

      setNodes((nds) => [...nds, ...newRfNodes])
      setEdges((eds) => [...eds, ...newRfEdges])
    } finally {
      setDeepening(false)
    }
  }, [apiKey, deepening, edges, nodes, originalSource, setNodes, setEdges, snap])

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex relative" onKeyDown={onKeyDown} tabIndex={0}>
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeDragStart={onNodeDragStart}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneClick={onPaneClick}
          onDoubleClick={onPaneDoubleClick}
          onContextMenu={onPaneContextMenu}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.05}
          maxZoom={2}
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={null}
          defaultEdgeOptions={{
            type: 'labeled',
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Controls position="bottom-left" showInteractive={false} />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--rf-bg-dots)"
          />
        </ReactFlow>

        <Toolbar
          onAddNode={onAddNode}
          onSave={onSave ? handleSave : undefined}
          onSaveAs={onSaveAs ? handleSaveAs : undefined}
          onDeepen={apiKey ? handleDeepen : undefined}
          deepening={deepening}
          onExportJson={onExport ? handleExport : undefined}
          onExportHtml={() => {
            const topicNode = nodes.find((n) =>
              typeof (n.data as { text?: string }).text === 'string' &&
              (n.data as { text: string }).text.startsWith('# '),
            )
            const title =
              topicNode
                ? ((topicNode.data as { text: string }).text.split('\n')[0] ?? 'Canvas').replace(/^#+\s*/, '')
                : 'Canvas'
            const html = exportToHtml(nodes, edges, { title, theme })
            const blob = new Blob([html], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = title.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\s-]/g, '').slice(0, 60).trim() + '.html'
            a.click()
            URL.revokeObjectURL(url)
          }}
        />

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] theme-text-faint">
          Press <kbd
            className="border rounded px-1 py-0.5 font-mono"
            style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
          >?</kbd> for shortcuts
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
          canExpand={!!apiKey}
        />
      )}

      {/* Expansion loading toast */}
      {expandingNodeId && (
        <div
          className="absolute top-4 right-1/2 translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-lg border z-20"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
          }}
        >
          <svg className="w-3.5 h-3.5 animate-spin" style={{ color: '#a882ff' }} fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs theme-text-secondary">
            Claude is expanding this node from your source...
          </span>
        </div>
      )}

      {expandError && (
        <div
          className="absolute top-4 right-1/2 translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-lg border z-20"
          style={{
            backgroundColor: 'rgb(239 68 68 / 0.1)',
            borderColor: 'rgb(239 68 68 / 0.3)',
          }}
        >
          <span className="text-xs text-red-400">Expand failed: {expandError}</span>
          <button
            onClick={() => setExpandError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {showShortcuts && <ShortcutsHelp onClose={() => setShowShortcuts(false)} />}

      {selectedNode && !selectedEdge && (
        <Sidebar
          node={selectedNode}
          editingNodeId={editingNodeId}
          onClose={() => {
            setSelectedNode(null)
            setEditingNodeId(null)
          }}
          onStartEdit={() => setEditingNodeId(selectedNode.id)}
          onTextChange={onNodeTextChange}
          onFinishEdit={onFinishEdit}
          onNodeUpdate={onNodeUpdate}
          onDeleteNode={onDeleteNode}
        />
      )}

      {selectedEdge && (
        <EdgeEditor
          edge={selectedEdge}
          onUpdate={onEdgeUpdate}
          onDelete={onDeleteEdge}
          onClose={() => setSelectedEdge(null)}
        />
      )}
    </div>
  )
}

const ForwardedInner = forwardRef<CanvasViewerHandle, CanvasViewerProps>(CanvasViewerInner)

export const CanvasViewer = forwardRef<CanvasViewerHandle, CanvasViewerProps>(
  function CanvasViewer(props, ref) {
    return (
      <ReactFlowProvider>
        <ForwardedInner {...props} ref={ref} />
      </ReactFlowProvider>
    )
  },
)

