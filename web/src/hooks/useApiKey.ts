import { useCallback, useEffect, useState } from 'react'
import {
  encryptString,
  decryptString,
  type EncryptedBlob,
} from '@/lib/encryption'

const STORAGE_KEY = 'canvas-encrypted-api-key'
const DISMISSED_KEY = 'canvas-welcome-dismissed'

function isValidKey(key: string): boolean {
  return key.trim().startsWith('sk-ant-') && key.trim().length > 20
}

function maskKey(key: string): string {
  if (key.length <= 12) return key
  return `${key.slice(0, 7)}...${key.slice(-4)}`
}

/**
 * Lock states:
 * - 'no-key': user has never saved a key
 * - 'locked': encrypted key in storage, password needed
 * - 'unlocked': key decrypted in memory, ready to use
 */
export type KeyState = 'no-key' | 'locked' | 'unlocked'

export function useApiKey() {
  const [state, setState] = useState<KeyState>('no-key')
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setState(stored ? 'locked' : 'no-key')
    setWelcomeDismissed(localStorage.getItem(DISMISSED_KEY) === 'true')
    setIsReady(true)
  }, [])

  const saveKey = useCallback(async (key: string, password: string) => {
    const trimmed = key.trim()
    if (!isValidKey(trimmed)) {
      throw new Error('Invalid API key format. Should start with sk-ant-')
    }
    if (password.length < 4) {
      throw new Error('Password must be at least 4 characters')
    }

    const blob = await encryptString(trimmed, password)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob))
    setApiKeyState(trimmed)
    setState('unlocked')
  }, [])

  const unlock = useCallback(async (password: string): Promise<void> => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      setState('no-key')
      throw new Error('No key stored')
    }
    let blob: EncryptedBlob
    try {
      blob = JSON.parse(raw)
    } catch {
      throw new Error('Stored key is corrupted')
    }

    const decrypted = await decryptString(blob, password)
    setApiKeyState(decrypted)
    setState('unlocked')
  }, [])

  const lock = useCallback(() => {
    setApiKeyState(null)
    const has = localStorage.getItem(STORAGE_KEY)
    setState(has ? 'locked' : 'no-key')
  }, [])

  const clearKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setApiKeyState(null)
    setState('no-key')
  }, [])

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) throw new Error('No key stored')
      const blob: EncryptedBlob = JSON.parse(raw)
      const plaintext = await decryptString(blob, oldPassword)
      if (newPassword.length < 4) throw new Error('New password too short')
      const newBlob = await encryptString(plaintext, newPassword)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newBlob))
    },
    [],
  )

  const dismissWelcome = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setWelcomeDismissed(true)
  }, [])

  return {
    state,
    apiKey,
    hasStoredKey: state !== 'no-key',
    isUnlocked: state === 'unlocked',
    maskedKey: apiKey ? maskKey(apiKey) : null,
    welcomeDismissed,
    isReady,
    saveKey,
    unlock,
    lock,
    clearKey,
    changePassword,
    dismissWelcome,
  }
}

export { isValidKey }
