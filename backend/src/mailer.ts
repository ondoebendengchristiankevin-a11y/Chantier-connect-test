import { config } from "./config.js"
import nodemailer from "nodemailer"

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }
    return entities[character]!
  })
}

export function isSecurityEmailConfigured() {
  const providerConfigured =
    config.EMAIL_PROVIDER === "gmail"
      ? Boolean(config.GMAIL_USER && config.GMAIL_APP_PASSWORD)
      : Boolean(config.RESEND_API_KEY && config.EMAIL_FROM)
  return providerConfigured && Boolean(config.APP_ORIGIN)
}

export function assertPasswordResetMailConfigured() {
  if (!isSecurityEmailConfigured()) {
    throw new Error("Le service d’envoi des emails de sécurité n’est pas configuré.")
  }
}

export async function sendPasswordResetEmail(input: {
  email: string
  fullName: string
  token: string
}) {
  assertPasswordResetMailConfigured()

  const resetUrl = new URL(
    "/reinitialiser-mot-de-passe",
    config.APP_ORIGIN!,
  )
  resetUrl.searchParams.set("token", input.token)

  if (config.EMAIL_PROVIDER === "gmail") {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: config.GMAIL_USER,
        pass: config.GMAIL_APP_PASSWORD?.replace(/\s/g, ""),
      },
    })
    await transporter.sendMail({
      from: `Chantier Connect <${config.GMAIL_USER}>`,
      to: input.email,
      subject: "Réinitialisation de votre mot de passe Chantier Connect",
      html: `<p>Bonjour ${escapeHtml(input.fullName)},</p>
        <p>Une demande de réinitialisation du mot de passe de votre compte a été reçue.</p>
        <p><a href="${escapeHtml(resetUrl.toString())}">Choisir un nouveau mot de passe</a></p>
        <p>Ce lien expire dans 30 minutes. Si vous n’êtes pas à l’origine de cet email, ignorez-le.</p>`,
      text: `Bonjour ${input.fullName},\n\nChoisissez un nouveau mot de passe dans les 30 minutes : ${resetUrl}\n\nSi vous n’êtes pas à l’origine de cet email, ignorez-le.`,
    })
    return
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to: [input.email],
      subject: "Réinitialisation de votre mot de passe Chantier Connect",
      html: `<p>Bonjour ${escapeHtml(input.fullName)},</p>
        <p>Une demande de réinitialisation du mot de passe de votre compte a été reçue.</p>
        <p><a href="${escapeHtml(resetUrl.toString())}">Choisir un nouveau mot de passe</a></p>
        <p>Ce lien expire dans 30 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>`,
      text: `Bonjour ${input.fullName},\n\nChoisissez un nouveau mot de passe dans les 30 minutes : ${resetUrl}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez cet email.`,
    }),
  })

  if (!response.ok) {
    throw new Error("L’email de réinitialisation n’a pas pu être envoyé.")
  }
}
