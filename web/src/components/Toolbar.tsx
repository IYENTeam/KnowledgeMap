import { useState } from 'react'
import { CANVAS_COLORS } from '@/lib/color-map'
import { useT } from '@/lib/i18n'

interface ToolbarProps {
  onAddNode: (color: string) => void
  onSave?: () => void
  onSaveAs?: () => void
  onDeepen?: () => void
  deepening?: boolean
  onExportJson?: () => void
  onExportHtml?: () => void
}

const COLOR_OPTIONS = Object.entries(CANVAS_COLORS).map(([code, hex]) => ({ code, hex }))

export function Toolbar({
  onAddNode,
  onSave,
  onSaveAs,
  onDeepen,
  deepening,
  onExportJson,
  onExportHtml,
}: ToolbarProps) {
  const { t, locale } = useT()
  const [showColors, setShowColors] = useState(false)
  const [showExport, setShowExport] = useState(false)

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg px-2 py-1.5 backdrop-blur-sm z-10 border flex-wrap"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="relative">
        <button
          onClick={() => setShowColors((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs theme-text-secondary theme-bg-hover rounded transition-colors"
          title={t('toolbar.add')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('toolbar.add')}
        </button>

        {showColors && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShowColors(false)} />
            <div
              className="absolute top-full mt-2 left-0 rounded-lg p-2 flex gap-1.5 z-30 border"
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
            >
              {COLOR_OPTIONS.map(({ code, hex }) => (
                <button
                  key={code}
                  onClick={() => {
                    onAddNode(code)
                    setShowColors(false)
                  }}
                  className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white/50 transition-colors"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {onDeepen && (
        <>
          <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border)' }} />
          <button
            onClick={onDeepen}
            disabled={deepening}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'rgba(168, 130, 255, 0.15)',
              color: '#a882ff',
            }}
            title={locale === 'ko' ? '바깥쪽 노드 전부를 한 층 더 쉽게 풀어쓰기' : 'Unwrap all leaf nodes one level simpler'}
          >
            {deepening ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19V6m0 13l-4-4m4 4l4-4M4 6h16" />
              </svg>
            )}
            {locale === 'ko' ? '한 층 더 쉽게' : 'Simplify all'}
          </button>
        </>
      )}

      {onSave && (
        <>
          <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border)' }} />
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs theme-text-secondary theme-bg-hover rounded transition-colors"
            title={locale === 'ko' ? '저장하기 (Ctrl+S)' : 'Save (Ctrl+S)'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {locale === 'ko' ? '저장' : 'Save'}
          </button>
        </>
      )}

      <span className="text-[10px] theme-text-faint px-1">{t('toolbar.add.hint')}</span>

      {(onExportJson || onExportHtml || onSaveAs) && (
        <>
          <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border)' }} />
          <div className="relative">
            <button
              onClick={() => setShowExport((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs theme-text-secondary theme-bg-hover rounded transition-colors"
              title={t('toolbar.export')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t('toolbar.export')}
            </button>

            {showExport && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowExport(false)} />
                <div
                  className="absolute top-full mt-2 right-0 rounded-lg py-1 z-30 border min-w-[240px]"
                  style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                >
                  {onSaveAs && (
                    <button
                      onClick={() => {
                        onSaveAs()
                        setShowExport(false)
                      }}
                      className="w-full text-left px-3 py-2 text-xs theme-text-secondary theme-bg-hover transition-colors"
                    >
                      <div className="font-medium">
                        {locale === 'ko' ? '다른 이름으로 저장' : 'Save As...'}
                      </div>
                      <div className="text-[10px] theme-text-faint mt-0.5">
                        {locale === 'ko' ? '새 파일로 복사 (Ctrl+Shift+S)' : 'Save to a new file (Ctrl+Shift+S)'}
                      </div>
                    </button>
                  )}
                  {onExportJson && (
                    <button
                      onClick={() => {
                        onExportJson()
                        setShowExport(false)
                      }}
                      className="w-full text-left px-3 py-2 text-xs theme-text-secondary theme-bg-hover transition-colors"
                    >
                      <div className="font-medium">{t('toolbar.export.json.title')}</div>
                      <div className="text-[10px] theme-text-faint mt-0.5">{t('toolbar.export.json.desc')}</div>
                    </button>
                  )}
                  {onExportHtml && (
                    <button
                      onClick={() => {
                        onExportHtml()
                        setShowExport(false)
                      }}
                      className="w-full text-left px-3 py-2 text-xs theme-text-secondary theme-bg-hover transition-colors"
                    >
                      <div className="font-medium">{t('toolbar.export.html.title')}</div>
                      <div className="text-[10px] theme-text-faint mt-0.5">{t('toolbar.export.html.desc')}</div>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
