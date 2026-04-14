import { useState, useEffect } from 'react'
import type { Edge } from '@xyflow/react'
import { CANVAS_COLORS } from '@/lib/color-map'
import { useT } from '@/lib/i18n'

interface EdgeEditorProps {
  edge: Edge
  onUpdate: (edgeId: string, data: { label?: string; color?: string }) => void
  onDelete: (edgeId: string) => void
  onClose: () => void
}

export function EdgeEditor({ edge, onUpdate, onDelete, onClose }: EdgeEditorProps) {
  const { t } = useT()
  const currentLabel = (edge.data as { label?: string } | undefined)?.label ?? (edge.label as string) ?? ''
  const currentColor = (edge.data as { color?: string } | undefined)?.color

  const [label, setLabel] = useState(currentLabel)

  useEffect(() => {
    setLabel(currentLabel)
  }, [currentLabel, edge.id])

  return (
    <div
      className="w-72 border-l flex flex-col shrink-0"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm font-medium theme-text">{t('edge.title')}</span>
        <button onClick={onClose} className="theme-text-muted hover:theme-text transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div>
          <label className="text-xs theme-text-muted mb-1.5 block">{t('edge.label')}</label>
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value)
              onUpdate(edge.id, { label: e.target.value })
            }}
            placeholder={t('edge.label.placeholder')}
            className="w-full rounded px-3 py-1.5 text-sm focus:outline-none border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div>
          <label className="text-xs theme-text-muted mb-2 block">{t('edge.color')}</label>
          <div className="flex gap-1.5">
            {Object.entries(CANVAS_COLORS).map(([code, hex]) => (
              <button
                key={code}
                onClick={() => onUpdate(edge.id, { color: code })}
                className="w-5 h-5 rounded-full transition-transform hover:scale-125"
                style={{
                  backgroundColor: hex,
                  outline: currentColor === code ? '2px solid var(--text-primary)' : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
            <button
              onClick={() => onUpdate(edge.id, { color: undefined })}
              className="w-5 h-5 rounded-full transition-transform hover:scale-125 border-2"
              style={{
                borderColor: 'var(--border)',
                outline: !currentColor ? '2px solid var(--text-primary)' : 'none',
                outlineOffset: '2px',
              }}
            />
          </div>
        </div>

        <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
          <MetaRow label={t('edge.from')} value={edge.source} />
          {edge.sourceHandle && <MetaRow label={t('edge.handle')} value={edge.sourceHandle} />}
          <MetaRow label={t('edge.to')} value={edge.target} />
          {edge.targetHandle && <MetaRow label={t('edge.handle')} value={edge.targetHandle} />}
        </div>

        <button
          onClick={() => onDelete(edge.id)}
          className="w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 rounded border transition-colors"
          style={{ borderColor: 'rgb(239 68 68 / 0.3)' }}
        >
          {t('edge.delete')}
        </button>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="theme-text-muted">{label}</span>
      <span className="theme-text-secondary font-mono truncate ml-2">{value}</span>
    </div>
  )
}
