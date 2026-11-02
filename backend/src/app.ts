import express, { type ErrorRequestHandler } from "express"

import cors from "cors"

import helmet from "helmet"

import { rateLimit } from "express-rate-limit"

import { ZodError } from "zod"

import { config } from "./config.js"

import { pool } from "./db.js"

import contactRoutes from "./routes/contact.js"

import registrationRequestRoutes from "./routes/registration-requests.js"

import authRoutes from "./routes/auth.js"

import mobilePaymentsRoutes from "./routes/mobile-payments.js"

import paymentsRoutes from "./routes/payments.js"

import platformRoutes from "./routes/platform.js"

import supplierInvoiceRoutes from "./routes/supplier-invoices.js"

import workRoutes from "./routes/work.js"

const app = express()

const allowedOrigins = new Set(
  [
    config.APP_ORIGIN,
    "http://localhost:8443",
    "http://127.0.0.1:8443",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter((value): value is string => Boolean(value)),
)

const appCors = cors({
  origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true)
      return
    }

    callback(new Error("Origine non autorisée pour cette API."))
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 600,
})

if (config.NODE_ENV === "production") app.set("trust proxy", 1)

app.disable("x-powered-by")

app.use(helmet({
  crossOriginResourcePolicy: false,
  referrerPolicy: { policy: "no-referrer" },
}))

app.use(appCors)

app.options(/.*/, appCors)

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: "Trop de demandes d’authentification. Réessayez dans 15 minutes." },
  }),
)

app.use(express.json({ limit: "4mb" }))

app.use("/api/contact", contactRoutes)

app.use("/api/registration-requests", registrationRequestRoutes)

app.get("/api/health", async (_request, response) => {
  try {
    await pool.query("SELECT 1")

    response.json({ status: "ok", database: "connected" })
  } catch (error) {
    console.error("La vérification PostgreSQL a échoué :", error)

    response.status(503).json({ status: "error", database: "unavailable" })
  }
})

app.use("/api/auth", authRoutes)

app.use("/api/mobile-payments", mobilePaymentsRoutes)

app.use("/api/platform", platformRoutes)

app.use("/api/payments", paymentsRoutes)

app.use("/api/supplier-invoices", supplierInvoiceRoutes)

app.use("/api", workRoutes)

app.use((_request, response) => {
  response.status(404).json({ error: "Route API introuvable." })
})

const errorHandler: ErrorRequestHandler = (
  error,

  _request,

  response,

  _next,
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: "Données invalides.",

      details: error.flatten().fieldErrors,
    })

    return
  }

  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400
  ) {
    response.status(400).json({ error: "Corps JSON invalide." })

    return
  }

  console.error("Erreur API non gérée :", error)

  response.status(500).json({ error: "Une erreur interne est survenue." })
}

app.use(errorHandler)

export default app
