import { useCallback, useRef, useState } from 'react'
import type { CanvasDocument, CanvasNode, CanvasEdge } from '@knowledgeos/types/canvas.js'
import { useCanvasData } from '@/hooks/useCanvasData'
import { useTheme } from '@/hooks/useTheme'
import { useApiKey } from '@/hooks/useApiKey'
import { CanvasViewer, type CanvasViewerHandle } from '@/components/CanvasViewer'
import { FileUpload } from '@/components/FileUpload'
import { JsonPaste } from '@/components/JsonPaste'
import { WelcomeModal } from '@/components/WelcomeModal'
import { UnlockModal } from '@/components/UnlockModal'
import { SettingsModal } from '@/components/SettingsModal'
import { DecomposeDialog } from '@/components/DecomposeDialog'
import { EXAMPLE_CANVAS } from '@/lib/example-canvas'
import { useT } from '@/lib/i18n'
import { useFontScale } from '@/hooks/useFontScale'

export default function App() {
  const {
    canvas,
    error,
    fileName,
    hasFileHandle,
    dirty,
    loadFromJson,
    loadFromFile,
    openFileWithHandle,
    loadCanvas,
    clear,
    markDirty,
    saveToHandle,
    saveAs,
  } = useCanvasData()
  const { theme, toggle } = useTheme()
  const { t, locale, setLocale } = useT()
  const { scale: fontScale, increase: incFont, decrease: decFont, reset: resetFont } = useFontScale()
  const {
    state,
    apiKey,
    hasStoredKey,
    isUnlocked,
    maskedKey,
    welcomeDismissed,
    isReady,
    saveKey,
    unlock,
    lock,
    clearKey,
    changePassword,
    dismissWelcome,
  } = useApiKey()

  const [showSettings, setShowSettings] = useState(false)
  const [showDecompose, setShowDecompose] = useState(false)
  const [showUnlock, setShowUnlock] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [originalSource, setOriginalSource] = useState<string>('')
  const [streaming, setStreaming] = useState(false)
  const canvasRef = useRef<CanvasViewerHandle>(null)

  const handleExport = useCallback(
    (doc: CanvasDocument) => {
      const json = JSON.stringify(doc, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (fileName?.replace(/\s*\(example\)/, '') ?? 'canvas') + '.canvas'
      a.click()
      URL.revokeObjectURL(url)
    },
    [fileName],
  )

  const handleSave = useCallback(
    async (doc: CanvasDocument) => {
      if (hasFileHandle) {
        await saveToHandle(doc)
      } else {
        await saveAs(doc, fileName?.replace(/\.canvas$/i, '') ?? 'canvas')
      }
    },
    [hasFileHandle, saveToHandle, saveAs, fileName],
  )

  const handleSaveAs = useCallback(
    async (doc: CanvasDocument) => {
      await saveAs(doc, fileName?.replace(/\.canvas$/i, '') ?? 'canvas')
    },
    [saveAs, fileName],
  )

  const handleWelcomeSave = useCallback(
    async (key: string, password: string) => {
      await saveKey(key, password)
      dismissWelcome()
    },
    [saveKey, dismissWelcome],
  )

  const handleUnlock = useCallback(
    async (password: string) => {
      await unlock(password)
      setShowUnlock(false)
    },
    [unlock],
  )

  const handleDecomposeClick = useCallback(() => {
    if (isUnlocked) {
      setShowDecompose(true)
    } else if (state === 'locked') {
      setShowUnlock(true)
    } else {
      setShowSetup(true)
    }
  }, [isUnlocked, state])

  /**
   * Streaming decompose: stage 1 done → load initial canvas + close dialog.
   * Subsequent stages push nodes via the canvas ref.
   */
  const handleStreamingStart = useCallback(
    (
      initialCanvas: CanvasDocument,
      source: string,
      label: string,
      subscribe: (cb: (nodes: CanvasNode[], edges: CanvasEdge[]) => void) => () => void,
      done: Promise<void>,
    ) => {
      setOriginalSource(source)
      loadCanvas(initialCanvas, label)
      setShowDecompose(false)
      setStreaming(true)

      // Canvas mount is async (useState transition). Defer subscription until the ref is ready.
      setTimeout(() => {
        const unsub = subscribe((nodes, edges) => {
          canvasRef.current?.appendCanvasItems(nodes, edges)
        })

        done.finally(() => {
          unsub()
          setStreaming(false)
        })
      }, 100)
    },
    [loadCanvas],
  )

  const handleSetupSave = useCallback(
    async (key: string, password: string) => {
      await saveKey(key, password)
      setShowSetup(false)
    },
    [saveKey],
  )

  const showWelcome = isReady && !hasStoredKey && !welcomeDismissed

  // Color for key status indicator
  const keyStatusColor =
    state === 'unlocked' ? 'bg-green-500' : state === 'locked' ? 'bg-amber-500' : null

  return (
    <div className="h-screen flex flex-col">
      <header
        className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight">
            <span style={{ color: '#a882ff' }}>{t('app.title')}</span>{' '}
            <span className="theme-text-secondary">{t('app.subtitle')}</span>
          </h1>
          {fileName && (
            <span
              className="text-xs theme-text-muted px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              {fileName}
              {dirty && <span className="ml-1 text-amber-400">●</span>}
            </span>
          )}
          {streaming && (
            <span
              className="text-xs px-2 py-0.5 rounded flex items-center gap-1.5"
              style={{ backgroundColor: 'rgba(168, 130, 255, 0.15)', color: '#a882ff' }}
            >
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {locale === 'ko' ? '생성 중' : 'Generating'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleDecomposeClick}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all"
            style={{
              backgroundColor: isUnlocked ? 'rgba(168, 130, 255, 0.15)' : 'var(--bg-tertiary)',
              color: isUnlocked ? '#a882ff' : 'var(--text-muted)',
            }}
            title={
              isUnlocked
                ? 'Decompose a paper PDF with AI'
                : state === 'locked'
                ? 'Unlock API key to use AI'
                : 'Connect API key first'
            }
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            {t('header.decompose')}
            {state === 'locked' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </button>

          <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border)' }} />

          {/* Font size controls */}
          <div className="flex items-center rounded overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <button
              onClick={decFont}
              className="px-1.5 py-1 theme-text-muted hover:theme-text transition-colors text-[11px]"
              title={locale === 'ko' ? '글자 작게' : 'Smaller font'}
            >
              A−
            </button>
            <button
              onClick={resetFont}
              className="px-1.5 py-1 theme-text-muted hover:theme-text transition-colors text-[10px] font-mono"
              title={locale === 'ko' ? '기본 크기로' : 'Reset font size'}
            >
              {Math.round(fontScale * 100)}%
            </button>
            <button
              onClick={incFont}
              className="px-1.5 py-1 theme-text-muted hover:theme-text transition-colors text-[11px]"
              title={locale === 'ko' ? '글자 크게' : 'Larger font'}
            >
              A+
            </button>
          </div>

          <button
            onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
            className="px-2 py-1 text-[11px] font-semibold theme-text-muted hover:theme-text transition-colors rounded"
            title={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
          >
            {locale === 'ko' ? 'KO' : 'EN'}
          </button>

          <button
            onClick={toggle}
            className="p-1.5 theme-text-muted hover:theme-text transition-colors rounded"
            title={theme === 'dark' ? t('header.theme.dark') : t('header.theme.light')}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 theme-text-muted hover:theme-text transition-colors rounded relative"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {keyStatusColor && (
              <span
                className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${keyStatusColor}`}
              />
            )}
          </button>

          <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border)' }} />

          {canvas && (
            <button
              onClick={() => {
                clear()
                setOriginalSource('')
              }}
              className="px-2.5 py-1 text-xs theme-text-muted hover:theme-text transition-colors"
            >
              {t('header.close')}
            </button>
          )}
          <button
            onClick={() => {
              loadCanvas({ nodes: [], edges: [] }, 'Untitled')
              setOriginalSource('')
            }}
            className="px-3 py-1 text-xs theme-text-secondary rounded transition-colors theme-bg-hover"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            {t('header.new')}
          </button>
          <button
            onClick={() => {
              loadCanvas(EXAMPLE_CANVAS, 'Transformer Architecture (example)')
              setOriginalSource('')
            }}
            className="px-3 py-1 text-xs theme-text-secondary rounded transition-colors theme-bg-hover"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            {t('header.example')}
          </button>
        </div>
      </header>

      {canvas ? (
        <CanvasViewer
          ref={canvasRef}
          canvas={canvas}
          onExport={handleExport}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          onDirty={markDirty}
          apiKey={apiKey}
          originalSource={originalSource}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md space-y-4 px-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-medium theme-text mb-1">{t('welcome.title')}</h2>
              <p className="text-sm theme-text-faint">{t('welcome.subtitle')}</p>
            </div>

            <button
              onClick={handleDecomposeClick}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-white rounded-lg transition-colors"
              style={{ backgroundColor: '#a882ff' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {state === 'unlocked'
                ? t('welcome.button.decompose.unlocked')
                : state === 'locked'
                ? t('welcome.button.decompose.locked')
                : t('welcome.button.decompose.nokey')}
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              <span className="text-[10px] theme-text-faint uppercase tracking-wide">{t('welcome.divider')}</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            <FileUpload onFile={loadFromFile} onPickFile={openFileWithHandle} />

            <div className="text-center">
              <JsonPaste onLoad={loadFromJson} />
            </div>

            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm text-red-400 border"
                style={{
                  backgroundColor: 'rgb(239 68 68 / 0.1)',
                  borderColor: 'rgb(239 68 68 / 0.3)',
                }}
              >
                {error}
              </div>
            )}

            <div className="text-center pt-2 space-x-4">
              <button
                onClick={() => loadCanvas({ nodes: [], edges: [] }, 'Untitled')}
                className="text-xs theme-text-secondary hover:theme-text transition-colors"
              >
                {t('welcome.blank')}
              </button>
              <span className="theme-text-faint">·</span>
              <button
                onClick={() =>
                  loadCanvas(EXAMPLE_CANVAS, 'Transformer Architecture (example)')
                }
                className="text-xs transition-colors"
                style={{ color: '#a882ff' }}
              >
                {t('welcome.example')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showWelcome && !showSetup && (
        <WelcomeModal onSave={handleWelcomeSave} onSkip={dismissWelcome} />
      )}

      {showUnlock && (
        <UnlockModal
          onUnlock={handleUnlock}
          onRemove={() => {
            clearKey()
            setShowUnlock(false)
          }}
          onSkip={() => setShowUnlock(false)}
        />
      )}

      {showSetup && (
        <WelcomeModal
          onSave={handleSetupSave}
          onSkip={() => setShowSetup(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          state={state}
          maskedKey={maskedKey}
          onClearKey={clearKey}
          onLock={lock}
          onChangePassword={changePassword}
          onStartSetup={() => {
            setShowSettings(false)
            if (state === 'locked') {
              setShowUnlock(true)
            } else {
              setShowSetup(true)
            }
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showDecompose && isUnlocked && apiKey && (
        <DecomposeDialog
          apiKey={apiKey}
          onStreamingStart={handleStreamingStart}
          onClose={() => setShowDecompose(false)}
        />
      )}
    </div>
  )
}
