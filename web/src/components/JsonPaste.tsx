import { useState, useCallback } from 'react'
import { useT } from '@/lib/i18n'

interface JsonPasteProps {
  onLoad: (json: string) => void
}

export function JsonPaste({ onLoad }: JsonPasteProps) {
  const { t } = useT()
  const [text, setText] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleLoad = useCallback(() => {
    if (text.trim()) {
      onLoad(text)
      setText('')
      setIsOpen(false)
    }
  }, [text, onLoad])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs theme-text-muted hover:theme-text transition-colors"
      >
        {t('jsonpaste.trigger')}
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{"nodes": [...], "edges": [...]}'
        className="w-full h-32 border rounded-lg p-3 text-xs font-mono resize-none focus:outline-none"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
      />
      <div className="flex gap-2">
        <button
          onClick={handleLoad}
          disabled={!text.trim()}
          className="px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs font-medium transition-colors text-white"
          style={{ backgroundColor: '#a882ff' }}
        >
          {t('jsonpaste.load')}
        </button>
        <button
          onClick={() => {
            setIsOpen(false)
            setText('')
          }}
          className="px-3 py-1.5 theme-text-muted hover:theme-text text-xs transition-colors"
        >
          {t('jsonpaste.cancel')}
        </button>
      </div>
    </div>
  )
}
