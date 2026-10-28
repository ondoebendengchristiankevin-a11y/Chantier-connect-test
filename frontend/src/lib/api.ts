export type Capability = "manage_platform" | "manage_company" | "manage_team" | "manage_sites" | "manage_tasks" | "capture_photos" | "create_reports" | "validate_reports" | "clock_in" | "update_assigned_tasks" | "manage_finance" | "manage_finance_planning" | "manage_company_budget" | "read_finance" | "read_company" | "read_assigned" | "read_team" | "read_validated_reports"

export type UserRole = "EDITOR" | "ADMIN_ENTERPRISE" | "CONDUCTEUR" | "CHEF_CHANTIER" | "COMPAGNON" | "SOUS_TRAITANT" | "COMPTABLE" | "MAITRE_OUVRAGE"

export interface AuthUser {
  id: string

  email: string

  phone: string | null

  fullName: string

  initials: string

  role: UserRole

  roleLabel: string

  tenantId: string | null

  tenantName: string

  tenantPlan: string

  assignedSite: string | null

  assignedSiteId: string | null

  requiresUserConsent: boolean

  sensitiveDataConsented: boolean

  mustChangePassword: boolean

  sections: string[]

  capabilities: Capability[]

  profilePhotoUrl: string | null
}

export interface RecentActivity {
  kind: string

  title: string

  detail: string

  siteName: string

  occurredAt: string
}

export interface Site {
  id: string

  name: string

  description: string | null

  location: string | null

  city: string | null

  province: string | null

  clientName: string | null

  workType: string | null

  contractReference: string | null

  status: "En cours" | "En pause" | "Terminé" | "Archivé" | null

  progress: number | null

  costBudgetFcfa: string | null

  contractAmountFcfa: string | null

  startDate: string | null

  endDate: string | null

  plannedDurationDays: number | null

  hasImage: boolean

  teamCount: number | null

  createdAt: string
}

export interface Task {
  id: string

  siteId: string

  siteName: string

  title: string

  description: string

  category: string

  priority: "Basse" | "Normale" | "Haute" | "Urgente"

  status: "À faire" | "En cours" | "Terminée" | "Bloquée"

  dueDate: string | null

  assignedTo: string | null

  assigneeInitials: string | null

  assigneeName: string | null

  createdAt: string

  updatedAt: string
}

export interface Report {
  id: string

  siteId: string

  siteName: string

  authorId: string

  authorName: string

  workDone: string

  crewCount: number

  status: "À valider" | "Validé" | "Rejeté"

  reportDate: string

  createdAt: string

  validatedAt: string | null
}

export type ManagedRole = "CONDUCTEUR" | "CHEF_CHANTIER" | "COMPAGNON" | "SOUS_TRAITANT" | "COMPTABLE" | "MAITRE_OUVRAGE"

export interface TeamMember {
  id: string

  email: string

  phone: string | null

  fullName: string

  initials: string

  role: ManagedRole | "ADMIN_ENTERPRISE"

  roleLabel: string

  assignedSite: string | null

  assignedSiteId: string | null

  active: boolean

  createdAt: string
}

export interface SitePhoto {
  id: string

  siteId: string

  siteName: string

  authorId: string

  authorName: string

  caption: string

  contentType: string

  sha256: string

  latitude: number | null

  longitude: number | null

  capturedAt: string

  createdAt: string
}

export interface AttendanceRecord {
  id: string

  siteId: string

  siteName: string

  clockInAt: string

  clockOutAt: string | null

  clockInLatitude: number | null

  clockInLongitude: number | null

  clockOutLatitude: number | null

  clockOutLongitude: number | null
}

export interface FinanceEntry {
  id: string

  siteId: string

  siteName: string

  entryType: "engagement" | "encaissement" | "depense"

  category: string

  description: string

  amountFcfa: string

  status: "prévu" | "réalisé"

  dueDate: string | null

  occurredAt: string | null

  createdAt: string
}

export interface FinanceSummary {
  costBudgetFcfa: string

  engagedFcfa: string

  expensesFcfa: string

  plannedReceiptsFcfa: string

  receivedFcfa: string

  cashBalanceFcfa: string
}

export interface PlatformOverview {
  tenantCount: number

  activeTenantCount: number

  trialTenantCount: number

  pastDueTenantCount: number

  activeUserCount: number

  monthlyRevenueFcfa: string

  openTicketCount: number
}

export interface PlatformTenant {
  id: string

  name: string

  status: "Actif" | "Essai" | "Impayé" | "Suspendu" | "Archivé"

  createdAt: string

  planId: string | null

  planName: string | null

  subscriptionStatus: "Essai" | "Actif" | "Impayé" | "Suspendu" | "Résilié" | null

  renewsAt: string | null

  userCount: number

  siteCount: number
}

export interface PlatformUser {
  id: string
  fullName: string
  emailMasked: string
  phoneMasked: string | null
  role: UserRole
  active: boolean
  tenantId: string | null
  tenantName: string
  assignedSiteId: string | null
  assignedSite: string | null
  mustChangePassword: boolean
  requiresUserConsent: boolean
  sensitiveDataConsented: boolean
  createdAt: string
}

export interface PlatformAuditLog {
  id: string
  actorId: string | null
  actorName: string | null
  actorRole: string
  tenantId: string | null
  tenantName: string | null
  targetType: string
  targetId: string
  targetName: string | null
  action: string
  payloadMasked: Record<string, unknown>
  ip: string | null
  userAgent: string | null
  createdAt: string
}

export interface SiteDetail extends Site {
  assignedTeam: Array<{ id: string; fullName: string; role: string; active: boolean }>
}

export type RegistrationRequestStatus =
  | "Nouvelle"
  | "En cours"
  | "Entreprise créée"
  | "Refusée"

export interface RegistrationRequest {
  id: string
  companyName: string
  adminFullName: string
  adminEmail: string
  phone: string | null
  message: string
  status: RegistrationRequestStatus
  createdAt: string
  updatedAt: string
}

export interface SubscriptionPlan {
  id: string

  name: string

  monthlyPriceFcfa: string

  maxUsers: number | null

  maxSites: number | null

  maxStorageMb: number | null

  active: boolean

  subscriberCount?: number
}

export type InvoicePaymentMethod =
  | "Espèces"
  | "Virement bancaire"
  | "Mobile Money"
  | "Autre"

export interface PlatformInvoice {
  id: string

  invoiceNumber: string

  tenantId: string

  tenantName: string

  description: string

  amountFcfa: string

  issuedAt: string

  dueAt: string

  status: "À payer" | "Payée" | "Annulée"

  paymentMethod: InvoicePaymentMethod | null

  paymentReference: string | null

  paidAt: string | null

  closedBy: string | null

  createdAt: string
}

export interface MobilePaymentInvoice {
  id: string

  invoiceNumber: string

  description: string

  amountFcfa: string

  currency: "XAF"

  issuedAt: string

  dueAt: string

  status: PlatformInvoice["status"]
}

export interface MobilePaymentIntent {
  id: string

  provider: string

  status: "En attente" | "Payée" | "Échouée" | "Annulée"

  amountFcfa: string

  currency: "XAF"

  providerReference: string | null

  createdAt: string

  completedAt: string | null
}

export type SupportTicketStatus = "Nouveau" | "En cours" | "En attente client" | "Résolu"

export interface SupportTicket {
  id: string

  tenantId: string

  tenantName: string

  subject: string

  description: string

  priority: "Basse" | "Normale" | "Haute" | "Urgente"

  status: SupportTicketStatus

  createdAt: string

  updatedAt: string

  resolvedAt: string | null
}

export interface TenantSettings {
  legalName: string

  taxId: string

  email: string

  phone: string

  address: string

  city: string

  country: string

  language: "fr"

  currency: "XAF"

  preferences: Record<string, boolean>

  updatedAt: string
}

export interface PlatformSettings {
  name: string

  supportEmail: string

  requestLimit: number

  updatedAt: string
}

export type PaymentDossierStatus = "En préparation" | "Prêt à transmettre" | "En instruction" | "À corriger" | "Payé" | "Refusé"

export interface PaymentDossier {
  id: string

  reference: string

  siteId: string

  siteName: string

  subject: string

  amountFcfa: string

  status: PaymentDossierStatus

  paymentReference: string | null

  dueDate: string | null

  createdAt: string

  updatedAt: string
}

export interface PaymentDossierSummary {
  status: PaymentDossierStatus

  count: number

  amountFcfa: string
}

export type SupplierInvoiceStatus =
  | "En préparation"
  | "À contrôler"
  | "Approuvée"
  | "Payée"
  | "Refusée"

export interface SupplierInvoice {
  id: string
  siteId: string
  siteName: string
  supplierName: string
  invoiceReference: string
  category: string
  description: string
  amountFcfa: string
  invoiceDate: string | null
  dueDate: string | null
  status: SupplierInvoiceStatus
  paymentReference: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CompanyOperatingBudget {
  fiscalYear: number
  amountFcfa: string | null
  notes: string
  updatedAt: string | null
}

export const managedRoles: Array<{ value: ManagedRole; label: string }> = [
  { value: "CONDUCTEUR", label: "Conducteur de travaux" },

  { value: "CHEF_CHANTIER", label: "Chef de chantier" },

  { value: "COMPAGNON", label: "Compagnon" },

  { value: "SOUS_TRAITANT", label: "Sous-traitant" },

  { value: "COMPTABLE", label: "Comptable" },

  { value: "MAITRE_OUVRAGE", label: "Maître d’ouvrage" },
]

export class ApiError extends Error {
  constructor(
    message: string,

    readonly status: number,
  ) {
    super(message)

    this.name = "ApiError"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        "API inaccessible. Vérifiez que le backend est démarré.",
        0,
      )
    }
    throw error
  }

  if (response.status === 204) return undefined as T

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      response.status >= 500
        ? `Erreur interne de l’API (HTTP ${response.status}). Consultez les journaux du backend.`
        : typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "La demande n’a pas pu être traitée. Vérifiez les informations saisies et réessayez."

    throw new ApiError(message, response.status)
  }

  return body as T
}

export const api = {
  async submitRegistrationRequest(input: {
    companyName: string
    adminFullName: string
    adminEmail: string
    phone: string
    message: string
    consent: boolean
    website: string
  }) {
    return request<{ message: string }>("/api/registration-requests", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  async submitContact(input: {
    fullName: string
    email: string
    phone: string
    company: string
    topic: string
    message: string
    consent: boolean
    website: string
  }) {
    return request<{ message: string }>("/api/contact", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  async login(identifier: string, password: string, rememberMe: boolean) {
    return request<
      | { user: AuthUser }
      | { mfaRequired: true; challengeToken: string }
      | { mfaSetupRequired: true; setupToken: string }
    >("/api/auth/login", {
      method: "POST",

      body: JSON.stringify({ identifier, password, rememberMe }),
    })
  },

  async startEditorMfaSetup(setupToken: string) {
    const result = await request<{
      data: { secret: string; provisioningUri: string }
    }>("/api/auth/mfa/setup", {
      method: "POST",
      body: JSON.stringify({ setupToken }),
    })
    return result.data
  },

  async enableEditorMfa(setupToken: string, code: string) {
    return request<{ user: AuthUser; recoveryCodes: string[] }>(
      "/api/auth/mfa/enable",
      { method: "POST", body: JSON.stringify({ setupToken, code }) },
    )
  },

  async verifyEditorMfa(
    challengeToken: string,
    input: { code: string } | { recoveryCode: string },
  ) {
    return request<{ user: AuthUser }>("/api/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ challengeToken, ...input }),
    })
  },

  async requestPasswordReset(email: string) {
    return request<{ message: string }>("/api/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  },

  async completePasswordReset(token: string, newPassword: string) {
    await request<void>("/api/auth/password-reset/complete", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    })
  },

  async completeFirstPasswordChange(newPassword: string) {
    await request<void>("/api/auth/first-password", {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    })
  },

  async savePrivacyConsent(accepted: boolean) {
    const result = await request<{ data: { sensitiveDataConsented: boolean } }>(
      "/api/auth/privacy-consent",
      { method: "PATCH", body: JSON.stringify({ accepted }) },
    )
    return result.data
  },

  async updateProfile(input: {
    fullName: string

    email: string

    phone: string | null
  }) {
    const result = await request<{ user: AuthUser }>("/api/auth/profile", {
      method: "PATCH",

      body: JSON.stringify(input),
    })

    return result.user
  },

  async updateProfilePhoto(input: {
    contentType: "image/jpeg" | "image/png" | "image/webp"
    imageBase64: string
  }) {
    const result = await request<{
      data: { profilePhotoUrl: string }
    }>("/api/auth/profile/photo", {
      method: "PUT",
      body: JSON.stringify(input),
    })
    return result.data
  },

  async removeProfilePhoto() {
    await request<void>("/api/auth/profile/photo", { method: "DELETE" })
  },

  async currentUser(): Promise<AuthUser | null> {
    try {
      const result = await request<{ user: AuthUser }>("/api/auth/me")

      return result.user
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null

      throw error
    }
  },

  async logout() {
    await request<void>("/api/auth/logout", { method: "POST" })
  },

  async sites() {
    const result = await request<{ data: Site[] }>("/api/sites")

    return result.data
  },

  async recentActivity() {
    const result = await request<{ data: RecentActivity[] }>(
      "/api/activity/recent",
    )
    return result.data
  },

  async site(id: string) {
    const result = await request<{ data: SiteDetail }>(`/api/sites/${encodeURIComponent(id)}`)
    return result.data
  },

  async createSite(input: {
    name: string
    location: string
    description?: string | null
    city?: string | null
    province?: string | null
    clientName?: string | null
    workType?: string | null
    contractReference?: string | null
    status?: NonNullable<Site["status"]>
    costBudgetFcfa?: number
    contractAmountFcfa?: number | null
    startDate?: string | null
    endDate?: string | null
    plannedDurationDays?: number | null
    coverImage?: {
      contentType: "image/jpeg" | "image/png" | "image/webp"
      imageBase64: string
    }
  }) {
    const result = await request<{ data: Site }>("/api/sites", {
      method: "POST",

      body: JSON.stringify(input),
    })
    return result.data
  },

  async updateSite(id: string, input: {
    name: string
    location: string
    description: string | null
    city: string | null
    province: string | null
    clientName: string | null
    workType: string | null
    contractReference: string | null
    status: NonNullable<Site["status"]>
    costBudgetFcfa: number
    contractAmountFcfa: number | null
    startDate: string | null
    endDate: string | null
    plannedDurationDays: number | null
  }) {
    const result = await request<{ data: Site }>(`/api/sites/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    })
    return result.data
  },

  async uploadSiteImage(
    id: string,
    input: {
      contentType: "image/jpeg" | "image/png" | "image/webp"
      imageBase64: string
    },
  ) {
    await request<void>(`/api/sites/${encodeURIComponent(id)}/image`, {
      method: "PUT",
      body: JSON.stringify(input),
    })
  },

  async deleteSiteImage(id: string) {
    await request<void>(`/api/sites/${encodeURIComponent(id)}/image`, {
      method: "DELETE",
    })
  },

  siteImageUrl(id: string) {
    return `/api/sites/${encodeURIComponent(id)}/image`
  },

  async tasks() {
    const result = await request<{ data: Task[] }>("/api/tasks")

    return result.data
  },

  async createTask(input: {
    siteId: string

    title: string

    description?: string

    category?: string

    priority?: Task["priority"]

    assignedTo?: string | null

    dueDate: string | null
  }) {
    await request<{ data: Pick<Task, "id"> }>("/api/tasks", {
      method: "POST",

      body: JSON.stringify(input),
    })
  },

  async updateTaskStatus(id: string, status: Task["status"]) {
    return request<{ data: Pick<Task, "id" | "status" | "updatedAt"> }>(
      `/api/tasks/${encodeURIComponent(id)}/status`,

      {
        method: "PATCH",

        body: JSON.stringify({ status }),
      },
    )
  },

  async reports() {
    const result = await request<{ data: Report[] }>("/api/reports")

    return result.data
  },

  async createReport(input: {
    siteId: string

    workDone: string

    crewCount: number

    reportDate?: string
  }) {
    await request<{ data: Report }>("/api/reports", {
      method: "POST",

      body: JSON.stringify(input),
    })
  },

  async validateReport(id: string) {
    const result = await request<{
      data: Pick<Report, "id" | "status" | "validatedAt">
    }>(
      `/api/reports/${encodeURIComponent(id)}/validate`,

      { method: "POST" },
    )

    return result.data
  },

  async team() {
    const result = await request<{ data: TeamMember[] }>("/api/team")

    return result.data
  },

  async createTeamMember(input: {
    fullName: string

    email: string

    phone: string | null

    role: ManagedRole

    assignedSiteId?: string | null
    assignedSite?: string | null

    temporaryPassword: string
  }) {
    const result = await request<{ data: TeamMember }>("/api/team", {
      method: "POST",

      body: JSON.stringify(input),
    })

    return result.data
  },

  async updateTeamMember(
    id: string,

    input: {
      role: ManagedRole
      assignedSiteId?: string | null
      assignedSite?: string | null
      active: boolean
    },
  ) {
    const result = await request<{ data: TeamMember }>(
      `/api/team/${encodeURIComponent(id)}`,

      { method: "PATCH", body: JSON.stringify(input) },
    )

    return result.data
  },

  async deleteTeamMember(id: string) {
    const result = await request<{ data: TeamMember }>(
      `/api/team/${encodeURIComponent(id)}`,

      { method: "DELETE" },
    )

    return result.data
  },

  async updateTeamMemberProfile(id: string, input: { fullName: string; email: string; phone: string | null }) {
    const result = await request<{ data: Pick<TeamMember, "id" | "fullName" | "role" | "active"> }>(
      `/api/team/${encodeURIComponent(id)}/profile`,
      { method: "PATCH", body: JSON.stringify(input) },
    )
    return result.data
  },

  async photos() {
    const result = await request<{ data: SitePhoto[] }>("/api/photos")

    return result.data
  },

  async createPhoto(input: {
    siteId: string

    caption: string

    contentType: "image/jpeg" | "image/png" | "image/webp"

    imageBase64: string

    latitude?: number

    longitude?: number

    capturedAt?: string
  }) {
    const result = await request<{ data: SitePhoto }>("/api/photos", {
      method: "POST",

      body: JSON.stringify(input),
    })

    return result.data
  },

  photoUrl(id: string) {
    return `/api/photos/${encodeURIComponent(id)}/image`
  },

  async attendance() {
    const result = await request<{ data: AttendanceRecord[] }>(
      "/api/attendance",
    )

    return result.data
  },

  async clockIn(location?: { latitude: number; longitude: number }) {
    const result = await request<{ data: AttendanceRecord }>(
      "/api/attendance/clock-in",
      {
        method: "POST",

        body: JSON.stringify(location ?? {}),
      },
    )

    return result.data
  },

  async clockOut(location?: { latitude: number; longitude: number }) {
    const result = await request<{ data: AttendanceRecord }>(
      "/api/attendance/clock-out",
      {
        method: "POST",

        body: JSON.stringify(location ?? {}),
      },
    )

    return result.data
  },

  async finance() {
    return request<{ data: FinanceEntry[]; summary: FinanceSummary }>(
      "/api/finance",
    )
  },

  async createFinanceEntry(input: {
    entryType: FinanceEntry["entryType"]

    siteId: string

    category: string

    description: string

    amountFcfa: number

    dueDate: string | null
  }) {
    const result = await request<{ data: FinanceEntry }>("/api/finance", {
      method: "POST",

      body: JSON.stringify(input),
    })

    return result.data
  },

  async updateFinanceEntry(
    id: string,
    input: {
      entryType: FinanceEntry["entryType"]
      siteId: string
      category: string
      description: string
      amountFcfa: number
      dueDate: string | null
    },
  ) {
    const result = await request<{ data: FinanceEntry }>(
      `/api/finance/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    )
    return result.data
  },

  async realizeFinanceEntry(id: string) {
    const result = await request<{
      data: Pick<FinanceEntry, "id" | "status" | "occurredAt">
    }>(
      `/api/finance/${encodeURIComponent(id)}/realize`,

      { method: "POST", body: JSON.stringify({ status: "réalisé" }) },
    )

    return result.data
  },

  async paymentDossiers() {
    return request<{
      data: PaymentDossier[]
      summary: PaymentDossierSummary[]
    }>(
      "/api/payments",
    )
  },

  async supplierInvoices() {
    return request<{ data: SupplierInvoice[] }>("/api/supplier-invoices")
  },

  async createSupplierInvoice(input: {
    siteId: string
    supplierName: string
    invoiceReference: string
    category: string
    description: string
    amountFcfa: number
    invoiceDate: string | null
    dueDate: string | null
  }) {
    const result = await request<{ data: SupplierInvoice }>(
      "/api/supplier-invoices",
      { method: "POST", body: JSON.stringify(input) },
    )
    return result.data
  },

  async updateSupplierInvoice(
    id: string,
    input: {
      siteId: string
      supplierName: string
      invoiceReference: string
      category: string
      description: string
      amountFcfa: number
      invoiceDate: string | null
      dueDate: string | null
    },
  ) {
    const result = await request<{ data: SupplierInvoice }>(
      `/api/supplier-invoices/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    )
    return result.data
  },

  async submitSupplierInvoice(id: string) {
    const result = await request<{ data: Pick<SupplierInvoice, "id" | "status"> }>(
      `/api/supplier-invoices/${encodeURIComponent(id)}/submit`,
      { method: "PATCH" },
    )
    return result.data
  },

  async updateSupplierInvoiceStatus(
    id: string,
    status: Extract<SupplierInvoiceStatus, "Approuvée" | "Payée" | "Refusée">,
    paymentReference?: string,
  ) {
    const result = await request<{
      data: Pick<SupplierInvoice, "id" | "status" | "paymentReference" | "paidAt">
    }>(`/api/supplier-invoices/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...(paymentReference ? { paymentReference } : {}) }),
    })
    return result.data
  },

  async companyOperatingBudget(year = new Date().getFullYear()) {
    const result = await request<{ data: CompanyOperatingBudget }>(
      `/api/company-operating-budget?year=${year}`,
    )
    return result.data
  },

  async saveCompanyOperatingBudget(input: {
    fiscalYear: number
    amountFcfa: number
    notes: string
  }) {
    const result = await request<{ data: CompanyOperatingBudget }>(
      "/api/company-operating-budget",
      { method: "PUT", body: JSON.stringify(input) },
    )
    return result.data
  },

  async createPaymentDossier(input: {
    siteId: string

    subject: string

    amountFcfa: number

    dueDate: string | null
  }) {
    const result = await request<{ data: PaymentDossier }>("/api/payments", {
      method: "POST",

      body: JSON.stringify(input),
    })

    return result.data
  },

  async updatePaymentDossier(
    id: string,
    input: {
      siteId: string
      subject: string
      amountFcfa: number
      dueDate: string | null
    },
  ) {
    const result = await request<{ data: PaymentDossier }>(
      `/api/payments/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    )
    return result.data
  },

  async updatePaymentDossierStatus(
    id: string,
    status: PaymentDossierStatus,
    paymentReference?: string,
  ) {
    const result = await request<{
      data: Pick<PaymentDossier, "id" | "status" | "paymentReference" | "updatedAt">
    }>(`/api/payments/${encodeURIComponent(id)}/status`, {
      method: "PATCH",

      body: JSON.stringify({
        status,
        ...(paymentReference ? { paymentReference } : {}),
      }),
    })

    return result.data
  },

  async platformOverview() {
    const result = await request<{ data: PlatformOverview }>(
      "/api/platform/overview",
    )

    return result.data
  },

  async platformTenants() {
    const result = await request<{ data: PlatformTenant[] }>(
      "/api/platform/tenants",
    )

    return result.data
  },

  async platformTenant(id: string) {
    const result = await request<{ data: PlatformTenant & { activeSiteCount: number } }>(
      `/api/platform/tenants/${encodeURIComponent(id)}`,
    )
    return result.data
  },

  async updatePlatformTenant(id: string, input: { name?: string; status?: PlatformTenant["status"] }) {
    const result = await request<{ data: Pick<PlatformTenant, "id" | "name" | "status"> }>(
      `/api/platform/tenants/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    )
    return result.data
  },

  async platformUsers(input: {
    page?: number
    limit?: number
    q?: string
    status?: "all" | "active" | "blocked"
    role?: UserRole
    tenantId?: string
  } = {}) {
    const search = new URLSearchParams()
    if (input.page) search.set("page", String(input.page))
    if (input.limit) search.set("limit", String(input.limit))
    if (input.q) search.set("q", input.q)
    if (input.status) search.set("status", input.status)
    if (input.role) search.set("role", input.role)
    if (input.tenantId) search.set("tenantId", input.tenantId)
    const result = await request<{ data: PlatformUser[]; page: number; limit: number; total: number }>(
      `/api/platform/users?${search.toString()}`,
    )
    return result
  },

  async createPlatformEditor(input: { fullName: string; email: string }) {
    return request<{
      data: { id: string; email: string; fullName: string }
      message: string
    }>("/api/platform/editors", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  async updatePlatformUser(id: string, input: { fullName?: string; email?: string; phone?: string | null }) {
    return request<{ data: { id: string; fullName: string; emailMasked: string; phoneMasked: string | null } }>(
      `/api/platform/users/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ).then((result) => result.data)
  },

  async setPlatformUserActive(id: string, active: boolean) {
    const result = await request<{ data: Pick<PlatformUser, "id" | "active" | "role"> }>(
      `/api/platform/users/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: JSON.stringify({ active }) },
    )
    return result.data
  },

  async revokePlatformUserSessions(id: string) {
    await request<void>(`/api/platform/users/${encodeURIComponent(id)}/sessions/revoke`, {
      method: "POST",
    })
  },

  async setPlatformUserTemporaryPassword(id: string, temporaryPassword: string) {
    await request<void>(`/api/platform/users/${encodeURIComponent(id)}/temporary-password`, {
      method: "POST",
      body: JSON.stringify({ temporaryPassword }),
    })
  },

  async sendPlatformPasswordReset(id: string) {
    return request<{ message: string }>(`/api/platform/users/${encodeURIComponent(id)}/password-reset`, { method: "POST" })
  },

  async supportUserAccess(id: string, justification: string, emergencyOverride: boolean) {
    const result = await request<{ data: { id: string; fullName: string; email: string; phone: string | null; role: string; active: boolean; consented: boolean } }>(
      `/api/platform/users/${encodeURIComponent(id)}/support-access`,
      { method: "POST", body: JSON.stringify({ justification, emergencyOverride }) },
    )
    return result.data
  },

  async platformAuditLogs(input: { page?: number; limit?: number; action?: string; tenantId?: string } = {}) {
    const search = new URLSearchParams()
    if (input.page) search.set("page", String(input.page))
    if (input.limit) search.set("limit", String(input.limit))
    if (input.action) search.set("action", input.action)
    if (input.tenantId) search.set("tenantId", input.tenantId)
    const result = await request<{ data: PlatformAuditLog[]; page: number; limit: number }>(
      `/api/platform/audit-logs?${search.toString()}`,
    )
    return result.data
  },

  async registrationRequests() {
    const result = await request<{ data: RegistrationRequest[] }>(
      "/api/platform/registration-requests",
    )
    return result.data
  },

  async updateRegistrationRequest(
    id: string,
    status: Exclude<RegistrationRequestStatus, "Entreprise créée">,
  ) {
    const result = await request<{
      data: Pick<RegistrationRequest, "id" | "status" | "updatedAt">
    }>(`/api/platform/registration-requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
    return result.data
  },

  async platformInvoices() {
    const result = await request<{ data: PlatformInvoice[] }>(
      "/api/platform/invoices",
    )
    return result.data
  },

  async createPlatformInvoice(input: {
    tenantId: string
    description: string
    amountFcfa: number
    issuedAt: string
    dueAt: string
  }) {
    const result = await request<{ data: PlatformInvoice }>(
      "/api/platform/invoices",
      { method: "POST", body: JSON.stringify(input) },
    )
    return result.data
  },

  async updatePlatformInvoiceStatus(
    id: string,
    input: {
      status: "Payée" | "Annulée"
      paymentMethod?: InvoicePaymentMethod
      paymentReference?: string | null
    },
  ) {
    const result = await request<{
      data: Pick<
        PlatformInvoice,
        "id" | "status" | "paymentMethod" | "paymentReference" | "paidAt"
      >
    }>(`/api/platform/invoices/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify(input),
    })
    return result.data
  },

  async mobilePaymentInvoices() {
    const result = await request<{ data: MobilePaymentInvoice[] }>(
      "/api/mobile-payments/invoices",
    )
    return result.data
  },

  async createMobilePaymentIntent(input: {
    invoiceId: string
    provider: string
    phoneNumber: string
    idempotencyKey: string
  }) {
    const result = await request<{ data: MobilePaymentIntent }>(
      "/api/mobile-payments/intents",
      {
        method: "POST",
        headers: { "Idempotency-Key": input.idempotencyKey },
        body: JSON.stringify({
          invoiceId: input.invoiceId,
          provider: input.provider,
          phoneNumber: input.phoneNumber,
        }),
      },
    )
    return result.data
  },

  async mobilePaymentIntent(id: string) {
    const result = await request<{ data: MobilePaymentIntent }>(
      `/api/mobile-payments/intents/${encodeURIComponent(id)}`,
    )
    return result.data
  },

  async createPlatformTenant(input: {
    name: string

    adminFullName: string

    adminEmail: string

    phone: string | null

    temporaryPassword: string

    planId: string

    registrationRequestId?: string
  }) {
    const result = await request<{
      data: Pick<PlatformTenant, "id" | "name" | "status" | "createdAt">

      adminEmail: string
    }>("/api/platform/tenants", {
      method: "POST",

      body: JSON.stringify(input),
    })

    return result.data
  },

  async updateTenantSubscription(
    id: string,

    input: {
      planId: string

      status: NonNullable<PlatformTenant["subscriptionStatus"]>

      renewsAt: string | null
    },
  ) {
    const result = await request<{
      data: {
        tenantId: string

        planId: string

        status: NonNullable<PlatformTenant["subscriptionStatus"]>

        renewsAt: string | null
      }
    }>(
      `/api/platform/tenants/${encodeURIComponent(id)}/subscription`,

      { method: "PATCH", body: JSON.stringify(input) },
    )

    return result.data
  },

  async subscriptionPlans() {
    const result = await request<{ data: SubscriptionPlan[] }>(
      "/api/platform/plans",
    )

    return result.data
  },

  async saveSubscriptionPlan(
    input: {
      name: string

      monthlyPriceFcfa: number

      maxUsers: number | null

      maxSites: number | null

      maxStorageMb: number | null

      active?: boolean
    },

    id?: string,
  ) {
    const result = await request<{ data: SubscriptionPlan }>(
      id
        ? `/api/platform/plans/${encodeURIComponent(id)}`
        : "/api/platform/plans",

      {
        method: id ? "PATCH" : "POST",

        body: JSON.stringify(input),
      },
    )

    return result.data
  },

  async supportTickets() {
    const result = await request<{ data: SupportTicket[] }>(
      "/api/platform/tickets",
    )

    return result.data
  },

  async createSupportTicket(input: {
    tenantId: string

    subject: string

    description: string

    priority: SupportTicket["priority"]
  }) {
    const result = await request<{ data: SupportTicket }>(
      "/api/platform/tickets",

      { method: "POST", body: JSON.stringify(input) },
    )

    return result.data
  },

  async updateSupportTicketStatus(id: string, status: SupportTicketStatus) {
    const result = await request<{
      data: Pick<SupportTicket, "id" | "status" | "updatedAt" | "resolvedAt">
    }>(`/api/platform/tickets/${encodeURIComponent(id)}/status`, {
      method: "PATCH",

      body: JSON.stringify({ status }),
    })

    return result.data
  },

  async tenantSettings() {
    const result = await request<{ data: TenantSettings }>(
      "/api/company/settings",
    )

    return result.data
  },

  async saveTenantSettings(input: Omit<TenantSettings, "updatedAt">) {
    const result = await request<{ data: TenantSettings }>(
      "/api/company/settings",
      {
        method: "PUT",

        body: JSON.stringify(input),
      },
    )

    return result.data
  },

  async platformSettings() {
    const result = await request<{ data: PlatformSettings }>(
      "/api/platform/settings",
    )

    return result.data
  },

  async savePlatformSettings(input: Omit<PlatformSettings, "updatedAt">) {
    const result = await request<{ data: PlatformSettings }>(
      "/api/platform/settings",

      { method: "PUT", body: JSON.stringify(input) },
    )

    return result.data
  },
}
