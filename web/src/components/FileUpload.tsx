import { useCallback, useState, type DragEvent } from 'react'
import { useT } from '@/lib/i18n'
import { supportsFileSystemAccess } from '@/hooks/useCanvasData'

interface FileUploadProps {
  onFile: (file: File) => void
  /** Optional: if provided and FS API available, use it for "save back to file" capability */
  onPickFile?: () => void | Promise<void>
}

export function FileUpload({ onFile, onPickFile }: FileUploadProps) {
  const { t } = useT()
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  const handleClick = useCallback(() => {
    if (onPickFile && supportsFileSystemAccess) {
      // Use FS API so Save can write back
      void onPickFile()
    } else {
      document.getElementById('canvas-file-input')?.click()
    }
  }, [onPickFile])

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer"
      style={{
        borderColor: isDragging ? '#a882ff' : 'var(--border)',
        backgroundColor: isDragging ? 'rgba(168, 130, 255, 0.1)' : 'transparent',
      }}
      onClick={handleClick}
    >
      <svg className="w-8 h-8 mx-auto mb-2 theme-text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="text-sm theme-text-secondary">{t('upload.drop')}</p>
      <p className="text-xs theme-text-faint mt-1">{t('upload.browse')}</p>
      <input
        id="canvas-file-input"
        type="file"
        accept=".canvas,.json"
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  )
}
