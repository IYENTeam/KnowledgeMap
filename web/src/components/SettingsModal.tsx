import { useState } from 'react'
import type { KeyState } from '@/hooks/useApiKey'
import { useT } from '@/lib/i18n'

interface SettingsModalProps {
  state: KeyState
  maskedKey: string | null
  onClearKey: () => void
  onLock: () => void
  onChangePassword: (oldPw: string, newPw: string) => Promise<void>
  onStartSetup: () => void
  onClose: () => void
}

export function SettingsModal({
  state, maskedKey, onClearKey, onLock, onChangePassword, onStartSetup, onClose,
}: SettingsModalProps) {
  const { t } = useT()
  const [changingPw, setChangingPw] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPwConfirm, setNewPwConfirm] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwWorking, setPwWorking] = useState(false)

  const handleChangePw = async () => {
    setPwError(null)
    if (newPw.length < 4) {
      setPwError(t('settings.pw.error.short'))
      return
    }
    if (newPw !== newPwConfirm) {
      setPwError(t('settings.pw.error.mismatch'))
      return
    }
    setPwWorking(true)
    try {
      await onChangePassword(oldPw, newPw)
      setChangingPw(false)
      setOldPw('')
      setNewPw('')
      setNewPwConfirm('')
    } catch (e) {
      setPwError(e instanceof Error ? e.message : String(e))
    } finally {
      setPwWorking(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'var(--overlay-bg)' }} onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 border rounded-xl p-6 w-[460px] shadow-2xl"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold theme-text">{t('settings.title')}</h2>
          <button onClick={onClose} className="theme-text-muted hover:theme-text transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium theme-text">{t('settings.label.key')}</label>
            <StatusBadge state={state} />
          </div>

          {state === 'no-key' && (
            <div className="space-y-2">
              <div className="text-xs theme-text-muted">{t('settings.nokey.desc')}</div>
              <button
                onClick={onStartSetup}
                className="w-full py-2 text-xs font-medium text-white rounded transition-colors"
                style={{ backgroundColor: '#a882ff' }}
              >
                {t('settings.nokey.button')}
              </button>
            </div>
          )}

          {state === 'locked' && (
            <div className="space-y-2">
              <div className="text-xs theme-text-muted">{t('settings.locked.desc')}</div>
              <div className="flex gap-2">
                <button
                  onClick={onStartSetup}
                  className="flex-1 py-2 text-xs font-medium text-white rounded transition-colors"
                  style={{ backgroundColor: '#a882ff' }}
                >
                  {t('settings.locked.unlock')}
                </button>
                <button
                  onClick={() => {
                    if (confirm(t('settings.remove.confirm'))) onClearKey()
                  }}
                  className="px-3 py-2 text-xs text-red-400 hover:text-red-300 rounded transition-colors"
                >
                  {t('settings.locked.remove')}
                </button>
              </div>
            </div>
          )}

          {state === 'unlocked' && !changingPw && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 text-xs font-mono px-3 py-2 rounded"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  {maskedKey}
                </code>
                <button
                  onClick={onLock}
                  className="px-3 py-2 text-xs theme-text-secondary theme-bg-hover rounded transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  {t('settings.unlocked.lock')}
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setChangingPw(true)}
                  className="text-xs theme-text-muted hover:theme-text transition-colors"
                >
                  {t('settings.unlocked.changepw')}
                </button>
                <span className="theme-text-faint">·</span>
                <button
                  onClick={onStartSetup}
                  className="text-xs theme-text-muted hover:theme-text transition-colors"
                >
                  {t('settings.unlocked.replace')}
                </button>
                <span className="theme-text-faint">·</span>
                <button
                  onClick={() => {
                    if (confirm(t('settings.remove.confirm'))) onClearKey()
                  }}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  {t('settings.unlocked.remove')}
                </button>
              </div>
            </div>
          )}

          {changingPw && (
            <div className="space-y-2 mt-2">
              <input
                type="password"
                placeholder={t('settings.pw.current')}
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <input
                type="password"
                placeholder={t('settings.pw.new')}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <input
                type="password"
                placeholder={t('settings.pw.confirm')}
                value={newPwConfirm}
                onChange={(e) => setNewPwConfirm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !pwWorking) handleChangePw()
                }}
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: pwError ? 'rgb(239 68 68)' : 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              {pwError && <div className="text-xs text-red-400">{pwError}</div>}
              <div className="flex gap-2">
                <button
                  onClick={handleChangePw}
                  disabled={!oldPw || !newPw || pwWorking}
                  className="px-3 py-1.5 text-xs font-medium text-white rounded disabled:opacity-40"
                  style={{ backgroundColor: '#a882ff' }}
                >
                  {pwWorking ? t('settings.pw.saving') : t('settings.pw.save')}
                </button>
                <button
                  onClick={() => {
                    setChangingPw(false)
                    setOldPw('')
                    setNewPw('')
                    setNewPwConfirm('')
                    setPwError(null)
                  }}
                  className="px-3 py-1.5 text-xs theme-text-muted hover:theme-text transition-colors"
                >
                  {t('settings.pw.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 rounded text-[11px] theme-text-muted" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <strong className="theme-text-secondary">{t('settings.howstored.title')}</strong>{' '}
          {t('settings.howstored.desc')}
        </div>
      </div>
    </>
  )
}

function StatusBadge({ state }: { state: KeyState }) {
  const { t } = useT()
  if (state === 'unlocked') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <span className="text-xs text-green-500">{t('settings.status.unlocked')}</span>
      </div>
    )
  }
  if (state === 'locked') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        <span className="text-xs text-amber-500">{t('settings.status.locked')}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
      <span className="text-xs theme-text-muted">{t('settings.status.nokey')}</span>
    </div>
  )
}
