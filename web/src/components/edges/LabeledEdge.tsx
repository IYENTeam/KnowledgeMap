import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from '@xyflow/react'
import { colorToHex } from '@/lib/color-map'

/**
 * "Floating" straight edge: endpoints are picked dynamically on the node boundary
 * closest to the other node's center, rather than stuck to a fixed handle side.
 * This makes the line look natural regardless of node positions.
 */
export function LabeledEdge({
  id,
  source,
  target,
  data,
  selected,
  markerEnd,
  style,
}: EdgeProps) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)

  if (!sourceNode || !targetNode) return null

  const { sx, sy, tx, ty } = getFloatingEdgeParams(sourceNode, targetNode)

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  })

  const color = (data as { color?: string } | undefined)?.color
  const label = (data as { label?: string } | undefined)?.label
  const stroke = color ? colorToHex(color) : (style?.stroke as string) ?? '#71717a'

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke,
          strokeWidth: selected ? 2.5 : 1.5,
        }}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute px-2 py-0.5 rounded text-[10px] pointer-events-auto nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: `1px solid ${stroke}`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

/**
 * Compute the intersection of the line (source-center → target-center) with each
 * node's rectangular boundary. Returns the boundary points that make a clean
 * straight edge.
 */
function getFloatingEdgeParams(
  source: InternalNode,
  target: InternalNode,
): { sx: number; sy: number; tx: number; ty: number } {
  const sourcePt = getRectIntersection(source, target)
  const targetPt = getRectIntersection(target, source)
  return {
    sx: sourcePt.x,
    sy: sourcePt.y,
    tx: targetPt.x,
    ty: targetPt.y,
  }
}

/**
 * Given a node and a "toward" node, return the point on `node`'s rectangular
 * boundary that lies on the line between the two centers.
 */
function getRectIntersection(
  node: InternalNode,
  toward: InternalNode,
): { x: number; y: number } {
  const nCenter = centerOf(node)
  const tCenter = centerOf(toward)

  const w = (node.measured?.width ?? node.width ?? 0) / 2
  const h = (node.measured?.height ?? node.height ?? 0) / 2

  const dx = tCenter.x - nCenter.x
  const dy = tCenter.y - nCenter.y

  if (dx === 0 && dy === 0) return nCenter

  // Parametric line from node center; find t such that (nCenter + t*d) hits
  // either vertical or horizontal edge of node's bounding box.
  const tx = dx === 0 ? Infinity : w / Math.abs(dx)
  const ty = dy === 0 ? Infinity : h / Math.abs(dy)
  const t = Math.min(tx, ty)

  return {
    x: nCenter.x + dx * t,
    y: nCenter.y + dy * t,
  }
}

function centerOf(node: InternalNode): { x: number; y: number } {
  const pos = node.internals.positionAbsolute
  const w = node.measured?.width ?? node.width ?? 0
  const h = node.measured?.height ?? node.height ?? 0
  return {
    x: pos.x + w / 2,
    y: pos.y + h / 2,
  }
}
