/**
 * Zod schemas for validating canvas JSON.
 * Provides strict parsing + auto-fix for common model errors.
 */

import { z } from 'zod'
import type { CanvasDocument } from '@knowledgeos/types/canvas.js'

// ── Base schemas ────────────────────────────────────────────

const sideSchema = z.enum(['top', 'right', 'bottom', 'left'])
const colorSchema = z.string().regex(/^[1-6]$|^#[0-9a-fA-F]{6}$/)

const baseNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['text', 'file', 'link', 'group']),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
  color: colorSchema.optional(),
})

const textNodeSchema = baseNodeSchema.extend({
  type: z.literal('text'),
  text: z.string(),
})

const fileNodeSchema = baseNodeSchema.extend({
  type: z.literal('file'),
  file: z.string(),
  subpath: z.string().optional(),
})

const linkNodeSchema = baseNodeSchema.extend({
  type: z.literal('link'),
  url: z.string(),
})

const groupNodeSchema = baseNodeSchema.extend({
  type: z.literal('group'),
  label: z.string().optional(),
})

const nodeSchema = z.discriminatedUnion('type', [
  textNodeSchema,
  fileNodeSchema,
  linkNodeSchema,
  groupNodeSchema,
])

const edgeSchema = z.object({
  id: z.string().min(1),
  fromNode: z.string().min(1),
  toNode: z.string().min(1),
  fromSide: sideSchema.optional(),
  toSide: sideSchema.optional(),
  color: colorSchema.optional(),
  label: z.string().optional(),
})

export const canvasSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
})

// ── Validation result ───────────────────────────────────────

export interface ValidationResult {
  ok: boolean
  doc?: CanvasDocument
  errors?: string[]
  warnings?: string[]
  fixed?: boolean
}

// ── Auto-fix helpers ────────────────────────────────────────

type LooseNode = Record<string, unknown>
type LooseEdge = Record<string, unknown>

function autoFixNode(node: LooseNode, index: number): { fixed: LooseNode; warnings: string[] } {
  const warnings: string[] = []
  const fixed: LooseNode = { ...node }

  // Ensure id
  if (typeof fixed.id !== 'string' || !fixed.id) {
    fixed.id = `autofix-node-${index}`
    warnings.push(`Node ${index} missing id, generated "${fixed.id}"`)
  }

  // Coerce x/y to numbers
  for (const key of ['x', 'y'] as const) {
    const v = fixed[key]
    if (typeof v === 'string') {
      const n = parseFloat(v)
      if (!isNaN(n)) {
        fixed[key] = n
        warnings.push(`Node ${fixed.id} ${key} coerced from string`)
      } else {
        fixed[key] = 0
        warnings.push(`Node ${fixed.id} ${key} invalid, set to 0`)
      }
    } else if (typeof v !== 'number' || !isFinite(v as number)) {
      fixed[key] = 0
      warnings.push(`Node ${fixed.id} ${key} missing or invalid, set to 0`)
    }
  }

  // Coerce width/height
  for (const key of ['width', 'height'] as const) {
    const v = fixed[key]
    if (typeof v === 'string') {
      const n = parseFloat(v)
      if (!isNaN(n) && n > 0) {
        fixed[key] = n
        warnings.push(`Node ${fixed.id} ${key} coerced from string`)
      } else {
        fixed[key] = key === 'width' ? 350 : 150
        warnings.push(`Node ${fixed.id} ${key} invalid, set to default`)
      }
    } else if (typeof v !== 'number' || v <= 0 || !isFinite(v as number)) {
      fixed[key] = key === 'width' ? 350 : 150
      warnings.push(`Node ${fixed.id} ${key} missing, set to default`)
    }
  }

  // Ensure type
  if (!fixed.type || !['text', 'file', 'link', 'group'].includes(fixed.type as string)) {
    fixed.type = 'text'
    warnings.push(`Node ${fixed.id} type missing/invalid, set to "text"`)
  }

  // Ensure content field matches type
  if (fixed.type === 'text' && typeof fixed.text !== 'string') {
    fixed.text = ''
    warnings.push(`Node ${fixed.id} text missing, set to ""`)
  }
  if (fixed.type === 'link' && typeof fixed.url !== 'string') {
    fixed.url = 'https://example.com'
    warnings.push(`Node ${fixed.id} url missing`)
  }
  if (fixed.type === 'file' && typeof fixed.file !== 'string') {
    fixed.file = 'unknown.md'
    warnings.push(`Node ${fixed.id} file missing`)
  }

  // Normalize color to string
  if (fixed.color !== undefined && typeof fixed.color !== 'string') {
    fixed.color = String(fixed.color)
    warnings.push(`Node ${fixed.id} color coerced to string`)
  }
  if (fixed.color === '') delete fixed.color

  return { fixed, warnings }
}

function autoFixEdge(
  edge: LooseEdge,
  index: number,
  validNodeIds: Set<string>,
): { fixed: LooseEdge | null; warnings: string[] } {
  const warnings: string[] = []
  const fixed: LooseEdge = { ...edge }

  if (typeof fixed.id !== 'string' || !fixed.id) {
    fixed.id = `autofix-edge-${index}`
    warnings.push(`Edge ${index} missing id, generated`)
  }

  if (typeof fixed.fromNode !== 'string' || !validNodeIds.has(fixed.fromNode as string)) {
    warnings.push(`Edge ${fixed.id} references missing fromNode "${fixed.fromNode}", dropped`)
    return { fixed: null, warnings }
  }

  if (typeof fixed.toNode !== 'string' || !validNodeIds.has(fixed.toNode as string)) {
    warnings.push(`Edge ${fixed.id} references missing toNode "${fixed.toNode}", dropped`)
    return { fixed: null, warnings }
  }

  // Clean up invalid sides
  for (const key of ['fromSide', 'toSide'] as const) {
    const v = fixed[key]
    if (v !== undefined && !['top', 'right', 'bottom', 'left'].includes(v as string)) {
      delete fixed[key]
    }
  }

  if (fixed.color !== undefined && typeof fixed.color !== 'string') {
    fixed.color = String(fixed.color)
  }
  if (fixed.color === '') delete fixed.color

  return { fixed, warnings }
}

// ── Public API ──────────────────────────────────────────────

/**
 * Validate raw canvas data. Runs auto-fix first, then strict Zod validation.
 *
 * @param raw - The canvas-like object to validate
 * @param options.externalNodeIds - Additional known-valid node IDs from outside
 *   this batch (e.g. nodes already placed in the live canvas during streaming).
 *   Edges referencing these IDs will be kept.
 */
export function validateCanvas(
  raw: unknown,
  options: { externalNodeIds?: Set<string> } = {},
): ValidationResult {
  const allWarnings: string[] = []
  let fixedFlag = false

  // Basic shape check
  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Input is not an object'] }
  }

  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj.nodes)) {
    return { ok: false, errors: ['Missing "nodes" array'] }
  }
  if (!Array.isArray(obj.edges)) {
    // Edges can be auto-fixed to empty
    obj.edges = []
    allWarnings.push('Missing "edges" array, set to []')
    fixedFlag = true
  }

  // Auto-fix nodes
  const fixedNodes: LooseNode[] = []
  // Start with externally-known IDs (e.g. nodes already placed in a live canvas
  // during streaming) so edges referencing them are accepted.
  const nodeIds = new Set<string>(options.externalNodeIds ?? [])
  for (let i = 0; i < obj.nodes.length; i++) {
    const node = obj.nodes[i]
    if (!node || typeof node !== 'object') continue
    const { fixed, warnings } = autoFixNode(node as LooseNode, i)
    if (warnings.length > 0) {
      fixedFlag = true
      allWarnings.push(...warnings)
    }
    // Deduplicate IDs
    if (nodeIds.has(fixed.id as string)) {
      fixed.id = `${fixed.id}-dup-${i}`
      allWarnings.push(`Duplicate node id, renamed to ${fixed.id}`)
      fixedFlag = true
    }
    nodeIds.add(fixed.id as string)
    fixedNodes.push(fixed)
  }

  // Auto-fix edges
  const fixedEdges: LooseEdge[] = []
  const edgeIds = new Set<string>()
  for (let i = 0; i < (obj.edges as LooseEdge[]).length; i++) {
    const edge = (obj.edges as LooseEdge[])[i]
    if (!edge || typeof edge !== 'object') continue
    const { fixed, warnings } = autoFixEdge(edge, i, nodeIds)
    if (warnings.length > 0) {
      fixedFlag = true
      allWarnings.push(...warnings)
    }
    if (!fixed) continue
    if (edgeIds.has(fixed.id as string)) {
      fixed.id = `${fixed.id}-dup-${i}`
      fixedFlag = true
    }
    edgeIds.add(fixed.id as string)
    fixedEdges.push(fixed)
  }

  const candidate = { nodes: fixedNodes, edges: fixedEdges }

  // Strict validation
  const result = canvasSchema.safeParse(candidate)
  if (!result.success) {
    const errors = result.error.issues.map((e) => {
      const path = e.path.join('.')
      return `${path || 'root'}: ${e.message}`
    })
    return {
      ok: false,
      errors,
      warnings: allWarnings,
    }
  }

  return {
    ok: true,
    doc: result.data as CanvasDocument,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
    fixed: fixedFlag,
  }
}
