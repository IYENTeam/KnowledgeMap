/**
 * Password-based symmetric encryption for API keys.
 * PBKDF2-derived key → AES-GCM encryption.
 *
 * Stored blob shape (base64-encoded):
 *   { version: 1, salt, iv, ciphertext }
 */

const PBKDF2_ITERATIONS = 210_000 // OWASP 2023 recommendation
const SALT_BYTES = 16
const IV_BYTES = 12
const AES_BITS = 256

export interface EncryptedBlob {
  v: 1
  salt: string // base64
  iv: string   // base64
  ct: string   // base64 (ciphertext)
}

// ── Base64 helpers ──────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str)
}

function fromBase64(b64: string): Uint8Array {
  const str = atob(b64)
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i)
  return bytes
}

// ── Key derivation ──────────────────────────────────────────

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const pwKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    pwKey,
    { name: 'AES-GCM', length: AES_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ── Encrypt / Decrypt ───────────────────────────────────────

export async function encryptString(
  plaintext: string,
  password: string,
): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(password, salt)

  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoded,
  )

  return {
    v: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(ciphertext)),
  }
}

export async function decryptString(
  blob: EncryptedBlob,
  password: string,
): Promise<string> {
  if (blob.v !== 1) {
    throw new Error(`Unsupported encryption version: ${blob.v}`)
  }
  const salt = fromBase64(blob.salt)
  const iv = fromBase64(blob.iv)
  const ct = fromBase64(blob.ct)

  const key = await deriveKey(password, salt)

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ct as BufferSource,
    )
    return new TextDecoder().decode(plaintext)
  } catch {
    throw new Error('Decryption failed — wrong password')
  }
}
