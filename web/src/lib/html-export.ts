/**
 * Export canvas as a self-contained HTML file.
 *
 * Produces a single .html file that:
 * - Has no external dependencies (no CDN, no fonts)
 * - Renders all nodes with markdown → HTML (pre-rendered)
 * - Draws edges as SVG lines between nodes
 * - Supports pan/zoom via inline JS
 * - Works offline, sendable via email/Slack/etc.
 */

import type { Node, Edge } from '@xyflow/react'
import type { TextNodeData, LinkNodeData, FileNodeData, GroupNodeData } from './canvas-to-reactflow'
import { CANVAS_COLORS } from './color-map'

const THEME_STYLES = `
  --bg-primary: #09090b;
  --bg-secondary: #18181b;
  --bg-tertiary: #27272a;
  --border: #3f3f46;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
`

const LIGHT_THEME_STYLES = `
  --bg-primary: #ffffff;
  --bg-secondary: #f4f4f5;
  --bg-tertiary: #e4e4e7;
  --border: #d4d4d8;
  --text-primary: #18181b;
  --text-secondary: #52525b;
  --text-muted: #71717a;
`

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Minimal markdown → HTML renderer (handles: # headings, **bold**, *italic*, `code`, ```code blocks```, - lists, blank lines)
 */
function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inCode = false
  let inList = false

  for (const raw of lines) {
    const line = raw

    // Code fence
    if (line.trim().startsWith('```')) {
      if (inCode) {
        out.push('</code></pre>')
        inCode = false
      } else {
        if (inList) {
          out.push('</ul>')
          inList = false
        }
        out.push('<pre><code>')
        inCode = true
      }
      continue
    }

    if (inCode) {
      out.push(escapeHtml(line))
      continue
    }

    // Heading
    const h3 = /^### (.+)$/.exec(line)
    const h2 = /^## (.+)$/.exec(line)
    const h1 = /^# (.+)$/.exec(line)
    if (h1 || h2 || h3) {
      if (inList) {
        out.push('</ul>')
        inList = false
      }
      const lvl = h1 ? 1 : h2 ? 2 : 3
      const text = (h1 ?? h2 ?? h3)![1]
      out.push(`<h${lvl}>${renderInline(text)}</h${lvl}>`)
      continue
    }

    // List item
    const li = /^[-*]\s+(.+)$/.exec(line.trim())
    if (li) {
      if (!inList) {
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${renderInline(li[1])}</li>`)
      continue
    }

    // Blank line
    if (!line.trim()) {
      if (inList) {
        out.push('</ul>')
        inList = false
      }
      continue
    }

    // Paragraph
    if (inList) {
      out.push('</ul>')
      inList = false
    }
    out.push(`<p>${renderInline(line)}</p>`)
  }

  if (inList) out.push('</ul>')
  if (inCode) out.push('</code></pre>')
  return out.join('\n')
}

function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

interface ExportOptions {
  title?: string
  theme?: 'dark' | 'light'
}

export function exportToHtml(
  nodes: Node[],
  edges: Edge[],
  options: ExportOptions = {},
): string {
  const { title = 'Canvas', theme = 'dark' } = options

  // Compute bounding box for viewBox
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of nodes) {
    const w = (n.style?.width as number) ?? 350
    const h = (n.style?.height as number) ?? 150
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x + w)
    maxY = Math.max(maxY, n.position.y + h)
  }
  if (!isFinite(minX)) {
    minX = 0; minY = 0; maxX = 1000; maxY = 600
  }
  const pad = 80
  minX -= pad; minY -= pad; maxX += pad; maxY += pad
  const canvasW = maxX - minX
  const canvasH = maxY - minY

  // Node positions (by id)
  const posById: Record<string, { x: number; y: number; w: number; h: number }> = {}
  for (const n of nodes) {
    const w = (n.style?.width as number) ?? 350
    const h = (n.style?.height as number) ?? 150
    posById[n.id] = { x: n.position.x, y: n.position.y, w, h }
  }

  // Generate node HTML
  const nodeHtml = nodes.map((n) => renderNode(n)).join('\n')

  // Generate edges as SVG
  const edgeSvg = edges
    .map((e) => renderEdge(e, posById))
    .filter(Boolean)
    .join('\n')

  const themeVars = theme === 'dark' ? THEME_STYLES : LIGHT_THEME_STYLES

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
:root { ${themeVars} }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}
.header {
  position: fixed; top: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  z-index: 100;
  font-size: 13px;
}
.header h1 { margin: 0; font-size: 14px; font-weight: 600; }
.header .hint { color: var(--text-muted); font-size: 11px; }
.viewport {
  position: absolute; inset: 48px 0 0 0;
  overflow: hidden;
  background: var(--bg-primary);
  background-image: radial-gradient(var(--border) 1px, transparent 1px);
  background-size: 20px 20px;
  cursor: grab;
}
.viewport:active { cursor: grabbing; }
.canvas-stage {
  position: absolute;
  transform-origin: 0 0;
  width: ${canvasW}px; height: ${canvasH}px;
}
.edges-layer {
  position: absolute;
  top: 0; left: 0;
  width: ${canvasW}px; height: ${canvasH}px;
  pointer-events: none;
}
.node {
  position: absolute;
  border-radius: 8px;
  padding: 12px 16px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid;
}
.node h1 { margin: 0 0 4px; font-size: 17px; }
.node h2 { margin: 0 0 4px; font-size: 15px; font-weight: 600; }
.node h3 { margin: 0 0 4px; font-size: 13px; font-weight: 600; }
.node p { margin: 4px 0; }
.node ul { margin: 4px 0; padding-left: 18px; }
.node li { margin: 2px 0; }
.node code { background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px; font-size: 12px; font-family: ui-monospace, monospace; }
.node pre { background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; font-size: 12px; overflow-x: auto; margin: 4px 0; }
.node pre code { background: transparent; padding: 0; }
.node strong { font-weight: 600; }
.node a { color: #60a5fa; }
.controls {
  position: fixed; bottom: 16px; left: 16px;
  display: flex; gap: 4px;
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px;
  padding: 4px;
  z-index: 100;
}
.controls button {
  background: transparent; color: var(--text-secondary);
  border: none; padding: 6px 10px; cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
}
.controls button:hover { background: var(--bg-tertiary); }
[data-theme="light"] .node code,
[data-theme="light"] .node pre { background: rgba(0,0,0,0.06); }
</style>
</head>
<body>
<div class="header">
  <h1>${escapeHtml(title)}</h1>
  <span class="hint">Drag to pan · Scroll to zoom</span>
</div>
<div class="viewport" id="viewport">
  <div class="canvas-stage" id="stage">
    <svg class="edges-layer" viewBox="${minX} ${minY} ${canvasW} ${canvasH}" preserveAspectRatio="none">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
        </marker>
      </defs>
      ${edgeSvg}
    </svg>
    <div style="transform: translate(${-minX}px, ${-minY}px); position: absolute;">
      ${nodeHtml}
    </div>
  </div>
</div>
<div class="controls">
  <button onclick="window.__canvas.zoom(0.8)">−</button>
  <button onclick="window.__canvas.reset()">Fit</button>
  <button onclick="window.__canvas.zoom(1.25)">+</button>
</div>
<script>
(function() {
  var stage = document.getElementById('stage');
  var viewport = document.getElementById('viewport');
  var tx = 0, ty = 0, scale = 1;
  var dragging = false, lastX = 0, lastY = 0;
  var canvasW = ${canvasW}, canvasH = ${canvasH};
  function apply() {
    stage.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
  }
  function fit() {
    var vw = viewport.clientWidth;
    var vh = viewport.clientHeight;
    var s = Math.min(vw / canvasW, vh / canvasH) * 0.9;
    scale = Math.max(0.05, Math.min(2, s));
    tx = (vw - canvasW * scale) / 2;
    ty = (vh - canvasH * scale) / 2;
    apply();
  }
  viewport.addEventListener('mousedown', function(e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    e.preventDefault();
  });
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    tx += e.clientX - lastX;
    ty += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    apply();
  });
  window.addEventListener('mouseup', function() { dragging = false; });
  viewport.addEventListener('wheel', function(e) {
    e.preventDefault();
    var rect = viewport.getBoundingClientRect();
    var px = e.clientX - rect.left;
    var py = e.clientY - rect.top;
    var delta = e.deltaY > 0 ? 0.9 : 1.1;
    var ns = Math.max(0.05, Math.min(3, scale * delta));
    // zoom around cursor
    tx = px - (px - tx) * (ns / scale);
    ty = py - (py - ty) * (ns / scale);
    scale = ns;
    apply();
  }, { passive: false });
  window.__canvas = {
    zoom: function(f) {
      var vw = viewport.clientWidth / 2;
      var vh = viewport.clientHeight / 2;
      var ns = Math.max(0.05, Math.min(3, scale * f));
      tx = vw - (vw - tx) * (ns / scale);
      ty = vh - (vh - ty) * (ns / scale);
      scale = ns; apply();
    },
    reset: fit
  };
  fit();
  window.addEventListener('resize', fit);
})();
</script>
</body>
</html>`
}

function renderNode(n: Node): string {
  const w = (n.style?.width as number) ?? 350
  const h = (n.style?.height as number) ?? 150
  const color = (n.data as { color?: string }).color
  const hex = color ? CANVAS_COLORS[color] ?? '#a1a1aa' : '#a1a1aa'
  const bg = hex + '26' // ~15% opacity
  const border = hex + '66' // ~40% opacity

  const baseStyle = `left:${n.position.x}px;top:${n.position.y}px;width:${w}px;height:${h}px;background:${bg};border-color:${border};color:var(--text-primary);`

  switch (n.type) {
    case 'textNode': {
      const data = n.data as TextNodeData
      return `<div class="node" style="${baseStyle}">${renderMarkdown(data.text ?? '')}</div>`
    }
    case 'linkNode': {
      const data = n.data as LinkNodeData
      return `<div class="node" style="${baseStyle}"><a href="${escapeHtml(data.url)}" target="_blank" rel="noopener">${escapeHtml(data.url)}</a></div>`
    }
    case 'fileNode': {
      const data = n.data as FileNodeData
      return `<div class="node" style="${baseStyle}"><strong>${escapeHtml(data.file.split('/').pop() ?? data.file)}</strong><br><small style="opacity:0.6">${escapeHtml(data.file)}</small></div>`
    }
    case 'groupNode': {
      const data = n.data as GroupNodeData
      return `<div class="node" style="${baseStyle}border-style:dashed;"><small style="opacity:0.6;text-transform:uppercase;">${escapeHtml(data.label ?? '')}</small></div>`
    }
    default:
      return ''
  }
}

function renderEdge(
  e: Edge,
  posById: Record<string, { x: number; y: number; w: number; h: number }>,
): string {
  const from = posById[e.source]
  const to = posById[e.target]
  if (!from || !to) return ''

  // Connect node centers (simple)
  const x1 = from.x + from.w / 2
  const y1 = from.y + from.h / 2
  const x2 = to.x + to.w / 2
  const y2 = to.y + to.h / 2

  const color = (e.data as { color?: string } | undefined)?.color
  const stroke = color ? CANVAS_COLORS[color] ?? '#71717a' : '#71717a'

  const label = (e.data as { label?: string } | undefined)?.label ?? (e.label as string | undefined)

  // Clip line to node edges (approximate: just shorten by 10px from centers)
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const shrink = 20
  const sx = x1 + (dx / len) * shrink
  const sy = y1 + (dy / len) * shrink
  const ex = x2 - (dx / len) * shrink
  const ey = y2 - (dy / len) * shrink

  const line = `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${stroke}" stroke-width="1.5" marker-end="url(#arrow)" style="color:${stroke}" />`

  if (label) {
    const mx = (sx + ex) / 2
    const my = (sy + ey) / 2
    return (
      line +
      `<rect x="${mx - label.length * 4}" y="${my - 10}" width="${label.length * 8}" height="18" rx="4" fill="#27272a" stroke="${stroke}" />` +
      `<text x="${mx}" y="${my + 3}" text-anchor="middle" font-size="11" fill="#a1a1aa">${escapeHtml(label)}</text>`
    )
  }

  return line
}
