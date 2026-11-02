import assert from "node:assert/strict"

import { readFile } from "node:fs/promises"

import { spawnSync } from "node:child_process"

const configModule = new URL("../../dist-server/config.js", import.meta.url)
  .href

const importConfig = `import(${JSON.stringify(configModule)})`

const databaseUrl = "postgresql://preflight:preflight@db.invalid:5432/preflight"

function loadProductionConfig({
  databaseSsl,
  jwtSecret,
  mfaEncryptionKey,
  emailProvider = "resend",
  resendApiKey = "re_test_key",
  gmailUser = "",
  gmailAppPassword = "",
  emailFrom = "Chantier Connect <no-reply@example.com>",
  appOrigin = "https://app.example.com",
}) {
  return spawnSync(
    process.execPath,

    ["--input-type=module", "--eval", importConfig],

    {
      cwd: process.cwd(),

      encoding: "utf8",

      env: {
        ...process.env,

        NODE_ENV: "production",

        DATABASE_URL: databaseUrl,

        DATABASE_SSL: databaseSsl,

        JWT_SECRET: jwtSecret,

        MFA_ENCRYPTION_KEY: mfaEncryptionKey,

        EMAIL_PROVIDER: emailProvider,

        RESEND_API_KEY: resendApiKey,

        GMAIL_USER: gmailUser,

        GMAIL_APP_PASSWORD: gmailAppPassword,

        EMAIL_FROM: emailFrom,

        APP_ORIGIN: appOrigin,
      },
    },
  )
}

const secureSecret = "aB3dE5fG7hJ9kL2mN4pQ6rS8tU0vW1xY"

  .repeat(2)

  .slice(0, 64)

const secureMfaKey = Buffer.alloc(32, 37).toString("base64")

const valid = loadProductionConfig({
  databaseSsl: "true",

  jwtSecret: secureSecret,

  mfaEncryptionKey: secureMfaKey,
})

assert.equal(
  valid.status,

  0,

  "Une configuration TLS et clé forte doit être acceptée.",
)

assert.ok(
  !valid.stdout.includes(secureSecret) && !valid.stderr.includes(secureSecret),

  "Le contrôle ne doit jamais afficher la clé JWT.",
)

const insecureDatabase = loadProductionConfig({
  databaseSsl: "false",

  jwtSecret: secureSecret,

  mfaEncryptionKey: secureMfaKey,
})

assert.notEqual(
  insecureDatabase.status,

  0,

  "La production doit refuser PostgreSQL sans TLS.",
)

assert.ok(
  !insecureDatabase.stdout.includes(secureSecret) &&
    !insecureDatabase.stderr.includes(secureSecret),

  "Le contrôle ne doit jamais afficher la clé JWT.",
)

const shortSecret = loadProductionConfig({
  databaseSsl: "true",

  jwtSecret: "short-secret",

  mfaEncryptionKey: secureMfaKey,
})

assert.notEqual(
  shortSecret.status,

  0,

  "La production doit refuser une clé JWT trop courte.",
)

const exampleSecret = loadProductionConfig({
  databaseSsl: "true",

  jwtSecret: "replace-with-a-random-secret-of-at-least-32-characters",

  mfaEncryptionKey: secureMfaKey,
})

assert.notEqual(
  exampleSecret.status,

  0,

  "La production doit refuser la clé d’exemple.",
)

const missingMfaKey = loadProductionConfig({
  databaseSsl: "true",
  jwtSecret: secureSecret,
})
assert.notEqual(
  missingMfaKey.status,
  0,
  "La production doit refuser l’absence de clé de chiffrement MFA.",
)

const missingEmailConfiguration = loadProductionConfig({
  databaseSsl: "true",
  jwtSecret: secureSecret,
  mfaEncryptionKey: secureMfaKey,
  emailProvider: "resend",
  resendApiKey: "",
  emailFrom: "",
  appOrigin: "",
})
assert.notEqual(
  missingEmailConfiguration.status,
  0,
  "La production doit refuser l’absence de configuration des emails de sécurité.",
)

const insecureAppOrigin = loadProductionConfig({
  databaseSsl: "true",
  jwtSecret: secureSecret,
  mfaEncryptionKey: secureMfaKey,
  appOrigin: "http://app.example.com",
})
assert.notEqual(
  insecureAppOrigin.status,
  0,
  "La production doit refuser une origine frontend sans HTTPS.",
)

const validGmail = loadProductionConfig({
  databaseSsl: "true",
  jwtSecret: secureSecret,
  mfaEncryptionKey: secureMfaKey,
  emailProvider: "gmail",
  resendApiKey: "",
  gmailUser: "recette@example.com",
  gmailAppPassword: "abcd efgh ijkl mnop",
  emailFrom: "",
})
assert.equal(
  validGmail.status,
  0,
  "Une configuration Gmail avec mot de passe d’application doit être acceptée.",
)

const missingGmailAppPassword = loadProductionConfig({
  databaseSsl: "true",
  jwtSecret: secureSecret,
  mfaEncryptionKey: secureMfaKey,
  emailProvider: "gmail",
  resendApiKey: "",
  gmailUser: "recette@example.com",
  gmailAppPassword: "",
  emailFrom: "",
})
assert.notEqual(
  missingGmailAppPassword.status,
  0,
  "La production doit refuser Gmail sans mot de passe d’application.",
)

const malformedGmailAppPassword = loadProductionConfig({
  databaseSsl: "true",
  jwtSecret: secureSecret,
  mfaEncryptionKey: secureMfaKey,
  emailProvider: "gmail",
  resendApiKey: "",
  gmailUser: "recette@example.com",
  gmailAppPassword: "too-short",
  emailFrom: "",
})
assert.notEqual(
  malformedGmailAppPassword.status,
  0,
  "La production doit refuser un mot de passe d’application Gmail mal formé.",
)

const manifest = JSON.parse(
  await readFile(
    new URL("../../frontend/public/manifest.webmanifest", import.meta.url),
    "utf8",
  ),
)
assert.equal(manifest.display, "standalone")
assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"))
assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"))
const serviceWorker = await readFile(
  new URL("../../frontend/public/sw.js", import.meta.url),
  "utf8",
)
assert.ok(serviceWorker.includes('url.pathname.startsWith("/api/")'))
assert.ok(serviceWorker.includes('caches.match("/index.html")'))

console.info(
  "Configuration de production et ressources PWA : prérequis positifs et négatifs vérifiés.",
)
