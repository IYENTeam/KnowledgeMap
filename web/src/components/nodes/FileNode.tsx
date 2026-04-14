import { NodeResizer, type NodeProps } from '@xyflow/react'
import type { FileNodeData } from '@/lib/canvas-to-reactflow'
import { colorToBg, colorToBorder, colorToHex } from '@/lib/color-map'
import { NodeHandles } from './TextNode'

export function FileNode({ data, selected }: NodeProps) {
  const { file, color } = data as FileNodeData
  const fileName = file.split('/').pop() ?? file

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={200}
        minHeight={60}
        lineStyle={{ borderColor: colorToHex(color) }}
        handleStyle={{ backgroundColor: colorToHex(color), width: 8, height: 8 }}
      />
      <div
        className="rounded-lg px-4 py-3 h-full flex items-center gap-2"
        style={{
          backgroundColor: colorToBg(color),
          borderWidth: 1,
          borderColor: selected ? colorToHex(color) : colorToBorder(color),
          borderStyle: 'solid',
        }}
      >
        <svg className="w-4 h-4 shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{fileName}</div>
          <div className="text-xs opacity-50 truncate">{file}</div>
        </div>
        <NodeHandles color={color} />
      </div>
    </>
  )
}
