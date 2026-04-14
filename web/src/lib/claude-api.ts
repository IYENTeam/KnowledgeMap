/**
 * Browser-side Claude API client for canvas decomposition.
 * Uses Anthropic's dangerous-direct-browser-access header.
 */

import type { CanvasDocument } from '@knowledgeos/types/canvas.js'
import { validateCanvasJson } from './canvas-to-reactflow'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5-20250929'

/**
 * Concentric/radial decomposition:
 * - Center: main topic
 * - Inner ring (radius 500): up to 5 core questions
 * - Middle ring (radius 1000): primary answers to each question
 * - Outer ring (radius 1500): detailed elaborations
 *
 * The further from center, the more detailed the content.
 */
const DECOMPOSE_SYSTEM_PROMPT = `You are a knowledge decomposition expert. Given a source (text, paper, concept, URL content), you extract the **core questions** and produce a radial knowledge canvas.

## Decomposition Strategy

1. Read the source carefully and identify **1-5 core questions** that the source addresses
2. Place those questions around a central topic node
3. For each question, create 1-3 **answer nodes** placed further outward
4. For the most important answers, create 1-2 **detail nodes** placed even further outward
5. The **further from center**, the **more detailed/concrete** the content

Layout concept:
\`\`\`
                  [detail]
                      |
            [answer]—[question 1]—[topic]
                      |
                 [another answer]
                      |
                  [detail]
\`\`\`

## Layout Coordinates (radial)

Use polar positioning around origin (0,0):

**Topic node (center):**
- (x=0, y=0), width=450, height=120, color="6" (purple)

**Questions (inner ring, radius=550):**
Distribute N questions at equal angles starting from top, going clockwise.
For N questions, angle_i = (360/N) * i - 90 degrees (so first question is at top)
- x = 550 * cos(angle_i * π/180)
- y = 550 * sin(angle_i * π/180)
- width=360, height=130, color="4" (green)

**Answers (middle ring, radius≈1050):**
Each answer is placed outward from its question. Use the question's angle ± small offset.
- Base angle = question's angle ± 15-25 degrees (to spread siblings apart)
- x = 1050 * cos(angle * π/180)
- y = 1050 * sin(angle * π/180)
- width=400, height=160, color="3" (yellow)

**Details (outer ring, radius≈1600):**
Each detail is placed outward from its answer.
- Use answer's angle ± small offset
- x = 1600 * cos(angle * π/180)
- y = 1600 * sin(angle * π/180)
- width=420, height=200, color="5" (cyan)

## Content Rules

**Topic node**: "# TopicName\\n\\nOne-line summary" (terse)

**Question nodes**: Start with "?" prefix. Be specific and substantive. Examples:
- "? How does self-attention handle long-range dependencies?"
- "? What makes reinforcement learning different from supervised learning?"

**Answer nodes**: Begin with "## " heading + 2-5 concise sentences/bullets.
Answers the parent question directly.

**Detail nodes**: "## " heading + deeper explanation (4-8 lines).
Elaborates on parent answer with specifics, examples, mechanisms, or edge cases.

## Edges

Every non-topic node MUST be connected via an edge to its parent:
- Topic → each Question
- Question → each Answer
- Answer → each Detail

Edge format: \`{ "id": "e-<N>", "fromNode": "<parent>", "toNode": "<child>", "color": "<color>" }\`
Color should match the child's zone (question=4, answer=3, detail=5).
Do not set fromSide/toSide — omit those fields so React Flow chooses the best side.

## Node ID Convention

- topic-1
- q-1, q-2, ... q-5 (questions)
- a-1-1, a-1-2 (answers to q-1), a-2-1 (answer to q-2), etc.
- d-1-1-1 (detail of a-1-1), etc.

## Size Guidelines

- Topic: 450 x 120
- Question: 360 x 130 (single-line mostly)
- Answer: 400 x 160 (a few lines)
- Detail: 420 x 200-260 (taller for more content)

Adjust height based on actual content length. If a node has 6+ lines, increase height by 30 per extra line.

## Total Node Budget

- Target: 8-15 nodes total
- 1 topic + 3-5 questions + 3-7 answers + 1-3 details
- Don't create so many that they overlap

## Output Format

Respond with ONLY valid JSON. No markdown fence. No explanation. Shape:

{
  "nodes": [
    { "id": "topic-1", "type": "text", "x": 0, "y": 0, "width": 450, "height": 120, "color": "6", "text": "# ..." },
    { "id": "q-1", "type": "text", "x": 0, "y": -550, "width": 360, "height": 130, "color": "4", "text": "? ..." },
    ...
  ],
  "edges": [
    { "id": "e-1", "fromNode": "topic-1", "toNode": "q-1", "color": "4" },
    ...
  ]
}`

export class ClaudeApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message)
    this.name = 'ClaudeApiError'
  }
}

export async function decomposeTopic(
  apiKey: string,
  topic: string,
  signal?: AbortSignal,
): Promise<CanvasDocument> {
  const response = await fetch(API_URL, {
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
      max_tokens: 8000,
      system: DECOMPOSE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Decompose the following into a radial knowledge canvas. Extract the core questions and build outward with progressively detailed answers. Respond with ONLY the JSON object.\n\nSource:\n${topic}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    if (response.status === 401) {
      throw new ClaudeApiError('Invalid API key. Please check and re-enter.', 401)
    }
    if (response.status === 429) {
      throw new ClaudeApiError('Rate limit exceeded. Please try again later.', 429)
    }
    throw new ClaudeApiError(
      `API error (${response.status}): ${errBody || response.statusText}`,
      response.status,
    )
  }

  const data = await response.json()
  const textBlock = data.content?.find((c: { type: string }) => c.type === 'text')
  if (!textBlock) {
    throw new ClaudeApiError('No text content in response')
  }

  const rawText = textBlock.text as string
  const jsonStr = extractJson(rawText)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new ClaudeApiError('Claude returned invalid JSON. Try rephrasing your input.')
  }

  if (!validateCanvasJson(parsed)) {
    throw new ClaudeApiError('Claude returned invalid canvas structure.')
  }

  return parsed
}

/**
 * Test if an API key is valid by making a minimal request.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    })
    return response.status !== 401 && response.status !== 403
  } catch {
    return false
  }
}

function extractJson(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return trimmed

  const fenceMatch = trimmed.match(/```(?:json)?\s*\n([\s\S]+?)\n```/)
  if (fenceMatch) return fenceMatch[1].trim()

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end > start) {
    return trimmed.substring(start, end + 1)
  }

  return trimmed
}
