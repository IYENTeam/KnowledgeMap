import { useT } from '@/lib/i18n'

interface ShortcutsHelpProps {
  onClose: () => void
}

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  const { t } = useT()

  const shortcuts = [
    {
      section: t('shortcuts.section.general'),
      items: [
        { keys: 'Ctrl + Z', action: t('shortcuts.undo') },
        { keys: 'Ctrl + Shift + Z', action: t('shortcuts.redo') },
        { keys: 'Ctrl + C', action: t('shortcuts.copy') },
        { keys: 'Ctrl + V', action: t('shortcuts.paste') },
        { keys: 'Ctrl + D', action: t('shortcuts.duplicate') },
        { keys: 'Ctrl + S', action: t('shortcuts.export') },
        { keys: 'Delete / Backspace', action: t('shortcuts.delete') },
        { keys: '?', action: t('shortcuts.toggle') },
      ],
    },
    {
      section: t('shortcuts.section.canvas'),
      items: [
        { keys: t('shortcuts.dblclick.empty'), action: t('shortcuts.dblclick.empty.action') },
        { keys: t('shortcuts.dblclick.node'), action: t('shortcuts.dblclick.node.action') },
        { keys: t('shortcuts.rightclick'), action: t('shortcuts.rightclick.action') },
        { keys: t('shortcuts.edge.click'), action: t('shortcuts.edge.click.action') },
        { keys: t('shortcuts.edge.create'), action: t('shortcuts.edge.create.action') },
        { keys: t('shortcuts.scroll'), action: t('shortcuts.scroll.action') },
        { keys: 'Esc', action: t('shortcuts.esc') },
      ],
    },
    {
      section: t('shortcuts.section.markdown'),
      items: [
        { keys: 'Ctrl + B', action: t('shortcuts.bold') },
        { keys: 'Ctrl + I', action: t('shortcuts.italic') },
        { keys: 'Ctrl + `', action: t('shortcuts.inlinecode') },
        { keys: 'Esc', action: t('shortcuts.finish') },
      ],
    },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'var(--overlay-bg)' }} onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 border rounded-xl p-6 w-[480px] max-h-[80vh] overflow-auto shadow-2xl"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold theme-text">{t('shortcuts.title')}</h2>
          <button onClick={onClose} className="theme-text-muted hover:theme-text transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {shortcuts.map((section) => (
            <div key={section.section}>
              <h3 className="text-xs font-medium theme-text-muted uppercase tracking-wide mb-2">
                {section.section}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <div key={item.keys} className="flex items-center justify-between py-1">
                    <span className="text-xs theme-text-secondary">{item.action}</span>
                    <kbd
                      className="text-[10px] border rounded px-1.5 py-0.5 font-mono theme-text-secondary"
                      style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                    >
                      {item.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
