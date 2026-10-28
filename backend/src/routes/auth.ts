import { Router } from "express"

import { rateLimit } from "express-rate-limit"

import bcrypt from "bcryptjs"

import { z } from "zod"

import { pool } from "../db.js"

import { config } from "../config.js"

import { hashPasswordResetToken, issuePasswordReset } from "../password-reset.js"

import { writeAuditLog } from "../audit-log.js"

import type { AuthenticatedRequest } from "../types.js"

import { getPlatformRequestLimit } from "../platform-settings.js"
import { tenantStorageCapacity } from "../storage.js"

import {
  authenticate,
  authenticatePassword,
  authenticateUserById,
  clearSession,
  issueSession,
  publicUser,
} from "../auth.js"
import {
  createMfaChallengeToken,
  createRecoveryCodes,
  createTotpSecret,
  decryptTotpSecret,
  encryptTotpSecret,
  hashMfaChallengeToken,
  hashRecoveryCode,
  provisioningUri,
  verifyTotp,
} from "../editor-mfa.js"

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: async () => getPlatformRequestLimit(),

  skipSuccessfulRequests: true,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
})

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),

  password: z.string().min(1).max(256),

  rememberMe: z.boolean().default(false),
})

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),

  email: z.email().trim().toLowerCase(),

  phone: z.string().trim().max(30).nullable(),
})

const profilePhotoSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  imageBase64: z.string().min(1).max(2_800_000),
})

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Trop de demandes. Réessayez dans quelques minutes." },
})

const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Trop de tentatives MFA. Réessayez dans 15 minutes." },
})

async function createMfaChallenge(
  userId: string,
  purpose: "setup" | "login",
  rememberMe = false,
) {
  const token = createMfaChallengeToken()
  await pool.query(
    `DELETE FROM editor_mfa_challenges
     WHERE user_id = $1 AND consumed_at IS NULL AND expires_at <= now()`,
    [userId],
  )
  await pool.query(
    `INSERT INTO editor_mfa_challenges
       (challenge_hash, user_id, purpose, remember_me, expires_at)
     VALUES ($1, $2, $3, $4, now() + $5::interval)`,
    [
      hashMfaChallengeToken(token),
      userId,
      purpose,
      rememberMe,
      purpose === "setup" ? "10 minutes" : "5 minutes",
    ],
  )
  return token
}

router.post("/password-reset/request", passwordResetLimiter, async (request, response) => {
  const parsed = z.object({ email: z.email().trim().toLowerCase() }).safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: "Adresse email invalide." })
    return
  }
  if (config.RESEND_API_KEY && config.EMAIL_FROM && config.APP_ORIGIN) {
    const result = await pool.query<{
      id: string; email: string; full_name: string; role: string; tenant_id: string | null
    }>(
      `SELECT id, email, full_name, role, tenant_id
       FROM users WHERE lower(email) = $1 AND active = true LIMIT 1`,
      [parsed.data.email],
    )
    const user = result.rows[0]
    if (user) {
      await issuePasswordReset({
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role as AuthenticatedRequest["authUser"]["role"],
        tenantId: user.tenant_id,
        requestedBy: null,
        actorRole: "PUBLIC_RESET",
        request,
      })
    }
  }
  response.status(202).json({ message: "Si le compte existe, un lien de réinitialisation sera envoyé." })
})

router.post("/password-reset/complete", passwordResetLimiter, async (request, response) => {
  const parsed = z.object({
    token: z.string().min(32).max(128),
    newPassword: z.string().min(12).max(128),
  }).safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: "Lien ou nouveau mot de passe invalide." })
    return
  }
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await client.query<{
      user_id: string; tenant_id: string | null; active: boolean; role: string
    }>(
      `SELECT token.user_id, u.tenant_id, u.active, u.role
       FROM password_reset_tokens token
       JOIN users u ON u.id = token.user_id
       WHERE token.token_hash = $1 AND token.used_at IS NULL
         AND token.expires_at > now()
       FOR UPDATE OF token`,
      [hashPasswordResetToken(parsed.data.token)],
    )
    const reset = result.rows[0]
    if (!reset || !reset.active) {
      await client.query("ROLLBACK")
      response.status(400).json({ error: "Ce lien est invalide ou expiré." })
      return
    }
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    await client.query(
      `UPDATE users SET password_hash = $1, must_change_password = false,
              session_version = session_version + 1,
              mfa_secret_encrypted = CASE WHEN role = 'EDITOR' THEN NULL ELSE mfa_secret_encrypted END,
              mfa_pending_secret_encrypted = CASE WHEN role = 'EDITOR' THEN NULL ELSE mfa_pending_secret_encrypted END,
              mfa_enabled_at = CASE WHEN role = 'EDITOR' THEN NULL ELSE mfa_enabled_at END
       WHERE id = $2 AND active = true`,
      [passwordHash, reset.user_id],
    )
    if (reset.role === "EDITOR") {
      await client.query(
        "DELETE FROM editor_mfa_recovery_codes WHERE user_id = $1",
        [reset.user_id],
      )
      await client.query(
        `UPDATE editor_mfa_challenges SET consumed_at = now()
         WHERE user_id = $1 AND consumed_at IS NULL`,
        [reset.user_id],
      )
    }
    await client.query(
      `UPDATE password_reset_tokens SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
      [reset.user_id],
    )
    await writeAuditLog(client, request, {
      actorId: reset.user_id,
      actorRole: "SELF_SERVICE",
      tenantId: reset.tenant_id,
      targetType: "user",
      targetId: reset.user_id,
      action: "PASSWORD_RESET_COMPLETED",
    })
    if (reset.role === "EDITOR") {
      await writeAuditLog(client, request, {
        actorId: reset.user_id,
        actorRole: "SELF_SERVICE",
        tenantId: null,
        targetType: "user",
        targetId: reset.user_id,
        action: "EDITOR_MFA_RESET_BY_PASSWORD_RECOVERY",
      })
    }
    await client.query("COMMIT")
    response.status(204).end()
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
})

router.patch("/privacy-consent", authenticate, async (request, response) => {
  const accepted = z.object({ accepted: z.boolean() }).safeParse(request.body)
  if (!accepted.success) {
    response.status(400).json({ error: "Choix de consentement invalide." })
    return
  }
  const user = request.authUser!
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query(
      `UPDATE users SET sensitive_data_consented_at = CASE WHEN $2 THEN now() ELSE NULL END
       WHERE id = $1`,
      [user.id, accepted.data.accepted],
    )
    await writeAuditLog(client, request, {
      actorId: user.id,
      actorRole: user.role,
      tenantId: user.tenantId,
      targetType: "user",
      targetId: user.id,
      action: accepted.data.accepted ? "SENSITIVE_DATA_CONSENT_GIVEN" : "SENSITIVE_DATA_CONSENT_WITHDRAWN",
    })
    await client.query("COMMIT")
    response.json({ data: { sensitiveDataConsented: accepted.data.accepted } })
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
})

router.post("/login", loginLimiter, async (request, response) => {
  const parsed = loginSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(400).json({
      error: "Identifiant ou mot de passe requis.",

      details: parsed.error.flatten().fieldErrors,
    })

    return
  }

  const user = await authenticatePassword(
    parsed.data.identifier,
    parsed.data.password,
  )

  if (!user) {
    response
      .status(401)
      .json({ error: "Identifiant ou mot de passe incorrect." })

    return
  }

  if (user.role === "EDITOR") {
    const mfaState = await pool.query<{
      mfa_secret_encrypted: string | null
      mfa_enabled_at: Date | null
    }>(
      `SELECT mfa_secret_encrypted, mfa_enabled_at
       FROM users WHERE id = $1 AND active = true`,
      [user.id],
    )
    const enabled = Boolean(
      mfaState.rows[0]?.mfa_secret_encrypted &&
      mfaState.rows[0]?.mfa_enabled_at,
    )
    const challengeToken = await createMfaChallenge(
      user.id,
      enabled ? "login" : "setup",
      parsed.data.rememberMe,
    )
    response.json(
      enabled
        ? { mfaRequired: true, challengeToken }
        : { mfaSetupRequired: true, setupToken: challengeToken },
    )
    return
  }

  issueSession(response, user, parsed.data.rememberMe)

  response.json({ user: publicUser(user) })
})

const mfaSetupTokenSchema = z.object({
  setupToken: z.string().min(32).max(128),
})

router.post("/mfa/setup", mfaLimiter, async (request, response) => {
  const parsed = mfaSetupTokenSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: "Jeton de configuration invalide." })
    return
  }
  const client = await pool.connect()
  let secret: string
  let email: string
  let userId: string
  try {
    await client.query("BEGIN")
    const challenge = await client.query<{
      id: string
      user_id: string
      email: string
    }>(
      `SELECT challenge.id, account.id AS user_id, account.email
       FROM editor_mfa_challenges challenge
       JOIN users account ON account.id = challenge.user_id
       WHERE challenge.challenge_hash = $1 AND challenge.purpose = 'setup'
         AND challenge.consumed_at IS NULL AND challenge.expires_at > now()
         AND account.active = true AND account.role = 'EDITOR'
         AND account.mfa_enabled_at IS NULL AND account.mfa_secret_encrypted IS NULL
       FOR UPDATE OF challenge, account`,
      [hashMfaChallengeToken(parsed.data.setupToken)],
    )
    const current = challenge.rows[0]
    if (!current) {
      await client.query("ROLLBACK")
      response.status(400).json({ error: "Jeton de configuration invalide ou expiré." })
      return
    }
    secret = createTotpSecret()
    email = current.email
    userId = current.user_id
    await client.query(
      `UPDATE users SET mfa_pending_secret_encrypted = $1
       WHERE id = $2 AND active = true AND role = 'EDITOR'
         AND mfa_enabled_at IS NULL AND mfa_secret_encrypted IS NULL`,
      [encryptTotpSecret(secret), userId],
    )
    await writeAuditLog(client, request, {
      actorId: userId,
      actorRole: "EDITOR",
      targetType: "user",
      targetId: userId,
      action: "EDITOR_MFA_SETUP_STARTED",
    })
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
  response.setHeader("Cache-Control", "no-store")
  response.json({
    data: { secret, provisioningUri: provisioningUri(secret, email) },
  })
})

router.post("/mfa/enable", mfaLimiter, async (request, response) => {
  const parsed = mfaSetupTokenSchema.extend({
    code: z.string().regex(/^\d{6}$/),
  }).safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: "Code de vérification invalide." })
    return
  }
  const client = await pool.connect()
  let userId: string
  let rememberMe: boolean
  let recoveryCodes: string[]
  try {
    await client.query("BEGIN")
    const challenge = await client.query<{
      id: string
      user_id: string
      remember_me: boolean
      mfa_pending_secret_encrypted: string | null
    }>(
      `SELECT challenge.id, challenge.user_id, challenge.remember_me,
              account.mfa_pending_secret_encrypted
       FROM editor_mfa_challenges challenge
       JOIN users account ON account.id = challenge.user_id
       WHERE challenge.challenge_hash = $1 AND challenge.purpose = 'setup'
         AND challenge.consumed_at IS NULL AND challenge.expires_at > now()
         AND account.active = true AND account.role = 'EDITOR'
         AND account.mfa_enabled_at IS NULL AND account.mfa_secret_encrypted IS NULL
       FOR UPDATE OF challenge, account`,
      [hashMfaChallengeToken(parsed.data.setupToken)],
    )
    const current = challenge.rows[0]
    if (!current?.mfa_pending_secret_encrypted) {
      await client.query("ROLLBACK")
      response.status(400).json({ error: "Configuration MFA absente ou expirée." })
      return
    }
    const secret = decryptTotpSecret(current.mfa_pending_secret_encrypted)
    if (!verifyTotp(secret, parsed.data.code)) {
      await client.query("ROLLBACK")
      response.status(401).json({ error: "Code d’authentification incorrect." })
      return
    }
    userId = current.user_id
    rememberMe = current.remember_me
    recoveryCodes = createRecoveryCodes()
    await client.query(
      `UPDATE users
       SET mfa_secret_encrypted = mfa_pending_secret_encrypted,
           mfa_pending_secret_encrypted = NULL, mfa_enabled_at = now()
       WHERE id = $1`,
      [userId],
    )
    for (const code of recoveryCodes) {
      await client.query(
        `INSERT INTO editor_mfa_recovery_codes (user_id, code_hash)
         VALUES ($1, $2)`,
        [userId, hashRecoveryCode(code)],
      )
    }
    await client.query(
      `UPDATE editor_mfa_challenges SET consumed_at = now()
       WHERE user_id = $1 AND purpose = 'setup' AND consumed_at IS NULL`,
      [userId],
    )
    await writeAuditLog(client, request, {
      actorId: userId,
      actorRole: "EDITOR",
      targetType: "user",
      targetId: userId,
      action: "EDITOR_MFA_ENABLED",
      payloadMasked: { recoveryCodesIssued: recoveryCodes.length },
    })
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
  const user = await authenticateUserById(userId)
  if (!user) {
    response.status(401).json({ error: "Le compte éditeur n’est plus disponible." })
    return
  }
  issueSession(response, user, rememberMe)
  response.setHeader("Cache-Control", "no-store")
  response.json({ user: publicUser(user), recoveryCodes })
})

router.post("/mfa/verify", mfaLimiter, async (request, response) => {
  const parsed = z.object({
    challengeToken: z.string().min(32).max(128),
    code: z.string().regex(/^\d{6}$/).optional(),
    recoveryCode: z.string().min(16).max(32).optional(),
  }).refine((value) => Boolean(value.code) !== Boolean(value.recoveryCode)).safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: "Code MFA ou code de secours invalide." })
    return
  }
  const client = await pool.connect()
  let userId: string
  let rememberMe: boolean
  let usedRecoveryCode = false
  try {
    await client.query("BEGIN")
    const challenge = await client.query<{
      id: string
      user_id: string
      remember_me: boolean
      mfa_secret_encrypted: string | null
    }>(
      `SELECT challenge.id, challenge.user_id, challenge.remember_me,
              account.mfa_secret_encrypted
       FROM editor_mfa_challenges challenge
       JOIN users account ON account.id = challenge.user_id
       WHERE challenge.challenge_hash = $1 AND challenge.purpose = 'login'
         AND challenge.consumed_at IS NULL AND challenge.expires_at > now()
         AND account.active = true AND account.role = 'EDITOR'
         AND account.mfa_enabled_at IS NOT NULL
       FOR UPDATE OF challenge, account`,
      [hashMfaChallengeToken(parsed.data.challengeToken)],
    )
    const current = challenge.rows[0]
    if (!current?.mfa_secret_encrypted) {
      await client.query("ROLLBACK")
      response.status(400).json({ error: "Défi MFA invalide ou expiré." })
      return
    }
    if (parsed.data.code) {
      if (!verifyTotp(decryptTotpSecret(current.mfa_secret_encrypted), parsed.data.code)) {
        await client.query("ROLLBACK")
        response.status(401).json({ error: "Code d’authentification incorrect." })
        return
      }
    } else {
      const codeHash = hashRecoveryCode(parsed.data.recoveryCode!)
      const recovery = await client.query(
        `SELECT code_hash FROM editor_mfa_recovery_codes
         WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL
         FOR UPDATE`,
        [current.user_id, codeHash],
      )
      if (!recovery.rowCount) {
        await client.query("ROLLBACK")
        response.status(401).json({ error: "Code de secours invalide ou déjà utilisé." })
        return
      }
      await client.query(
        `UPDATE editor_mfa_recovery_codes SET used_at = now()
         WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL`,
        [current.user_id, codeHash],
      )
      usedRecoveryCode = true
    }
    await client.query(
      "UPDATE editor_mfa_challenges SET consumed_at = now() WHERE id = $1",
      [current.id],
    )
    userId = current.user_id
    rememberMe = current.remember_me
    await writeAuditLog(client, request, {
      actorId: userId,
      actorRole: "EDITOR",
      targetType: "user",
      targetId: userId,
      action: usedRecoveryCode ? "EDITOR_MFA_RECOVERY_CODE_USED" : "EDITOR_MFA_LOGIN",
    })
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
  const user = await authenticateUserById(userId)
  if (!user) {
    response.status(401).json({ error: "Le compte éditeur n’est plus disponible." })
    return
  }
  issueSession(response, user, rememberMe)
  response.json({ user: publicUser(user) })
})

router.post("/first-password", authenticate, async (request, response) => {
  const parsed = z.object({
    newPassword: z.string().min(12).max(128),
  }).safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 12 caractères." })
    return
  }

  const user = request.authUser!
  if (!user.mustChangePassword) {
    response.status(409).json({ error: "Aucun changement obligatoire n’est en attente." })
    return
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const current = await client.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1 AND active = true AND must_change_password = true FOR UPDATE",
      [user.id],
    )
    if (!current.rowCount) {
      await client.query("ROLLBACK")
      response.status(409).json({ error: "Le compte ne nécessite plus de changement de mot de passe." })
      return
    }
    if (await bcrypt.compare(parsed.data.newPassword, current.rows[0].password_hash)) {
      await client.query("ROLLBACK")
      response.status(400).json({ error: "Choisissez un mot de passe différent du mot de passe provisoire." })
      return
    }
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    await client.query(
      `UPDATE users
       SET password_hash = $1, must_change_password = false,
           session_version = session_version + 1
       WHERE id = $2`,
      [passwordHash, user.id],
    )
    await writeAuditLog(client, request, {
      actorId: user.id,
      actorRole: user.role,
      tenantId: user.tenantId,
      targetType: "user",
      targetId: user.id,
      action: "FIRST_PASSWORD_CHANGED",
    })
    await client.query("COMMIT")
    clearSession(response)
    response.status(204).end()
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
})

router.get("/profile/photo", authenticate, async (request, response) => {
  const result = await pool.query<{
    profile_photo_data: Buffer | null
    profile_photo_content_type: string | null
  }>(
    `SELECT profile_photo_data, profile_photo_content_type
     FROM users WHERE id = $1 AND active = true`,
    [request.authUser!.id],
  )
  const photo = result.rows[0]
  if (!photo?.profile_photo_data || !photo.profile_photo_content_type) {
    response.status(404).json({ error: "Aucune photo de profil enregistrée." })
    return
  }
  response.setHeader("Cache-Control", "private, no-store")
  response.setHeader("X-Content-Type-Options", "nosniff")
  response.type(photo.profile_photo_content_type).send(photo.profile_photo_data)
})

router.put("/profile/photo", authenticate, async (request, response) => {
  const parsed = profilePhotoSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: "Photo ou format invalide." })
    return
  }

  const image = Buffer.from(parsed.data.imageBase64, "base64")
  const canonicalBase64 = image.toString("base64").replace(/=+$/, "")
  if (
    image.length === 0 ||
    image.length > 2 * 1024 * 1024 ||
    canonicalBase64 !== parsed.data.imageBase64.replace(/=+$/, "")
  ) {
    response.status(400).json({ error: "La photo doit peser au maximum 2 Mo." })
    return
  }

  const { contentType } = parsed.data
  const validSignature =
    (contentType === "image/jpeg" && image.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ) ||
    (contentType === "image/png" && image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (contentType === "image/webp" && image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 12) === "WEBP")
  if (!validSignature) {
    response.status(400).json({ error: "Le contenu ne correspond pas au format image choisi." })
    return
  }

  const user = request.authUser!
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    if (user.tenantId) {
      const capacity = await tenantStorageCapacity(
        client,
        user.tenantId,
        image.length,
        user.id,
      )
      if (!capacity.allowed) {
        await client.query("ROLLBACK")
        response.status(409).json({
          error: `La limite de stockage du plan (${capacity.maxStorageMb} Mo) est atteinte.`,
        })
        return
      }
    }
    const updated = await client.query(
      `UPDATE users
       SET profile_photo_data = $1, profile_photo_content_type = $2
       WHERE id = $3 AND active = true
       RETURNING id`,
      [image, contentType, user.id],
    )
    if (!updated.rowCount) {
      await client.query("ROLLBACK")
      response.status(401).json({ error: "Votre compte n’est plus actif." })
      return
    }
    await client.query("COMMIT")
    response.json({ data: { profilePhotoUrl: "/api/auth/profile/photo" } })
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
})

router.delete("/profile/photo", authenticate, async (request, response) => {
  await pool.query(
    `UPDATE users
     SET profile_photo_data = NULL, profile_photo_content_type = NULL
     WHERE id = $1 AND active = true`,
    [request.authUser!.id],
  )
  response.status(204).end()
})

router.patch("/profile", authenticate, async (request, response) => {
  const parsed = profileSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(400).json({
      error: "Vérifiez votre nom, votre email et votre téléphone.",

      details: parsed.error.flatten().fieldErrors,
    })

    return
  }

  if (parsed.data.phone && parsed.data.phone.length < 7) {
    response.status(400).json({
      error: "Le numéro de téléphone doit contenir au moins 7 caractères.",
    })

    return
  }

  const { fullName, email, phone } = parsed.data

  const normalizedPhone = phone || null

  const initials = fullName

    .split(/\s+/)

    .slice(0, 2)

    .map((part) => part[0]!.toLocaleUpperCase("fr-FR"))

    .join("")

  try {
    const updated = await pool.query(
      `UPDATE users
       SET full_name = $1, initials = $2, email = $3, phone = $4
       WHERE id = $5 AND active = true
       RETURNING id`,

      [fullName, initials, email, normalizedPhone, request.authUser!.id],
    )

    if (!updated.rowCount) {
      response.status(401).json({ error: "Votre compte n’est plus actif." })

      return
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      response.status(409).json({
        error: "Cet email ou ce numéro de téléphone est déjà utilisé.",
      })

      return
    }

    throw error
  }

  response.json({
    user: publicUser({
      ...request.authUser!,

      fullName,

      initials,

      email,

      phone: normalizedPhone,
    }),
  })
})

router.get("/me", authenticate, (request, response) => {
  response.json({ user: publicUser(request.authUser!) })
})

router.post("/logout", (_request, response) => {
  clearSession(response)

  response.status(204).end()
})

export default router
