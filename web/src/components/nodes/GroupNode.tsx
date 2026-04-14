import type { NodeProps } from '@xyflow/react'
import type { GroupNodeData } from '@/lib/canvas-to-reactflow'
import { colorToBg, colorToBorder } from '@/lib/color-map'

export function GroupNode({ data }: NodeProps) {
  const { label, color } = data as GroupNodeData

  return (
    <div
      className="rounded-xl h-full w-full relative"
      style={{
        backgroundColor: colorToBg(color),
        borderWidth: 1,
        borderColor: colorToBorder(color),
        borderStyle: 'dashed',
      }}
    >
      {label && (
        <div className="absolute top-2 left-3 text-xs font-medium theme-text-muted uppercase tracking-wide">
          {label}
        </div>
      )}
    </div>
  )
}
