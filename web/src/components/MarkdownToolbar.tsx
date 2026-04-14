interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onUpdate: (newText: string) => void
}

type FormatAction = {
  label: string
  icon: string
  shortcut?: string
  action: (text: string, start: number, end: number) => { text: string; cursor: [number, number] }
}

const formatActions: FormatAction[] = [
  {
    label: 'Heading',
    icon: 'H',
    action: (text, start, _end) => {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1
      const lineEnd = text.indexOf('\n', start)
      const line = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd)

      if (line.startsWith('### ')) {
        // cycle: ### → remove
        const newText = text.substring(0, lineStart) + line.slice(4) + text.substring(lineEnd === -1 ? text.length : lineEnd)
        return { text: newText, cursor: [start - 4, start - 4] }
      } else if (line.startsWith('## ')) {
        // cycle: ## → ###
        const newText = text.substring(0, lineStart) + '#' + text.substring(lineStart)
        return { text: newText, cursor: [start + 1, start + 1] }
      } else if (line.startsWith('# ')) {
        // cycle: # → ##
        const newText = text.substring(0, lineStart) + '#' + text.substring(lineStart)
        return { text: newText, cursor: [start + 1, start + 1] }
      } else {
        const newText = text.substring(0, lineStart) + '## ' + text.substring(lineStart)
        return { text: newText, cursor: [start + 3, start + 3] }
      }
    },
  },
  {
    label: 'Bold',
    icon: 'B',
    shortcut: 'Ctrl+B',
    action: (text, start, end) => wrapSelection(text, start, end, '**', '**'),
  },
  {
    label: 'Italic',
    icon: 'I',
    shortcut: 'Ctrl+I',
    action: (text, start, end) => wrapSelection(text, start, end, '*', '*'),
  },
  {
    label: 'Code',
    icon: '`',
    shortcut: 'Ctrl+`',
    action: (text, start, end) => wrapSelection(text, start, end, '`', '`'),
  },
  {
    label: 'List',
    icon: 'UL',
    action: (text, start, _end) => {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1
      const prefix = '- '
      const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart)
      return { text: newText, cursor: [start + prefix.length, start + prefix.length] }
    },
  },
  {
    label: 'Code Block',
    icon: '```',
    action: (text, start, end) => {
      const selected = text.substring(start, end)
      const replacement = '```\n' + (selected || 'code') + '\n```'
      const newText = text.substring(0, start) + replacement + text.substring(end)
      const cursorPos = start + 4
      return { text: newText, cursor: [cursorPos, cursorPos + (selected.length || 4)] }
    },
  },
]

function wrapSelection(
  text: string,
  start: number,
  end: number,
  before: string,
  after: string,
): { text: string; cursor: [number, number] } {
  const selected = text.substring(start, end)

  // If already wrapped, unwrap
  if (
    text.substring(start - before.length, start) === before &&
    text.substring(end, end + after.length) === after
  ) {
    const newText = text.substring(0, start - before.length) + selected + text.substring(end + after.length)
    return { text: newText, cursor: [start - before.length, end - before.length] }
  }

  const replacement = before + (selected || 'text') + after
  const newText = text.substring(0, start) + replacement + text.substring(end)
  if (selected) {
    return { text: newText, cursor: [start + before.length, end + before.length] }
  }
  return { text: newText, cursor: [start + before.length, start + before.length + 4] }
}

export function MarkdownToolbar({ textareaRef, onUpdate }: MarkdownToolbarProps) {
  const handleAction = (action: FormatAction) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const result = action.action(textarea.value, start, end)

    onUpdate(result.text)

    // Restore cursor position after React re-renders
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(result.cursor[0], result.cursor[1])
    })
  }

  return (
    <div
      className="flex items-center gap-0.5 border rounded-md px-1 py-0.5"
      style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
    >
      {formatActions.map((action) => (
        <button
          key={action.label}
          onClick={() => handleAction(action)}
          title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
          className={`px-1.5 py-0.5 text-[11px] font-mono theme-text-muted hover:theme-text theme-bg-hover rounded transition-colors ${
            action.label === 'Bold' ? 'font-bold' : ''
          } ${action.label === 'Italic' ? 'italic' : ''}`}
        >
          {action.icon}
        </button>
      ))}
    </div>
  )
}

// Handle keyboard shortcuts inside textarea
export function handleMarkdownShortcut(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  onUpdate: (text: string) => void,
): boolean {
  if (!e.ctrlKey && !e.metaKey) return false

  const textarea = e.currentTarget
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = textarea.value

  let result: { text: string; cursor: [number, number] } | null = null

  if (e.key === 'b') {
    result = wrapSelection(text, start, end, '**', '**')
  } else if (e.key === 'i') {
    result = wrapSelection(text, start, end, '*', '*')
  } else if (e.key === '`') {
    result = wrapSelection(text, start, end, '`', '`')
  }

  if (result) {
    e.preventDefault()
    onUpdate(result.text)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(result!.cursor[0], result!.cursor[1])
    })
    return true
  }

  return false
}
