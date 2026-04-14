import { NodeResizer, type NodeProps } from '@xyflow/react'
import type { LinkNodeData } from '@/lib/canvas-to-reactflow'
import { colorToBg, colorToBorder, colorToHex } from '@/lib/color-map'
import { NodeHandles } from './TextNode'

export function LinkNode({ data, selected }: NodeProps) {
  const { url, color } = data as LinkNodeData

  let displayUrl = url
  try {
    const parsed = new URL(url)
    displayUrl = parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '')
  } catch {
    // keep raw url
  }

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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.553-4.554a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 truncate underline"
          onClick={(e) => e.stopPropagation()}
        >
          {displayUrl}
        </a>
        <NodeHandles color={color} />
      </div>
    </>
  )
}
