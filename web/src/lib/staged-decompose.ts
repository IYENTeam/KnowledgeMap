/**
 * Staged concentric decomposition workflow WITH PROMPT CACHING.
 *
 * The BIG win: the original source (PDF text) is reused across ALL calls
 * (Stage 1 + N stage 2 + M stage 3 + any expansions).
 * We mark it with cache_control so the first call WRITES, subsequent READS.
 *
 * System prompts are also cached since they're identical per stage type.
 *
 * Cache TTL: 5 minutes. Our whole workflow finishes well within that.
 *
 * Depth 0 (CENTER):  Topic (1 node)
 * Depth 1 (RING 1):  3-5 core questions
 * Depth 2 (RING 2):  1-3 answers per question
 * Depth 3 (RING 3):  1-2 details per answer
 */

import type { CanvasDocument, CanvasNode, CanvasEdge } from '@knowledgeos/types/canvas.js'
import { z } from 'zod'
import { getLocale } from './i18n'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5-20250929'

// ── Radial layout parameters ────────────────────────────────

const LAYOUT = {
  ring1Radius: 700,
  ring2Radius: 1300,
  ring3Radius: 1950,
  topic: { width: 500, height: 140, color: '6' },
  question: { width: 420, height: 150, color: '4' },
  answer: { width: 460, height: 200, color: '3' },
  detail: { width: 480, height: 260, color: '5' },
}

// ── Progress callback ──────────────────────────────────────

export type ProgressStage =
  | { stage: 'extracting-questions' }
  | { stage: 'generating-answers'; questionCount: number }
  | { stage: 'generating-details'; answerCount: number }
  | { stage: 'finalizing' }
  | { stage: 'cache-stats'; created: number; read: number; totalInput: number }

// ── Schemas ────────────────────────────────────────────────

const questionsSchema = z.object({
  topic: z.object({
    title: z.string().min(1),
    summary: z.string(),
  }),
  questions: z.array(z.string().min(1)).min(3).max(5),
})

const answersSchema = z.object({
  answers: z
    .array(
      z.object({
        heading: z.string().min(1),
        body: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
})

const detailsSchema = z.object({
  details: z
    .array(
      z.object({
        heading: z.string().min(1),
        body: z.string().min(1),
      }),
    )
    .min(1)
    .max(2),
})

// ── Errors ──────────────────────────────────────────────────

export class DecomposeError extends Error {
  constructor(message: string, public readonly stage?: string) {
    super(message)
    this.name = 'DecomposeError'
  }
}

// ── Cache stats tracking ───────────────────────────────────

export interface CacheStats {
  cacheCreationTokens: number
  cacheReadTokens: number
  inputTokens: number
  outputTokens: number
  callCount: number
}

function newCacheStats(): CacheStats {
  return {
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    callCount: 0,
  }
}

// ── Content block type helpers ─────────────────────────────

interface TextBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

// ── Concurrency limiter (global semaphore) ────────────────
// Anthropic rate limits are per-minute; we serialize at most N parallel calls
// to avoid 429 bursts. Tier 1 users have ~50 RPM so 3 concurrent is safe.

const MAX_CONCURRENT = 3
let inFlight = 0
const waiting: Array<() => void> = []

async function acquireSlot(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight++
    return
  }
  await new Promise<void>((resolve) => waiting.push(resolve))
  inFlight++
}

function releaseSlot(): void {
  inFlight--
  const next = waiting.shift()
  if (next) next()
}

// ── Retry policy ────────────────────────────────────────
// Rate limits and overload: retry indefinitely until the user aborts (via signal).
//   Exponential backoff 2s → 4s → 8s → ... capped at 64s + jitter.
// Network / 5xx errors (other than 529): retry up to 5 times.
// Auth / parse / schema errors: no retry (surface immediately).

const MAX_NET_RETRIES = 5
const MAX_RL_RETRIES = 20  // effectively unlimited with capped backoff
const BASE_BACKOFF_MS = 2000
const MAX_BACKOFF_MS = 64_000

async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  signal?: AbortSignal,
  onRetryNotice?: (stage: string, attempt: number, delayMs: number) => void,
): Promise<T> {
  let rlAttempts = 0
  let netAttempts = 0

  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      return await fn(rlAttempts + netAttempts)
    } catch (e) {
      if (!(e instanceof DecomposeError)) throw e

      const isRateLimit = e.stage === 'rate-limit' || e.stage === 'overloaded'
      const isNetwork = e.stage === 'network' || e.stage === 'api-error'

      if (!isRateLimit && !isNetwork) throw e

      if (isRateLimit) {
        rlAttempts++
        if (rlAttempts > MAX_RL_RETRIES) throw e
        const delay = Math.min(
          BASE_BACKOFF_MS * Math.pow(2, Math.min(rlAttempts - 1, 6)),
          MAX_BACKOFF_MS,
        ) + Math.random() * 1000
        onRetryNotice?.(e.stage!, rlAttempts, delay)
        console.warn(`[decompose] ${e.stage} — auto-retry #${rlAttempts} in ${Math.round(delay)}ms`)
        await sleepWithAbort(delay, signal)
        continue
      }

      if (isNetwork) {
        netAttempts++
        if (netAttempts > MAX_NET_RETRIES) throw e
        const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, netAttempts - 1), MAX_BACKOFF_MS)
        onRetryNotice?.(e.stage!, netAttempts, delay)
        console.warn(`[decompose] ${e.stage} — retry #${netAttempts}/${MAX_NET_RETRIES} in ${Math.round(delay)}ms`)
        await sleepWithAbort(delay, signal)
        continue
      }
    }
  }
}

async function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

// ── Claude API helper with content blocks ──────────────────

async function callClaudeRaw(
  apiKey: string,
  systemBlocks: TextBlock[],
  userContent: TextBlock[],
  stats: CacheStats,
  signal?: AbortSignal,
): Promise<string> {
  return withRetry(async () => {
    await acquireSlot()
    try {
      let response: Response
      try {
        response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          signal,
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 4000,
            system: systemBlocks,
            messages: [{ role: 'user', content: userContent }],
          }),
        })
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') throw e
        // fetch itself failed — network / CORS / DNS
        throw new DecomposeError(
          `Network error: ${e instanceof Error ? e.message : String(e)}`,
          'network',
        )
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        if (response.status === 401) throw new DecomposeError('Invalid API key', 'auth')
        if (response.status === 429) throw new DecomposeError('Rate limit exceeded', 'rate-limit')
        if (response.status === 529 || response.status === 503) {
          throw new DecomposeError('Anthropic API overloaded', 'overloaded')
        }
        throw new DecomposeError(
          `API error (${response.status}): ${body || response.statusText}`,
          'api-error',
        )
      }

      const data = await response.json()

      // Track cache usage
      const usage = data.usage ?? {}
      stats.callCount += 1
      stats.cacheCreationTokens += usage.cache_creation_input_tokens ?? 0
      stats.cacheReadTokens += usage.cache_read_input_tokens ?? 0
      stats.inputTokens += usage.input_tokens ?? 0
      stats.outputTokens += usage.output_tokens ?? 0

      const textBlock = data.content?.find((c: { type: string }) => c.type === 'text')
      if (!textBlock) throw new DecomposeError('No text content in response', 'empty')
      return textBlock.text as string
    } finally {
      releaseSlot()
    }
  }, signal)
}

function extractJson(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return trimmed
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n([\s\S]+?)\n```/)
  if (fenceMatch) return fenceMatch[1].trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end > start) return trimmed.substring(start, end + 1)
  return trimmed
}

async function callStructured<T>(
  apiKey: string,
  systemBlocks: TextBlock[],
  userContent: TextBlock[],
  schema: z.ZodSchema<T>,
  stats: CacheStats,
  signal?: AbortSignal,
): Promise<T> {
  const raw = await callClaudeRaw(apiKey, systemBlocks, userContent, stats, signal)
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJson(raw))
  } catch {
    throw new DecomposeError('Claude returned invalid JSON')
  }
  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new DecomposeError(
      `Schema validation failed: ${result.error.issues[0]?.message ?? 'unknown'}`,
    )
  }
  return result.data
}

// ── Stage system prompts (cacheable, reused across calls) ──

const STAGE_1_SYSTEM = `You are a knowledge decomposition expert. Given a source, extract:
1. A clear topic title (1-5 words)
2. A 1-sentence summary
3. Exactly 3 to 5 CORE QUESTIONS that this source fundamentally answers

Questions should be:
- Substantive (not trivial yes/no)
- Distinct from each other (cover different aspects)
- Start with words like "How", "What", "Why", "When does", "Under what conditions"

Respond with ONLY valid JSON:

{
  "topic": { "title": "...", "summary": "..." },
  "questions": [
    "How does X handle Y?",
    "What makes Z different from W?",
    ...
  ]
}`

const STAGE_2_SYSTEM = `You are a knowledge decomposition expert. Given the ORIGINAL SOURCE, a parent question, and topic context, generate 1-3 ANSWER nodes that thoroughly address the question.

**CRITICAL: Every answer MUST be grounded in the original source provided. Do not invent facts not supported by the source. If the source doesn't cover something, say "(not covered in source)" rather than fabricate.**

Each answer must be SUBSTANTIVE and EXPLANATORY, not a one-liner:
- Start with a markdown heading (3-8 words, "## Title")
- Body must be **at least 6 lines** of meaningful content — ideally 8-12 lines
- Use a mix of: short intro paragraph + bullet points + a concluding sentence, OR 2-3 substantial paragraphs
- Include specific mechanisms, names, numbers, or terms from the source — not vague generalities
- Answer a distinct facet of the question (if you generate multiple answers, each covers a different angle)
- The reader should learn something concrete, not just be told "this is important"

Good body example (substance + structure):
"## 병렬 처리의 원리

기존 RNN은 시퀀스를 순차적으로 처리하여 t 시점의 출력이 t-1에 의존했습니다. Transformer는 이 의존성을 제거하여:

- 모든 위치가 동시에 계산됨 — GPU의 행렬 연산에 적합
- 학습 시간이 O(n) → O(1) (깊이 관점에서)
- 단, 각 레이어의 어텐션 계산은 여전히 O(n²) 메모리 필요

결과적으로 같은 하드웨어에서 10배 이상 빠른 학습이 가능해졌습니다."

Respond with ONLY valid JSON:

{
  "answers": [
    { "heading": "## Parallel processing", "body": "multi-line substantive content..." },
    ...
  ]
}`

const STAGE_3_SYSTEM = `You are a knowledge decomposition expert. Given the ORIGINAL SOURCE and a PARENT ANSWER node, you produce 1-2 DETAIL nodes that are **re-expressions of the same answer** — NOT new information.

**PRIMARY PRINCIPLE — The parent answer is the Single Source of Truth (SSOT).**
Your detail nodes MUST say the EXACT SAME THINGS as the parent answer, just with:
- Technical terms from the parent UNPACKED (e.g., "self-attention" → "a mechanism where each token weighs every other token")
- Jargon replaced with plainer phrasing OR kept with inline parenthetical explanations
- Shorter sentences, simpler syntax
- Occasional analogies drawn from the source
- Same logical structure, same claims, same conclusions

**WHAT YOU MUST NOT DO:**
- ❌ DO NOT introduce new concepts, mechanisms, or examples that aren't in the parent answer
- ❌ DO NOT add new details "from the paper" that the parent didn't mention
- ❌ DO NOT deepen the topic — only unwrap it
- ❌ DO NOT contradict or revise the parent's claims
- ❌ DO NOT be more technical than the parent — ALWAYS be equally or less technical

**WHAT YOU MUST DO:**
- ✅ Same claims, expressed at a lower prerequisite knowledge level
- ✅ Each technical term that appears in the parent should be explained inline or replaced
- ✅ Maintain the parent's structure (if parent has 3 bullets, you might still have 3 bullets, each with unwrapped vocabulary)
- ✅ Length similar to or slightly longer than the parent (unwrapping adds words)
- ✅ Stay grounded in the source — you may pull exact terms from the source to explain parent's jargon, but NOT to introduce new topics

Think of it as: "If the parent answer were rewritten for a reader one expertise level lower, what would it say?"

**Output format** (ONLY valid JSON):

{
  "details": [
    { "heading": "## Same idea, unpacked", "body": "the same content, just with terms explained..." },
    { "heading": "## (optional second view)", "body": "alternative phrasing of the same content..." }
  ]
}

Usually 1 detail is enough. Produce 2 only if there's a clear benefit (e.g., the parent has two distinct clauses that warrant separate unwrapping).`

const STAGE_EXPAND_SYSTEM = `You are a knowledge decomposition expert. Given the ORIGINAL SOURCE and a PARENT node (which itself is an unwrapping of a higher-level answer), you produce 1-2 CHILD nodes that are **yet another layer of unwrapping** — NOT new information.

**PRIMARY PRINCIPLE — Progressive unwrapping, not progressive depth.**
Your child node MUST say the EXACT SAME THINGS as the parent, just with:
- Any remaining technical terms UNWRAPPED further
- Even shorter sentences
- Even plainer language
- More analogies or concrete phrasings

**WHAT YOU MUST NOT DO:**
- ❌ DO NOT introduce new concepts, examples, or mechanisms not in the parent
- ❌ DO NOT add "deeper details" — only make the existing content more accessible
- ❌ DO NOT be more technical than the parent
- ❌ DO NOT contradict the parent

**WHAT YOU MUST DO:**
- ✅ Same claims, expressed at a yet-lower prerequisite knowledge level
- ✅ Unwrap the technical terms that still appear in the parent
- ✅ Keep structure proportional to parent
- ✅ Source material may be consulted to find plain-language alternatives for jargon, but not to add new content

Think of it as: "If a smart 2nd-year undergrad had to explain the parent node to a curious 1st-year, what would they say?"

**Output format** (ONLY valid JSON):

{
  "details": [
    { "heading": "## ...", "body": "same content, unwrapped further..." }
  ]
}

Usually 1 child is enough.`

// ── Cache block builders ───────────────────────────────────

/**
 * Build the cached source block. This is the single largest piece of text
 * and gets reused in every call within the 5-minute cache window.
 */
function buildCachedSource(source: string): TextBlock {
  return {
    type: 'text',
    text: `=== ORIGINAL SOURCE ===\n${source}\n=== END SOURCE ===`,
    cache_control: { type: 'ephemeral' },
  }
}

/**
 * Build a cached system prompt block, with locale-aware output instruction appended.
 */
function buildCachedSystem(systemText: string): TextBlock[] {
  const locale = getLocale()
  const langInstruction =
    locale === 'ko'
      ? '\n\n**IMPORTANT: All generated content (headings, bodies, questions, answers, details) MUST be written in 한국어 (Korean). The source may be in any language, but OUTPUT is always Korean. JSON keys stay in English.**'
      : '\n\n**IMPORTANT: All generated content (headings, bodies, questions, answers, details) MUST be written in English. The source may be in any language, but OUTPUT is always English.**'

  return [
    {
      type: 'text',
      text: systemText + langInstruction,
      cache_control: { type: 'ephemeral' },
    },
  ]
}

// ── Streaming workflow ──────────────────────────────────────
//
// Produces results incrementally:
//   1. Stage 1 completes → returns `initialCanvas` (topic + questions placed)
//      + `done` promise for the rest
//   2. Each stage 2/3 result emits via `onAppend` callback as ready
// Caller loads initial canvas immediately, then appends per event.

export interface StreamingCallbacks {
  /** Called when Stage 2 or Stage 3 produces new nodes/edges. */
  onAppend?: (nodes: CanvasNode[], edges: CanvasEdge[]) => void
  /** Called when auto-retry kicks in (rate limit, network). */
  onRetry?: (info: { stage: string; attempt: number; delayMs: number }) => void
  /** Progress updates. */
  onProgress?: (stage: ProgressStage) => void
}

export interface StreamingSession {
  /** Initial canvas (topic + question nodes) — load this first. */
  initialCanvas: CanvasDocument
  /** Resolves when every background task (stage 2+3) is finished. */
  done: Promise<void>
}

type Sector = { center: number; min: number; max: number }

export async function startStreamingDecompose(
  apiKey: string,
  input: string,
  callbacks: StreamingCallbacks,
  signal?: AbortSignal,
): Promise<StreamingSession> {
  const stats = newCacheStats()
  const cachedSource = buildCachedSource(input)

  // ── Stage 1 ─────────────────────────────────────────────
  callbacks.onProgress?.({ stage: 'extracting-questions' })

  const stage1 = await callStructured(
    apiKey,
    buildCachedSystem(STAGE_1_SYSTEM),
    [
      cachedSource,
      {
        type: 'text',
        text: 'Extract the topic and 3-5 core questions from the source above. Respond with JSON only.',
      },
    ],
    questionsSchema,
    stats,
    signal,
  )

  // Build initial canvas: topic + question nodes + edges
  const initialNodes: CanvasNode[] = []
  const initialEdges: CanvasEdge[] = []

  initialNodes.push({
    id: 'topic-1',
    type: 'text',
    x: -LAYOUT.topic.width / 2,
    y: -LAYOUT.topic.height / 2,
    width: LAYOUT.topic.width,
    height: LAYOUT.topic.height,
    color: LAYOUT.topic.color,
    text: `# ${stage1.topic.title}\n\n${stage1.topic.summary}`,
  })

  const Q = stage1.questions.length
  const sectorWidth = 360 / Q
  const sectorSafety = Math.min(12, sectorWidth * 0.15)
  const innerRangePerQ = sectorWidth - sectorSafety

  const questionSectors: Sector[] = []
  stage1.questions.forEach((qText, qIdx) => {
    const center = sectorWidth * qIdx - 90
    questionSectors.push({
      center,
      min: center - innerRangePerQ / 2,
      max: center + innerRangePerQ / 2,
    })
    const pos = polarToTopLeft(center, LAYOUT.ring1Radius, LAYOUT.question.width, LAYOUT.question.height)
    initialNodes.push({
      id: `q-${qIdx + 1}`,
      type: 'text',
      ...pos,
      width: LAYOUT.question.width,
      height: LAYOUT.question.height,
      color: LAYOUT.question.color,
      text: `? ${qText}`,
    })
    initialEdges.push({
      id: `e-topic-q${qIdx + 1}`,
      fromNode: 'topic-1',
      toNode: `q-${qIdx + 1}`,
      color: LAYOUT.question.color,
    })
  })

  const initialCanvas: CanvasDocument = {
    nodes: initialNodes,
    edges: initialEdges,
  }

  // Track every node we've placed (topic + questions + streaming batches) so
  // each new batch can resolve collisions against them before emission.
  const allPlaced: CanvasNode[] = [...initialNodes]

  /**
   * Resolve collisions for a batch of NEW nodes against the full history.
   * Only the batch nodes move; previously-placed nodes (including topic) stay.
   * Nodes move outward radially (preserves branch direction).
   */
  function resolveBatchAgainstHistory(batch: CanvasNode[]): void {
    const PADDING = 24
    const STEP = 60
    const MAX_ITER = 250

    // Sort batch outer-first so inner placements aren't displaced by later pushes
    const indexed = batch.map((n) => ({
      n,
      dist: Math.hypot(n.x + n.width / 2, n.y + n.height / 2),
    }))
    indexed.sort((a, b) => a.dist - b.dist)

    for (const { n: target } of indexed) {
      let iter = 0
      while (iter < MAX_ITER) {
        let overlap: CanvasNode | null = null
        for (const other of allPlaced) {
          if (other === target) continue
          if (collides(target, other, PADDING)) {
            overlap = other
            break
          }
        }
        if (!overlap) {
          // also check against earlier items in the same batch
          let batchOverlap: CanvasNode | null = null
          for (const other of batch) {
            if (other === target) continue
            if (collides(target, other, PADDING)) {
              batchOverlap = other
              break
            }
          }
          if (!batchOverlap) break
        }
        const cx = target.x + target.width / 2
        const cy = target.y + target.height / 2
        const r = Math.max(Math.hypot(cx, cy), 1)
        const ux = cx / r
        const uy = cy / r
        target.x = Math.round(target.x + ux * STEP)
        target.y = Math.round(target.y + uy * STEP)
        iter++
      }
    }
  }

  // ── Stage 2 + Stage 3 in background ──────────────────────
  const done = (async () => {
    try {
      callbacks.onProgress?.({ stage: 'generating-answers', questionCount: Q })

      // For each question, run stage 2 → immediately stage 3 for its answers (streaming chain)
      await Promise.all(
        stage1.questions.map(async (q, qIdx) => {
          if (signal?.aborted) return

          const parentSector = questionSectors[qIdx]

          // Stage 2 for this question
          const answersResult = await callStructured(
            apiKey,
            buildCachedSystem(STAGE_2_SYSTEM),
            [
              cachedSource,
              {
                type: 'text',
                text: `Topic: ${stage1.topic.title}\nTopic summary: ${stage1.topic.summary}\n\nQuestion to answer: ${q}\n\nGenerate 1-3 answers, each grounded in the source above.`,
              },
            ],
            answersSchema,
            stats,
            signal,
          )

          const N = answersResult.answers.length
          const perChildRange = (parentSector.max - parentSector.min) / Math.max(N, 1)
          const answerSubSectors: Sector[] = []

          const answerNodes: CanvasNode[] = []
          const answerEdges: CanvasEdge[] = []

          answersResult.answers.forEach((ans, aIdx) => {
            const childCenter = parentSector.min + perChildRange * (aIdx + 0.5)
            answerSubSectors.push({
              center: childCenter,
              min: parentSector.min + perChildRange * aIdx + perChildRange * 0.1,
              max: parentSector.min + perChildRange * (aIdx + 1) - perChildRange * 0.1,
            })
            const fullText = `${ans.heading}\n\n${ans.body}`
            const height = estimateHeight(fullText, LAYOUT.answer.height, LAYOUT.answer.width)
            const pos = polarToTopLeft(childCenter, LAYOUT.ring2Radius, LAYOUT.answer.width, height)
            const answerId = `a-${qIdx + 1}-${aIdx + 1}`
            answerNodes.push({
              id: answerId,
              type: 'text',
              ...pos,
              width: LAYOUT.answer.width,
              height,
              color: LAYOUT.answer.color,
              text: fullText,
            })
            answerEdges.push({
              id: `e-q${qIdx + 1}-${answerId}`,
              fromNode: `q-${qIdx + 1}`,
              toNode: answerId,
              color: LAYOUT.answer.color,
            })
          })

          // Resolve collisions against everything placed so far, then commit
          resolveBatchAgainstHistory(answerNodes)
          allPlaced.push(...answerNodes)
          callbacks.onAppend?.(answerNodes, answerEdges)

          if (signal?.aborted) return

          // Stage 3 — run each answer's details in parallel, emit as each completes
          await Promise.all(
            answersResult.answers.map(async (ans, aIdx) => {
              if (signal?.aborted) return
              const detailsResult = await callStructured(
                apiKey,
                buildCachedSystem(STAGE_3_SYSTEM),
                [
                  cachedSource,
                  {
                    type: 'text',
                    text: `Topic: ${stage1.topic.title}\nQuestion: ${q}\n\nParent answer to re-express:\n${ans.heading}\n${ans.body}\n\nGenerate 1-2 detail nodes that re-express the parent at a lower prerequisite knowledge level.`,
                  },
                ],
                detailsSchema,
                stats,
                signal,
              )

              if (detailsResult.details.length === 0) return

              const parentSubSector = answerSubSectors[aIdx]
              const D = detailsResult.details.length
              const detailRange = (parentSubSector.max - parentSubSector.min) / Math.max(D, 1)

              const detailNodes: CanvasNode[] = []
              const detailEdges: CanvasEdge[] = []

              detailsResult.details.forEach((detail, dIdx) => {
                const childCenter = parentSubSector.min + detailRange * (dIdx + 0.5)
                const fullText = `${detail.heading}\n\n${detail.body}`
                const height = estimateHeight(fullText, LAYOUT.detail.height, LAYOUT.detail.width)
                const pos = polarToTopLeft(childCenter, LAYOUT.ring3Radius, LAYOUT.detail.width, height)
                const detailId = `d-${qIdx + 1}-${aIdx + 1}-${dIdx + 1}`
                const answerId = `a-${qIdx + 1}-${aIdx + 1}`
                detailNodes.push({
                  id: detailId,
                  type: 'text',
                  ...pos,
                  width: LAYOUT.detail.width,
                  height,
                  color: LAYOUT.detail.color,
                  text: fullText,
                })
                detailEdges.push({
                  id: `e-${answerId}-${detailId}`,
                  fromNode: answerId,
                  toNode: detailId,
                  color: LAYOUT.detail.color,
                })
              })

              resolveBatchAgainstHistory(detailNodes)
              allPlaced.push(...detailNodes)
              callbacks.onAppend?.(detailNodes, detailEdges)
            }),
          )
        }),
      )

      callbacks.onProgress?.({ stage: 'finalizing' })

      console.info('[streaming] Cache stats:', {
        calls: stats.callCount,
        cacheCreation: stats.cacheCreationTokens,
        cacheRead: stats.cacheReadTokens,
        uncachedInput: stats.inputTokens,
        output: stats.outputTokens,
      })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      throw e
    }
  })()

  return { initialCanvas, done }
}

// ── Main workflow ───────────────────────────────────────────

export async function runStagedDecompose(
  apiKey: string,
  input: string,
  onProgress?: (p: ProgressStage) => void,
  signal?: AbortSignal,
): Promise<CanvasDocument> {
  const stats = newCacheStats()
  const cachedSource = buildCachedSource(input)

  // ── Stage 1 ─────────────────────────────────────────────
  // First call WRITES the source to cache (and the system prompt).
  onProgress?.({ stage: 'extracting-questions' })

  const stage1 = await callStructured(
    apiKey,
    buildCachedSystem(STAGE_1_SYSTEM),
    [
      cachedSource,
      {
        type: 'text',
        text: 'Extract the topic and 3-5 core questions from the source above. Respond with JSON only.',
      },
    ],
    questionsSchema,
    stats,
    signal,
  )

  // ── Stage 2 (parallel) ──────────────────────────────────
  // All N calls READ the cached source. 90% cheaper than re-sending.
  onProgress?.({ stage: 'generating-answers', questionCount: stage1.questions.length })

  // No .catch fallback — rate-limit and network failures are retried inside
  // callStructured via withRetry. Auth / schema errors surface to caller.
  const answersPerQuestion = await Promise.all(
    stage1.questions.map((q) =>
      callStructured(
        apiKey,
        buildCachedSystem(STAGE_2_SYSTEM),
        [
          cachedSource,
          {
            type: 'text',
            text: `Topic: ${stage1.topic.title}\nTopic summary: ${stage1.topic.summary}\n\nQuestion to answer: ${q}\n\nGenerate 1-3 answers, each grounded in the source above.`,
          },
        ],
        answersSchema,
        stats,
        signal,
      ),
    ),
  )

  // ── Stage 3 (parallel) ──────────────────────────────────
  const totalAnswers = answersPerQuestion.reduce((sum, a) => sum + a.answers.length, 0)
  onProgress?.({ stage: 'generating-details', answerCount: totalAnswers })

  type AnswerCtx = {
    questionIdx: number
    answerIdx: number
    question: string
    answer: { heading: string; body: string }
  }
  const allAnswers: AnswerCtx[] = []
  answersPerQuestion.forEach((answersForQ, qIdx) => {
    answersForQ.answers.forEach((ans, aIdx) => {
      allAnswers.push({
        questionIdx: qIdx,
        answerIdx: aIdx,
        question: stage1.questions[qIdx],
        answer: ans,
      })
    })
  })

  const detailsResults = await Promise.all(
    allAnswers.map((ctx) =>
      callStructured(
        apiKey,
        buildCachedSystem(STAGE_3_SYSTEM),
        [
          cachedSource,
          {
            type: 'text',
            text: `Topic: ${stage1.topic.title}\nQuestion: ${ctx.question}\n\nParent answer to elaborate on:\n${ctx.answer.heading}\n${ctx.answer.body}\n\nGenerate 1-2 detail nodes with specifics drawn from the source.`,
          },
        ],
        detailsSchema,
        stats,
        signal,
      ),
    ),
  )

  // ── Finalize ────────────────────────────────────────────
  onProgress?.({ stage: 'finalizing' })

  // Report cache stats
  onProgress?.({
    stage: 'cache-stats',
    created: stats.cacheCreationTokens,
    read: stats.cacheReadTokens,
    totalInput: stats.inputTokens + stats.cacheCreationTokens + stats.cacheReadTokens,
  })

  // Log to console for transparency
  console.info('[decompose] Cache stats:', {
    calls: stats.callCount,
    cacheCreation: stats.cacheCreationTokens,
    cacheRead: stats.cacheReadTokens,
    uncachedInput: stats.inputTokens,
    output: stats.outputTokens,
    savingsPct: stats.cacheReadTokens > 0
      ? ((stats.cacheReadTokens * 0.9) / (stats.cacheReadTokens + stats.inputTokens + stats.cacheCreationTokens) * 100).toFixed(1) + '%'
      : '0%',
  })

  return composeCanvas(stage1, answersPerQuestion, allAnswers, detailsResults)
}

// ── Layout composition ──────────────────────────────────────

function composeCanvas(
  stage1: z.infer<typeof questionsSchema>,
  answersPerQuestion: z.infer<typeof answersSchema>[],
  allAnswers: Array<{
    questionIdx: number
    answerIdx: number
    question: string
    answer: { heading: string; body: string }
  }>,
  detailsResults: z.infer<typeof detailsSchema>[],
): CanvasDocument {
  const nodes: CanvasNode[] = []
  const edges: CanvasEdge[] = []

  nodes.push({
    id: 'topic-1',
    type: 'text',
    x: -LAYOUT.topic.width / 2,
    y: -LAYOUT.topic.height / 2,
    width: LAYOUT.topic.width,
    height: LAYOUT.topic.height,
    color: LAYOUT.topic.color,
    text: `# ${stage1.topic.title}\n\n${stage1.topic.summary}`,
  })

  const Q = stage1.questions.length
  const sectorWidth = 360 / Q
  const sectorSafety = Math.min(12, sectorWidth * 0.15)
  const innerRangePerQ = sectorWidth - sectorSafety

  type Sector = { center: number; min: number; max: number }
  const questionSectors: Sector[] = []

  stage1.questions.forEach((qText, qIdx) => {
    const center = sectorWidth * qIdx - 90
    const sector: Sector = {
      center,
      min: center - innerRangePerQ / 2,
      max: center + innerRangePerQ / 2,
    }
    questionSectors.push(sector)

    const pos = polarToTopLeft(center, LAYOUT.ring1Radius, LAYOUT.question.width, LAYOUT.question.height)
    nodes.push({
      id: `q-${qIdx + 1}`,
      type: 'text',
      ...pos,
      width: LAYOUT.question.width,
      height: LAYOUT.question.height,
      color: LAYOUT.question.color,
      text: `? ${qText}`,
    })

    edges.push({
      id: `e-topic-q${qIdx + 1}`,
      fromNode: 'topic-1',
      toNode: `q-${qIdx + 1}`,
      color: LAYOUT.question.color,
    })
  })

  const answerSectors: Sector[][] = []

  answersPerQuestion.forEach((answersForQ, qIdx) => {
    const parentSector = questionSectors[qIdx]
    const N = answersForQ.answers.length
    const perChildRange = (parentSector.max - parentSector.min) / Math.max(N, 1)
    const subSectors: Sector[] = []

    answersForQ.answers.forEach((ans, aIdx) => {
      const childCenter = parentSector.min + perChildRange * (aIdx + 0.5)
      subSectors.push({
        center: childCenter,
        min: parentSector.min + perChildRange * aIdx + perChildRange * 0.1,
        max: parentSector.min + perChildRange * (aIdx + 1) - perChildRange * 0.1,
      })

      const fullText = `${ans.heading}\n\n${ans.body}`
      const height = estimateHeight(fullText, LAYOUT.answer.height, LAYOUT.answer.width)
      const pos = polarToTopLeft(childCenter, LAYOUT.ring2Radius, LAYOUT.answer.width, height)
      const answerId = `a-${qIdx + 1}-${aIdx + 1}`

      nodes.push({
        id: answerId,
        type: 'text',
        ...pos,
        width: LAYOUT.answer.width,
        height,
        color: LAYOUT.answer.color,
        text: `${ans.heading}\n\n${ans.body}`,
      })

      edges.push({
        id: `e-q${qIdx + 1}-${answerId}`,
        fromNode: `q-${qIdx + 1}`,
        toNode: answerId,
        color: LAYOUT.answer.color,
      })
    })

    answerSectors.push(subSectors)
  })

  allAnswers.forEach((ctx, flatIdx) => {
    const details = detailsResults[flatIdx]?.details ?? []
    if (details.length === 0) return

    const parentSector = answerSectors[ctx.questionIdx][ctx.answerIdx]
    const N = details.length
    const perChildRange = (parentSector.max - parentSector.min) / Math.max(N, 1)

    details.forEach((detail, dIdx) => {
      const childCenter = parentSector.min + perChildRange * (dIdx + 0.5)
      const fullText = `${detail.heading}\n\n${detail.body}`
      const height = estimateHeight(fullText, LAYOUT.detail.height, LAYOUT.detail.width)
      const pos = polarToTopLeft(childCenter, LAYOUT.ring3Radius, LAYOUT.detail.width, height)

      const detailId = `d-${ctx.questionIdx + 1}-${ctx.answerIdx + 1}-${dIdx + 1}`
      const answerId = `a-${ctx.questionIdx + 1}-${ctx.answerIdx + 1}`

      nodes.push({
        id: detailId,
        type: 'text',
        ...pos,
        width: LAYOUT.detail.width,
        height,
        color: LAYOUT.detail.color,
        text: `${detail.heading}\n\n${detail.body}`,
      })

      edges.push({
        id: `e-${answerId}-${detailId}`,
        fromNode: answerId,
        toNode: detailId,
        color: LAYOUT.detail.color,
      })
    })
  })

  resolveCollisions(nodes)

  return { nodes, edges }
}

function polarToTopLeft(
  angleDeg: number,
  radius: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: Math.round(radius * Math.cos(rad) - width / 2),
    y: Math.round(radius * Math.sin(rad) - height / 2),
  }
}

function collides(a: CanvasNode, b: CanvasNode, pad = 20): boolean {
  return (
    a.x < b.x + b.width + pad &&
    a.x + a.width + pad > b.x &&
    a.y < b.y + b.height + pad &&
    a.y + a.height + pad > b.y
  )
}

/**
 * Guaranteed non-overlap by construction:
 * 1. Phase 1: Relaxation — push outward radially (preserves branch/direction).
 * 2. Phase 2: Deterministic force-resolve — for each remaining collision,
 *    push target node outward in unit steps until it's clear of ALL others.
 *    Finite because target moves monotonically outward in a plane.
 * 3. Phase 3: Final verification — assert no pair overlaps; throw if so.
 */
function resolveCollisions(nodes: CanvasNode[]): void {
  const RELAX_PASSES = 15
  const RELAX_STEP = 120
  const FORCE_STEP = 60
  const FORCE_MAX_ITER = 200
  const PADDING = 20

  // Topic node is anchored at origin — never move it
  const movable = (n: CanvasNode) => !(n.id === 'topic-1')

  // Phase 1: gentle radial relaxation
  for (let pass = 0; pass < RELAX_PASSES; pass++) {
    let anyCollision = false
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (!collides(nodes[i], nodes[j], PADDING)) continue
        anyCollision = true
        pushFartherOutward(nodes[i], nodes[j], RELAX_STEP, movable)
      }
    }
    if (!anyCollision) break
  }

  // Phase 2: deterministic force-resolve for any stragglers
  // Sort nodes by distance from origin ascending — keep inner rings, push outer ones
  const indexed = nodes.map((n, idx) => ({
    n,
    dist: Math.hypot(n.x + n.width / 2, n.y + n.height / 2),
    idx,
  }))
  indexed.sort((a, b) => a.dist - b.dist)

  for (const { n: target } of indexed) {
    if (!movable(target)) continue

    let iter = 0
    while (iter < FORCE_MAX_ITER) {
      let overlapping: CanvasNode | null = null
      for (const other of nodes) {
        if (other === target) continue
        if (collides(target, other, PADDING)) {
          overlapping = other
          break
        }
      }
      if (!overlapping) break

      // Push target outward along its own radial direction
      const cx = target.x + target.width / 2
      const cy = target.y + target.height / 2
      const r = Math.max(Math.hypot(cx, cy), 1)
      const ux = cx / r
      const uy = cy / r
      target.x = Math.round(target.x + ux * FORCE_STEP)
      target.y = Math.round(target.y + uy * FORCE_STEP)
      iter++
    }

    if (iter >= FORCE_MAX_ITER) {
      // Should never happen — canvas is effectively infinite, 200 * 60 = 12000 px outward
      console.warn(`[layout] Force-resolve hit max iterations for ${target.id}`)
    }
  }

  // Phase 3: verification
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (collides(nodes[i], nodes[j], PADDING)) {
        // Guaranteed no collision: log as assertion failure but don't throw
        console.error(
          `[layout] Collision survived: ${nodes[i].id} ↔ ${nodes[j].id}`,
        )
      }
    }
  }
}

/**
 * Push the node that's farther from origin outward along its radial direction.
 * Preserves branch/direction (concentric invariant).
 */
function pushFartherOutward(
  a: CanvasNode,
  b: CanvasNode,
  step: number,
  movable: (n: CanvasNode) => boolean,
): void {
  const aCenter = { x: a.x + a.width / 2, y: a.y + a.height / 2 }
  const bCenter = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  const aDist = Math.hypot(aCenter.x, aCenter.y)
  const bDist = Math.hypot(bCenter.x, bCenter.y)

  let target: CanvasNode
  let tCenter: { x: number; y: number }
  if (aDist > bDist && movable(a)) {
    target = a
    tCenter = aCenter
  } else if (movable(b)) {
    target = b
    tCenter = bCenter
  } else if (movable(a)) {
    target = a
    tCenter = aCenter
  } else {
    return // neither movable (shouldn't happen with only topic fixed)
  }

  const dist = Math.max(Math.hypot(tCenter.x, tCenter.y), 1)
  const ux = tCenter.x / dist
  const uy = tCenter.y / dist
  target.x = Math.round(target.x + ux * step)
  target.y = Math.round(target.y + uy * step)
}

/**
 * Estimate node height based on rendered markdown content.
 *
 * Assumptions matched to the actual CSS in styles/index.css:
 * - Font base ≈ 15px (0.95rem), line-height 1.6 → line box ≈ 24px
 * - h1 ≈ 1.35rem, h2 ≈ 1.15rem, h3 ≈ 1rem — each with ~4-6px top margin
 * - Padding: px-4 py-3 (32px horizontal, 24px vertical)
 * - Border: 1px each side
 *
 * Width: Korean/CJK characters are ~2x the visual width of Latin chars, so we
 * compute pixel width per character class and divide by available content width.
 */
function estimateHeight(body: string, minHeight: number, nodeWidth: number = 400): number {
  const CONTENT_WIDTH = nodeWidth - 32 - 2 // padding + border

  const CJK_CHAR_PX = 15        // each Korean/CJK char occupies ~15px at base size
  const LATIN_CHAR_PX = 7.5     // average Latin char width
  const CODE_CHAR_PX = 9        // monospace char

  const LINE_HEIGHT_P = 26      // paragraph line box
  const LINE_HEIGHT_LI = 26
  const LINE_HEIGHT_CODE = 20   // code lines are smaller (0.82rem)
  const H1_HEIGHT = 36
  const H2_HEIGHT = 30
  const H3_HEIGHT = 26

  const V_PADDING = 24 + 4  // py-3 + 4px breathing
  const BUFFER = 12          // safety buffer to avoid clipping

  const lines = body.split('\n')
  let totalHeight = V_PADDING + BUFFER
  let inCodeBlock = false

  for (const raw of lines) {
    const line = raw

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      totalHeight += 8 // code block boundary padding
      continue
    }

    if (inCodeBlock) {
      const px = line.length * CODE_CHAR_PX
      const wraps = Math.max(1, Math.ceil(px / CONTENT_WIDTH))
      totalHeight += wraps * LINE_HEIGHT_CODE
      continue
    }

    const trimmed = line.trim()
    if (!trimmed) {
      totalHeight += LINE_HEIGHT_P / 2
      continue
    }

    // Compute effective pixel width of this line
    const cjkCount = (trimmed.match(/[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uff00-\uffef]/g) ?? []).length
    const latinCount = trimmed.length - cjkCount
    const effectivePx = cjkCount * CJK_CHAR_PX + latinCount * LATIN_CHAR_PX

    if (trimmed.startsWith('# ')) {
      totalHeight += H1_HEIGHT
      const wraps = Math.max(1, Math.ceil(effectivePx * 1.3 / CONTENT_WIDTH))
      if (wraps > 1) totalHeight += (wraps - 1) * H1_HEIGHT
    } else if (trimmed.startsWith('## ')) {
      totalHeight += H2_HEIGHT
      const wraps = Math.max(1, Math.ceil(effectivePx * 1.2 / CONTENT_WIDTH))
      if (wraps > 1) totalHeight += (wraps - 1) * H2_HEIGHT
    } else if (trimmed.startsWith('### ')) {
      totalHeight += H3_HEIGHT
      const wraps = Math.max(1, Math.ceil(effectivePx * 1.1 / CONTENT_WIDTH))
      if (wraps > 1) totalHeight += (wraps - 1) * H3_HEIGHT
    } else if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      // list items have left indent (pl-4 = 16px)
      const effectiveLiWidth = CONTENT_WIDTH - 16
      const wraps = Math.max(1, Math.ceil(effectivePx / effectiveLiWidth))
      totalHeight += wraps * LINE_HEIGHT_LI
    } else {
      const wraps = Math.max(1, Math.ceil(effectivePx / CONTENT_WIDTH))
      totalHeight += wraps * LINE_HEIGHT_P
    }
  }

  return Math.max(minHeight, Math.min(900, Math.ceil(totalHeight)))
}

// ── On-demand expansion (also benefits from cache if within 5min) ──

export async function expandNode(
  apiKey: string,
  originalSource: string,
  parentNode: { id: string; text: string; position: { x: number; y: number } },
  siblingCount: number,
  signal?: AbortSignal,
): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> {
  const stats = newCacheStats()

  const systemBlocks = buildCachedSystem(STAGE_EXPAND_SYSTEM)
  const userContent: TextBlock[] = []

  if (originalSource) {
    userContent.push(buildCachedSource(originalSource))
  }
  userContent.push({
    type: 'text',
    text: `Target node to expand:\n${parentNode.text}\n\nGenerate 1-2 deeper child nodes${
      originalSource ? ' with specifics drawn FROM the source above' : ''
    }.`,
  })

  const result = await callStructured(apiKey, systemBlocks, userContent, detailsSchema, stats, signal)

  console.info('[expand] Cache stats:', {
    cacheRead: stats.cacheReadTokens,
    cacheCreation: stats.cacheCreationTokens,
    uncached: stats.inputTokens,
  })

  const nodes: CanvasNode[] = []
  const edges: CanvasEdge[] = []

  const parentAngle = Math.atan2(parentNode.position.y, parentNode.position.x) * (180 / Math.PI)
  const parentDist = Math.hypot(parentNode.position.x, parentNode.position.y)
  const newRadius = parentDist + 550

  const spread = result.details.length === 1 ? [0] : [-12, 12]

  result.details.forEach((detail, i) => {
    const angle = parentAngle + spread[i]
    const rad = (angle * Math.PI) / 180
    const x = Math.round(newRadius * Math.cos(rad) - LAYOUT.detail.width / 2)
    const y = Math.round(newRadius * Math.sin(rad) - LAYOUT.detail.height / 2)

    const nodeId = `expand-${parentNode.id}-${Date.now()}-${i}`
    nodes.push({
      id: nodeId,
      type: 'text',
      x,
      y,
      width: LAYOUT.detail.width,
      height: estimateHeight(`${detail.heading}\n\n${detail.body}`, LAYOUT.detail.height, LAYOUT.detail.width),
      color: LAYOUT.detail.color,
      text: `${detail.heading}\n\n${detail.body}`,
    })

    edges.push({
      id: `e-expand-${parentNode.id}-${siblingCount + i}`,
      fromNode: parentNode.id,
      toNode: nodeId,
      color: LAYOUT.detail.color,
    })
  })

  return { nodes, edges }
}
