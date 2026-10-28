import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"
import { config } from "./config.js"

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
const periodSeconds = 30

function encryptionKey() {
  if (config.MFA_ENCRYPTION_KEY) {
    return Buffer.from(config.MFA_ENCRYPTION_KEY, "base64")
  }
  return createHmac("sha256", config.JWT_SECRET)
    .update("chantier-connect/editor-mfa/encryption-key/v1")
    .digest()
}

export function createTotpSecret() {
  const bytes = randomBytes(20)
  let bits = 0
  let value = 0
  let encoded = ""
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      encoded += base32Alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) encoded += base32Alphabet[(value << (5 - bits)) & 31]
  return encoded
}

function decodeBase32(secret: string) {
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const character of secret.toUpperCase().replace(/=+$/, "")) {
    const digit = base32Alphabet.indexOf(character)
    if (digit < 0) throw new Error("Secret TOTP invalide.")
    value = (value << 5) | digit
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

function totpAt(secret: string, timeStep: number) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(timeStep))
  const digest = createHmac("sha1", decodeBase32(secret))
    .update(counter)
    .digest()
  const offset = digest[digest.length - 1]! & 15
  const binary =
    ((digest[offset]! & 127) << 24) |
    ((digest[offset + 1]! & 255) << 16) |
    ((digest[offset + 2]! & 255) << 8) |
    (digest[offset + 3]! & 255)
  return String(binary % 1_000_000).padStart(6, "0")
}

export function currentTotpCode(secret: string, now = Date.now()) {
  return totpAt(secret, Math.floor(now / 1000 / periodSeconds))
}

export function verifyTotp(secret: string, candidate: string, now = Date.now()) {
  if (!/^\d{6}$/.test(candidate)) return false
  const candidateBytes = Buffer.from(candidate)
  const timeStep = Math.floor(now / 1000 / periodSeconds)
  for (let offset = -1; offset <= 1; offset += 1) {
    const expected = Buffer.from(totpAt(secret, timeStep + offset))
    if (timingSafeEqual(expected, candidateBytes)) return true
  }
  return false
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64")
}

export function decryptTotpSecret(encrypted: string) {
  const payload = Buffer.from(encrypted, "base64")
  if (payload.length < 29) throw new Error("Secret MFA chiffré invalide.")
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    payload.subarray(0, 12),
  )
  decipher.setAuthTag(payload.subarray(12, 28))
  return Buffer.concat([
    decipher.update(payload.subarray(28)),
    decipher.final(),
  ]).toString("utf8")
}

export function createRecoveryCodes() {
  return Array.from({ length: 10 }, () =>
    randomBytes(8).toString("hex").toUpperCase(),
  )
}

export function hashRecoveryCode(code: string) {
  return createHash("sha256")
    .update(code.replace(/[\s-]/g, "").toUpperCase())
    .digest("hex")
}

export function createMfaChallengeToken() {
  return randomBytes(32).toString("base64url")
}

export function hashMfaChallengeToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export function provisioningUri(secret: string, email: string) {
  const label = encodeURIComponent(`Chantier Connect:${email}`)
  const query = new URLSearchParams({
    secret,
    issuer: "Chantier Connect",
    algorithm: "SHA1",
    digits: "6",
    period: String(periodSeconds),
  })
  return `otpauth://totp/${label}?${query.toString()}`
}
