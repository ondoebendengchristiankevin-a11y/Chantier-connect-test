import { existsSync, readFileSync } from "node:fs"

import pg from "pg"
import { resolve } from "node:path"
import { config } from "./config.js"
import { fileURLToPath } from "node:url"

function postgresTlsConfig() {
  if (!config.DATABASE_SSL) return false
  const caPath = [
    resolve(process.cwd(), "prod-ca-2021.crt"),
    resolve(process.cwd(), "backend", "prod-ca-2021.crt"),
    fileURLToPath(new URL("../prod-ca-2021.crt", import.meta.url)),
  ].find(existsSync)
  if (!caPath) {
    throw new Error("Le certificat PostgreSQL prod-ca-2021.crt est introuvable.")
  }
  return {
    ca: readFileSync(caPath, "utf8"),
    rejectUnauthorized: true,
  }
}

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ssl: postgresTlsConfig(),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on("error", (error) => {
  console.error("Erreur inattendue du pool PostgreSQL :", error)
})
