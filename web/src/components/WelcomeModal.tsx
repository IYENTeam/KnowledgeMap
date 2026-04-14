import { useState } from 'react'
import { isValidKey } from '@/hooks/useApiKey'
import { validateApiKey } from '@/lib/claude-api'
import { useT } from '@/lib/i18n'

interface WelcomeModalProps {
  onSave: (key: string, password: string) => Promise<void>
  onSkip: () => void
}

export function WelcomeModal({ onSave, onSkip }: WelcomeModalProps) {
  const { t } = useT()
  const [step, setStep] = useState<'intro' | 'connect'>('intro')
  const [key, setKey] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    if (!isValidKey(key)) {
      setError(t('connect.error.format'))
      return
    }
    if (password.length < 4) {
      setError(t('connect.error.short'))
      return
    }
    if (password !== passwordConfirm) {
      setError(t('connect.error.mismatch'))
      return
    }

    setWorking(true)
    try {
      const valid = await validateApiKey(key.trim())
      if (!valid) {
        setError(t('connect.error.rejected'))
        setWorking(false)
        return
      }
      await onSave(key.trim(), password)
    } catch (e) {
      setError(`${e instanceof Error ? e.message : String(e)}`)
      setWorking(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'var(--overlay-bg)' }}
      />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 border rounded-2xl p-8 w-[520px] max-h-[90vh] overflow-auto shadow-2xl"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        {step === 'intro' ? (
          <IntroStep onContinue={() => setStep('connect')} onSkip={onSkip} />
        ) : (
          <ConnectStep
            keyValue={key}
            onKeyChange={setKey}
            password={password}
            onPasswordChange={setPassword}
            passwordConfirm={passwordConfirm}
            onPasswordConfirmChange={setPasswordConfirm}
            onSave={handleSave}
            onBack={() => setStep('intro')}
            working={working}
            error={error}
          />
        )}
      </div>
    </>
  )
}

function IntroStep({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const { t } = useT()
  return (
    <>
      <div className="text-center mb-6">
        <div
          className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(168, 130, 255, 0.15)' }}
        >
          <svg className="w-7 h-7" fill="none" stroke="#a882ff" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold theme-text mb-2">{t('welcome.modal.title')}</h1>
        <p className="text-sm theme-text-secondary">{t('welcome.modal.subtitle')}</p>
      </div>

      <div className="space-y-3 mb-6">
        <FeatureRow icon="✨" title={t('welcome.modal.feature1.title')} desc={t('welcome.modal.feature1.desc')} />
        <FeatureRow icon="🎨" title={t('welcome.modal.feature2.title')} desc={t('welcome.modal.feature2.desc')} />
        <FeatureRow icon="🔐" title={t('welcome.modal.feature3.title')} desc={t('welcome.modal.feature3.desc')} />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onContinue}
          className="flex-1 py-2.5 text-sm font-medium text-white rounded-lg transition-colors"
          style={{ backgroundColor: '#a882ff' }}
        >
          {t('welcome.modal.connect')}
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-2.5 text-sm theme-text-secondary hover:theme-text transition-colors"
        >
          {t('welcome.modal.skip')}
        </button>
      </div>
      <p className="text-[11px] theme-text-faint text-center mt-3">{t('welcome.modal.foot')}</p>
    </>
  )
}

function ConnectStep({
  keyValue, onKeyChange, password, onPasswordChange,
  passwordConfirm, onPasswordConfirmChange,
  onSave, onBack, working, error,
}: {
  keyValue: string; onKeyChange: (v: string) => void
  password: string; onPasswordChange: (v: string) => void
  passwordConfirm: string; onPasswordConfirmChange: (v: string) => void
  onSave: () => void; onBack: () => void
  working: boolean; error: string | null
}) {
  const { t } = useT()
  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="theme-text-muted hover:theme-text transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base font-semibold theme-text">{t('connect.title')}</h2>
      </div>

      <div className="space-y-3 mb-4 text-xs theme-text-secondary">
        <InstructionStep
          n={1}
          text={
            <>
              {t('connect.step1')}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: '#a882ff' }}
              >
                {t('connect.step1.link')}
              </a>
            </>
          }
        />
        <InstructionStep n={2} text={t('connect.step2')} />
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs theme-text-muted mb-1 block">{t('connect.label.key')}</label>
          <input
            type="password"
            value={keyValue}
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div>
          <label className="text-xs theme-text-muted mb-1 block">
            {t('connect.label.password')} <span className="theme-text-faint">{t('connect.label.password.hint')}</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={t('connect.placeholder.password')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div>
          <label className="text-xs theme-text-muted mb-1 block">{t('connect.label.confirm')}</label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => onPasswordConfirmChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !working) onSave()
            }}
            placeholder={t('connect.placeholder.confirm')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: error ? 'rgb(239 68 68)' : 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {error && <div className="text-xs text-red-400">{error}</div>}
      </div>

      <div className="mt-4 p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <div className="flex items-start gap-2">
          <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#a882ff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div className="theme-text-secondary">{t('connect.info')}</div>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={onSave}
          disabled={!keyValue.trim() || !password || working}
          className="flex-1 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#a882ff' }}
        >
          {working ? t('connect.saving') : t('connect.save')}
        </button>
      </div>
    </>
  )
}

function FeatureRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
      <div className="text-xl">{icon}</div>
      <div>
        <div className="text-sm font-medium theme-text">{title}</div>
        <div className="text-xs theme-text-muted mt-0.5">{desc}</div>
      </div>
    </div>
  )
}

function InstructionStep({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: '#a882ff' }}
      >
        {n}
      </div>
      <div className="text-sm theme-text-secondary leading-relaxed">{text}</div>
    </div>
  )
}
