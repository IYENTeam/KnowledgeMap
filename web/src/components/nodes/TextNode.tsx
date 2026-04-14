import { useEffect, useRef } from 'react'
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react'
import Markdown from 'react-markdown'
import type { TextNodeData } from '@/lib/canvas-to-reactflow'
import { colorToBg, colorToBorder, colorToHex } from '@/lib/color-map'

/**
 * TextNode auto-grows to fit markdown content.
 *
 * Strategy:
 *   - Render markdown into a content <div> with no fixed height
 *   - Use ResizeObserver to detect the rendered content's actual height
 *   - If actual height > node's current style.height, grow the node
 *   - Never shrink (user can manually resize smaller via NodeResizer)
 *
 * This handles cases where the AI-generated estimateHeight was too low
 * (especially with varied Korean/English mixed content).
 */
export function TextNode({ id, data, selected }: NodeProps) {
  const { text, color } = data as TextNodeData
  const containerRef = useRef<HTMLDivElement>(null)
  const { setNodes } = useReactFlow()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const resize = () => {
      const measured = el.scrollHeight
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n
          const currentH = (n.style?.width as number | undefined) != null ? (n.style?.height as number | undefined) ?? 0 : 0
          // Only grow (never shrink automatically — respects user's manual resize)
          if (measured > currentH + 2) {
            return {
              ...n,
              style: { ...n.style, height: measured },
            }
          }
          return n
        }),
      )
    }

    // Initial measure (wait for fonts/markdown to render)
    const raf = requestAnimationFrame(resize)

    const ro = new ResizeObserver(resize)
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [id, text, setNodes])

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={200}
        minHeight={80}
        lineStyle={{ borderColor: colorToHex(color) }}
        handleStyle={{ backgroundColor: colorToHex(color), width: 8, height: 8 }}
      />
      <div
        ref={containerRef}
        className="rounded-lg px-4 py-3"
        style={{
          backgroundColor: colorToBg(color),
          borderWidth: 1,
          borderColor: selected ? colorToHex(color) : colorToBorder(color),
          borderStyle: 'solid',
          // No overflow: let container measure its natural content height.
          // React Flow's node.style.height is adjusted to match via the effect above.
          minHeight: '100%',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div className="node-markdown">
          <Markdown>{text}</Markdown>
        </div>

        <NodeHandles color={color} />
      </div>
    </>
  )
}

function NodeHandles({ color }: { color?: string }) {
  const style = { background: colorToHex(color) }

  return (
    <>
      <Handle type="source" position={Position.Top} id="top" style={style} />
      <Handle type="target" position={Position.Top} id="top" style={style} />
      <Handle type="source" position={Position.Right} id="right" style={style} />
      <Handle type="target" position={Position.Right} id="right" style={style} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={style} />
      <Handle type="target" position={Position.Bottom} id="bottom" style={style} />
      <Handle type="source" position={Position.Left} id="left" style={style} />
      <Handle type="target" position={Position.Left} id="left" style={style} />
    </>
  )
}

export { NodeHandles }
