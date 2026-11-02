import { z } from "zod"

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().min(1).max(65535).default(3001),

  DATABASE_URL: z.string().min(1, "DATABASE_URL est obligatoire."),

  DATABASE_SSL: z

    .enum(["true", "false"])

    .default("false")

    .transform((value) => value === "true"),

  JWT_SECRET: z
    .string()
    .min(64, "JWT_SECRET doit contenir au moins 64 caractères aléatoires."),

  MFA_ENCRYPTION_KEY: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().refine((value) => {
      const decoded = Buffer.from(value, "base64")
      return decoded.length === 32 && decoded.toString("base64") === value
    }, "MFA_ENCRYPTION_KEY doit être une clé Base64 aléatoire de 32 octets.").optional(),
  ),

  EMAIL_PROVIDER: z.enum(["gmail", "resend"]).default("resend"),

  RESEND_API_KEY: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(1).optional(),
  ),

  GMAIL_USER: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.email().trim().toLowerCase().optional(),
  ),

  GMAIL_APP_PASSWORD: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string()
      .trim()
      .refine(
        (value) => value.replace(/\s/g, "").length === 16,
        "GMAIL_APP_PASSWORD doit être un mot de passe d’application Gmail valide.",
      )
      .optional(),
  ),

  EMAIL_FROM: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(3).optional(),
  ),

  APP_ORIGIN: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.url()
      .refine((value) => {
        const url = new URL(value)
        return (
          url.pathname === "/" &&
          !url.search &&
          !url.hash &&
          !url.username &&
          !url.password
        )
      })
      .optional(),
  ),
})

const result = environmentSchema.safeParse(process.env)

if (!result.success) {
  console.error(
    "Configuration backend invalide :",
    result.error.flatten().fieldErrors,
  )

  throw new Error("Vérifiez les variables d’environnement requises.")
}

const productionConfigurationErrors: string[] = []

if (result.data.NODE_ENV === "production") {
  if (!result.data.DATABASE_SSL) {
    productionConfigurationErrors.push("DATABASE_SSL doit être activé.")
  }

  if (!result.data.MFA_ENCRYPTION_KEY) {
    productionConfigurationErrors.push(
      "MFA_ENCRYPTION_KEY doit être configurée pour chiffrer les secrets TOTP.",
    )
  }

  const emailProviderConfigured =
    result.data.EMAIL_PROVIDER === "gmail"
      ? Boolean(result.data.GMAIL_USER && result.data.GMAIL_APP_PASSWORD)
      : Boolean(result.data.RESEND_API_KEY && result.data.EMAIL_FROM)

  if (!emailProviderConfigured || !result.data.APP_ORIGIN) {
    productionConfigurationErrors.push(
      "Configurez le fournisseur email choisi et APP_ORIGIN pour les emails de sécurité.",
    )
  }

  if (
    result.data.APP_ORIGIN &&
    new URL(result.data.APP_ORIGIN).protocol !== "https:"
  ) {
    productionConfigurationErrors.push(
      "APP_ORIGIN doit utiliser HTTPS en production.",
    )
  }

  const isPlaceholderSecret =
    /^(replace-with|change-me|changeme|your[-_]|example)/i.test(
      result.data.JWT_SECRET,
    )

  const hasEnoughSecretVariety = new Set(result.data.JWT_SECRET).size >= 16

  if (
    result.data.JWT_SECRET.length < 64 ||
    isPlaceholderSecret ||
    !hasEnoughSecretVariety
  ) {
    productionConfigurationErrors.push(
      "JWT_SECRET doit être une clé aléatoire d’au moins 64 caractères.",
    )
  }
}

if (
  result.data.JWT_SECRET.length < 64 ||
  /^(replace-with|change-me|changeme|your[-_]|example)/i.test(
    result.data.JWT_SECRET,
  ) ||
  new Set(result.data.JWT_SECRET).size < 16
) {
  throw new Error(
    "JWT_SECRET doit être une clé aléatoire d’au moins 64 caractères et ne pas contenir de valeur par défaut.",
  )
}

if (productionConfigurationErrors.length > 0) {
  console.error(
    "Configuration de production invalide :",

    productionConfigurationErrors,
  )

  throw new Error("Corrigez les prérequis de configuration de production.")
}

export const config = result.data
