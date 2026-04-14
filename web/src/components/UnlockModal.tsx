import { useState } from 'react'
import { useT } from '@/lib/i18n'

interface UnlockModalProps {
  onUnlock: (password: string) => Promise<void>
  onRemove: () => void
  onSkip: () => void
}

export function UnlockModal({ onUnlock, onRemove, onSkip }: UnlockModalProps) {
  const { t } = useT()
  const [password, setPassword] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUnlock = async () => {
    if (!password) return
    setError(null)
    setWorking(true)
    try {
      await onUnlock(password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unlock failed')
      setWorking(false)
      setPassword('')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'var(--overlay-bg)' }} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 border rounded-2xl p-6 w-[440px] shadow-2xl"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(168, 130, 255, 0.15)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="#a882ff" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold theme-text">{t('unlock.title')}</h2>
            <p className="text-xs theme-text-muted">{t('unlock.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && password && !working) handleUnlock()
            }}
            autoFocus
            placeholder={t('unlock.placeholder')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: error ? 'rgb(239 68 68)' : 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleUnlock}
            disabled={!password || working}
            className="flex-1 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#a882ff' }}
          >
            {working ? t('unlock.working') : t('unlock.button')}
          </button>
          <button
            onClick={onSkip}
            className="px-3 py-2 text-sm theme-text-muted hover:theme-text transition-colors"
          >
            {t('unlock.skip')}
          </button>
        </div>

        <div className="mt-3 pt-3 border-t text-center" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => {
              if (confirm(t('unlock.forgot.confirm'))) {
                onRemove()
              }
            }}
            className="text-[11px] theme-text-faint hover:theme-text-muted transition-colors"
          >
            {t('unlock.forgot')}
          </button>
        </div>
      </div>
    </>
  )
}
