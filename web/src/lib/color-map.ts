/**
 * Obsidian Canvas color codes → CSS hex values
 */

export const CANVAS_COLORS: Record<string, string> = {
  '1': '#fb464c', // red
  '2': '#e9973f', // orange
  '3': '#e0de71', // yellow
  '4': '#44cf6e', // green
  '5': '#53dfdd', // cyan
  '6': '#a882ff', // purple
}

const DEFAULT_COLOR = '#a1a1aa' // zinc-400

export function colorToHex(color?: string): string {
  if (!color) return DEFAULT_COLOR
  if (color.startsWith('#')) return color
  return CANVAS_COLORS[color] ?? DEFAULT_COLOR
}

export function colorWithAlpha(color: string | undefined, alpha: number): string {
  const hex = colorToHex(color)
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${alphaHex}`
}

export function colorToBg(color?: string): string {
  return colorWithAlpha(color, 0.15)
}

export function colorToBorder(color?: string): string {
  return colorWithAlpha(color, 0.4)
}
