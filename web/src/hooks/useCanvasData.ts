import { useState, useCallback } from 'react'
import type { CanvasDocument } from '@knowledgeos/types/canvas.js'
import { validateCanvasJson } from '@/lib/canvas-to-reactflow'

// Narrow types for File System Access API (not in all TS libs)
interface FileSystemWritableFileStreamLike {
  write: (data: string) => Promise<void>
  close: () => Promise<void>
}
interface FileSystemFileHandleLike {
  name?: string
  createWritable: () => Promise<FileSystemWritableFileStreamLike>
  getFile: () => Promise<File>
}

declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      types?: { description: string; accept: Record<string, string[]> }[]
      multiple?: boolean
    }) => Promise<FileSystemFileHandleLike[]>
    showSaveFilePicker?: (options?: {
      suggestedName?: string
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<FileSystemFileHandleLike>
  }
}

export const supportsFileSystemAccess =
  typeof window !== 'undefined' && 'showOpenFilePicker' in window

interface CanvasDataState {
  canvas: CanvasDocument | null
  error: string | null
  fileName: string | null
  fileHandle: FileSystemFileHandleLike | null
  dirty: boolean
}

export function useCanvasData() {
  const [state, setState] = useState<CanvasDataState>({
    canvas: null,
    error: null,
    fileName: null,
    fileHandle: null,
    dirty: false,
  })

  const loadFromJson = useCallback((jsonString: string, fileName?: string) => {
    try {
      const parsed = JSON.parse(jsonString)
      if (!validateCanvasJson(parsed)) {
        setState({
          canvas: null,
          error: 'Invalid canvas format. Expected { nodes: [...], edges: [...] }',
          fileName: null,
          fileHandle: null,
          dirty: false,
        })
        return
      }
      setState({
        canvas: parsed,
        error: null,
        fileName: fileName ?? null,
        fileHandle: null,
        dirty: false,
      })
    } catch (e) {
      setState({
        canvas: null,
        error: `JSON parse error: ${e instanceof Error ? e.message : String(e)}`,
        fileName: null,
        fileHandle: null,
        dirty: false,
      })
    }
  }, [])

  const loadFromFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result
        if (typeof text === 'string') {
          loadFromJson(text, file.name)
        }
      }
      reader.onerror = () => {
        setState({
          canvas: null,
          error: 'Failed to read file',
          fileName: null,
          fileHandle: null,
          dirty: false,
        })
      }
      reader.readAsText(file)
    },
    [loadFromJson],
  )

  /**
   * File System Access API: pick a file and remember the handle for in-place Save.
   */
  const openFileWithHandle = useCallback(async () => {
    if (!supportsFileSystemAccess) return
    try {
      const handles = await window.showOpenFilePicker!({
        types: [
          {
            description: 'Canvas / JSON',
            accept: {
              'application/json': ['.canvas', '.json'],
            },
          },
        ],
      })
      const handle = handles[0]
      if (!handle) return
      const file = await handle.getFile()
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!validateCanvasJson(parsed)) {
        setState((s) => ({ ...s, error: 'Invalid canvas format', canvas: null }))
        return
      }
      setState({
        canvas: parsed,
        error: null,
        fileName: file.name,
        fileHandle: handle,
        dirty: false,
      })
    } catch (e) {
      // User cancelled or error
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }))
      }
    }
  }, [])

  const loadCanvas = useCallback((doc: CanvasDocument, name?: string) => {
    setState({
      canvas: doc,
      error: null,
      fileName: name ?? null,
      fileHandle: null,
      dirty: false,
    })
  }, [])

  const clear = useCallback(() => {
    setState({
      canvas: null,
      error: null,
      fileName: null,
      fileHandle: null,
      dirty: false,
    })
  }, [])

  const markDirty = useCallback(() => {
    setState((s) => (s.dirty ? s : { ...s, dirty: true }))
  }, [])

  /**
   * Save the current canvas back to its file handle (File System Access API).
   * Returns true on success, false if no handle (caller should fallback to Save As).
   */
  const saveToHandle = useCallback(
    async (doc: CanvasDocument): Promise<boolean> => {
      if (!state.fileHandle) return false
      try {
        const writable = await state.fileHandle.createWritable()
        await writable.write(JSON.stringify(doc, null, 2))
        await writable.close()
        setState((s) => ({ ...s, dirty: false }))
        return true
      } catch (e) {
        setState((s) => ({
          ...s,
          error: `Save failed: ${e instanceof Error ? e.message : String(e)}`,
        }))
        return false
      }
    },
    [state.fileHandle],
  )

  /**
   * Save As: pick a new file location and save. Updates the file handle so future
   * saves go to the new location.
   */
  const saveAs = useCallback(
    async (doc: CanvasDocument, suggestedName?: string): Promise<boolean> => {
      if (supportsFileSystemAccess) {
        try {
          const handle = await window.showSaveFilePicker!({
            suggestedName: (suggestedName ?? 'canvas') + '.canvas',
            types: [
              {
                description: 'Canvas',
                accept: { 'application/json': ['.canvas'] },
              },
            ],
          })
          const writable = await handle.createWritable()
          await writable.write(JSON.stringify(doc, null, 2))
          await writable.close()
          const file = await handle.getFile()
          setState((s) => ({
            ...s,
            fileHandle: handle,
            fileName: file.name,
            dirty: false,
          }))
          return true
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return false
          setState((s) => ({
            ...s,
            error: `Save failed: ${e instanceof Error ? e.message : String(e)}`,
          }))
          return false
        }
      } else {
        // Fallback: download
        const json = JSON.stringify(doc, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = (suggestedName ?? 'canvas') + '.canvas'
        a.click()
        URL.revokeObjectURL(url)
        return true
      }
    },
    [],
  )

  return {
    canvas: state.canvas,
    error: state.error,
    fileName: state.fileName,
    hasFileHandle: !!state.fileHandle,
    dirty: state.dirty,
    loadFromJson,
    loadFromFile,
    openFileWithHandle,
    loadCanvas,
    clear,
    markDirty,
    saveToHandle,
    saveAs,
  }
}
