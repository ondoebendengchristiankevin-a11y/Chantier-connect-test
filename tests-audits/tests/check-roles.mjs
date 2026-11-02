import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import "dotenv/config"

const baseUrl = new URL(
  process.env.CHECK_ROLES_BASE_URL ?? "http://127.0.0.1:3001",
)

const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"])
const isLoopback = loopbackHosts.has(baseUrl.hostname)
const isRemoteAllowed =
  process.env.CHECK_ROLES_ALLOW_REMOTE === "true" &&
  baseUrl.protocol === "https:"

assert.ok(
  !baseUrl.username &&
    !baseUrl.password &&
    !baseUrl.search &&
    !baseUrl.hash &&
    ((isLoopback && baseUrl.protocol === "http:") || isRemoteAllowed),
  "La recette exige localhost en HTTP ou CHECK_ROLES_ALLOW_REMOTE=true avec HTTPS pour une cible distante; ne placez aucun secret dans l’URL.",
)

const roles = [
  {
    email: "editeur@chantierconnect.ga",

    role: "EDITOR",

    sites: null,

    finance: false,

    platform: true,

    team: false,

    reports: false,

    photos: false,

    attendance: false,
  },

  {
    email: "admin@okoume-btp.ga",

    role: "ADMIN_ENTERPRISE",

    sites: [
      "Résidence Les Palmiers",
      "École Nzeng-Ayong",
      "Centre médical Owendo",
    ],

    finance: true,

    platform: false,

    team: true,

    reports: true,

    photos: true,

    attendance: false,
  },

  {
    email: "conducteur@okoume-btp.ga",

    role: "CONDUCTEUR",

    sites: ["Résidence Les Palmiers"],

    finance: false,

    platform: false,

    team: true,

    reports: true,

    photos: true,

    attendance: false,
  },

  {
    email: "chef@okoume-btp.ga",

    role: "CHEF_CHANTIER",

    sites: ["Résidence Les Palmiers"],

    finance: false,

    platform: false,

    team: true,

    reports: true,

    photos: true,

    attendance: true,
  },

  {
    email: "compagnon@okoume-btp.ga",

    role: "COMPAGNON",

    sites: ["Résidence Les Palmiers"],

    finance: false,

    platform: false,

    team: false,

    reports: false,

    photos: true,

    attendance: true,
  },

  {
    email: "sous-traitant@elecplus.ga",

    role: "SOUS_TRAITANT",

    sites: ["Centre médical Owendo"],

    finance: false,

    platform: false,

    team: false,

    reports: false,

    photos: true,

    attendance: false,
  },

  {
    email: "comptable@okoume-btp.ga",

    role: "COMPTABLE",

    sites: [
      "Résidence Les Palmiers",
      "École Nzeng-Ayong",
      "Centre médical Owendo",
    ],

    finance: true,

    platform: false,

    team: false,

    reports: true,

    photos: false,

    attendance: false,
  },

  {
    email: "client@ministere.ga",

    role: "MAITRE_OUVRAGE",

    sites: ["École Nzeng-Ayong"],

    finance: false,

    platform: false,

    team: false,

    reports: true,

    photos: true,

    attendance: false,
  },
]

const usersJson = process.env.CHECK_ROLES_USERS_JSON
let users
if (usersJson) {
  let configuredUsers
  try {
    configuredUsers = JSON.parse(usersJson)
  } catch {
    throw new Error("CHECK_ROLES_USERS_JSON doit contenir un JSON valide.")
  }

  assert.ok(
    Array.isArray(configuredUsers),
    "CHECK_ROLES_USERS_JSON doit être un tableau de comptes de recette.",
  )
  assert.deepEqual(
    configuredUsers.map((user) => user.role).sort(),
    roles.map((user) => user.role).sort(),
    "Le JSON doit contenir exactement un compte de recette pour chacun des huit rôles.",
  )
  for (const user of configuredUsers) {
    assert.ok(
      typeof user.email === "string" &&
        user.email.length > 0 &&
        typeof user.password === "string" &&
        user.password.length > 0,
      `Email et mot de passe requis pour le rôle ${user.role}.`,
    )
    assert.ok(
      user.role === "EDITOR"
        ? user.sites === null
        : Array.isArray(user.sites) &&
            user.sites.every((site) => typeof site === "string"),
      `Sites attendus invalides pour le rôle ${user.role}.`,
    )
  }
  users = roles.map((policy) => ({
    ...policy,
    ...configuredUsers.find((user) => user.role === policy.role),
  }))
} else {
  const demoPassword = process.env.DEMO_SEED_PASSWORD
  assert.ok(
    demoPassword,
    "Définissez CHECK_ROLES_USERS_JSON pour la préproduction, ou DEMO_SEED_PASSWORD pour les comptes de démonstration locaux.",
  )
  users = roles.map((user) => ({ ...user, password: demoPassword }))
}

const secondaryEmail = process.env.CHECK_ROLES_SECOND_TENANT_EMAIL
const secondaryPassword = process.env.CHECK_ROLES_SECOND_TENANT_PASSWORD
if (!isLoopback) {
  assert.ok(
    usersJson && secondaryEmail && secondaryPassword,
    "Une cible distante exige huit comptes de recette dédiés et CHECK_ROLES_SECOND_TENANT_EMAIL/PASSWORD.",
  )
}

async function request(path, options = {}, cookie) {
  const headers = new Headers(options.headers)

  if (cookie) headers.set("Cookie", cookie)

  const response = await fetch(new URL(path, baseUrl), {
    ...options,
    headers,
    signal: AbortSignal.timeout(10_000),
  })

  let body

  try {
    body = response.status === 204 ? null : await response.json()
  } catch {
    throw new Error(
      `${options.method ?? "GET"} ${path} a renvoyé une réponse JSON invalide.`,
    )
  }

  return { response, body }
}

function currentTotpCode(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = 0
  let value = 0
  const bytes = []
  for (const character of secret.toUpperCase().replace(/=+$/, "")) {
    const digit = alphabet.indexOf(character)
    assert.ok(digit >= 0, "CHECK_ROLES_EDITOR_TOTP_SECRET doit être une clé Base32.")
    value = (value << 5) | digit
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)))
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest()
  const offset = digest[digest.length - 1] & 15
  const binary =
    ((digest[offset] & 127) << 24) |
    ((digest[offset + 1] & 255) << 16) |
    ((digest[offset + 2] & 255) << 8) |
    (digest[offset + 3] & 255)
  return String(binary % 1_000_000).padStart(6, "0")
}

async function saveEditorTotpSecret(secret) {
  const envPath = path.join(process.cwd(), ".env")
  let contents

  try {
    contents = await readFile(envPath, "utf8")
  } catch (error) {
    throw new Error(
      "Impossible d’enregistrer la clé MFA locale : le fichier .env racine doit déjà exister.",
      { cause: error },
    )
  }

  const lines = contents.split(/\r?\n/)
  const variableIndex = lines.findIndex((line) =>
    /^\s*CHECK_ROLES_EDITOR_TOTP_SECRET\s*=/.test(line),
  )

  if (variableIndex >= 0) {
    const existingValue = lines[variableIndex].slice(
      lines[variableIndex].indexOf("=") + 1,
    )
    assert.equal(
      existingValue.trim(),
      "",
      "Une clé TOTP locale existe déjà dans .env; elle ne sera pas remplacée.",
    )
    lines[variableIndex] = `CHECK_ROLES_EDITOR_TOTP_SECRET=${secret}`
    contents = lines.join("\n")
  } else {
    contents += `${contents.endsWith("\n") || contents.length === 0 ? "" : "\n"}CHECK_ROLES_EDITOR_TOTP_SECRET=${secret}\n`
  }

  await writeFile(envPath, contents, "utf8")
  process.env.CHECK_ROLES_EDITOR_TOTP_SECRET = secret
}

async function login(email, password, expectedRole) {
  let { response, body } = await request("/api/auth/login", {
    method: "POST",

    headers: { "Content-Type": "application/json" },

    body: JSON.stringify({ identifier: email, password, rememberMe: false }),
  })

  assert.equal(
    response.status,
    200,
    `Connexion de recette refusée pour ${email}.`,
  )

  if (body.mfaSetupRequired) {
    assert.equal(expectedRole, "EDITOR")
    assert.ok(
      isLoopback &&
        process.env.CHECK_ROLES_AUTO_ENROLL_EDITOR_MFA === "true",
      "Le compte Éditeur doit terminer son enrôlement MFA. Pour un compte de recette local uniquement, définissez CHECK_ROLES_AUTO_ENROLL_EDITOR_MFA=true; le secret généré sera conservé dans le fichier .env racine.",
    )
    const setup = await request("/api/auth/mfa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupToken: body.setupToken }),
    })
    assert.equal(
      setup.response.status,
      200,
      `Échec de l’initialisation MFA : ${JSON.stringify(setup.body)}`,
    )
    const secret = setup.body.data?.secret
    assert.ok(
      typeof secret === "string" && /^[A-Z2-7]+$/.test(secret),
      "Le serveur a renvoyé une clé TOTP invalide.",
    )
    await saveEditorTotpSecret(secret)
    const enabled = await request("/api/auth/mfa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setupToken: body.setupToken,
        code: currentTotpCode(secret),
      }),
    })
    assert.equal(
      enabled.response.status,
      200,
      `Échec de l’activation MFA : ${JSON.stringify(enabled.body)}`,
    )
    body = enabled.body
    response = enabled.response
  }
  if (body.mfaRequired) {
    assert.equal(expectedRole, "EDITOR")
    const secret = process.env.CHECK_ROLES_EDITOR_TOTP_SECRET
    assert.ok(
      secret,
      "La clé MFA locale est absente. Définissez CHECK_ROLES_EDITOR_TOTP_SECRET ou utilisez une fois CHECK_ROLES_AUTO_ENROLL_EDITOR_MFA=true sur une cible locale.",
    )
    const verified = await request("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeToken: body.challengeToken,
        code: currentTotpCode(secret),
      }),
    })
    assert.equal(verified.response.status, 200, "Code TOTP Éditeur invalide.")
    body = verified.body
    response = verified.response
  }

  const cookieHeader = response.headers.get("set-cookie")

  const cookie = cookieHeader?.match(/(?:^|,\s*)cc_session=([^;,\s]+)/)?.[1]

  assert.ok(cookie, `Cookie de session absent après la connexion de ${email}.`)

  return { user: body.user, cookie: `cc_session=${cookie}` }
}

async function checkStatus(session, path, expectedStatus, label) {
  const { response } = await request(path, {}, session.cookie)

  assert.equal(
    response.status,

    expectedStatus,

    `${session.user.role}: accès inattendu à ${label}.`,
  )
}

const sessions = new Map()

for (const expected of users) {
  const session = await login(expected.email, expected.password, expected.role)

  assert.equal(
    session.user.role,
    expected.role,
    `Rôle incorrect pour ${expected.email}.`,
  )

  sessions.set(expected.role, session)

  const siteResult = await request("/api/sites", {}, session.cookie)

  if (expected.sites === null) {
    assert.equal(
      siteResult.response.status,
      403,
      "L’éditeur ne doit pas accéder aux chantiers d’entreprise.",
    )
  } else {
    assert.equal(
      siteResult.response.status,
      200,
      `${expected.role}: lecture des chantiers refusée.`,
    )

    assert.deepEqual(
      siteResult.body.data.map((site) => site.name).sort(),

      [...expected.sites].sort(),

      `${expected.role}: périmètre des chantiers incorrect.`,
    )
  }

  await checkStatus(
    session,
    "/api/finance",
    expected.finance ? 200 : 403,
    "la finance",
  )

  await checkStatus(
    session,
    "/api/platform/overview",
    expected.platform ? 200 : 403,
    "le back-office éditeur",
  )

  await checkStatus(session, "/api/team", expected.team ? 200 : 403, "l’équipe")

  await checkStatus(
    session,
    "/api/reports",
    expected.reports ? 200 : 403,
    "les rapports",
  )

  await checkStatus(
    session,
    "/api/photos",
    expected.photos ? 200 : 403,
    "les photos",
  )

  await checkStatus(
    session,
    "/api/attendance",
    expected.attendance ? 200 : 403,
    "le pointage",
  )

  console.info(`OK ${expected.role}`)
}

assert.equal(
  Boolean(secondaryEmail),

  Boolean(secondaryPassword),

  "Renseignez les deux variables CHECK_ROLES_SECOND_TENANT_EMAIL et CHECK_ROLES_SECOND_TENANT_PASSWORD, ou aucune.",
)

if (secondaryEmail && secondaryPassword) {
  const primary = sessions.get("ADMIN_ENTERPRISE")

  const secondary = await login(secondaryEmail, secondaryPassword)

  assert.equal(
    secondary.user.role,
    "ADMIN_ENTERPRISE",
    "Le compte du second tenant doit être administrateur entreprise.",
  )

  assert.notEqual(
    secondary.user.tenantId,
    primary.user.tenantId,
    "Les comptes de recette doivent appartenir à deux entreprises distinctes.",
  )

  const [primarySites, secondarySites] = await Promise.all([
    request("/api/sites", {}, primary.cookie),

    request("/api/sites", {}, secondary.cookie),
  ])

  assert.equal(primarySites.response.status, 200)

  assert.equal(secondarySites.response.status, 200)

  assert.ok(
    primarySites.body.data.length > 0,
    "Le premier tenant doit avoir au moins un chantier de recette.",
  )

  assert.ok(
    secondarySites.body.data.length > 0,
    "Le second tenant doit avoir au moins un chantier de recette.",
  )

  const primarySiteIds = new Set(primarySites.body.data.map((site) => site.id))

  const secondarySiteIds = new Set(
    secondarySites.body.data.map((site) => site.id),
  )

  assert.ok(
    [...primarySiteIds].every((id) => !secondarySiteIds.has(id)),

    "Les listes de chantiers des deux tenants se chevauchent.",
  )

  for (const [session, foreignSiteId] of [
    [primary, secondarySites.body.data[0].id],

    [secondary, primarySites.body.data[0].id],
  ]) {
    const { response } = await request(
      "/api/tasks",

      {
        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({
          siteId: foreignSiteId,

          title: "Sonde de cloisonnement",

          description: "",

          category: "Recette",

          priority: "Normale",

          status: "À faire",
        }),
      },

      session.cookie,
    )

    assert.equal(
      response.status,
      404,
      "La création sur un chantier d’une autre entreprise doit être refusée.",
    )
  }

  console.info("OK cloisonnement entre deux entreprises")
} else {
  console.warn(
    "RECETTE PARTIELLE : l’isolation entre deux entreprises n’a pas été testée. Fournissez un compte administrateur de recette du second tenant pour activer ce contrôle.",
  )
}

console.info("Contrôles des parcours par rôle terminés.")
