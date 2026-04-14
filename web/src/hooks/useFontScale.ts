import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'canvas-font-scale'
const DEFAULT_SCALE = 1.0
const MIN_SCALE = 0.7
const MAX_SCALE = 2.0

function getInitial(): number {
  if (typeof window === 'undefined') return DEFAULT_SCALE
  const raw = localStorage.getItem(STORAGE_KEY)
  const n = raw ? parseFloat(raw) : DEFAULT_SCALE
  return isNaN(n) ? DEFAULT_SCALE : Math.min(MAX_SCALE, Math.max(MIN_SCALE, n))
}

export function useFontScale() {
  const [scale, setScaleState] = useState<number>(getInitial)

  useEffect(() => {
    document.documentElement.style.setProperty('--node-font-scale', String(scale))
    localStorage.setItem(STORAGE_KEY, String(scale))
  }, [scale])

  const setScale = useCallback((s: number) => {
    setScaleState(Math.min(MAX_SCALE, Math.max(MIN_SCALE, s)))
  }, [])

  const increase = useCallback(() => {
    setScaleState((s) => Math.min(MAX_SCALE, Math.round((s + 0.1) * 10) / 10))
  }, [])

  const decrease = useCallback(() => {
    setScaleState((s) => Math.max(MIN_SCALE, Math.round((s - 0.1) * 10) / 10))
  }, [])

  const reset = useCallback(() => {
    setScaleState(DEFAULT_SCALE)
  }, [])

  return { scale, setScale, increase, decrease, reset, MIN_SCALE, MAX_SCALE }
}
