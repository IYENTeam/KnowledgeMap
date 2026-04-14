import { useCallback, useRef } from 'react'
import type { Node, Edge } from '@xyflow/react'

interface Snapshot {
  nodes: Node[]
  edges: Edge[]
}

const MAX_HISTORY = 50

export function useUndoRedo() {
  const past = useRef<Snapshot[]>([])
  const future = useRef<Snapshot[]>([])

  const takeSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    past.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    })
    if (past.current.length > MAX_HISTORY) {
      past.current.shift()
    }
    // Any new action clears the redo stack
    future.current = []
  }, [])

  const undo = useCallback(
    (
      currentNodes: Node[],
      currentEdges: Edge[],
      setNodes: (nodes: Node[]) => void,
      setEdges: (edges: Edge[]) => void,
    ) => {
      const prev = past.current.pop()
      if (!prev) return

      future.current.push({
        nodes: structuredClone(currentNodes),
        edges: structuredClone(currentEdges),
      })

      setNodes(prev.nodes)
      setEdges(prev.edges)
    },
    [],
  )

  const redo = useCallback(
    (
      currentNodes: Node[],
      currentEdges: Edge[],
      setNodes: (nodes: Node[]) => void,
      setEdges: (edges: Edge[]) => void,
    ) => {
      const next = future.current.pop()
      if (!next) return

      past.current.push({
        nodes: structuredClone(currentNodes),
        edges: structuredClone(currentEdges),
      })

      setNodes(next.nodes)
      setEdges(next.edges)
    },
    [],
  )

  const canUndo = useCallback(() => past.current.length > 0, [])
  const canRedo = useCallback(() => future.current.length > 0, [])

  return { takeSnapshot, undo, redo, canUndo, canRedo }
}
