import { useState, useRef, useCallback } from 'react'
import type { CanvasDocument, CanvasNode, CanvasEdge } from '@knowledgeos/types/canvas.js'
import {
  startStreamingDecompose,
  DecomposeError,
  type ProgressStage,
} from '@/lib/staged-decompose'
import { validateCanvas } from '@/lib/canvas-schema'
import { extractPdfText, maybeTruncate, type PdfProgress } from '@/lib/pdf-extract'
import { useT } from '@/lib/i18n'

interface DecomposeDialogProps {
  apiKey: string
  /** Called once Stage 1 finishes — loads the initial canvas + registers onAppend for later stages. */
  onStreamingStart: (
    initialCanvas: CanvasDocument,
    source: string,
    label: string,
    subscribe: (cb: (nodes: CanvasNode[], edges: CanvasEdge[]) => void) => () => void,
    done: Promise<void>,
  ) => void
  onClose: () => void
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'extracting-pdf'; fileName: string; progress: PdfProgress | null }
  | { kind: 'pdf-ready'; fileName: string; text: string; pageCount: number; charCount: number; title?: string; truncated: boolean; originalLength: number }
  | { kind: 'starting'; progress: ProgressStage }

export function DecomposeDialog({ apiKey, onStreamingStart, onClose }: DecomposeDialogProps) {
  const { t } = useT()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const loading = phase.kind === 'extracting-pdf' || phase.kind === 'starting'

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError(t('decompose.error.notpdf'))
        return
      }
      setError(null)
      setPhase({ kind: 'extracting-pdf', fileName: file.name, progress: null })

      try {
        const result = await extractPdfText(file, (p) =>
          setPhase({ kind: 'extracting-pdf', fileName: file.name, progress: p }),
        )

        if (!result.text.trim()) {
          setError(t('decompose.error.scanned'))
          setPhase({ kind: 'idle' })
          return
        }

        const { text, truncated, originalLength } = maybeTruncate(result.text)

        setPhase({
          kind: 'pdf-ready',
          fileName: file.name,
          text,
          pageCount: result.pageCount,
          charCount: text.length,
          title: result.title,
          truncated,
          originalLength,
        })
      } catch (e) {
        setError(`${t('decompose.error.parse')}: ${e instanceof Error ? e.message : String(e)}`)
        setPhase({ kind: 'idle' })
      }
    },
    [t],
  )

  const handleGenerate = async () => {
    if (phase.kind !== 'pdf-ready') return

    setError(null)
    abortRef.current = new AbortController()

    const source = phase.title ? `Paper: ${phase.title}\n\n${phase.text}` : phase.text

    setPhase({ kind: 'starting', progress: { stage: 'extracting-questions' } })

    // Collect listeners so caller can subscribe after we start
    const listeners = new Set<(n: CanvasNode[], e: CanvasEdge[]) => void>()
    const subscribe = (cb: (n: CanvasNode[], e: CanvasEdge[]) => void) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    }

    // Track all node IDs placed so far so batch-validation accepts edges that
    // reference parents from earlier batches (e.g. detail→answer edges).
    const placedNodeIds = new Set<string>()

    try {
      const session = await startStreamingDecompose(
        apiKey,
        source,
        {
          onAppend: (nodes, edges) => {
            const validation = validateCanvas(
              { nodes, edges },
              { externalNodeIds: placedNodeIds },
            )
            if (!validation.ok) {
              console.warn('[streaming] Invalid append batch, skipped:', validation.errors)
              return
            }
            const doc = validation.doc!
            // Register these node IDs so subsequent batches can reference them
            for (const n of doc.nodes) placedNodeIds.add(n.id)
            for (const l of listeners) l(doc.nodes, doc.edges)
          },
          onProgress: (p) => setPhase({ kind: 'starting', progress: p }),
        },
        abortRef.current.signal,
      )

      // Validate initial canvas
      const validation = validateCanvas(session.initialCanvas)
      // Seed placed node IDs with the initial canvas so streaming batches can
      // reference these as edge targets (e.g. question → answer edges).
      if (validation.ok && validation.doc) {
        for (const n of validation.doc.nodes) placedNodeIds.add(n.id)
      }
      if (!validation.ok) {
        setError(`${t('decompose.error.validation')}:\n${(validation.errors ?? []).slice(0, 3).join('\n')}`)
        setPhase(phase)
        return
      }

      const label = phase.title ?? phase.fileName.replace(/\.pdf$/i, '')

      // Hand off to App
      onStreamingStart(validation.doc!, source, label, subscribe, session.done)

      // Dialog closes automatically via App's state
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setPhase(phase)
      } else if (e instanceof DecomposeError) {
        setError(e.message)
        setPhase(phase)
      } else {
        setError(e instanceof Error ? e.message : String(e))
        setPhase(phase)
      }
    } finally {
      abortRef.current = null
    }
  }

  const handleCancel = () => {
    if (phase.kind === 'starting' && abortRef.current) {
      abortRef.current.abort()
    } else {
      onClose()
    }
  }

  const handleReset = () => {
    setPhase({ kind: 'idle' })
    setError(null)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'var(--overlay-bg)' }}
        onClick={loading ? undefined : onClose}
      />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 border rounded-xl p-6 w-[600px] max-h-[90vh] overflow-auto shadow-2xl"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" style={{ color: '#a882ff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <h2 className="text-base font-semibold theme-text">{t('decompose.title')}</h2>
          </div>
          {!loading && (
            <button onClick={onClose} className="theme-text-muted hover:theme-text transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs theme-text-muted mb-4">{t('decompose.subtitle')}</p>

        <div className="space-y-3">
          {phase.kind === 'idle' && (
            <label
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const file = e.dataTransfer.files[0]
                if (file) handleFile(file)
              }}
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors block"
              style={{
                borderColor: dragging ? '#a882ff' : 'var(--border)',
                backgroundColor: dragging ? 'rgba(168, 130, 255, 0.08)' : 'transparent',
              }}
            >
              <svg className="w-10 h-10 mx-auto mb-3 theme-text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="text-sm theme-text mb-1">{t('decompose.drop.title')}</div>
              <div className="text-xs theme-text-faint">{t('decompose.drop.browse')}</div>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </label>
          )}

          {phase.kind === 'extracting-pdf' && (
            <div className="rounded-lg p-6 flex items-center gap-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <Spinner large />
              <div className="flex-1">
                <div className="text-sm theme-text font-medium">{t('decompose.reading')}</div>
                <div className="text-xs theme-text-muted mt-1">{phase.fileName}</div>
                {phase.progress && (
                  <div className="text-[11px] theme-text-faint mt-1">
                    {t('decompose.page')} {phase.progress.page} / {phase.progress.total}
                  </div>
                )}
              </div>
            </div>
          )}

          {phase.kind === 'pdf-ready' && (
            <div className="rounded-lg p-4 space-y-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(168, 130, 255, 0.15)' }}
                >
                  <svg className="w-5 h-5" style={{ color: '#a882ff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm theme-text font-medium truncate">
                    {phase.title ?? phase.fileName}
                  </div>
                  <div className="text-xs theme-text-muted truncate">{phase.fileName}</div>
                  <div className="text-[10px] theme-text-faint mt-1">
                    {phase.pageCount} {t('decompose.pages')} · {phase.charCount.toLocaleString()} {t('decompose.chars.extracted')}
                    {phase.truncated && (
                      <span className="text-amber-400 ml-1">
                        · {t('decompose.truncated.from')} {phase.originalLength.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={handleReset} className="theme-text-muted hover:theme-text transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {phase.truncated && (
                <div className="text-[11px] px-2 py-1.5 rounded" style={{ backgroundColor: 'rgb(245 158 11 / 0.1)', color: 'rgb(252 211 77)' }}>
                  {t('decompose.truncated.warn')}
                </div>
              )}
            </div>
          )}

          {phase.kind === 'starting' && (
            <div className="rounded-lg p-4 flex items-center gap-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <Spinner large />
              <div className="flex-1">
                <div className="text-sm theme-text font-medium">{t('progress.extracting')}</div>
                <div className="text-xs theme-text-muted mt-1">{t('progress.extracting.desc')}</div>
              </div>
            </div>
          )}

          {error && (
            <div
              className="border rounded-lg px-3 py-2 text-xs text-red-400 whitespace-pre-wrap"
              style={{ backgroundColor: 'rgb(239 68 68 / 0.1)', borderColor: 'rgb(239 68 68 / 0.3)' }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-2">
            {phase.kind === 'pdf-ready' && (
              <button
                onClick={handleGenerate}
                className="flex-1 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#a882ff' }}
              >
                {t('decompose.generate')}
              </button>
            )}
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm theme-text-secondary theme-bg-hover rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              {phase.kind === 'starting' ? t('decompose.cancel') : t('decompose.close')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Spinner({ large }: { large?: boolean } = {}) {
  const size = large ? 'w-5 h-5' : 'w-3.5 h-3.5'
  return (
    <svg className={`${size} animate-spin`} style={{ color: '#a882ff' }} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
