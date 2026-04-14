import { useEffect, useRef } from 'react'
import { CANVAS_COLORS } from '@/lib/color-map'
import { useT } from '@/lib/i18n'

export interface ContextMenuState {
  x: number
  y: number
  type: 'node' | 'edge' | 'pane'
  nodeId?: string
  nodeType?: string
  edgeId?: string
}

interface ContextMenuProps {
  menu: ContextMenuState
  onClose: () => void
  onAction: (action: string, payload?: Record<string, string>) => void
  canExpand?: boolean
}

export function ContextMenu({ menu, onClose, onAction, canExpand }: ContextMenuProps) {
  const { t } = useT()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 border rounded-lg py-1 shadow-xl min-w-[200px]"
      style={{ left: menu.x, top: menu.y, backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
    >
      {menu.type === 'node' && (
        <>
          {menu.nodeType === 'textNode' && (
            <MenuItem label={t('ctx.edit')} shortcut={t('ctx.edit.shortcut')} onClick={() => onAction('edit')} />
          )}
          {canExpand && menu.nodeType === 'textNode' && (
            <MenuItem label={t('ctx.expand')} onClick={() => onAction('expand')} accent />
          )}
          <MenuItem label={t('ctx.duplicate')} shortcut="Ctrl+D" onClick={() => onAction('duplicate')} />
          <MenuItem label={t('ctx.copy')} shortcut="Ctrl+C" onClick={() => onAction('copy')} />
          <Divider />
          <div className="px-3 py-1.5">
            <div className="text-[10px] theme-text-muted mb-1.5 uppercase tracking-wide">{t('ctx.color')}</div>
            <div className="flex gap-1.5">
              {Object.entries(CANVAS_COLORS).map(([code, hex]) => (
                <button
                  key={code}
                  onClick={() => onAction('color', { color: code })}
                  className="w-5 h-5 rounded-full hover:scale-125 transition-transform"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
          <Divider />
          <MenuItem label={t('ctx.delete')} shortcut="Del" onClick={() => onAction('delete')} danger />
        </>
      )}

      {menu.type === 'edge' && (
        <MenuItem label={t('ctx.delete.edge')} shortcut="Del" onClick={() => onAction('deleteEdge')} danger />
      )}

      {menu.type === 'pane' && (
        <>
          <MenuItem label={t('ctx.add.text')} onClick={() => onAction('addText')} />
          <Divider />
          <MenuItem label={t('ctx.paste')} shortcut="Ctrl+V" onClick={() => onAction('paste')} />
          <Divider />
          <MenuItem label={t('ctx.fitview')} onClick={() => onAction('fitView')} />
        </>
      )}
    </div>
  )
}

function MenuItem({
  label, shortcut, onClick, danger, accent,
}: {
  label: string; shortcut?: string; onClick: () => void; danger?: boolean; accent?: boolean
}) {
  const color = danger ? 'text-red-400 hover:text-red-300' : accent ? '' : 'theme-text-secondary'
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors theme-bg-hover ${color}`}
      style={accent ? { color: '#a882ff' } : undefined}
    >
      <span>{label}</span>
      {shortcut && <span className="theme-text-faint ml-4">{shortcut}</span>}
    </button>
  )
}

function Divider() {
  return <div className="border-t my-1" style={{ borderColor: 'var(--border-subtle)' }} />
}
