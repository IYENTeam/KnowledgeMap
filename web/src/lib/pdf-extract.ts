/**
 * Browser-side PDF text extraction using pdfjs-dist.
 */

import * as pdfjs from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'

// Set worker source (bundled via Vite ?url import)
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

export interface PdfExtractResult {
  text: string
  pageCount: number
  charCount: number
  title?: string
}

export interface PdfProgress {
  page: number
  total: number
}

export async function extractPdfText(
  file: File,
  onProgress?: (p: PdfProgress) => void,
): Promise<PdfExtractResult> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise

  // Grab title from metadata if available
  let title: string | undefined
  try {
    const meta = await pdf.getMetadata()
    const info = meta.info as { Title?: string } | undefined
    title = info?.Title?.trim() || undefined
  } catch {
    // ignore
  }

  const pageTexts: string[] = []
  const total = pdf.numPages

  for (let i = 1; i <= total; i++) {
    onProgress?.({ page: i, total })
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Reconstruct text with rough layout awareness
    const items = content.items as TextItem[]
    let pageText = ''
    let lastY: number | null = null

    for (const item of items) {
      if (!('str' in item)) continue
      const y = item.transform?.[5]
      if (lastY !== null && typeof y === 'number' && Math.abs(lastY - y) > 3) {
        pageText += '\n'
      }
      pageText += item.str
      if (item.hasEOL) pageText += '\n'
      if (typeof y === 'number') lastY = y
    }

    pageTexts.push(pageText.trim())
  }

  const fullText = pageTexts.join('\n\n')
  return {
    text: fullText,
    pageCount: total,
    charCount: fullText.length,
    title,
  }
}

/**
 * Claude has a large but finite context. For very large PDFs, truncate.
 * Conservative estimate: 1 token ≈ 4 chars. Sonnet 200K context.
 * We want to leave room for system prompt + output. Use ~150K chars max.
 */
const MAX_SOURCE_CHARS = 150_000

export function maybeTruncate(text: string): { text: string; truncated: boolean; originalLength: number } {
  if (text.length <= MAX_SOURCE_CHARS) {
    return { text, truncated: false, originalLength: text.length }
  }
  // Keep head + tail (intro + conclusion are most important)
  const head = text.slice(0, MAX_SOURCE_CHARS * 0.7)
  const tail = text.slice(-MAX_SOURCE_CHARS * 0.25)
  return {
    text: head + '\n\n[... middle sections truncated ...]\n\n' + tail,
    truncated: true,
    originalLength: text.length,
  }
}
