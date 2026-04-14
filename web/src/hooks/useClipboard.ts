import { useCallback, useRef } from 'react'
import type { Node } from '@xyflow/react'

let idCounter = 2000

export function useClipboard() {
  const clipboard = useRef<Node[]>([])

  const copy = useCallback((nodes: Node[]) => {
    const selected = nodes.filter((n) => n.selected)
    if (selected.length === 0) return
    clipboard.current = structuredClone(selected)
  }, [])

  const paste = useCallback(
    (setNodes: (updater: (nodes: Node[]) => Node[]) => void) => {
      if (clipboard.current.length === 0) return

      const offset = 40
      const newNodes = clipboard.current.map((n) => ({
        ...structuredClone(n),
        id: `paste-${++idCounter}`,
        position: {
          x: n.position.x + offset,
          y: n.position.y + offset,
        },
        selected: true,
      }))

      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        ...newNodes,
      ])
    },
    [],
  )

  const hasContent = useCallback(() => clipboard.current.length > 0, [])

  return { copy, paste, hasContent }
}
