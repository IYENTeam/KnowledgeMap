import { useState, useEffect, useRef } from 'react'
import type { Node } from '@xyflow/react'
import Markdown from 'react-markdown'
import { colorToHex, colorToBg, colorToBorder, CANVAS_COLORS } from '@/lib/color-map'
import { MarkdownToolbar, handleMarkdownShortcut } from './MarkdownToolbar'
import { useT } from '@/lib/i18n'
import type {
  TextNodeData,
  FileNodeData,
  LinkNodeData,
  GroupNodeData,
} from '@/lib/canvas-to-reactflow'

interface SidebarProps {
  node: Node
  editingNodeId: string | null
  onClose: () => void
  onStartEdit: () => void
  onTextChange: (nodeId: string, text: string) => void
  onFinishEdit: () => void
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void
  onDeleteNode: (nodeId: string) => void
}

export function Sidebar({
  node,
  editingNodeId,
  onClose,
  onStartEdit,
  onTextChange,
  onFinishEdit,
  onNodeUpdate,
  onDeleteNode,
}: SidebarProps) {
  const { t } = useT()
  const color = (node.data as { color?: string }).color
  const isEditing = editingNodeId === node.id

  return (
    <div
      className="w-80 border-l flex flex-col shrink-0"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: colorToBorder(color) }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorToHex(color) }} />
          <span className="text-sm font-medium capitalize theme-text">
            {node.type?.replace('Node', '')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {node.type === 'textNode' && !isEditing && (
            <button
              onClick={onStartEdit}
              className="theme-text-muted hover:theme-text transition-colors p-1"
              title={t('sidebar.edit')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onDeleteNode(node.id)}
            className="theme-text-muted hover:text-red-400 transition-colors p-1"
            title={t('sidebar.delete')}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="theme-text-muted hover:theme-text transition-colors p-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <NodeDetail
          node={node}
          isEditing={isEditing}
          onTextChange={onTextChange}
          onFinishEdit={onFinishEdit}
          onNodeUpdate={onNodeUpdate}
        />

        <div>
          <div className="text-xs theme-text-muted mb-2">{t('sidebar.color')}</div>
          <div className="flex gap-1.5">
            {Object.entries(CANVAS_COLORS).map(([code, hex]) => (
              <button
                key={code}
                onClick={() => onNodeUpdate(node.id, { color: code })}
                className="w-5 h-5 rounded-full transition-transform hover:scale-125"
                style={{
                  backgroundColor: hex,
                  outline: color === code ? '2px solid var(--text-primary)' : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
        </div>

        <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
          <MetaRow label={t('sidebar.id')} value={node.id} />
          <MetaRow
            label={t('sidebar.position')}
            value={`(${Math.round(node.position.x)}, ${Math.round(node.position.y)})`}
          />
          {node.style?.width && (
            <MetaRow label={t('sidebar.size')} value={`${node.style.width} x ${node.style.height}`} />
          )}
        </div>
      </div>
    </div>
  )
}

function NodeDetail({
  node,
  isEditing,
  onTextChange,
  onFinishEdit,
  onNodeUpdate,
}: {
  node: Node
  isEditing: boolean
  onTextChange: (nodeId: string, text: string) => void
  onFinishEdit: () => void
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void
}) {
  switch (node.type) {
    case 'textNode': {
      const data = node.data as TextNodeData
      if (isEditing) {
        return (
          <TextEditor
            nodeId={node.id}
            text={data.text}
            color={data.color}
            onChange={onTextChange}
            onFinish={onFinishEdit}
          />
        )
      }
      return (
        <div
          className="rounded-lg p-3 cursor-pointer theme-text"
          style={{ backgroundColor: colorToBg(data.color) }}
        >
          <div className="node-markdown">
            <Markdown>{data.text}</Markdown>
          </div>
        </div>
      )
    }
    case 'fileNode': {
      const data = node.data as FileNodeData
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium theme-text">{data.file.split('/').pop()}</div>
          <div className="text-xs theme-text-muted break-all">{data.file}</div>
        </div>
      )
    }
    case 'linkNode': {
      const data = node.data as LinkNodeData
      return <LinkEditor nodeId={node.id} url={data.url} onUpdate={onNodeUpdate} />
    }
    case 'groupNode': {
      const data = node.data as GroupNodeData
      return (
        <div className="text-sm theme-text-secondary">Group: {data.label ?? '(unnamed)'}</div>
      )
    }
    default:
      return <div className="text-sm theme-text-muted">Unknown node type</div>
  }
}

function TextEditor({
  nodeId,
  text,
  color,
  onChange,
  onFinish,
}: {
  nodeId: string
  text: string
  color?: string
  onChange: (nodeId: string, text: string) => void
  onFinish: () => void
}) {
  const { t } = useT()
  const [value, setValue] = useState(text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setValue(text)
  }, [text])

  useEffect(() => {
    textareaRef.current?.focus()
    const len = textareaRef.current?.value.length ?? 0
    textareaRef.current?.setSelectionRange(len, len)
  }, [])

  const handleChange = (newVal: string) => {
    setValue(newVal)
    onChange(nodeId, newVal)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <MarkdownToolbar textareaRef={textareaRef} onUpdate={handleChange} />
        <button
          onClick={onFinish}
          className="px-3 py-1 text-xs rounded transition-colors text-white"
          style={{ backgroundColor: '#a882ff' }}
        >
          {t('sidebar.editor.done')}
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onFinish()
            return
          }
          handleMarkdownShortcut(e, handleChange)
        }}
        className="w-full h-48 border rounded-lg p-3 text-sm font-mono resize-y focus:outline-none"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderColor: colorToBorder(color),
          color: 'var(--text-primary)',
        }}
        placeholder="Markdown content..."
      />
      <div className="rounded-lg p-3" style={{ backgroundColor: colorToBg(color) }}>
        <div className="text-[10px] theme-text-muted mb-1 uppercase tracking-wide">Preview</div>
        <div className="node-markdown text-sm theme-text">
          <Markdown>{value}</Markdown>
        </div>
      </div>
    </div>
  )
}

function LinkEditor({
  nodeId,
  url,
  onUpdate,
}: {
  nodeId: string
  url: string
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
}) {
  const { t } = useT()
  const [value, setValue] = useState(url)

  return (
    <div className="space-y-2">
      <input
        type="url"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          onUpdate(nodeId, { url: e.target.value })
        }}
        className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
        placeholder="https://..."
      />
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-400 hover:text-blue-300 underline"
      >
        {t('sidebar.link.open')}
      </a>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="theme-text-muted">{label}</span>
      <span className="theme-text-secondary font-mono">{value}</span>
    </div>
  )
}
