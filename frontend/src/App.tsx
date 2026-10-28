import { FormEvent, ReactNode, useEffect, useState } from "react"
import {
  api,
  managedRoles,
  type AuthUser,
  type AttendanceRecord,
  type FinanceEntry,
  type FinanceSummary,
  type CompanyOperatingBudget,
  type InvoicePaymentMethod,
  type ManagedRole,
  type PaymentDossier,
  type PaymentDossierStatus,
  type PlatformOverview,
  type PlatformInvoice,
  type PlatformSettings,
  type PlatformTenant,
  type PlatformUser,
  type PlatformAuditLog,
  type RegistrationRequest,
  type RegistrationRequestStatus,
  type RecentActivity,
  type Report,
  type SitePhoto,
  type Site,
  type SiteDetail,
  type SupplierInvoice,
  type SupplierInvoiceStatus,
  type SubscriptionPlan,
  type SupportTicket,
  type SupportTicketStatus,
  type Task,
  type TenantSettings,
  type TeamMember,
  type UserRole,
} from "./lib/api"

type IconName = "alert" | "arrow" | "building" | "calendar" | "camera" | "chart" | "check" | "chevron" | "clipboard" | "cloud" | "download" | "hardhat" | "home" | "lock" | "logout" | "menu" | "moon" | "pin" | "plus" | "search" | "settings" | "task" | "team" | "user" | "wallet"

type ActionKind = "site" | "task" | "photo" | "report" | "member" | "payment" | "paymentReceipt" | "budget" | "treasury" | "supplierInvoice" | "supplierInvoicePayment" | "tenant" | "plan" | "ticket" | "invoice"

type PendingAction = {
  kind: ActionKind
  title: string
  id?: string
  initialValues?: Record<string, string>
} | null

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

function generateTemporaryPassword() {
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@#$%&*-_=+?",
  ]
  const allCharacters = groups.join("")
  const values = new Uint32Array(20)
  crypto.getRandomValues(values)
  const password = groups.map((group, index) => group[values[index]! % group.length]!)
  for (let index = groups.length; index < values.length; index += 1) {
    password.push(allCharacters[values[index]! % allCharacters.length]!)
  }
  for (let index = password.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1)
    crypto.getRandomValues(random)
    const swap = random[0]! % (index + 1)
    ;[password[index], password[swap]] = [password[swap]!, password[index]!]
  }
  return password.join("")
}

function dateInputValue(value: string | null | undefined) {
  if (!value) return ""
  const dateOnly = /^(\d{4}-\d{2}-\d{2})/.exec(value)?.[1]
  if (dateOnly) return dateOnly
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDateOnly(value: string | null | undefined) {
  const normalized = dateInputValue(value)
  if (!normalized) return "Date non définie"
  const [year, month, day] = normalized.split("-").map(Number)
  return new Date(year!, month! - 1, day!).toLocaleDateString("fr-FR")
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    alert: (
      <>
        <path d="M12 3 2.7 19h18.6L12 3Z" />
        <path d="M12 9v4" />
        <path d="M12 16.5h.01" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5" />
        <path d="M5 17v3h14v-3" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    building: (
      <>
        <path d="M4 21V5l8-3v19" />
        <path d="M12 8h8v13M8 7v.01M8 11v.01M8 15v.01M16 12v.01M16 16v.01M2 21h20" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    camera: (
      <>
        <path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clipboard: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6" />
      </>
    ),
    cloud: (
      <>
        <path d="M7 18h11a4 4 0 0 0 .6-8A7 7 0 0 0 5.4 8.5 4.8 4.8 0 0 0 7 18Z" />
        <path d="m9 14 3 3 3-3M12 10v7" />
      </>
    ),
    hardhat: (
      <>
        <path d="M4 14a8 8 0 0 1 16 0M9 14V7M15 14V7M2 14h20v4H2z" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    moon: <path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z" />,
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    task: (
      <>
        <path d="m4 7 2 2 4-4M4 15l2 2 4-4M13 7h7M13 15h7" />
      </>
    ),
    team: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    wallet: (
      <>
        <path d="M3 6a2 2 0 0 1 2-2h14v16H5a2 2 0 0 1-2-2V6Z" />
        <path d="M3 8h16M15 13h6v4h-6a2 2 0 0 1 0-4Z" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function UserAvatar({
  user,
  photoUrl = user.profilePhotoUrl,
  alt = "",
  onPhotoLoaded,
  onPhotoError,
}: {
  user: AuthUser
  photoUrl?: string | null
  alt?: string
  onPhotoLoaded?: () => void
  onPhotoError?: () => void
}) {
  const [photoFailed, setPhotoFailed] = useState(!photoUrl)

  useEffect(() => {
    setPhotoFailed(!photoUrl)
  }, [photoUrl])

  return photoUrl && !photoFailed ? (
    <img
      src={photoUrl}
      alt={alt}
      onLoad={onPhotoLoaded}
      onError={() => {
        setPhotoFailed(true)
        onPhotoError?.()
      }}
    />
  ) : (
    user.initials
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand__mark">
        <img src="/chantier-connect-logo.png" alt="" />
      </span>
      {!compact && (
        <span className="brand__name">
          Chantier<span>Connect</span>
        </span>
      )}
    </div>
  )
}

function LandingPage() {
  const [activeAudience, setActiveAudience] = useState("Terrain")
  const [contactTopic, setContactTopic] = useState("Demander une démonstration")
  const [contactStatus, setContactStatus] = useState("")
  const [contactError, setContactError] = useState("")
  const [contactLoading, setContactLoading] = useState(false)

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]")
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setContactError("")
    setContactStatus("")
    setContactLoading(true)

    const form = event.currentTarget
    const values = new FormData(form)

    try {
      const result = await api.submitContact({
        fullName: String(values.get("fullName") ?? ""),
        email: String(values.get("email") ?? ""),
        phone: String(values.get("phone") ?? ""),
        company: String(values.get("company") ?? ""),
        topic: String(values.get("topic") ?? ""),
        message: String(values.get("message") ?? ""),
        consent: values.get("consent") === "on",
        website: String(values.get("website") ?? ""),
      })
      setContactStatus(result.message)
      form.reset()
      setContactTopic("Demander une démonstration")
    } catch (cause) {
      setContactError(
        cause instanceof Error
          ? cause.message
          : "L’envoi de votre demande a échoué. Réessayez ou contactez-nous par email.",
      )
    } finally {
      setContactLoading(false)
    }
  }

  const audienceCopy: Record<string, { title: string; copy: string }> = {
        Terrain: {
          title: "Des preuves qui restent avec le chantier.",
          copy: "Retrouvez tâches, rapports et photos horodatées dans l’espace de votre équipe.",
        },
        Direction: {
          title: "Une vue claire sur chaque opération.",
          copy: "Suivez l’avancement, les équipes, les budgets et les échéances depuis votre espace entreprise.",
        },
        Finance: {
          title: "Les dépenses et dossiers au bon endroit.",
          copy: "Structurez engagements, trésorerie et dossiers de paiement par chantier.",
        },
      }

      const offers = [
        {
          name: "Découverte",
          price: "25 000",
          limit: "5 utilisateurs · 2 chantiers",
          description: "Pour une petite équipe qui veut commencer avec un suivi partagé.",
          features: ["Tâches et rapports terrain", "Photos datées", "Accès par rôle"],
        },
        {
          name: "PME",
          price: "75 000",
          limit: "30 utilisateurs · 10 chantiers",
          description: "Pour piloter plusieurs équipes et garder le suivi financier lié aux chantiers.",
          features: ["Tout Découverte", "Budget et trésorerie", "Dossiers de paiement"],
          featured: true,
        },
        {
          name: "Entreprise",
          price: "150 000",
          limit: "100 utilisateurs · 100 chantiers",
          description: "Pour les organisations multi-sites qui souhaitent un démarrage accompagné.",
          features: ["Tout PME", "Gestion multi-sites", "Accompagnement initial"],
        },
      ]

      return (
        <main className="landing-page">
          <header className="landing-header">
            <a className="landing-brand" href="#accueil" aria-label="Chantier Connect, accueil">
              <Brand />
            </a>
            <nav aria-label="Navigation du site">
              <a href="#solution">La solution</a>
              <a href="#offres">Offres</a>
              <a href="#demarrage">Démarrage</a>
              <a href="#contact">Contact</a>
            </nav>
            <div className="landing-header__actions">
              <a className="landing-header__signup" href="/inscription">Créer un compte</a>
              <a className="landing-login-link" href="/connexion">Connexion <Icon name="arrow" size={15} /></a>
            </div>
          </header>

          <section className="landing-hero" id="accueil">
            <img
              className="landing-hero__image"
              src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=2200&q=88"
              alt="Équipe du bâtiment en intervention sur un chantier"
              fetchPriority="high"
            />
            <div className="landing-hero__shade" />
            <div className="landing-hero__content">
              <span className="landing-kicker"><i /> Le suivi de chantier, pensé au Gabon</span>
              <h1>Chantier<br />Connect</h1>
              <p>Le terrain, les équipes et les preuves de chantier réunis dans un espace clair, du premier pointage au rapport.</p>
              <div className="landing-hero__actions">
                <a className="landing-button landing-button--lime" href="#offres">Voir les formules <Icon name="arrow" size={17} /></a>
                <a className="landing-button landing-button--ghost" href="#contact">Demander une démonstration</a>
              </div>
              <div className="landing-hero__footnote">
                <span>01</span><p>Un espace par entreprise.<br />Des accès selon le rôle de chacun.</p>
              </div>
            </div>
            <a className="landing-scroll-cue" href="#solution" aria-label="Découvrir la solution"><span /> Défiler</a>
          </section>

          <section className="landing-intro landing-section" id="solution" data-reveal>
            <div className="landing-section__index">01 / VOTRE ACTIVITÉ</div>
            <div className="landing-intro__grid">
              <h2>Un chantier avance mieux quand chacun voit <em>la bonne information.</em></h2>
              <div>
                <p>Chantier Connect rassemble le suivi quotidien, les rapports, les photos et les flux financiers dans des espaces adaptés aux responsabilités de vos équipes.</p>
                <a className="landing-text-link" href="#demarrage">Voir comment démarrer <Icon name="arrow" size={15} /></a>
              </div>
            </div>
            <div className="landing-proof-strip">
              <div><strong>Terrain</strong><span>Tâches · pointages · photos</span></div>
              <div><strong>Pilotage</strong><span>Chantiers · rapports · équipe</span></div>
              <div><strong>Finance</strong><span>Budget · trésorerie · dossiers</span></div>
              <div><strong>Accès</strong><span>Rôles et périmètres dédiés</span></div>
            </div>
          </section>

          <section className="landing-audience landing-section" id="demonstration" data-reveal>
            <div className="landing-section__index">02 / DÉMONSTRATION INTERACTIVE</div>
            <div className="landing-audience__layout">
              <div>
                <span className="landing-eyebrow">Explorez les espaces par métier</span>
                <h2>{audienceCopy[activeAudience]!.title}</h2>
                <p>{audienceCopy[activeAudience]!.copy}</p>
                <div className="landing-tabs" role="tablist" aria-label="Parcours par équipe">
                  {Object.keys(audienceCopy).map((audience) => (
                    <button
                      key={audience}
                      role="tab"
                      aria-selected={activeAudience === audience}
                      className={activeAudience === audience ? "active" : ""}
                      onClick={() => setActiveAudience(audience)}
                    >
                      {audience}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className={`landing-audience-preview landing-audience-preview--${activeAudience.toLowerCase()}`}
                aria-live="polite"
                key={activeAudience}
              >
                <div className="landing-preview-label">Maquette d’illustration · données fictives</div>
                {activeAudience === "Terrain" ? (
                  <div className="terrain-preview">
                    <div className="terrain-preview__header"><span><Icon name="hardhat" size={15} /> JOURNAL TERRAIN</span><time>09:42</time></div>
                    <div className="terrain-preview__site"><small>RÉSIDENCE LES PALMIERS · NIVEAU 2</small><strong>Activité du chantier</strong><span>2 actions enregistrées aujourd’hui</span></div>
                    <div className="terrain-preview__photo">
                      <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80" alt="Équipe sur un chantier en cours" />
                      <span><Icon name="camera" size={14} /> Photo horodatée</span>
                    </div>
                    <div className="terrain-preview__task"><span><Icon name="check" size={14} /></span><div><strong>Contrôle du ferraillage</strong><small>À suivre · Chef de chantier</small></div><Icon name="chevron" size={15} /></div>
                    <div className="terrain-preview__footer"><Icon name="pin" size={13} /> Résidence Les Palmiers <span>GPS enregistré</span></div>
                  </div>
                ) : activeAudience === "Direction" ? (
                  <div className="direction-preview">
                    <div className="direction-preview__header"><div><small>TABLEAU DE PILOTAGE</small><strong>Vue entreprise</strong></div><span><Icon name="calendar" size={14} /> Cette semaine</span></div>
                    <div className="direction-preview__metrics">
                      <div><small>CHANTIERS ACTIFS</small><strong>08</strong><span>sur 10 autorisés</span></div>
                      <div><small>AVANCEMENT MOYEN</small><strong>68<span>%</span></strong><span>+4 pts cette semaine</span></div>
                      <div><small>ÉQUIPE MOBILISÉE</small><strong>24</strong><span>sur 30 comptes</span></div>
                    </div>
                    <div className="direction-preview__projects"><div className="direction-preview__projects-title"><strong>Avancement des chantiers</strong><span>Voir les chantiers <Icon name="arrow" size={12} /></span></div>{[["Résidence Les Palmiers", 68], ["École Nzeng-Ayong", 42], ["Centre médical Owendo", 31]].map(([name, value]) => <div className="direction-preview__project" key={name}><span>{name}</span><div><i style={{ width: `${value}%` }} /></div><b>{value}%</b></div>)}</div>
                    <div className="direction-preview__footer"><Icon name="team" size={13} /> Rapports et équipes consolidés par chantier</div>
                  </div>
                ) : (
                  <div className="finance-preview">
                    <div className="finance-preview__header"><div><small>TRÉSORERIE CHANTIERS</small><strong>Suivi financier</strong></div><span>XAF</span></div>
                    <div className="finance-preview__balances"><div><small>ENCAISSEMENTS RÉALISÉS</small><strong>12 200 000 <span>FCFA</span></strong></div><div><small>DÉPENSES RÉALISÉES</small><strong>8 640 000 <span>FCFA</span></strong></div></div>
                    <div className="finance-preview__chart"><div className="finance-preview__chart-head"><strong>Flux par semaine</strong><span>4 semaines</span></div><div className="finance-preview__bars">{[42, 68, 51, 84, 60, 74, 48, 92].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><div className="finance-preview__axis"><span>S1</span><span>S2</span><span>S3</span><span>S4</span></div></div>
                    <div className="finance-preview__dossier"><span><Icon name="clipboard" size={16} /></span><div><small>DOSSIER DE PAIEMENT · SITUATION 04</small><strong>Échéance enregistrée</strong></div><b>En instruction</b></div>
                    <div className="finance-preview__footer"><Icon name="lock" size={13} /> Données visibles aux rôles autorisés</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="landing-pricing landing-section" id="offres" data-reveal>
            <div className="landing-section__index">03 / TARIFS DE LANCEMENT</div>
            <div className="landing-pricing__heading">
              <div><span className="landing-eyebrow">Clairs dès le départ</span><h2>Choisissez votre rythme.</h2></div>
              <p>Facturation mensuelle manuelle. Le paiement en ligne n’est pas encore activé.</p>
            </div>
            <div className="landing-price-grid">
              {offers.map((offer, index) => (
                <article className={`landing-price ${offer.featured ? "landing-price--featured" : ""}`} key={offer.name} data-reveal>
                  <div className="landing-price__top"><span>0{index + 1} / {offer.name.toUpperCase()}</span>{offer.featured && <b>LE PLUS CHOISI</b>}</div>
                  <p>{offer.description}</p>
                  <div className="landing-price__amount"><strong>{offer.price}</strong><span>FCFA<br />/ mois</span></div>
                  <small className="landing-price__limit">{offer.limit}</small>
                  <ul>{offer.features.map((feature) => <li key={feature}><Icon name="check" size={15} />{feature}</li>)}</ul>
                  <a href="#contact" onClick={() => setContactTopic("Information sur une formule")} className={offer.featured ? "landing-button landing-button--dark" : "landing-button landing-button--outline"}>Parler de cette formule <Icon name="arrow" size={15} /></a>
                </article>
              ))}
            </div>
            <p className="landing-pricing__note">Tarifs indicatifs en FCFA, à confirmer au devis et au contrat. Taxes applicables à préciser selon votre situation.</p>
          </section>

          <section className="landing-onboarding landing-section" id="demarrage" data-reveal>
            <div className="landing-section__index">04 / MISE EN ROUTE</div>
            <div className="landing-onboarding__heading"><div><span className="landing-eyebrow">Un lancement accompagné</span><h2>Du premier échange<br />au premier chantier.</h2></div><p>On démarre sur un périmètre simple, avec vos rôles et vos habitudes réelles.</p></div>
            <div className="landing-steps">
              <article><span>01</span><h3>On cadre</h3><p>Vos chantiers, vos équipes, vos besoins et le nombre de comptes.</p></article>
              <article><span>02</span><h3>On configure</h3><p>Entreprise, offre, administrateur, chantiers et premiers accès.</p></article>
              <article><span>03</span><h3>On prend en main</h3><p>Une séance terrain et bureau : tâches, photos, rapports et finance.</p></article>
              <article><span>04</span><h3>On suit le démarrage</h3><p>Vérification après la première semaine, puis au premier mois.</p></article>
            </div>
          </section>

          <section className="landing-manual" data-reveal>
            <div><span className="landing-eyebrow">Un accompagnement adapté à votre entreprise</span><h2>Votre offre, cadrée selon vos chantiers.</h2></div>
            <p>Nous définissons ensemble la formule, les accès et les modalités commerciales adaptées à votre équipe. Chaque étape est précisée dans une proposition claire avant le démarrage.</p>
            <a href="#contact" onClick={() => setContactTopic("Autre demande")}>Parler de votre projet <Icon name="arrow" size={15} /></a>
          </section>

          <section className="landing-contact landing-section" id="contact" data-reveal>
            <div className="landing-section__index">05 / CONTACT</div>
            <div className="landing-contact__layout">
              <div className="landing-contact__intro">
                <span className="landing-eyebrow">Parlons de vos chantiers</span>
                <h2>Une équipe à vos côtés, dès le premier échange.</h2>
                <p>Décrivez-nous votre besoin. Notre équipe vous recontactera pour organiser la suite.</p>
                <a href="mailto:support@chantierconnect.ga">support@chantierconnect.ga</a>
              </div>
              <form className="landing-contact-card" onSubmit={submitContact}>
                <div className="landing-contact-card__grid">
                  <label>
                    <span>Nom complet</span>
                    <input name="fullName" autoComplete="name" placeholder="Votre nom" minLength={2} maxLength={120} required />
                  </label>
                  <label>
                    <span>Email professionnel</span>
                    <input name="email" type="email" autoComplete="email" placeholder="nom@entreprise.ga" maxLength={254} required />
                  </label>
                  <label>
                    <span>Entreprise <small>Facultatif</small></span>
                    <input name="company" autoComplete="organization" placeholder="Nom de votre entreprise" maxLength={160} />
                  </label>
                  <label>
                    <span>Téléphone <small>Facultatif</small></span>
                    <input name="phone" type="tel" autoComplete="tel" placeholder="+241 06 00 00 00" maxLength={30} />
                  </label>
                  <label className="landing-contact-card__topic">
                    <span>Objet de votre demande</span>
                    <select name="topic" value={contactTopic} onChange={(event) => setContactTopic(event.target.value)}>
                      <option>Demander une démonstration</option>
                      <option>Information sur une formule</option>
                      <option>Autre demande</option>
                    </select>
                  </label>
                  <label className="landing-contact-card__message">
                    <span>Comment pouvons-nous vous aider ?</span>
                    <textarea name="message" placeholder="Parlez-nous de votre entreprise et de vos besoins." minLength={10} maxLength={3000} rows={4} required />
                  </label>
                  <label className="landing-contact-card__honeypot" aria-hidden="true">
                    <span>Ne pas remplir</span>
                    <input name="website" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>
                <label className="landing-contact-card__consent">
                  <input name="consent" type="checkbox" required />
                  <span>J’accepte que mes informations soient utilisées pour répondre à ma demande. Ne transmettez aucune donnée sensible.</span>
                </label>
                {contactError && <p className="landing-contact-card__feedback landing-contact-card__feedback--error" role="alert">{contactError}</p>}
                {contactStatus && <p className="landing-contact-card__feedback" role="status">{contactStatus}</p>}
                <button className="landing-button landing-button--lime" type="submit" disabled={contactLoading}>
                  {contactLoading ? "Envoi en cours…" : "Envoyer ma demande"} <Icon name="arrow" size={17} />
                </button>
                <p className="landing-contact-card__privacy">Vos coordonnées restent confidentielles et servent uniquement au suivi de votre demande.</p>
              </form>
            </div>
          </section>

          <section className="landing-faq landing-section" data-reveal>
            <div className="landing-section__index">06 / QUESTIONS</div>
            <div className="landing-faq__layout"><div><span className="landing-eyebrow">À savoir avant de commencer</span><h2>Des réponses sans détour.</h2></div><div className="landing-faq__items">
              <details><summary>Comment régler mon abonnement ?</summary><p>Les modalités et l’échéance figurent dans votre proposition commerciale et votre contrat. Le paiement en ligne dans l’application n’est pas encore activé.</p></details>
              <details><summary>Puis-je essayer avec une petite équipe ?</summary><p>Oui. La formule Découverte est configurée pour 5 utilisateurs et 2 chantiers. La durée d’essai et les conditions sont convenues lors de l’onboarding.</p></details>
              <details><summary>Les rôles voient-ils les mêmes informations ?</summary><p>Non. Les espaces et les actions disponibles dépendent du rôle et du périmètre attribué à chaque compte.</p></details>
            </div></div>
          </section>

          <section className="landing-signin" id="connexion">
            <div className="landing-signin__intro"><span className="landing-eyebrow">Déjà client ?</span><h2>Votre chantier<br />vous attend.</h2><p>Retrouvez votre espace entreprise sécurisé.</p></div>
            <div className="landing-signin__actions">
              <a className="landing-button landing-button--lime" href="/connexion">Se connecter <Icon name="arrow" size={17} /></a>
              <a className="landing-signin__help" href="#contact">Besoin d’aide ? Contactez-nous</a>
            </div>
          </section>

          <footer className="landing-footer"><a className="landing-brand" href="#accueil"><Brand /></a><span>Conçu au Gabon pour les bâtisseurs d’Afrique centrale.</span><a href="mailto:support@chantierconnect.ga">support@chantierconnect.ga</a><span>© {new Date().getFullYear()} Chantier Connect</span></footer>
        </main>
      )
}

function StandaloneLogin({
  onLogin,
  initialError,
}: {
  onLogin: (user: AuthUser, rememberMe: boolean) => Promise<void>
  initialError: string
}) {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [visible, setVisible] = useState(false)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mfaSetupToken, setMfaSetupToken] = useState("")
  const [mfaChallengeToken, setMfaChallengeToken] = useState("")
  const [mfaSetup, setMfaSetup] = useState<{
    secret: string
    provisioningUri: string
  } | null>(null)
  const [mfaCode, setMfaCode] = useState("")
  const [usingRecoveryCode, setUsingRecoveryCode] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [mfaUserToContinue, setMfaUserToContinue] = useState<AuthUser | null>(null)

  async function finishMfaLogin(user: AuthUser) {
    if (user.mustChangePassword) {
      setMustChangePassword(true)
      return
    }
    await onLogin(user, rememberMe)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      if (mustChangePassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("Les deux nouveaux mots de passe ne correspondent pas.")
        }
        await api.completeFirstPasswordChange(newPassword)
        setPasswordChanged(true)
        setNewPassword("")
        setConfirmPassword("")
        return
      }
      if (recoveryCodes.length > 0) {
        return
      }
      if (mfaSetupToken) {
        const result = await api.enableEditorMfa(mfaSetupToken, mfaCode)
        setRecoveryCodes(result.recoveryCodes)
        setMfaUserToContinue(result.user)
        setMfaCode("")
        return
      }
      if (mfaChallengeToken) {
        const result = await api.verifyEditorMfa(
          mfaChallengeToken,
          usingRecoveryCode ? { recoveryCode: mfaCode } : { code: mfaCode },
        )
        setMfaChallengeToken("")
        await finishMfaLogin(result.user)
      } else {
        const result = await api.login(identifier, password, rememberMe)
        if ("mfaSetupRequired" in result) {
          setMfaSetupToken(result.setupToken)
          setMfaSetup(await api.startEditorMfaSetup(result.setupToken))
          setPassword("")
        } else if ("mfaRequired" in result) {
          setMfaChallengeToken(result.challengeToken)
          setPassword("")
        } else if (result.user.mustChangePassword) {
          setMustChangePassword(true)
        } else {
          await onLogin(result.user, rememberMe)
        }
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "La connexion au serveur a échoué.",
      )
    } finally {
      setLoading(false)
    }
  }

  async function continueAfterRecoveryCodes() {
    if (!mfaUserToContinue) return
    const user = mfaUserToContinue
    setRecoveryCodes([])
    setMfaUserToContinue(null)
    setMfaSetupToken("")
    setMfaSetup(null)
    await finishMfaLogin(user)
  }

  return (
    <main className="auth-page">
      <section className="auth-page__story">
        <a className="landing-brand" href="/" aria-label="Retour à l’accueil">
          <Brand />
        </a>
        <div>
          <span className="landing-eyebrow">Votre espace chantier</span>
          <h1>Le terrain et vos équipes, toujours au même endroit.</h1>
          <p>Connectez-vous pour retrouver vos chantiers, vos rapports et les informations de votre entreprise.</p>
        </div>
        <a className="auth-page__back" href="/">Retour au site</a>
      </section>
      <section className="auth-page__panel">
        <form className="auth-page__card" onSubmit={(event) => void submit(event)}>
          <div className="landing-auth-card__heading">
            <span className="landing-eyebrow">Espace sécurisé</span>
            <h2>
              {passwordChanged
                ? "Mot de passe modifié"
                : recoveryCodes.length > 0
                  ? "Conservez vos codes de secours"
                  : mustChangePassword
                    ? "Sécurisez votre compte"
                    : mfaSetupToken
                      ? "Protégez votre accès éditeur"
                      : mfaChallengeToken
                        ? "Vérification en deux étapes"
                        : "Connexion"}
            </h2>
            <p>
              {passwordChanged
                ? "Reconnectez-vous avec votre nouveau mot de passe."
                : recoveryCodes.length > 0
                  ? "Ces codes ne seront plus affichés. Conservez-les hors de cet appareil."
                  : mustChangePassword
                    ? "Votre mot de passe provisoire doit être remplacé avant d’accéder à la plateforme."
                    : mfaSetupToken
                      ? "Ajoutez cette clé à une application TOTP, puis saisissez le code à six chiffres pour activer la MFA."
                      : mfaChallengeToken
                        ? "Saisissez le code à six chiffres de votre application, ou utilisez un code de secours."
                        : "Accédez à l’espace de votre entreprise."}
            </p>
          </div>
          {passwordChanged ? (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setPasswordChanged(false)
                setMustChangePassword(false)
                setPassword("")
              }}
            >
              Retour à la connexion
            </button>
          ) : recoveryCodes.length > 0 ? (
            <div className="editor-boundary">
              <Icon name="lock" />
              <div>
                <strong>Codes à usage unique</strong>
                <p>{recoveryCodes.join(" · ")}</p>
                <button className="primary-button" type="button" onClick={() => void continueAfterRecoveryCodes()}>
                  J’ai enregistré mes codes
                </button>
              </div>
            </div>
          ) : mustChangePassword ? (
            <>
              <label>
                <span>Nouveau mot de passe (12 caractères minimum)</span>
                <input
                  autoComplete="new-password"
                  type={visible ? "text" : "password"}
                  minLength={12}
                  maxLength={128}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Confirmer le nouveau mot de passe</span>
                <input
                  autoComplete="new-password"
                  type={visible ? "text" : "password"}
                  minLength={12}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </label>
              <button className="text-button" type="button" onClick={() => setVisible((current) => !current)}>
                {visible ? "Masquer les mots de passe" : "Afficher les mots de passe"}
              </button>
            </>
          ) : mfaSetupToken ? (
            <>
              {mfaSetup && (
                <div className="editor-boundary">
                  <Icon name="lock" />
                  <div>
                    <strong>Clé de configuration</strong>
                    <p>{mfaSetup.secret}</p>
                    <a href={mfaSetup.provisioningUri}>Ouvrir dans une application compatible</a>
                  </div>
                </div>
              )}
              <label>
                <span>Code de l’application</span>
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ""))}
                  required
                />
              </label>
              {error && <div className="auth-error" role="alert">{error}</div>}
              <button className="primary-button" type="submit" disabled={loading || mfaCode.length !== 6}>
                {loading ? "Vérification…" : "Activer la MFA"}
              </button>
            </>
          ) : mfaChallengeToken ? (
            <>
              <label>
                <span>{usingRecoveryCode ? "Code de secours" : "Code de l’application"}</span>
                <input
                  autoComplete={usingRecoveryCode ? "off" : "one-time-code"}
                  inputMode={usingRecoveryCode ? "text" : "numeric"}
                  maxLength={usingRecoveryCode ? 32 : 6}
                  value={mfaCode}
                  onChange={(event) => setMfaCode(
                    usingRecoveryCode
                      ? event.target.value.replace(/[^a-fA-F0-9]/g, "").toUpperCase()
                      : event.target.value.replace(/\D/g, ""),
                  )}
                  required
                />
              </label>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setUsingRecoveryCode((current) => !current)
                  setMfaCode("")
                  setError("")
                }}
              >
                {usingRecoveryCode ? "Utiliser l’application d’authentification" : "Utiliser un code de secours"}
              </button>
              {error && <div className="auth-error" role="alert">{error}</div>}
              <button className="primary-button" type="submit" disabled={loading || (usingRecoveryCode ? mfaCode.length < 16 : mfaCode.length !== 6)}>
                {loading ? "Vérification…" : "Vérifier et continuer"}
              </button>
            </>
          ) : (
          <>
          <label>
            <span>Email ou numéro de téléphone</span>
            <div className="field">
              <Icon name="user" />
              <input
                autoComplete="username"
                placeholder="nom@entreprise.ga"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value)
                  setError("")
                }}
                required
              />
            </div>
          </label>
          <label>
            <span>Mot de passe</span>
            <div className="field">
              <Icon name="lock" />
              <input
                autoComplete="current-password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError("")
                }}
                type={visible ? "text" : "password"}
                required
              />
              <button
                className="field__action"
                type="button"
                onClick={() => setVisible((current) => !current)}
              >
                {visible ? "Masquer" : "Afficher"}
              </button>
            </div>
          </label>
          <div className="form-options">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>Rester connecté</span>
            </label>
            <span className="auth-page__support">
              Besoin d’aide ? <a href="mailto:support@chantierconnect.ga">Contactez-nous</a>
            </span>
          </div>
          {(error || initialError) && (
            <div className="auth-error" role="alert">
              <Icon name="alert" size={16} />
              {error || initialError}
            </div>
          )}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Connexion en cours…" : "Se connecter"}
            {!loading && <Icon name="chevron" />}
          </button>
          <div className="secure-note">
            <Icon name="lock" size={15} /> Connexion chiffrée et sécurisée
          </div>
          <p className="auth-page__switch">
            Pas encore client ? <a href="/inscription">Demander l’ouverture d’un espace</a>
          </p>
          <p className="auth-page__switch">
            Mot de passe oublié ? <a href="/reinitialiser-mot-de-passe">Recevoir un lien de réinitialisation</a>
          </p>
          </>
          )}
          {passwordChanged && <p className="landing-contact-card__feedback" role="status">Votre nouveau mot de passe est enregistré.</p>}
          {mustChangePassword && !passwordChanged && (
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer mon nouveau mot de passe"}
            </button>
          )}
        </form>
      </section>
    </main>
  )
}

function PasswordResetPage() {
  const token = new URLSearchParams(window.location.search).get("token") ?? ""
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccess("")
    if (token && password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.")
      return
    }
    setLoading(true)
    try {
      if (token) {
        await api.completePasswordReset(token, password)
        setSuccess("Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.")
      } else {
        const result = await api.requestPasswordReset(email)
        setSuccess(result.message)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La demande n’a pas pu aboutir.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-page__story">
        <a className="landing-brand" href="/" aria-label="Retour à l’accueil">
          <Brand />
        </a>
        <div>
          <span className="landing-eyebrow">Compte sécurisé</span>
          <h1>Retrouvez l’accès à votre espace.</h1>
          <p>Un lien temporaire vous permet de choisir un nouveau mot de passe, sans que l’équipe support ne le connaisse.</p>
        </div>
        <a className="auth-page__back" href="/connexion">Retour à la connexion</a>
      </section>
      <section className="auth-page__panel">
        <form className="auth-page__card" onSubmit={(event) => void submit(event)}>
          <div className="landing-auth-card__heading">
            <span className="landing-eyebrow">Réinitialisation sécurisée</span>
            <h2>{token ? "Choisir un nouveau mot de passe" : "Mot de passe oublié"}</h2>
            <p>{token ? "Le lien est valable 30 minutes et ne peut être utilisé qu’une seule fois." : "Indiquez l’adresse email associée à votre compte."}</p>
          </div>
          {token ? (
            <>
              <label>
                <span>Nouveau mot de passe</span>
                <input autoComplete="new-password" type="password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              <label>
                <span>Confirmer le mot de passe</span>
                <input autoComplete="new-password" type="password" minLength={12} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
              </label>
            </>
          ) : (
            <label>
              <span>Adresse email</span>
              <input autoComplete="email" type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
          )}
          {error && <div className="auth-error" role="alert">{error}</div>}
          {success && <p className="landing-contact-card__feedback" role="status">{success}</p>}
          <button className="primary-button" type="submit" disabled={loading || Boolean(success && token)}>
            {loading ? "Traitement…" : token ? "Enregistrer le nouveau mot de passe" : "Envoyer le lien"}
          </button>
        </form>
      </section>
    </main>
  )
}

function RegistrationPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")
    const form = event.currentTarget
    const values = new FormData(form)

    try {
      const result = await api.submitRegistrationRequest({
        companyName: String(values.get("companyName") ?? ""),
        adminFullName: String(values.get("adminFullName") ?? ""),
        adminEmail: String(values.get("adminEmail") ?? ""),
        phone: String(values.get("phone") ?? ""),
        message: String(values.get("message") ?? ""),
        consent: values.get("consent") === "on",
        website: String(values.get("website") ?? ""),
      })
      setSuccess(result.message)
      form.reset()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "La demande n’a pas pu être envoyée. Réessayez ou contactez-nous par email.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page registration-page">
      <section className="auth-page__story">
        <a className="landing-brand" href="/" aria-label="Retour à l’accueil">
          <Brand />
        </a>
        <div>
          <span className="landing-eyebrow">Ouverture d’un espace entreprise</span>
          <h1>Commençons par comprendre vos chantiers.</h1>
          <p>Notre équipe étudie votre demande et vous accompagne pour définir l’espace adapté à votre entreprise.</p>
          <ol className="registration-steps">
            <li><span>01</span> Vous envoyez votre demande</li>
            <li><span>02</span> Notre équipe vous recontacte</li>
            <li><span>03</span> L’espace est créé après validation</li>
          </ol>
        </div>
        <a className="auth-page__back" href="/">Retour au site</a>
      </section>
      <section className="auth-page__panel">
        <form className="auth-page__card registration-card" onSubmit={(event) => void submit(event)}>
          <div className="landing-auth-card__heading">
            <span className="landing-eyebrow">Préinscription</span>
            <h2>Parlez-nous de votre entreprise</h2>
            <p>Ce formulaire ne crée pas encore de compte ni d’entreprise.</p>
          </div>
          <div className="registration-card__grid">
            <label>
              <span>Nom de l’entreprise</span>
              <input name="companyName" autoComplete="organization" minLength={2} maxLength={160} required />
            </label>
            <label>
              <span>Votre nom complet</span>
              <input name="adminFullName" autoComplete="name" minLength={2} maxLength={120} required />
            </label>
            <label>
              <span>Email professionnel</span>
              <input name="adminEmail" type="email" autoComplete="email" maxLength={254} required />
            </label>
            <label>
              <span>Téléphone <small>Facultatif</small></span>
              <input name="phone" type="tel" autoComplete="tel" maxLength={30} />
            </label>
            <label className="registration-card__message">
              <span>Présentez votre besoin</span>
              <textarea name="message" minLength={10} maxLength={2000} rows={4} required />
            </label>
            <label className="registration-card__honeypot" aria-hidden="true">
              <span>Ne pas remplir</span>
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label className="registration-card__consent">
            <input name="consent" type="checkbox" required />
            <span>J’accepte l’utilisation de ces informations pour étudier et traiter ma demande.</span>
          </label>
          {error && <p className="landing-contact-card__feedback landing-contact-card__feedback--error" role="alert">{error}</p>}
          {success && <p className="landing-contact-card__feedback" role="status">{success}</p>}
          <button className="landing-button landing-button--lime" type="submit" disabled={loading}>
            {loading ? "Envoi en cours…" : "Envoyer ma demande"} <Icon name="arrow" size={17} />
          </button>
          <p className="registration-card__switch">
            Déjà un compte ? <a href="/connexion">Se connecter</a>
          </p>
        </form>
      </section>
    </main>
  )
}

const sectionIcons: Record<string, IconName> = {
  "Tableau de bord": "home",
  Chantiers: "building",
  "Mes tâches": "task",
  Photos: "camera",
  Rapports: "clipboard",
  Équipe: "team",
  Trésorerie: "wallet",
  Budget: "chart",
  "Dossiers de paiement": "wallet",
  "Factures fournisseurs": "wallet",
  Pointage: "calendar",
  Entreprises: "building",
  Utilisateurs: "team",
  "Journal d’audit": "clipboard",
  Abonnements: "wallet",
  Support: "alert",
  Paramètres: "settings",
  Profil: "user",
}

const auditActionLabels: Record<string, string> = {
  TEMPORARY_PASSWORD_ISSUED: "Mot de passe provisoire défini",
  FIRST_PASSWORD_CHANGED: "Mot de passe initial modifié",
  USER_SESSIONS_REVOKED: "Sessions utilisateur révoquées",
  TENANT_CREATED: "Entreprise créée",
  TENANT_UPDATED: "Entreprise modifiée",
  TENANT_SUBSCRIPTION_UPDATED: "Abonnement mis à jour",
  SUBSCRIPTION_PLAN_UPDATED: "Plan modifié",
  USER_PROFILE_UPDATED: "Compte utilisateur modifié",
  USER_BLOCKED: "Compte utilisateur bloqué",
  USER_UNBLOCKED: "Compte utilisateur réactivé",
  TEAM_MEMBER_CREATED: "Membre d’équipe créé",
  TEAM_MEMBER_UPDATED: "Membre d’équipe modifié",
  TEAM_MEMBER_PROFILE_UPDATED: "Profil de membre modifié",
  TEAM_MEMBER_DEACTIVATED: "Membre d’équipe désactivé",
  PASSWORD_RESET_COMPLETED: "Mot de passe réinitialisé",
  PASSWORD_RESET_REQUESTED: "Réinitialisation demandée",
  ATTENDANCE_CLOCKED_IN: "Arrivée enregistrée",
  ATTENDANCE_CLOCKED_OUT: "Départ enregistré",
  FINANCE_ENTRY_CREATED: "Écriture financière créée",
  FINANCE_ENTRY_UPDATED: "Prévision financière modifiée",
  FINANCE_ENTRY_REALIZED: "Écriture financière réalisée",
  PAYMENT_DOSSIER_CREATED: "Dossier de paiement créé",
  PAYMENT_DOSSIER_UPDATED: "Dossier de paiement modifié",
  PAYMENT_DOSSIER_STATUS_CHANGED: "Statut du dossier de paiement modifié",
  COMPANY_OPERATING_BUDGET_UPDATED: "Budget annuel de l’entreprise modifié",
  SUPPLIER_INVOICE_CREATED: "Facture fournisseur créée",
  SUPPLIER_INVOICE_UPDATED: "Facture fournisseur modifiée",
  SUPPLIER_INVOICE_SUBMITTED: "Facture fournisseur soumise au contrôle",
  SUPPLIER_INVOICE_STATUS_CHANGED: "Statut de facture fournisseur modifié",
  SITE_COVER_IMAGE_UPDATED: "Image du chantier modifiée",
  SITE_COVER_IMAGE_REMOVED: "Image du chantier supprimée",
}

const actionFields: Record<ActionKind, {
  label: string
  placeholder: string
  type?: string
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
}[]> = {
  site: [
    { label: "Nom du chantier", placeholder: "Ex. Immeuble Batterie IV" },
    { label: "Description du projet", placeholder: "Nature et périmètre des travaux", required: false },
    { label: "Adresse / quartier", placeholder: "Quartier, rue, repère ou coordonnées" },
    { label: "Ville", placeholder: "Ex. Libreville", required: false },
    { label: "Province", placeholder: "Sélectionner une province", required: false },
    { label: "Maître d’ouvrage / client", placeholder: "Nom du client ou donneur d’ordre", required: false },
    { label: "Nature des travaux", placeholder: "Ex. construction, réhabilitation, VRD…", required: false },
    { label: "Référence du marché", placeholder: "N° de contrat ou de marché", required: false },
    { label: "Statut", placeholder: "En cours", required: false },
    { label: "Enveloppe de coûts prévue (FCFA)", placeholder: "0", type: "number", required: false, min: 0 },
    { label: "Montant contractuel facturé au client (FCFA)", placeholder: "À renseigner si connu", type: "number", required: false, min: 0 },
    { label: "Date de début", placeholder: "", type: "date", required: false },
    { label: "Délai prévu (jours)", placeholder: "Ex. 180", type: "number", required: false, min: 1, max: 3650 },
    { label: "Échéance prévisionnelle", placeholder: "", type: "date", required: false },
  ],
  task: [
    { label: "Tâche", placeholder: "Travail à réaliser" },
    { label: "Description", placeholder: "Consignes et résultat attendu", required: false },
    { label: "Catégorie", placeholder: "Ex. Préparation, gros œuvre…", required: false },
    { label: "Échéance", placeholder: "Date prévue", type: "date", required: false },
  ],
  photo: [{ label: "Légende", placeholder: "Décrivez la preuve terrain" }],
  report: [
    { label: "Travaux réalisés", placeholder: "Décrivez l’avancement du jour" },
    {
      label: "Effectif présent",
      placeholder: "0",
      type: "number",
      min: 0,
      max: 500,
    },
    {
      label: "Date du rapport",
      placeholder: "",
      type: "date",
      required: false,
    },
  ],
  member: [
    { label: "Nom complet", placeholder: "Prénom et nom" },
    {
      label: "Email professionnel",
      placeholder: "nom@entreprise.ga",
      type: "email",
    },
    { label: "Téléphone", placeholder: "+241…", required: false },
    {
      label: "Mot de passe provisoire",
      placeholder: "12 caractères minimum",
      type: "password",
      minLength: 12,
    },
  ],
  payment: [
    { label: "Objet du dossier", placeholder: "Ex. Situation n°4" },
    { label: "Montant FCFA", placeholder: "0", type: "number" },
    { label: "Date limite", placeholder: "", type: "date", required: false },
  ],
  supplierInvoice: [
    { label: "Fournisseur", placeholder: "Raison sociale du fournisseur" },
    { label: "Référence de facture", placeholder: "N° de facture" },
    { label: "Poste de dépense", placeholder: "Ex. Matériaux, sous-traitance, transport" },
    { label: "Description", placeholder: "Détail de la fourniture ou prestation", required: false },
    { label: "Montant FCFA", placeholder: "0", type: "number", min: 1 },
    { label: "Date de facture", placeholder: "", type: "date", required: false },
    { label: "Date limite de paiement", placeholder: "", type: "date", required: false },
  ],
  supplierInvoicePayment: [
    { label: "Référence du paiement", placeholder: "N° transaction ou référence bancaire", minLength: 2, maxLength: 120 },
  ],
  paymentReceipt: [
    { label: "Référence d’encaissement", placeholder: "N° de transaction ou référence bancaire", minLength: 2, maxLength: 120 },
  ],
  budget: [
    { label: "Poste budgétaire", placeholder: "Ex. Gros œuvre" },
    { label: "Description", placeholder: "Détail de l’engagement" },
    { label: "Montant engagé FCFA", placeholder: "0", type: "number" },
  ],
  treasury: [
    { label: "Description", placeholder: "Ex. Acompte client" },
    { label: "Montant FCFA", placeholder: "0", type: "number" },
    { label: "Échéance", placeholder: "", type: "date", required: false },
  ],
  tenant: [
    { label: "Raison sociale", placeholder: "Nom de l’entreprise" },
    { label: "Nom de l’administrateur", placeholder: "Prénom et nom" },
    {
      label: "Email administrateur",
      placeholder: "admin@entreprise.ga",
      type: "email",
    },
    {
      label: "Téléphone administrateur",
      placeholder: "+241…",
      type: "tel",
      required: false,
    },
    { label: "Plan d’abonnement", placeholder: "Choisir un plan" },
    {
      label: "Mot de passe provisoire",
      placeholder: "12 caractères minimum",
      type: "password",
      minLength: 12,
    },
  ],
  plan: [
    { label: "Nom du plan", placeholder: "Ex. Croissance" },
    { label: "Tarif mensuel FCFA", placeholder: "0", type: "number" },
    {
      label: "Limite utilisateurs",
      placeholder: "Illimitée si vide",
      type: "number",
      required: false,
      min: 1,
    },
    {
      label: "Limite chantiers",
      placeholder: "Illimitée si vide",
      type: "number",
      required: false,
      min: 1,
    },
    {
      label: "Limite stockage (Mo)",
      placeholder: "Illimité si vide",
      type: "number",
      required: false,
      min: 1,
    },
  ],
  ticket: [
    { label: "Objet", placeholder: "Décrivez brièvement la demande" },
    { label: "Description", placeholder: "Détails utiles au traitement" },
  ],
  invoice: [
    { label: "Description", placeholder: "Ex. Abonnement mensuel · octobre 2026" },
    { label: "Montant FCFA", placeholder: "0", type: "number", min: 1 },
    { label: "Date d’émission", placeholder: "", type: "date" },
    { label: "Échéance", placeholder: "", type: "date" },
    { label: "Référence d’encaissement", placeholder: "Reçu, transaction ou référence bancaire", required: false },
  ],
}

const siteScopedRoles: ManagedRole[] = [
  "CONDUCTEUR",
  "CHEF_CHANTIER",
  "COMPAGNON",
  "SOUS_TRAITANT",
  "MAITRE_OUVRAGE",
]

const actionGuideByKind: Record<ActionKind, string> = {
  site: "Renseignez les informations du marché, la localisation et le calendrier pour suivre les travaux et leurs échéances.",
  task: "Coordonnez votre chantier : précisez la priorité, les consignes, l’échéance et le membre responsable.",
  photo: "Mode terrain : ajoutez une preuve visuelle avec une légende et, si besoin, votre position GPS.",
  report: "Mode terrain : résumez les travaux, l’effectif présent et la date pour valider l’avancement du chantier.",
  member: "Mode administration : créez le compte, définissez le rôle et l’affectation chantier pour sécuriser l’accès.",
  payment: "Préparez une situation de travaux à transmettre au client et suivez les montants à encaisser.",
  supplierInvoice: "Enregistrez une facture fournisseur liée à un chantier. Elle reste en préparation jusqu’à sa soumission au Comptable.",
  supplierInvoicePayment: "Saisissez la référence de la pièce de paiement afin de tracer le règlement fournisseur.",
  paymentReceipt: "Confirmez l’encaissement client avec sa référence de transaction. Cette opération sera ajoutée à la trésorerie.",
  budget: "Mode finance : enregistrez un engagement budgétaire avec un poste, une description et un montant clairement identifiés.",
  treasury: "Mode finance : enregistrez un encaissement ou une dépense avec son montant et son échéance.",
  tenant: "Mode administration : créez l’entreprise cliente, son administrateur et le mot de passe provisoire associé.",
  plan: "Mode administration : configurez le prix et les limites du plan pour chaque offre commerciale.",
  ticket: "Mode administration : décrivez le besoin de support avec son niveau de priorité et l’entreprise concernée.",
  invoice: "Mode éditeur : émettez une facture avec son montant et son échéance, ou enregistrez un paiement effectivement reçu.",
}

function getAllowedActionKinds(user: AuthUser): ActionKind[] {
  const terrainKinds: ActionKind[] = ["site", "task", "photo", "report"]
  const financeKinds: ActionKind[] = ["payment", "paymentReceipt", "budget", "treasury", "supplierInvoice", "supplierInvoicePayment"]
  const adminKinds: ActionKind[] = [
    "member",
    "tenant",
    "plan",
    "ticket",
    "invoice",
  ]

  const allowedTerrain = terrainKinds.filter((kind) => {
    if (kind === "site") return user.capabilities.includes("manage_sites")
    if (kind === "task") return user.capabilities.includes("manage_tasks")
    if (kind === "photo") return user.capabilities.includes("capture_photos")
    if (kind === "report") return user.capabilities.includes("create_reports")
    return false
  })

  const allowedFinance = financeKinds.filter((kind) =>
    user.capabilities.includes("manage_finance") ||
    user.capabilities.includes("manage_finance_planning"),
  )

  const allowedAdmin = adminKinds.filter((kind) => {
    if (kind === "member") return user.capabilities.includes("manage_team")
    if (kind === "tenant") return user.role === "EDITOR"
    if (kind === "plan") return user.role === "EDITOR"
    if (kind === "ticket") return user.role === "EDITOR"
    if (kind === "invoice") return user.role === "EDITOR"
    return false
  })

  return [...allowedTerrain, ...allowedFinance, ...allowedAdmin]
}

function ActionDialog({
  action,
  user,
  onClose,
  onConfirm,
}: {
  action: PendingAction
  user: AuthUser
  onClose: () => void
  onConfirm: (
    action: Exclude<PendingAction, null>,
    values: Record<string, string>,
  ) => Promise<void>
}) {
  const [taskSites, setTaskSites] = useState<Site[]>([])
  const [taskMembers, setTaskMembers] = useState<TeamMember[]>([])
  const [taskSiteId, setTaskSiteId] = useState("")
  const [taskAssigneeId, setTaskAssigneeId] = useState("")
  const [platformTenants, setPlatformTenants] = useState<PlatformTenant[]>([])
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([])
  const [platformUserSearch, setPlatformUserSearch] = useState("")
  const [platformUserStatus, setPlatformUserStatus] = useState<"all" | "active" | "blocked">("all")
  const [platformUserPage, setPlatformUserPage] = useState(1)
  const [platformUserTotal, setPlatformUserTotal] = useState(0)
  const [platformAuditLogs, setPlatformAuditLogs] = useState<PlatformAuditLog[]>([])
  const [auditActionFilter, setAuditActionFilter] = useState("")
  const [supportUserDetail, setSupportUserDetail] = useState<Awaited<ReturnType<typeof api.supportUserAccess>> | null>(null)
  const [tenantPlans, setTenantPlans] = useState<SubscriptionPlan[]>([])
  const [tenantPlanId, setTenantPlanId] = useState("")
  const [taskSitesLoading, setTaskSitesLoading] = useState(false)
  const [memberRole, setMemberRole] = useState<ManagedRole>("COMPAGNON")
  const [tenantPlansLoading, setTenantPlansLoading] = useState(false)
  const [taskSitesError, setTaskSitesError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")

  useEffect(() => {
    if (action?.kind === "member") setMemberRole("COMPAGNON")
    if (action?.kind === "member" || action?.kind === "tenant") {
      setTemporaryPassword("")
      setPasswordConfirmation("")
      setPasswordVisible(false)
    }
  }, [action?.kind])

  useEffect(() => {
    if (
      action?.kind !== "task" &&
      action?.kind !== "report" &&
      action?.kind !== "member" &&
      action?.kind !== "photo" &&
      action?.kind !== "budget" &&
      action?.kind !== "treasury" &&
      action?.kind !== "supplierInvoice" &&
      action?.kind !== "payment"
    )
      return
    let activeRequest = true
    setTaskSitesLoading(true)
    setTaskSitesError("")
    const loadSites =
      action.kind === "task"
        ? Promise.all([api.sites(), api.team()]).then(([result, members]) => {
            if (!activeRequest) return
            setTaskSites(result)
            setTaskMembers(members)
            setTaskSiteId(
              user.assignedSiteId &&
                result.some((site) => site.id === user.assignedSiteId)
                ? user.assignedSiteId
                : "",
            )
            setTaskAssigneeId("")
          })
        : api.sites().then((result) => {
            if (!activeRequest) return
            setTaskSites(result)
            if (action.kind === "report") {
              setTaskSiteId(
                user.assignedSiteId &&
                  result.some((site) => site.id === user.assignedSiteId)
                  ? user.assignedSiteId
                  : "",
              )
            }
          })
    loadSites
      .catch((error: unknown) => {
        if (activeRequest) {
          setTaskSitesError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les chantiers.",
          )
        }
      })
      .finally(() => {
        if (activeRequest) setTaskSitesLoading(false)
      })
    return () => {
      activeRequest = false
    }
  }, [action?.kind, user.assignedSiteId])

  useEffect(() => {
    if (action?.kind !== "tenant") return
    let activeRequest = true
    setTenantPlansLoading(true)
    setTenantPlans([])
    setTenantPlanId("")
    setTaskSitesError("")
    api
      .subscriptionPlans()
      .then((result) => {
        if (activeRequest) {
          const plans = result.filter((plan) => plan.active)
          setTenantPlans(plans)
          setTenantPlanId(
            plans.find((plan) => plan.name === "Plan PME")?.id ??
              plans[0]?.id ??
              "",
          )
        }
      })
      .catch((error: unknown) => {
        if (activeRequest) {
          setTaskSitesError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les plans d’abonnement.",
          )
        }
      })
      .finally(() => {
        if (activeRequest) setTenantPlansLoading(false)
      })
    return () => {
      activeRequest = false
    }
  }, [action?.kind])

  useEffect(() => {
    if (
      action?.kind !== "ticket" &&
      !(action?.kind === "invoice" && !action.id)
    ) return
    let activeRequest = true
    setTaskSitesError("")
    api
      .platformTenants()
      .then((result) => {
        if (activeRequest) setPlatformTenants(result)
      })
      .catch((error: unknown) => {
        if (activeRequest) {
          setTaskSitesError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les entreprises.",
          )
        }
      })
    return () => {
      activeRequest = false
    }
  }, [action?.kind])

  if (!action) return null
  const allowedActionKinds = getAllowedActionKinds(user)
  if (!allowedActionKinds.includes(action.kind)) {
    return null
  }

  const fields = actionFields[action.kind]
  const assignableTeamSites = taskSites.filter(
    (site) => site.status !== "Archivé",
  )
  const selectableTaskSites = user.capabilities.includes("read_company")
    ? taskSites
    : taskSites.filter((site) => site.id === user.assignedSiteId)
  const assignableTaskMembers = taskMembers.filter(
    (member) =>
      member.active &&
      (member.role === "ADMIN_ENTERPRISE" ||
        !siteScopedRoles.includes(member.role) ||
        member.assignedSiteId === taskSiteId),
  )
  const visibleFields =
    action.kind === "site"
      ? action.id
        ? fields
        : fields.filter((field) => field.label !== "Statut")
      : action.kind === "member"
      ? fields.slice(0, 2)
      : action.kind === "payment"
        ? fields
        : action.kind === "supplierInvoice" || action.kind === "supplierInvoicePayment" || action.kind === "paymentReceipt"
          ? fields
      : action.kind === "invoice"
        ? action.id
          ? [fields[4]!]
          : fields.slice(0, 4)
      : action.kind === "tenant"
        ? fields.slice(0, 5)
      : action.kind === "plan"
        ? fields
        : action.kind === "task"
          ? fields
          : fields.slice(0, action.kind === "report" ? 3 : 2)
  const requiredTailField =
    action.kind === "member" || action.kind === "tenant"
      ? fields[fields.length - 1]
      : null
  const actionHelpText = actionGuideByKind[action.kind]

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (!action) return

    event.preventDefault()
    setSubmitError("")
    setSubmitting(true)
    try {
      const values: Record<string, string> = {}
      for (const [key, value] of new FormData(event.currentTarget)) {
        if (value instanceof File) {
          if (value.size > 2 * 1024 * 1024) {
            throw new Error("La photo doit peser au maximum 2 Mo.")
          }
          if (value.size > 0) {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => {
                if (typeof reader.result !== "string") {
                  reject(new Error("La lecture de la photo a échoué."))
                  return
                }
                resolve(reader.result)
              }
              reader.onerror = () =>
                reject(new Error("La lecture de la photo a échoué."))
              reader.readAsDataURL(value)
            })
            values.imageBase64 = dataUrl.slice(dataUrl.indexOf(",") + 1)
            values.contentType = value.type
          }
        } else {
          values[key] = String(value)
        }
      }
      if (
        (action.kind === "tenant" || action.kind === "member") &&
        values["Mot de passe provisoire"] !==
          values["Confirmer le mot de passe provisoire"]
      ) {
        throw new Error("Les deux saisies du mot de passe provisoire ne correspondent pas.")
      }
      if (action.kind === "photo" && values.includeLocation === "on") {
        if (!navigator.geolocation) {
          throw new Error(
            "La géolocalisation n’est pas disponible sur cet appareil.",
          )
        }
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              () =>
                reject(
                  new Error(
                    "La position n’a pas pu être récupérée. Autorisez la géolocalisation ou décochez cette option.",
                  ),
                ),
              { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
            )
          },
        )
        values.latitude = String(position.coords.latitude)
        values.longitude = String(position.coords.longitude)
      }
      await onConfirm(action, values)
      onClose()
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "L’opération n’a pas pu être enregistrée.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`action-modal${action.kind === "site" ? " action-modal--site" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="action-modal__heading">
          <div>
            <span className="eyebrow">Nouvelle opération</span>
            <h2 id="action-title">{action.title}</h2>
          </div>
          <button className="icon-button" aria-label="Fermer" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={(event) => void submit(event)}>
          <div className="form-journey-banner">
            <Icon name="check" size={16} />
            <span>{actionHelpText}</span>
          </div>
          {visibleFields.map((field) => (
            <label
              key={field.label}
              className={
                action.kind === "site" &&
                [
                  "Nom du chantier",
                  "Description du projet",
                  "Adresse / quartier",
                ].includes(field.label)
                  ? "full-field"
                  : undefined
              }
            >
              <span>{field.label}</span>
              {action.kind === "site" && field.label === "Statut" ? (
                <select name={field.label} defaultValue={action.initialValues?.[field.label] ?? "En cours"}>
                  {(["En cours", "En pause", "Terminé", "Archivé"] as const).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              ) : action.kind === "site" && field.label === "Province" ? (
                <select
                  name={field.label}
                  defaultValue={action.initialValues?.[field.label] ?? ""}
                >
                  <option value="">Sélectionner une province</option>
                  {[
                    "Estuaire",
                    "Haut-Ogooué",
                    "Moyen-Ogooué",
                    "Ngounié",
                    "Nyanga",
                    "Ogooué-Ivindo",
                    "Ogooué-Lolo",
                    "Ogooué-Maritime",
                    "Woleu-Ntem",
                  ].map((province) => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
              ) : action.kind === "site" && field.label === "Description du projet" ? (
                <textarea
                  name={field.label}
                  placeholder={field.placeholder}
                  required={false}
                  maxLength={4000}
                  rows={4}
                  defaultValue={action.initialValues?.[field.label]}
                />
              ) : action.kind === "tenant" &&
              field.label === "Plan d’abonnement" ? (
                <select
                  name="planId"
                  value={action.initialValues?.planId ?? tenantPlanId}
                  required
                  disabled={tenantPlansLoading || tenantPlans.length === 0}
                  onChange={(event) => setTenantPlanId(event.target.value)}
                >
                  <option value="" disabled>
                    {tenantPlansLoading
                      ? "Chargement des plans…"
                      : "Choisir un plan actif"}
                  </option>
                  {tenantPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} · {Number(plan.monthlyPriceFcfa) === 0
                        ? "Sur devis"
                        : `${formatFcfa(Number(plan.monthlyPriceFcfa))} / mois`}
                    </option>
                  ))}
                </select>
              ) : action.kind === "task" && field.label === "Description" ? (
                <textarea
                  name={field.label}
                  placeholder={field.placeholder}
                  required={false}
                  maxLength={4000}
                  rows={3}
                />
              ) : (
                <input
                  name={field.label}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  required={field.required ?? true}
                  min={field.min}
                  max={field.max}
                  minLength={field.minLength}
                  maxLength={field.maxLength}
                  step={field.type === "number" ? 1 : undefined}
                  defaultValue={action.initialValues?.[field.label]}
                />
              )}
            </label>
          ))}
          {action.kind === "site" && (
            <div className="site-image-field">
              <span>Image du chantier (JPEG, PNG ou WebP · 2 Mo max.)</span>
              {action.initialValues?.hasImage === "true" && action.id && (
                <img
                  src={api.siteImageUrl(action.id)}
                  alt={`Image actuelle de ${action.title.replace(/^Modifier /, "")}`}
                />
              )}
              <input
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Choisir une image du chantier"
              />
              {action.initialValues?.hasImage === "true" && (
                <label className="site-image-field__remove">
                  <input name="removeSiteImage" type="checkbox" />
                  Supprimer l’image actuelle
                </label>
              )}
            </div>
          )}
          {requiredTailField && (
            <label key={requiredTailField.label}>
              <span>{requiredTailField.label}</span>
              <input
                name={requiredTailField.label}
                type={passwordVisible ? "text" : requiredTailField.type ?? "text"}
                placeholder={requiredTailField.placeholder}
                required={requiredTailField.required ?? true}
                minLength={requiredTailField.minLength}
                value={temporaryPassword}
                onChange={(event) => setTemporaryPassword(event.target.value)}
                autoComplete={action.kind === "tenant" ? "new-password" : undefined}
              />
              <div className="form-inline-actions">
                <button className="text-button" type="button" onClick={() => setTemporaryPassword(generateTemporaryPassword())}>
                  Générer
                </button>
                <button className="text-button" type="button" onClick={() => setPasswordVisible((visible) => !visible)}>
                  {passwordVisible ? "Masquer" : "Afficher"}
                </button>
              </div>
              <small>
                Mot de passe provisoire à transmettre par un canal privé et sécurisé.
                Le changement sera obligatoire à la première connexion.
              </small>
            </label>
          )}
          {(action.kind === "tenant" || action.kind === "member") && (
            <label>
              <span>Confirmer le mot de passe provisoire</span>
              <input
                name="Confirmer le mot de passe provisoire"
                type={passwordVisible ? "text" : "password"}
                placeholder="Saisissez-le à nouveau"
                required
                minLength={12}
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
            </label>
          )}
          {action.kind === "photo" && (
            <>
              <label>
                <span>Fichier image (JPEG, PNG ou WebP · 2 Mo max.)</span>
                <input
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  required
                />
              </label>
              <label>
                <span>
                  <input name="includeLocation" type="checkbox" />
                  Joindre ma position GPS (facultatif)
                </span>
              </label>
            </>
          )}
          {action.kind === "member" ? (
            <>
              <label>
                <span>Rôle</span>
                <select
                  name="role"
                  value={memberRole}
                  required
                  onChange={(event) =>
                    setMemberRole(event.target.value as ManagedRole)
                  }
                >
                  {managedRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>
                  Chantier affecté
                  {siteScopedRoles.includes(memberRole) ? " (obligatoire)" : " (facultatif)"}
                </span>
                <select
                  name="assignedSiteId"
                  defaultValue=""
                  required={siteScopedRoles.includes(memberRole)}
                  disabled={taskSitesLoading || assignableTeamSites.length === 0}
                >
                  <option value="">Aucun chantier spécifique</option>
                  {assignableTeamSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : action.kind === "task" ? (
            <>
              <label>
                <span>Chantier</span>
                <select
                  name="siteId"
                  value={taskSiteId}
                  required
                  disabled={taskSitesLoading || selectableTaskSites.length === 0}
                  onChange={(event) => {
                    setTaskSiteId(event.target.value)
                    setTaskAssigneeId("")
                  }}
                >
                  <option value="" disabled>
                    {taskSitesLoading
                      ? "Chargement des chantiers…"
                      : "Choisir un chantier"}
                  </option>
                  {selectableTaskSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Responsable (facultatif)</span>
                <select
                  name="assignedTo"
                  value={taskAssigneeId}
                  disabled={!taskSiteId}
                  onChange={(event) => setTaskAssigneeId(event.target.value)}
                >
                  <option value="">À définir par l’équipe</option>
                  {assignableTaskMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName} · {member.roleLabel}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Priorité</span>
                <select name="priority" defaultValue="Normale" required>
                  {(["Basse", "Normale", "Haute", "Urgente"] as const).map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </label>
            </>
          ) : action.kind === "report" ||
            action.kind === "payment" ? (
            <label>
              <span>Chantier</span>
              <select
                name="siteId"
                value={
                  action.kind === "report"
                    ? taskSiteId
                    : undefined
                }
                defaultValue={
                  action.kind === "payment"
                    ? action.initialValues?.siteId ?? ""
                    : undefined
                }
                required
                onChange={
                  action.kind === "report"
                    ? (event) => setTaskSiteId(event.target.value)
                    : undefined
                }
                disabled={taskSitesLoading || selectableTaskSites.length === 0}
              >
                <option value="" disabled>
                  {taskSitesLoading
                    ? "Chargement des chantiers…"
                    : "Choisir un chantier"}
                </option>
                {selectableTaskSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
          ) : action.kind === "photo" ||
            action.kind === "budget" ||
            action.kind === "treasury" ||
            action.kind === "supplierInvoice" ? (
            <>
              {action.kind === "treasury" && (
                <label>
                  <span>Type d’opération</span>
                  <select
                    name="entryType"
                    defaultValue={action.initialValues?.entryType ?? "encaissement"}
                  >
                    <option value="encaissement">Encaissement</option>
                    <option value="depense">Dépense à enregistrer</option>
                  </select>
                </label>
              )}
              <label>
                <span>Chantier lié à la facture</span>
                <select
                  name="siteId"
                  defaultValue={action.initialValues?.siteId ?? ""}
                  required
                  disabled={
                    taskSitesLoading || selectableTaskSites.length === 0
                  }
                >
                  <option value="" disabled>
                    {taskSitesLoading
                      ? "Chargement des chantiers…"
                      : "Choisir un chantier"}
                  </option>
                  {selectableTaskSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : action.kind === "ticket" || action.kind === "invoice" ? (
            <>
              {action.kind === "ticket" && (
                <label>
                  <span>Priorité</span>
                  <select name="priority" defaultValue="Normale" required>
                    {(["Basse", "Normale", "Haute", "Urgente"] as const).map(
                      (priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              )}
              {action.kind === "invoice" && action.id && (
                <label>
                  <span>Mode d’encaissement</span>
                  <select name="paymentMethod" defaultValue="Espèces" required>
                    {(["Espèces", "Virement bancaire", "Mobile Money", "Autre"] as const).map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </label>
              )}
              {(action.kind === "ticket" || !action.id) && (
                <label>
                  <span>{action.kind === "invoice" ? "Entreprise facturée" : "Entreprise concernée"}</span>
                  <select name="tenantId" defaultValue="" required disabled={!platformTenants.length}>
                    <option value="" disabled>Choisir une entreprise</option>
                    {platformTenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          ) : null}
          {action.kind === "tenant" &&
            !tenantPlansLoading &&
            tenantPlans.length === 0 &&
            !taskSitesError && (
              <div className="auth-error" role="alert">
                Aucun plan actif n’est disponible. Activez un plan dans Abonnements avant de créer une entreprise.
              </div>
            )}
          {taskSitesError &&
            (action.kind === "task" ||
              action.kind === "report" ||
              action.kind === "member" ||
              action.kind === "photo" ||
              action.kind === "budget" ||
              action.kind === "treasury" ||
              action.kind === "payment" ||
              action.kind === "supplierInvoice" ||
              action.kind === "ticket" ||
              action.kind === "invoice" ||
              action.kind === "tenant") && (
              <div className="auth-error" role="alert">
                {taskSitesError}
              </div>
            )}
          {submitError && (
            <div className="auth-error" role="alert">
              {submitError}
            </div>
          )}
          <div className="action-modal__note">
            <Icon name={action.kind === "tenant" ? "building" : "cloud"} />
            <span>
              {action.kind === "tenant"
                ? "Création de l’espace entreprise"
                : action.kind === "photo"
                  ? "Enregistrement de la photo"
                  : "Enregistrement de l’opération"}
              <small>
                {action.kind === "tenant"
                  ? "Essai de 14 jours. L’entreprise renseignera ses chantiers après la création de son espace."
                  : "Les informations seront enregistrées dans votre espace autorisé."}
              </small>
            </span>
          </div>
          <div className="settings-actions">
            <button className="outline-button" type="button" onClick={onClose}>
              Annuler
            </button>
            <button
              className="module-primary"
              type="submit"
              disabled={
                submitting ||
                ((action.kind === "task" ||
                  action.kind === "report" ||
                  action.kind === "photo" ||
                  action.kind === "budget" ||
                  action.kind === "treasury" ||
                  action.kind === "payment" ||
                  action.kind === "supplierInvoice") &&
                  (taskSitesLoading || selectableTaskSites.length === 0)) ||
                ((action.kind === "ticket" ||
                  (action.kind === "invoice" && !action.id)) &&
                  platformTenants.length === 0) ||
                (action.kind === "tenant" &&
                  (tenantPlansLoading || tenantPlans.length === 0))
              }
            >
              <Icon name="check" />
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
  onClick,
}: {
  icon: IconName
  label: string
  value: string
  detail: string
  tone: string
  onClick?: () => void
}) {
  const content = (
    <>
      <span className={`metric-card__icon metric-card__icon--${tone}`}>
        <Icon name={icon} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button className="metric-card metric-card--interactive" onClick={onClick} type="button">
        {content}
      </button>
    )
  }

  return (
    <article className="metric-card">
      {content}
    </article>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  icon,
  showAction = true,
  onAction,
}: {
  eyebrow: string
  title: string
  description: string
  action: string
  icon: IconName
  showAction?: boolean
  onAction?: () => void
}) {
  return (
    <div className="module-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {showAction && (
        <button className="module-primary" onClick={onAction}>
          <Icon name={icon} /> {action}
        </button>
      )}
    </div>
  )
}

function DetailDialog({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="action-modal__heading">
          <div>
            <span className="eyebrow">Détail</span>
            <h2 id="detail-title">{title}</h2>
          </div>
          <button className="icon-button" aria-label="Fermer" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="detail-modal__content">{children}</div>
      </section>
    </div>
  )
}

function TemporaryPasswordDialog({
  user,
  onClose,
  onConfirm,
}: {
  user: PlatformUser
  onClose: () => void
  onConfirm: (password: string) => Promise<void>
}) {
  const [password, setPassword] = useState(generateTemporaryPassword)
  const [confirmation, setConfirmation] = useState("")
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.")
      return
    }
    setLoading(true)
    setError("")
    try {
      await onConfirm(password)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le mot de passe n’a pas pu être réinitialisé.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="temporary-password-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="action-modal__heading">
          <div>
            <span className="eyebrow">Réinitialisation sécurisée</span>
            <h2 id="temporary-password-title">Mot de passe provisoire</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        </div>
        <form className="detail-modal__content" onSubmit={(event) => void submit(event)}>
          <p>Pour {user.fullName} ({user.emailMasked}). L’accès sera révoqué et le changement sera obligatoire à sa prochaine connexion. Transmettez le mot de passe par un canal privé.</p>
          <label>
            <span>Nouveau mot de passe (12 caractères minimum)</span>
            <input
              autoComplete="new-password"
              type={visible ? "text" : "password"}
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <div className="form-inline-actions">
            <button className="text-button" type="button" onClick={() => {
              setPassword(generateTemporaryPassword())
              setConfirmation("")
            }}>Générer un autre</button>
            <button className="text-button" type="button" onClick={() => setVisible((current) => !current)}>
              {visible ? "Masquer" : "Afficher"}
            </button>
          </div>
          <label>
            <span>Confirmer le mot de passe</span>
            <input
              autoComplete="new-password"
              type={visible ? "text" : "password"}
              minLength={12}
              maxLength={128}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="settings-actions">
            <button className="outline-button" type="button" onClick={onClose}>Annuler</button>
            <button className="module-primary" type="submit" disabled={loading}>
              {loading ? "Réinitialisation…" : "Réinitialiser"}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function EditPlatformUserDialog({
  user,
  onClose,
  onConfirm,
}: {
  user: PlatformUser
  onClose: () => void
  onConfirm: (input: { fullName: string; email?: string; phone?: string }) => Promise<void>
}) {
  const [fullName, setFullName] = useState(user.fullName)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      const input: { fullName: string; email?: string; phone?: string } = {
        fullName: fullName.trim(),
      }
      if (email.trim()) input.email = email.trim()
      if (phone.trim()) input.phone = phone.trim()
      await onConfirm(input)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le compte n’a pas pu être modifié.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-platform-user-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="action-modal__heading">
          <div>
            <span className="eyebrow">Compte utilisateur</span>
            <h2 id="edit-platform-user-title">Modifier le profil</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        </div>
        <form className="detail-modal__content" onSubmit={(event) => void submit(event)}>
          <p>Pour {user.emailMasked}. L’adresse actuelle et le téléphone sont masqués ; laissez les champs vides pour les conserver.</p>
          <label>
            <span>Nom complet</span>
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={2} maxLength={120} required />
          </label>
          <label>
            <span>Nouvelle adresse email <small>Facultatif</small></span>
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} placeholder="Laisser vide pour conserver l’adresse actuelle" />
          </label>
          <label>
            <span>Nouveau téléphone <small>Facultatif</small></span>
            <input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} placeholder="Laisser vide pour conserver le numéro actuel" />
          </label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="settings-actions">
            <button className="outline-button" type="button" onClick={onClose}>Annuler</button>
            <button className="module-primary" type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function PlatformSupportAccessDialog({
  user,
  onClose,
  onConfirm,
}: {
  user: PlatformUser
  onClose: () => void
  onConfirm: (justification: string, emergencyOverride: boolean) => Promise<void>
}) {
  const [justification, setJustification] = useState("")
  const [emergencyAcknowledged, setEmergencyAcknowledged] = useState(false)
  const [emergencyRequired, setEmergencyRequired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (emergencyRequired && !emergencyAcknowledged) {
      setError("Confirmez que cet accès d’urgence est nécessaire et sera journalisé.")
      return
    }
    setLoading(true)
    setError("")
    try {
      await onConfirm(justification.trim(), emergencyRequired)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "L’accès support a été refusé."
      if (!emergencyRequired && message.toLocaleLowerCase("fr-FR").includes("consentement")) {
        setEmergencyRequired(true)
        setError("Le consentement de l’utilisateur n’est pas enregistré. Si l’intervention est indispensable, fournissez une justification détaillée pour demander un accès d’urgence audité.")
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-support-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="action-modal__heading">
          <div>
            <span className="eyebrow">Accès exceptionnel et audité</span>
            <h2 id="platform-support-title">Mode support</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        </div>
        <form className="detail-modal__content" onSubmit={(event) => void submit(event)}>
          <p>Consultation des coordonnées de {user.fullName} ({user.emailMasked}). Une justification est obligatoire et sera inscrite au journal d’audit.</p>
          <label>
            <span>{emergencyRequired ? "Justification d’urgence (20 caractères minimum)" : "Justification (12 caractères minimum)"}</span>
            <textarea
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              minLength={emergencyRequired ? 20 : 12}
              maxLength={1000}
              rows={4}
              required
            />
          </label>
          {emergencyRequired && (
            <label className="checkbox">
              <input type="checkbox" checked={emergencyAcknowledged} onChange={(event) => setEmergencyAcknowledged(event.target.checked)} />
              <span>Je confirme que l’accès d’urgence est nécessaire et accepte sa journalisation.</span>
            </label>
          )}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="settings-actions">
            <button className="outline-button" type="button" onClick={onClose}>Annuler</button>
            <button className="module-primary" type="submit" disabled={loading}>
              {loading ? "Vérification…" : emergencyRequired ? "Demander l’accès d’urgence" : "Continuer"}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function ConfirmPlatformUserActionDialog({
  user,
  action,
  onClose,
  onConfirm,
}: {
  user: PlatformUser
  action: "block" | "unblock" | "logout"
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const isLogout = action === "logout"
  const isBlocking = action === "block"

  async function confirm() {
    setLoading(true)
    setError("")
    try {
      await onConfirm()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’action n’a pas pu être effectuée.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-user-confirm-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="action-modal__heading">
          <div>
            <span className="eyebrow">Confirmation</span>
            <h2 id="platform-user-confirm-title">
              {isLogout ? "Forcer la déconnexion" : isBlocking ? "Bloquer le compte" : "Réactiver le compte"}
            </h2>
          </div>
          <button className="icon-button" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        </div>
        <div className="detail-modal__content">
          <p>
            {isLogout
              ? `Toutes les sessions de ${user.fullName} seront immédiatement révoquées.`
              : `Confirmez-vous vouloir ${isBlocking ? "bloquer" : "réactiver"} le compte de ${user.fullName} ?`}
          </p>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="settings-actions">
            <button className="outline-button" type="button" onClick={onClose}>Annuler</button>
            <button className="module-primary" type="button" onClick={() => void confirm()} disabled={loading}>
              {loading ? "Traitement…" : isLogout ? "Déconnecter" : isBlocking ? "Bloquer le compte" : "Réactiver"}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function EditTenantDialog({
  tenant,
  onClose,
  onConfirm,
}: {
  tenant: PlatformTenant
  onClose: () => void
  onConfirm: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(tenant.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      await onConfirm(name.trim())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’entreprise n’a pas pu être modifiée.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="edit-tenant-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="action-modal__heading">
          <div><span className="eyebrow">Entreprise cliente</span><h2 id="edit-tenant-title">Modifier le nom</h2></div>
          <button className="icon-button" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        </div>
        <form className="detail-modal__content" onSubmit={(event) => void submit(event)}>
          <label><span>Nom de l’entreprise</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={160} required /></label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="settings-actions">
            <button className="outline-button" type="button" onClick={onClose}>Annuler</button>
            <button className="module-primary" type="submit" disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function EditTeamMemberDialog({
  member,
  onClose,
  onConfirm,
}: {
  member: TeamMember
  onClose: () => void
  onConfirm: (input: { fullName: string; email: string; phone: string | null }) => Promise<void>
}) {
  const [fullName, setFullName] = useState(member.fullName)
  const [email, setEmail] = useState(member.email)
  const [phone, setPhone] = useState(member.phone ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      await onConfirm({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || null })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le profil n’a pas pu être modifié.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="edit-team-member-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="action-modal__heading">
          <div><span className="eyebrow">Collaborateur</span><h2 id="edit-team-member-title">Modifier le profil</h2></div>
          <button className="icon-button" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        </div>
        <form className="detail-modal__content" onSubmit={(event) => void submit(event)}>
          <label><span>Nom complet</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={2} maxLength={120} required /></label>
          <label><span>Email professionnel</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></label>
          <label><span>Téléphone <small>Facultatif</small></span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} /></label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="settings-actions">
            <button className="outline-button" type="button" onClick={onClose}>Annuler</button>
            <button className="module-primary" type="submit" disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function ConfirmActionDialog({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function confirm() {
    setLoading(true)
    setError("")
    try {
      await onConfirm()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’action n’a pas pu être effectuée.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-action-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="action-modal__heading">
          <div><span className="eyebrow">Confirmation</span><h2 id="confirm-action-title">{title}</h2></div>
          <button className="icon-button" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        </div>
        <div className="detail-modal__content">
          <p>{description}</p>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="settings-actions">
            <button className="outline-button" type="button" onClick={onClose}>Annuler</button>
            <button className="module-primary" type="button" onClick={() => void confirm()} disabled={loading}>{loading ? "Traitement…" : confirmLabel}</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function formatFcfa(amount: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount)} FCFA`
}

function ModuleView({
  active,
  user,
  openAction,
  notify,
  onProfileUpdate,
  dataRevision,
  onDataChange,
}: {
  active: string
  user: AuthUser
  openAction: (
    kind: ActionKind,
    title: string,
    id?: string,
    initialValues?: Record<string, string>,
  ) => void
  notify: (message: string) => void
  onProfileUpdate: (user: AuthUser) => void
  dataRevision: number
  onDataChange: () => void
}) {
  const [taskFilter, setTaskFilter] = useState("Toutes")
  const [taskDueAscending, setTaskDueAscending] = useState(true)
  const [saved, setSaved] = useState(false)
  const [profileName, setProfileName] = useState(user.fullName)
  const [profileEmail, setProfileEmail] = useState(user.email)
  const [profilePhone, setProfilePhone] = useState(user.phone ?? "")
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null)
  const [profilePhotoChecked, setProfilePhotoChecked] = useState(false)
  const [profilePhotoSaving, setProfilePhotoSaving] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)
  const [sensitiveConsent, setSensitiveConsent] = useState(user.sensitiveDataConsented)
  const [profileError, setProfileError] = useState("")
  const [clockBusy, setClockBusy] = useState(false)
  const [siteFilter, setSiteFilter] = useState("Tous")
  const [siteSearch, setSiteSearch] = useState("")
  const [selectedSite, setSelectedSite] = useState<SiteDetail | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [photoFilter, setPhotoFilter] = useState("Toutes")
  const [photoSearch, setPhotoSearch] = useState("")
  const [reportFilter, setReportFilter] = useState("Tous")
  const [teamFilter, setTeamFilter] = useState("Tous")
  const [teamSearch, setTeamSearch] = useState("")
  const [settingsTab, setSettingsTab] = useState("Entreprise")
  const [sites, setSites] = useState<Site[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [photos, setPhotos] = useState<SitePhoto[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([])
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(
    null,
  )
  const [companyOperatingBudget, setCompanyOperatingBudget] =
    useState<CompanyOperatingBudget | null>(null)
  const [companyBudgetYear, setCompanyBudgetYear] = useState(new Date().getFullYear())
  const [companyBudgetAmount, setCompanyBudgetAmount] = useState("")
  const [companyBudgetNotes, setCompanyBudgetNotes] = useState("")
  const [companyBudgetSaving, setCompanyBudgetSaving] = useState(false)
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [paymentDossiers, setPaymentDossiers] = useState<PaymentDossier[]>([])
  const [platformTenants, setPlatformTenants] = useState<PlatformTenant[]>([])
  const [selectedPlatformTenant, setSelectedPlatformTenant] = useState<
    (PlatformTenant & { activeSiteCount: number }) | null
  >(null)
  const [platformTenantEditTarget, setPlatformTenantEditTarget] = useState<PlatformTenant | null>(null)
  const [platformTenantStatusTarget, setPlatformTenantStatusTarget] = useState<{
    tenant: PlatformTenant
    status: PlatformTenant["status"]
  } | null>(null)
  const [subscriptionTerminationTarget, setSubscriptionTerminationTarget] = useState<PlatformTenant | null>(null)
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([])
  const [platformUserTotal, setPlatformUserTotal] = useState(0)
  const [platformUserPage, setPlatformUserPage] = useState(1)
  const [platformUserSearch, setPlatformUserSearch] = useState("")
  const [platformUserStatus, setPlatformUserStatus] = useState<
    "all" | "active" | "blocked"
  >("all")
  const [platformUserRole, setPlatformUserRole] = useState<UserRole | "all">("all")
  const [platformUserTenantId, setPlatformUserTenantId] = useState("all")
  const [newEditorName, setNewEditorName] = useState("")
  const [newEditorEmail, setNewEditorEmail] = useState("")
  const [creatingPlatformEditor, setCreatingPlatformEditor] = useState(false)
  const [platformUserEditTarget, setPlatformUserEditTarget] = useState<PlatformUser | null>(null)
  const [platformSupportTarget, setPlatformSupportTarget] = useState<PlatformUser | null>(null)
  const [platformUserConfirmation, setPlatformUserConfirmation] = useState<{
    user: PlatformUser
    action: "block" | "unblock" | "logout"
  } | null>(null)
  const [supportUserDetail, setSupportUserDetail] = useState<{
    id: string
    fullName: string
    email: string
    phone: string | null
    role: string
    active: boolean
    consented: boolean
  } | null>(null)
  const [temporaryPasswordTarget, setTemporaryPasswordTarget] = useState<PlatformUser | null>(null)
  const [platformAuditLogs, setPlatformAuditLogs] = useState<PlatformAuditLog[]>([])
  const [auditActionFilter, setAuditActionFilter] = useState("")
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>([])
  const [platformInvoices, setPlatformInvoices] = useState<PlatformInvoice[]>([])
  const [invoiceToPrint, setInvoiceToPrint] = useState<PlatformInvoice | null>(null)
  const [subscriptionPlans, setSubscriptionPlans] =
    useState<SubscriptionPlan[]>([])
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [platformOverview, setPlatformOverview] =
    useState<PlatformOverview | null>(null)
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(
    null,
  )
  const [platformSettings, setPlatformSettings] =
    useState<PlatformSettings | null>(null)
  const [updatingMemberIds, setUpdatingMemberIds] = useState<string[]>([])
  const [teamMemberEditTarget, setTeamMemberEditTarget] = useState<TeamMember | null>(null)
  const [teamMemberDeleteTarget, setTeamMemberDeleteTarget] = useState<TeamMember | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState("")
  useEffect(() => {
    if (!invoiceToPrint) return
    const clearPrintState = () => setInvoiceToPrint(null)
    window.addEventListener("afterprint", clearPrintState)
    const timeout = window.setTimeout(() => window.print(), 100)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener("afterprint", clearPrintState)
    }
  }, [invoiceToPrint])
  const can = (capability: AuthUser["capabilities"][number]) =>
    user.capabilities.includes(capability)
  const canUpdateTask = (task: Task) =>
    (can("manage_tasks") &&
      (can("read_company") || task.siteName === user.assignedSite)) ||
    (can("update_assigned_tasks") && task.assignedTo === user.id)

  useEffect(() => {
    let activeRequest = true
    const load =
      active === "Chantiers"
        ? api.sites().then((result) => {
            if (activeRequest) setSites(result)
          })
        : active === "Mes tâches"
          ? api.tasks().then((result) => {
              if (activeRequest) setTasks(result)
            })
          : active === "Rapports"
            ? api.reports().then((result) => {
                if (activeRequest) setReports(result)
              })
            : active === "Photos"
              ? api.photos().then((result) => {
                  if (activeRequest) setPhotos(result)
                })
              : active === "Pointage"
                ? api.attendance().then((result) => {
                    if (activeRequest) setAttendance(result)
                  })
                : active === "Budget"
                  ? Promise.all([
                      api.finance(),
                      api.companyOperatingBudget(),
                      api.sites(),
                    ]).then(([finance, budget, budgetSites]) => {
                      if (activeRequest) {
                        setFinanceEntries(finance.data)
                        setFinanceSummary(finance.summary)
                        setSites(budgetSites)
                        setCompanyOperatingBudget(budget)
                        setCompanyBudgetYear(budget.fiscalYear)
                        setCompanyBudgetAmount(budget.amountFcfa ?? "")
                        setCompanyBudgetNotes(budget.notes)
                      }
                    })
                  : active === "Trésorerie"
                    ? api.finance().then((result) => {
                        if (activeRequest) {
                          setFinanceEntries(result.data)
                          setFinanceSummary(result.summary)
                        }
                      })
                  : active === "Dossiers de paiement"
                    ? api.paymentDossiers().then((result) => {
                        if (activeRequest) setPaymentDossiers(result.data)
                      })
                    : active === "Factures fournisseurs"
                      ? Promise.all([
                          api.supplierInvoices(),
                          api.sites(),
                        ]).then(([invoices, invoiceSites]) => {
                          if (activeRequest) {
                            setSupplierInvoices(invoices.data)
                            setSites(invoiceSites)
                          }
                        })
                    : active === "Entreprises"
                      ? Promise.all([
                          api.platformTenants(),
                          api.subscriptionPlans(),
                          api.registrationRequests(),
                        ]).then(([tenants, plans, requests]) => {
                          if (activeRequest) {
                            setPlatformTenants(tenants)
                            setSubscriptionPlans(plans)
                            setRegistrationRequests(requests)
                          }
                        })
                      : active === "Abonnements"
                        ? Promise.all([
                            api.subscriptionPlans(),
                            api.platformTenants(),
                            api.platformOverview(),
                            api.platformInvoices(),
                          ]).then(([plans, tenants, overview, invoices]) => {
                            if (activeRequest) {
                              setSubscriptionPlans(plans)
                              setPlatformTenants(tenants)
                              setPlatformOverview(overview)
                              setPlatformInvoices(invoices)
                            }
                          })
                        : active === "Support"
                          ? api.supportTickets().then((result) => {
                              if (activeRequest) setSupportTickets(result)
                            })
                          : active === "Paramètres" && user.role === "EDITOR"
                            ? api.platformSettings().then((result) => {
                                if (activeRequest) setPlatformSettings(result)
                              })
                            : active === "Paramètres" && can("manage_company")
                              ? api.tenantSettings().then((result) => {
                                  if (activeRequest) setTenantSettings(result)
                                })
                              : active === "Équipe"
                                ? Promise.all([api.team(), api.sites()]).then(
                                    ([members, teamSites]) => {
                                      if (activeRequest) {
                                        setTeamMembers(members)
                                        setSites(teamSites)
                                      }
                                    },
                                  )
                                : null
    if (!load) return

    setLoadingData(true)
    setDataError("")
    load
      .catch((error: unknown) => {
        if (activeRequest) {
          setDataError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les données depuis le serveur.",
          )
        }
      })
      .finally(() => {
        if (activeRequest) setLoadingData(false)
      })
    return () => {
      activeRequest = false
    }
  }, [active, dataRevision])

  useEffect(() => {
    if (active !== "Utilisateurs" || user.role !== "EDITOR") return
    let activeRequest = true
    setLoadingData(true)
    setDataError("")
    Promise.all([
      api.platformUsers({
        page: platformUserPage,
        limit: 25,
        q: platformUserSearch,
        status: platformUserStatus,
        ...(platformUserRole === "all" ? {} : { role: platformUserRole }),
        ...(platformUserTenantId === "all" ? {} : { tenantId: platformUserTenantId }),
      }),
      api.platformTenants(),
    ]).then(([result, tenants]) => {
      if (!activeRequest) return
      setPlatformUsers(result.data)
      setPlatformUserTotal(result.total)
      setPlatformTenants(tenants)
    }).catch((error: unknown) => {
      if (activeRequest) setDataError(error instanceof Error ? error.message : "Impossible de charger les comptes.")
    }).finally(() => {
      if (activeRequest) setLoadingData(false)
    })
    return () => { activeRequest = false }
  }, [active, dataRevision, platformUserPage, platformUserSearch, platformUserStatus, platformUserRole, platformUserTenantId, user.role])

  useEffect(() => {
    if (active !== "Journal d’audit" || user.role !== "EDITOR") return
    let activeRequest = true
    setLoadingData(true)
    setDataError("")
    api.platformAuditLogs({ limit: 50, action: auditActionFilter || undefined }).then((result) => {
      if (activeRequest) setPlatformAuditLogs(result)
    }).catch((error: unknown) => {
      if (activeRequest) setDataError(error instanceof Error ? error.message : "Impossible de charger le journal d’audit.")
    }).finally(() => {
      if (activeRequest) setLoadingData(false)
    })
    return () => { activeRequest = false }
  }, [active, dataRevision, auditActionFilter, user.role])

  async function toggleAttendance() {
    if (!can("clock_in") || clockBusy) return
    setClockBusy(true)
    try {
      const openShift = attendance.find((record) => record.clockOutAt === null)
      if (openShift) {
        const result = await api.clockOut()
        setAttendance((current) =>
          current.map((record) => (record.id === result.id ? result : record)),
        )
        notify("Départ enregistré.")
      } else {
        const result = await api.clockIn()
        setAttendance((current) => [result, ...current])
        notify("Arrivée enregistrée.")
      }
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Le pointage n’a pas pu être enregistré.",
      )
    } finally {
      setClockBusy(false)
    }
  }

  async function realizeFinanceEntry(entry: FinanceEntry) {
    if (!can("manage_finance")) return
    try {
      const result = await api.realizeFinanceEntry(entry.id)
      setFinanceEntries((current) =>
        current.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                status: result.status,
                occurredAt: result.occurredAt,
              }
            : item,
        ),
      )
      onDataChange()
      notify("Opération financière enregistrée comme réalisée.")
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "L’opération n’a pas pu être mise à jour.",
      )
    }
  }

  async function updatePaymentStatus(
    dossier: PaymentDossier,
    status: PaymentDossierStatus,
    paymentReference?: string,
  ) {
    try {
      const updated = await api.updatePaymentDossierStatus(dossier.id, status, paymentReference)
      setPaymentDossiers((current) =>
        current.map((item) =>
          item.id === dossier.id ? { ...item, ...updated } : item,
        ),
      )
      notify(`Dossier ${dossier.reference} mis à jour.`)
      if (status === "Payé") onDataChange()
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Le dossier n’a pas pu être mis à jour.",
      )
    }
  }

  async function saveCompanyBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!can("manage_company_budget") || companyBudgetSaving) return
    const amount = Number(companyBudgetAmount)
    if (!Number.isSafeInteger(amount) || amount < 0) {
      setDataError("Le budget annuel doit être un montant entier positif ou nul en FCFA.")
      return
    }
    setCompanyBudgetSaving(true)
    setDataError("")
    try {
      const savedBudget = await api.saveCompanyOperatingBudget({
        fiscalYear: companyBudgetYear,
        amountFcfa: amount,
        notes: companyBudgetNotes,
      })
      setCompanyOperatingBudget(savedBudget)
      notify(`Budget de fonctionnement ${savedBudget.fiscalYear} enregistré.`)
    } catch (error) {
      setDataError(
        error instanceof Error ? error.message : "Le budget de l’entreprise n’a pas pu être enregistré.",
      )
    } finally {
      setCompanyBudgetSaving(false)
    }
  }

  async function updateSupplierInvoiceStatus(
    invoice: SupplierInvoice,
    status: Extract<SupplierInvoiceStatus, "Approuvée" | "Refusée">,
  ) {
    try {
      const updated = await api.updateSupplierInvoiceStatus(invoice.id, status)
      setSupplierInvoices((current) =>
        current.map((item) => item.id === invoice.id ? { ...item, ...updated } : item),
      )
      notify(`Facture ${invoice.invoiceReference} ${status.toLowerCase()}.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : "La facture n’a pas pu être traitée.")
    }
  }

  async function submitSupplierInvoice(invoice: SupplierInvoice) {
    try {
      const updated = await api.submitSupplierInvoice(invoice.id)
      setSupplierInvoices((current) =>
        current.map((item) => item.id === invoice.id ? { ...item, ...updated } : item),
      )
      notify(`Facture ${invoice.invoiceReference} soumise au Comptable.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : "La facture n’a pas pu être soumise.")
    }
  }

  async function updateTenantSubscription(
    tenant: PlatformTenant,
    planId: string,
    status: NonNullable<PlatformTenant["subscriptionStatus"]>,
    renewsAt: string | null = tenant.renewsAt,
    throwOnError = false,
  ) {
    try {
      const updated = await api.updateTenantSubscription(tenant.id, {
        planId,
        status,
        renewsAt,
      })
      const planName =
        subscriptionPlans.find((plan) => plan.id === planId)?.name ??
        tenant.planName
      const tenantStatus = status === "Résilié" ? "Suspendu" : status
      setPlatformTenants((current) =>
        current.map((item) =>
          item.id === tenant.id
            ? {
                ...item,
                planId,
                planName,
                status: tenantStatus,
                subscriptionStatus: status,
                renewsAt: updated.renewsAt,
              }
            : item,
        ),
      )
      notify(`Abonnement de ${tenant.name} mis à jour.`)
    } catch (error) {
      if (throwOnError) {
        throw error instanceof Error
          ? error
          : new Error("L’abonnement n’a pas pu être mis à jour.")
      }
      notify(
        error instanceof Error
          ? error.message
          : "L’abonnement n’a pas pu être mis à jour.",
      )
    }
  }

  async function updatePlatformTenant(
    tenant: PlatformTenant,
    updates: { name?: string; status?: PlatformTenant["status"] },
  ) {
    try {
      const updated = await api.updatePlatformTenant(tenant.id, updates)
      setPlatformTenants((current) =>
        current.map((item) => item.id === tenant.id ? { ...item, ...updated } : item),
      )
      notify(`Entreprise ${updated.status === "Archivé" ? "archivée" : "mise à jour"}.`)
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("L’entreprise n’a pas pu être mise à jour.")
    }
  }

  async function savePlatformTenantName(name: string) {
    if (!platformTenantEditTarget) return
    await updatePlatformTenant(platformTenantEditTarget, { name })
    setPlatformTenantEditTarget(null)
  }

  async function confirmPlatformTenantStatus() {
    if (!platformTenantStatusTarget) return
    await updatePlatformTenant(
      platformTenantStatusTarget.tenant,
      { status: platformTenantStatusTarget.status },
    )
    setPlatformTenantStatusTarget(null)
  }

  async function confirmSubscriptionTermination() {
    if (!subscriptionTerminationTarget) return
    await updateTenantSubscription(
      subscriptionTerminationTarget,
      subscriptionTerminationTarget.planId ?? "",
      "Résilié",
      subscriptionTerminationTarget.renewsAt,
      true,
    )
    setSubscriptionTerminationTarget(null)
  }

  async function showPlatformTenantDetails(tenant: PlatformTenant) {
    try {
      setSelectedPlatformTenant(await api.platformTenant(tenant.id))
    } catch (error) {
      notify(error instanceof Error ? error.message : "Le détail de l’entreprise n’a pas pu être chargé.")
    }
  }

  async function updateRegistrationRequestStatus(
    request: RegistrationRequest,
    status: Exclude<RegistrationRequestStatus, "Entreprise créée">,
  ) {
    try {
      const updated = await api.updateRegistrationRequest(request.id, status)
      setRegistrationRequests((current) =>
        current.map((item) =>
          item.id === request.id ? { ...item, ...updated } : item,
        ),
      )
      notify(`Demande de ${request.companyName} mise à jour.`)
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Le statut de la demande n’a pas pu être mis à jour.",
      )
    }
  }

  async function updatePlatformInvoiceStatus(
    invoice: PlatformInvoice,
    status: "Payée" | "Annulée",
  ) {
    try {
      const updated = await api.updatePlatformInvoiceStatus(invoice.id, { status })
      setPlatformInvoices((current) =>
        current.map((item) =>
          item.id === invoice.id ? { ...item, ...updated } : item,
        ),
      )
      notify(
        status === "Payée"
          ? `Encaissement de ${invoice.invoiceNumber} enregistré.`
          : `Facture ${invoice.invoiceNumber} annulée.`,
      )
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "La facture n’a pas pu être mise à jour.",
      )
    }
  }

  async function togglePlanActive(plan: SubscriptionPlan, active: boolean) {
    try {
      const updated = await api.saveSubscriptionPlan(
        {
          name: plan.name,
          monthlyPriceFcfa: Number(plan.monthlyPriceFcfa),
          maxUsers: plan.maxUsers,
          maxSites: plan.maxSites,
          maxStorageMb: plan.maxStorageMb,
          active,
        },
        plan.id,
      )

      setSubscriptionPlans((current) =>
        current.map((item) =>
          item.id === plan.id
            ? {
                ...item,
                ...updated,
                active: updated.active,
              }
            : item,
        ),
      )
      notify(`Le plan ${plan.name} a été ${active ? "activé" : "désactivé"}.`)
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Le statut du plan n’a pas pu être mis à jour.",
      )
    }
  }

  async function updateTicketStatus(
    ticket: SupportTicket,
    status: SupportTicketStatus,
  ) {
    try {
      const updated = await api.updateSupportTicketStatus(ticket.id, status)
      setSupportTickets((current) =>
        current.map((item) =>
          item.id === ticket.id ? { ...item, ...updated } : item,
        ),
      )
      notify(`Ticket de ${ticket.tenantName} mis à jour.`)
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Le ticket n’a pas pu être mis à jour.",
      )
    }
  }

  async function saveCompanySettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const preferences = { ...tenantSettings?.preferences }
    event.currentTarget
      .querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"][name^="preference."]',
      )
      .forEach((input) => {
        preferences[input.name.slice("preference.".length)] = input.checked
      })
    try {
      const updated = await api.saveTenantSettings({
        legalName: String(
          formData.get("legalName") ??
            tenantSettings?.legalName ??
            user.tenantName,
        ),
        taxId: String(formData.get("taxId") ?? tenantSettings?.taxId ?? ""),
        email: String(formData.get("email") ?? tenantSettings?.email ?? ""),
        phone: String(formData.get("phone") ?? tenantSettings?.phone ?? ""),
        address: String(
          formData.get("address") ?? tenantSettings?.address ?? "",
        ),
        city: String(formData.get("city") ?? tenantSettings?.city ?? ""),
        country: String(
          formData.get("country") ?? tenantSettings?.country ?? "Gabon",
        ),
        language: "fr",
        currency: "XAF",
        preferences,
      })
      setTenantSettings(updated)
      setSaved(true)
      notify("Paramètres de l’entreprise enregistrés.")
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Les paramètres de l’entreprise n’ont pas pu être enregistrés.",
      )
    }
  }

  async function savePlatformSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const requestLimit = Number(formData.get("requestLimit"))
    if (!Number.isSafeInteger(requestLimit)) {
      notify("La limite de requêtes doit être un nombre entier.")
      return
    }
    try {
      const updated = await api.savePlatformSettings({
        name: String(formData.get("name") ?? ""),
        supportEmail: String(formData.get("supportEmail") ?? ""),
        requestLimit,
      })
      setPlatformSettings(updated)
      setSaved(true)
      notify("Paramètres de la plateforme enregistrés.")
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Les paramètres de la plateforme n’ont pas pu être enregistrés.",
      )
    }
  }

  async function setTaskStatus(task: Task, status: Task["status"]) {
    if (!canUpdateTask(task)) return
    if (task.status === status) return
    try {
      const result = await api.updateTaskStatus(task.id, status)
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: result.data.status,
                updatedAt: result.data.updatedAt,
              }
            : item,
        ),
      )
      notify(`Tâche mise à jour : ${status.toLocaleLowerCase("fr-FR")}.`)
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "La tâche n’a pas pu être mise à jour.",
      )
    }
  }

  async function saveMemberAccess(
    member: TeamMember,
    updates: {
      role?: ManagedRole
      assignedSiteId?: string | null
      active?: boolean
    },
  ) {
    if (
      member.role === "ADMIN_ENTERPRISE" ||
      member.id === user.id ||
      updatingMemberIds.includes(member.id)
    )
      return
    const role = updates.role ?? member.role
    const assignedSiteId =
      updates.assignedSiteId === undefined
        ? member.assignedSiteId
        : updates.assignedSiteId
    if (siteScopedRoles.includes(role) && !assignedSiteId) {
      notify("Affectez un chantier à ce rôle avant d’enregistrer.")
      return
    }
    setUpdatingMemberIds((current) => [...current, member.id])
    try {
      const updated = await api.updateTeamMember(member.id, {
        role,
        assignedSiteId,
        active: updates.active ?? member.active,
      })
      setTeamMembers((current) =>
        current.map((item) => (item.id === member.id ? updated : item)),
      )
      notify(`Accès de ${updated.fullName} mis à jour.`)
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Les accès n’ont pas pu être mis à jour.",
      )
    } finally {
      setUpdatingMemberIds((current) =>
        current.filter((id) => id !== member.id),
      )
    }
  }

  function removeTeamMember(member: TeamMember) {
    if (
      !can("manage_team") ||
      member.role === "ADMIN_ENTERPRISE" ||
      member.id === user.id ||
      updatingMemberIds.includes(member.id)
    )
      return
    setTeamMemberDeleteTarget(member)
  }

  async function confirmTeamMemberRemoval() {
    if (!teamMemberDeleteTarget) return
    const member = teamMemberDeleteTarget
    setUpdatingMemberIds((current) => [...current, member.id])
    try {
      const updated = await api.deleteTeamMember(member.id)
      setTeamMembers((current) =>
        current.map((item) => (item.id === member.id ? updated : item)),
      )
      notify(
        `Accès de ${updated.fullName} supprimé. Son historique est conservé.`,
      )
      setTeamMemberDeleteTarget(null)
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Le membre n’a pas pu être supprimé.")
    } finally {
      setUpdatingMemberIds((current) =>
        current.filter((id) => id !== member.id),
      )
    }
  }

  function editTeamMemberProfile(member: TeamMember) {
    if (!can("manage_team") || member.role === "ADMIN_ENTERPRISE") return
    setTeamMemberEditTarget(member)
  }

  async function saveTeamMemberProfile(input: {
    fullName: string
    email: string
    phone: string | null
  }) {
    if (!teamMemberEditTarget) return
    try {
      await api.updateTeamMemberProfile(teamMemberEditTarget.id, input)
      onDataChange()
      notify(`Profil de ${input.fullName} mis à jour.`)
      setTeamMemberEditTarget(null)
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Le profil n’a pas pu être modifié.")
    }
  }

  function togglePlatformUser(userRecord: PlatformUser) {
    setPlatformUserConfirmation({
      user: userRecord,
      action: userRecord.active ? "block" : "unblock",
    })
  }

  async function confirmPlatformUserAction() {
    if (!platformUserConfirmation) return
    const { user: userRecord, action } = platformUserConfirmation
    try {
      if (action === "logout") {
        await api.revokePlatformUserSessions(userRecord.id)
        notify("Toutes les sessions du compte ont été révoquées.")
      } else {
        const nextActive = action === "unblock"
        await api.setPlatformUserActive(userRecord.id, nextActive)
        notify(`Compte ${nextActive ? "réactivé" : "bloqué"}.`)
      }
      setPlatformUserConfirmation(null)
      onDataChange()
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("L’action sur le compte n’a pas pu être effectuée.")
    }
  }

  async function resetPlatformUserPassword(userRecord: PlatformUser) {
    setTemporaryPasswordTarget(userRecord)
  }

  async function createPlatformEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreatingPlatformEditor(true)
    try {
      const result = await api.createPlatformEditor({
        fullName: newEditorName.trim(),
        email: newEditorEmail.trim(),
      })
      setNewEditorName("")
      setNewEditorEmail("")
      notify(result.message)
      onDataChange()
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "L’invitation de l’éditeur n’a pas pu être envoyée.",
      )
    } finally {
      setCreatingPlatformEditor(false)
    }
  }

  async function resendPlatformEditorInvitation(userRecord: PlatformUser) {
    try {
      const result = await api.sendPlatformPasswordReset(userRecord.id)
      notify(result.message)
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "L’invitation de l’éditeur n’a pas pu être envoyée.",
      )
    }
  }

  async function saveTemporaryPassword(userRecord: PlatformUser, temporaryPassword: string) {
    try {
      await api.setPlatformUserTemporaryPassword(userRecord.id, temporaryPassword)
      notify("Mot de passe provisoire enregistré. Il devra être changé à la prochaine connexion.")
      setTemporaryPasswordTarget(null)
      onDataChange()
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Le mot de passe provisoire n’a pas pu être enregistré.")
    }
  }

  function revokePlatformUserSessions(userRecord: PlatformUser) {
    setPlatformUserConfirmation({ user: userRecord, action: "logout" })
  }

  function editPlatformUser(userRecord: PlatformUser) {
    setPlatformUserEditTarget(userRecord)
  }

  async function savePlatformUserProfile(input: {
    fullName: string
    email?: string
    phone?: string
  }) {
    if (!platformUserEditTarget) return
    try {
      await api.updatePlatformUser(platformUserEditTarget.id, input)
      notify("Compte utilisateur mis à jour.")
      setPlatformUserEditTarget(null)
      onDataChange()
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Le compte n’a pas pu être modifié.")
    }
  }

  function openPlatformSupportAccess(userRecord: PlatformUser) {
    setPlatformSupportTarget(userRecord)
  }

  async function confirmPlatformSupportAccess(
    justification: string,
    emergencyOverride: boolean,
  ) {
    if (!platformSupportTarget) return
    const detail = await api.supportUserAccess(
      platformSupportTarget.id,
      justification,
      emergencyOverride,
    )
    setSupportUserDetail(detail)
    setPlatformSupportTarget(null)
  }

  if (active === "Chantiers") {
    async function selectSite(site: Site) {
      try {
        if (can("manage_sites")) {
          setSelectedSite(await api.site(site.id))
        } else {
          setSelectedSite({ ...site, assignedTeam: [] })
        }
      } catch (error) {
        notify(error instanceof Error ? error.message : "Le détail du chantier n’a pas pu être chargé.")
      }
    }

    const visibleSites = sites.filter(
      (site) =>
        (siteFilter === "Tous" || site.status === siteFilter) &&
        `${site.name} ${site.location ?? ""} ${site.city ?? ""} ${site.province ?? ""} ${site.clientName ?? ""}`
          .toLowerCase()
          .includes(siteSearch.toLowerCase()),
    )
    return (
      <div className="module-page">
        {selectedSite && (
          <DetailDialog
            title={selectedSite.name}
            onClose={() => setSelectedSite(null)}
          >
            {selectedSite.hasImage && (
              <img
                className="site-detail-image"
                src={api.siteImageUrl(selectedSite.id)}
                alt={`Vue du chantier ${selectedSite.name}`}
              />
            )}
            <dl className="detail-list">
              {selectedSite.description && (
                <div className="detail-list__wide">
                  <dt>Description du projet</dt>
                  <dd>{selectedSite.description}</dd>
                </div>
              )}
              <div>
                <dt>Adresse / quartier</dt>
                <dd>{selectedSite.location || "Non communiquée"}</dd>
              </div>
              {(selectedSite.city || selectedSite.province) && (
                <div>
                  <dt>Ville / province</dt>
                  <dd>
                    {[selectedSite.city, selectedSite.province]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                </div>
              )}
              {selectedSite.clientName && (
                <div>
                  <dt>Maître d’ouvrage / client</dt>
                  <dd>{selectedSite.clientName}</dd>
                </div>
              )}
              {selectedSite.workType && (
                <div>
                  <dt>Nature des travaux</dt>
                  <dd>{selectedSite.workType}</dd>
                </div>
              )}
              {selectedSite.contractReference && (
                <div>
                  <dt>Référence du marché</dt>
                  <dd>{selectedSite.contractReference}</dd>
                </div>
              )}
              <div>
                <dt>Statut</dt>
                <dd>{selectedSite.status ?? "Non communiqué"}</dd>
              </div>
              <div>
                <dt>Progression</dt>
                <dd>
                  {selectedSite.progress === null
                    ? "Non communiquée"
                    : `${selectedSite.progress}%`}
                </dd>
              </div>
              {can("read_finance") && selectedSite.costBudgetFcfa !== null && (
                <div>
                  <dt>Enveloppe de coûts prévue</dt>
                  <dd>{formatFcfa(Number(selectedSite.costBudgetFcfa))}</dd>
                </div>
              )}
              {can("read_finance") &&
                selectedSite.contractAmountFcfa !== null && (
                <div>
                  <dt>Montant contractuel facturé au client</dt>
                  <dd>{formatFcfa(Number(selectedSite.contractAmountFcfa))}</dd>
                </div>
              )}
              <div>
                <dt>Équipe affectée</dt>
                <dd>{selectedSite.assignedTeam.length
                  ? selectedSite.assignedTeam
                      .filter((member) => member.active)
                      .map((member) => `${member.fullName} · ${member.role}`)
                      .join(", ")
                  : selectedSite.teamCount === null || selectedSite.teamCount === 0
                    ? "Aucune personne affectée"
                    : `${selectedSite.teamCount} personne(s) affectée(s)`}</dd>
              </div>
              <div>
                <dt>Délai prévu</dt>
                <dd>
                  {selectedSite.plannedDurationDays
                    ? `${selectedSite.plannedDurationDays} jours`
                    : "Non défini"}
                </dd>
              </div>
              <div>
                <dt>Échéance prévisionnelle</dt>
                <dd>
                  {selectedSite.endDate
                    ? new Date(
                        `${selectedSite.endDate}T00:00:00`,
                      ).toLocaleDateString("fr-FR")
                    : "Non définie"}
                </dd>
              </div>
            </dl>
            {can("manage_sites") && (
              <div className="settings-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    const site = selectedSite
                    setSelectedSite(null)
                    openAction("site", `Modifier ${site.name}`, site.id, {
                      "Nom du chantier": site.name,
                      "Description du projet": site.description ?? "",
                      "Adresse / quartier": site.location ?? "",
                      Ville: site.city ?? "",
                      Province: site.province ?? "",
                      "Maître d’ouvrage / client": site.clientName ?? "",
                      "Nature des travaux": site.workType ?? "",
                      "Référence du marché": site.contractReference ?? "",
                      Statut: site.status ?? "En cours",
                      "Enveloppe de coûts prévue (FCFA)": String(site.costBudgetFcfa ?? 0),
                      "Montant contractuel facturé au client (FCFA)": site.contractAmountFcfa ?? "",
                      "Date de début": site.startDate ?? "",
                      "Délai prévu (jours)": site.plannedDurationDays
                        ? String(site.plannedDurationDays)
                        : "",
                      "Échéance prévisionnelle": site.endDate ?? "",
                      hasImage: String(site.hasImage),
                    })
                  }}
                >
                  Modifier le chantier
                </button>
              </div>
            )}
          </DetailDialog>
        )}
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow="Portefeuille"
          title={can("read_assigned") ? "Chantier partagé" : "Mes chantiers"}
          description={
            can("read_assigned")
              ? "Vous consultez uniquement le chantier auquel votre accès est rattaché."
              : "La progression reflète la part des tâches terminées. Suivez aussi les équipes et échéances de vos opérations."
          }
          action="Nouveau chantier"
          icon="plus"
          showAction={can("manage_sites")}
          onAction={() => openAction("site", "Créer un chantier")}
        />
        <div className="module-toolbar">
          <div className="module-search">
            <Icon name="search" />
            <input
              aria-label="Rechercher un chantier"
              placeholder="Rechercher un chantier…"
              value={siteSearch}
              onChange={(event) => setSiteSearch(event.target.value)}
            />
          </div>
          <div className="filter-pills">
            {["Tous", "En cours", "En pause", "Terminé", "Archivé"].map((filter) => (
              <button
                className={siteFilter === filter ? "active" : ""}
                key={filter}
                onClick={() => setSiteFilter(filter)}
              >
                {filter}{" "}
                <b>
                  {filter === "Tous"
                    ? sites.length
                    : sites.filter((site) => site.status === filter).length}
                </b>
              </button>
            ))}
          </div>
        </div>
        <div className="portfolio-grid">
          {loadingData ? (
            <p role="status">Chargement des chantiers…</p>
          ) : !dataError && visibleSites.length === 0 ? (
            <p>Aucun chantier ne correspond à votre recherche.</p>
          ) : null}
          {visibleSites.map((site) => {
            const progress = site.progress ?? 0
            const tone =
              progress >= 70 ? "green" : progress < 35 ? "orange" : "blue"
            const endDate = site.endDate
              ? new Date(`${site.endDate}T00:00:00`).toLocaleDateString("fr-FR")
              : "Date non définie"
            return (
              <article
                className="portfolio-card portfolio-card--interactive"
                key={site.id}
                role="button"
                tabIndex={0}
                onClick={() => void selectSite(site)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    void selectSite(site)
                  }
                }}
              >
                <div className={`portfolio-card__cover cover--${tone}${site.hasImage ? " portfolio-card__cover--image" : ""}`}>
                  {site.hasImage && (
                    <img
                      src={api.siteImageUrl(site.id)}
                      alt={`Vue du chantier ${site.name}`}
                      loading="lazy"
                    />
                  )}
                  <span className="status-pill">
                    {site.status ?? "Non communiqué"}
                  </span>
                  {!site.hasImage && <Icon name="building" size={35} />}
                  <button
                    aria-label={`Ouvrir ${site.name}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      void selectSite(site)
                    }}
                  >
                    <Icon name="chevron" />
                  </button>
                </div>
                <div className="portfolio-card__body">
                  <span className="project-ref">
                    CHANTIER · CC-{site.id.slice(-4)}
                  </span>
                  <h3>{site.name}</h3>
                  <p>
                    <Icon name="pin" size={14} />{" "}
                    {[site.location, site.city, site.province]
                      .filter(Boolean)
                      .join(" · ") || "Non communiquée"}
                  </p>
                  <div className="portfolio-progress">
                    <span>Avancement des tâches</span>
                    <strong>{progress}%</strong>
                    <div className="progress">
                      <i style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="portfolio-meta">
                    <span>
                      <Icon name="calendar" />
                      {endDate}
                    </span>
                    <span>
                      <Icon name="team" />
                      {site.teamCount ?? "—"} personnes
                    </span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    )
  }

  if (active === "Mes tâches") {
    const now = new Date()
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    const overdueTasks = tasks.filter(
      (task) =>
        task.dueDate !== null &&
        task.dueDate < todayKey &&
        task.status !== "Terminée",
    )
    const filteredTasks =
      taskFilter === "Toutes"
        ? tasks
        : taskFilter === "En retard"
          ? overdueTasks
          : tasks.filter((task) => task.status === taskFilter)
    const visibleTasks = [...filteredTasks].sort((first, second) => {
      const firstDueDate = first.dueDate ?? (taskDueAscending ? "9999-12-31" : "")
      const secondDueDate = second.dueDate ?? (taskDueAscending ? "9999-12-31" : "")
      return taskDueAscending
        ? firstDueDate.localeCompare(secondDueDate)
        : secondDueDate.localeCompare(firstDueDate)
    })
    const pendingTaskCount = tasks.filter(
      (task) => task.status === "À faire",
    ).length
    const inProgressTaskCount = tasks.filter(
      (task) => task.status === "En cours",
    ).length
    const blockedTaskCount = tasks.filter(
      (task) => task.status === "Bloquée",
    ).length
    const completedTaskCount = tasks.filter(
      (task) => task.status === "Terminée",
    ).length
    const completionRate =
      tasks.length === 0
        ? 0
        : Math.round((completedTaskCount / tasks.length) * 100)
    const formatDueDate = (dueDate: string | null) => {
      if (!dueDate) return "À planifier"
      const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
        ? new Date(`${dueDate}T12:00:00`)
        : new Date(dueDate)
      return Number.isNaN(parsedDate.getTime())
        ? "Date non renseignée"
        : parsedDate.toLocaleDateString("fr-FR")
    }
    return (
      <div className="module-page">
        {selectedTask && (
          <DetailDialog
            title={selectedTask.title}
            onClose={() => setSelectedTask(null)}
          >
            <dl className="detail-list">
              <div>
                <dt>Chantier</dt>
                <dd>{selectedTask.siteName}</dd>
              </div>
              <div>
                <dt>Statut</dt>
                <dd>{selectedTask.status}</dd>
              </div>
              <div>
                <dt>Priorité</dt>
                <dd>{selectedTask.priority}</dd>
              </div>
              <div>
                <dt>Assignée à</dt>
                <dd>{selectedTask.assigneeName ?? "Non assignée"}</dd>
              </div>
              <div>
                <dt>Échéance</dt>
                <dd>{formatDueDate(selectedTask.dueDate)}</dd>
              </div>
              <div className="detail-list__wide">
                <dt>Description</dt>
                <dd>
                  {selectedTask.description || "Aucune description fournie."}
                </dd>
              </div>
            </dl>
          </DetailDialog>
        )}
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow={user.role === "SOUS_TRAITANT" ? "Mission confiée" : "Opérations"}
          title={
            can("manage_tasks")
              ? "Tâches du chantier"
              : user.role === "SOUS_TRAITANT"
                ? "Mes missions"
                : "Mes tâches"
          }
          description={
            can("manage_tasks")
              ? "Coordonnez les tâches du chantier affecté, répartissez les responsabilités et suivez les blocages."
              : user.role === "SOUS_TRAITANT"
                ? "Consultez uniquement les tâches qui vous sont confiées sur le chantier invité et transmettez vos preuves au responsable."
              : can("read_assigned")
              ? "Seules les tâches qui vous sont assignées sont affichées."
              : "Priorisez votre journée et ne laissez aucun blocage ralentir le chantier."
          }
          action="Créer une tâche"
          icon="plus"
          showAction={can("manage_tasks")}
          onAction={() => openAction("task", "Créer une tâche")}
        />
        <div className="task-summary">
          <div>
            <span>À faire</span>
            <strong>{pendingTaskCount}</strong>
            <small>
              {overdueTasks.length
                ? `${overdueTasks.length} en retard · ${tasks.length} au total`
                : `${tasks.length} tâche${tasks.length === 1 ? "" : "s"} au total`}
            </small>
          </div>
          <div>
            <span>En cours</span>
            <strong>{inProgressTaskCount}</strong>
            <small>À terminer</small>
          </div>
          <div>
            <span>Bloquées</span>
            <strong>{blockedTaskCount}</strong>
            <small>
              {blockedTaskCount > 0 ? "Action requise" : "Aucun blocage"}
            </small>
          </div>
          <div className="task-summary__progress">
            <span>Terminées</span>
            <strong>
              {completedTaskCount} / {tasks.length}
            </strong>
            <div className="progress">
              <i style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        </div>
        <div className="module-toolbar task-toolbar">
          <div className="filter-pills">
            {["Toutes", "À faire", "En cours", "Bloquée", "Terminée", "En retard"].map(
              (filter) => (
                <button
                  className={taskFilter === filter ? "active" : ""}
                  key={filter}
                  onClick={() => setTaskFilter(filter)}
                >
                  {filter}
                </button>
              ),
            )}
          </div>
          <button
            className="outline-button"
            type="button"
            aria-pressed={taskDueAscending}
            onClick={() => setTaskDueAscending((ascending) => !ascending)}
          >
            <Icon name="calendar" /> Échéance {taskDueAscending ? "↑" : "↓"}
          </button>
        </div>
        <section className="data-panel">
          <div className="task-list">
            {loadingData ? (
              <p role="status">Chargement des tâches…</p>
            ) : !dataError && visibleTasks.length === 0 ? (
              <p>Aucune tâche ne correspond à ce filtre.</p>
            ) : null}
            {visibleTasks.map((task) => (
              <article
                className={`task-row ${
                  task.status === "Terminée" ? "task-row--done" : ""
                }`}
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTask(task)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    setSelectedTask(task)
                  }
                }}
              >
                <select
                  className="task-status-control"
                  aria-label={`Statut de ${task.title}`}
                  value={task.status}
                  disabled={!canUpdateTask(task)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    event.stopPropagation()
                    void setTaskStatus(task, event.target.value as Task["status"])
                  }}
                >
                  {(["À faire", "En cours", "Bloquée", "Terminée"] as const).map(
                    (status) => (
                      <option key={status} value={status}>{status}</option>
                    ),
                  )}
                </select>
                <div className="task-main">
                  <span
                    className={`priority priority--${task.priority.toLowerCase()}`}
                  >
                    {task.priority}
                  </span>
                  <h3>{task.title}</h3>
                  <p>
                    <Icon name="building" size={13} /> {task.siteName}
                  </p>
                </div>
                <div className="task-assignee">
                  <span>{task.assigneeInitials ?? "—"}</span>
                  <small>{task.assigneeName ?? "Non assignée"}</small>
                </div>
                <div className="task-due">
                  <span>
                    <Icon name="calendar" size={14} />{" "}
                    {formatDueDate(task.dueDate)}
                  </span>
                  <small
                    className={task.status === "Bloquée" ? "danger-text" : ""}
                  >
                    {task.status}
                  </small>
                </div>
                <button
                  className="row-action"
                  aria-label="Ouvrir la tâche"
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedTask(task)
                  }}
                >
                  <Icon name="chevron" />
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    )
  }

  if (active === "Photos") {
    const visiblePhotos = photos.filter(
      (photo) =>
        (photoFilter !== "Cette semaine" ||
          Date.now() - new Date(photo.capturedAt).getTime() <=
            7 * 24 * 60 * 60 * 1000) &&
        `${photo.caption} ${photo.siteName} ${photo.authorName}`
          .toLocaleLowerCase("fr-FR")
          .includes(photoSearch.toLocaleLowerCase("fr-FR")),
    )
    const formatPhotoDate = (value: string) =>
      new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    return (
      <div className="module-page">
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow={user.role === "SOUS_TRAITANT" ? "Preuve de mission" : "Preuve terrain"}
          title={user.role === "SOUS_TRAITANT" ? "Mes preuves photo" : "Photos certifiées"}
          description={
            user.role === "SOUS_TRAITANT"
              ? "Transmettez les photos de vos travaux sur le chantier auquel vous êtes invité."
              : "Photos horodatées et vérifiables par leur empreinte SHA-256."
          }
          action={user.role === "SOUS_TRAITANT" ? "Transmettre une preuve" : "Prendre une photo"}
          icon="camera"
          showAction={can("capture_photos")}
          onAction={() => openAction("photo", "Ajouter une preuve photo")}
        />
        <div className="photo-status">
          <div>
            <span className="sync-orb">
              <Icon name="cloud" />
            </span>
            <div>
              <strong>
                {photos.length} photo{photos.length === 1 ? "" : "s"}{" "}
                synchronisée{photos.length === 1 ? "" : "s"}
              </strong>
              <small>
                Les preuves sont stockées dans votre espace entreprise.
              </small>
            </div>
          </div>
          <div className="sync-queue">
            <span>File d’attente</span>
            <strong>File vide</strong>
            <small>Aucun envoi en attente.</small>
          </div>
        </div>
        <div className="module-toolbar">
          <div className="module-search">
            <Icon name="search" />
            <input
              aria-label="Rechercher une photo"
              placeholder="Légende, chantier ou auteur…"
              value={photoSearch}
              onChange={(event) => setPhotoSearch(event.target.value)}
            />
          </div>
          <div className="filter-pills">
            {["Toutes", "Cette semaine"].map((filter) => (
              <button
                className={photoFilter === filter ? "active" : ""}
                key={filter}
                onClick={() => setPhotoFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="photo-grid">
          {loadingData ? (
            <p role="status">Chargement des photos…</p>
          ) : !dataError && visiblePhotos.length === 0 ? (
            <p>Aucune photo ne correspond à votre recherche.</p>
          ) : null}
          {visiblePhotos.map((photo) => (
            <article className="photo-card" key={photo.id}>
              <div className="photo-card__image">
                <img src={api.photoUrl(photo.id)} alt={photo.caption} />
                <span>
                  <Icon name="check" size={13} />
                  Synchronisée
                </span>
              </div>
              <div className="photo-card__body">
                <div>
                  <h3>{photo.caption}</h3>
                  <p>
                    {photo.siteName} · {photo.authorName}
                  </p>
                </div>
                <button
                  aria-label="Ouvrir la photo"
                  onClick={() =>
                    notify(
                      `${photo.caption} · SHA-256 ${photo.sha256.slice(0, 12)}…`,
                    )
                  }
                >
                  <Icon name="chevron" />
                </button>
              </div>
              <div className="photo-proof">
                <span>
                  <Icon name="calendar" size={13} />{" "}
                  {formatPhotoDate(photo.capturedAt)}
                </span>
                {photo.latitude !== null && photo.longitude !== null ? (
                  <span>
                    <Icon name="pin" size={13} /> {photo.latitude.toFixed(4)},{" "}
                    {photo.longitude.toFixed(4)}
                  </span>
                ) : (
                  <span>Position non fournie</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    )
  }

  if (active === "Rapports") {
    const scopedReports = reports
    const reportFilters =
      user.role === "MAITRE_OUVRAGE"
        ? ["Tous", "Validé"]
        : ["Tous", "À valider", "Validé", "Rejeté"]
    const activeReportFilter = reportFilters.includes(reportFilter)
      ? reportFilter
      : "Tous"
    const visibleReports = scopedReports.filter(
      (report) =>
        activeReportFilter === "Tous" || report.status === activeReportFilter,
    )
    const pendingReports = scopedReports.filter(
      (report) => report.status === "À valider",
    ).length
    const formatReportDate = (date: string) => {
      const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(`${date}T12:00:00`)
        : new Date(date)
      if (Number.isNaN(parsedDate.getTime())) return "Date non renseignée"
      return new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(parsedDate)
    }
    return (
      <div className="module-page">
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow="Suivi quotidien"
          title="Rapports journaliers"
          description={
            user.role === "MAITRE_OUVRAGE"
              ? "Consultez les comptes rendus validés et publiés pour votre chantier."
              : can("validate_reports")
              ? "Examinez les comptes rendus du chantier affecté et publiez-les après contrôle."
              : can("create_reports")
                ? "Créez les comptes rendus journaliers de vos chantiers."
                : "Consultez les rapports auxquels votre profil vous donne accès."
          }
          action="Nouveau rapport"
          icon="plus"
          showAction={can("create_reports")}
          onAction={() => openAction("report", "Créer un rapport journalier")}
        />
        {can("validate_reports") && (
          <div className="report-callout">
            <span>
              <Icon name="clipboard" size={26} />
            </span>
            <div>
              <strong>
                {pendingReports} rapport{pendingReports === 1 ? "" : "s"} en
                attente de validation
              </strong>
              <p>
                Vérifiez les effectifs, les travaux réalisés et les incidents
                avant validation.
              </p>
            </div>
            <button onClick={() => setReportFilter("À valider")}>
              Examiner maintenant <Icon name="chevron" size={16} />
            </button>
          </div>
        )}
        <div className="module-toolbar">
          <div className="filter-pills">
            {reportFilters.map((filter) => (
              <button
                className={activeReportFilter === filter ? "active" : ""}
                key={filter}
                onClick={() => setReportFilter(filter)}
              >
                {filter}{" "}
                <b>
                  {filter === "Tous"
                    ? scopedReports.length
                    : scopedReports.filter((report) => report.status === filter)
                        .length}
                </b>
              </button>
            ))}
          </div>
          <button
            className="outline-button"
            onClick={() =>
              notify(
                user.role === "MAITRE_OUVRAGE"
                  ? "Seuls les rapports validés sont publiés dans votre espace. Ils sont classés du plus récent au plus ancien."
                  : "Les rapports sont classés par date, du plus récent au plus ancien.",
              )
            }
          >
            <Icon name="calendar" />{" "}
            {user.role === "MAITRE_OUVRAGE" ? "Rapports publiés" : "Toutes les périodes"}
          </button>
        </div>
        <section className="data-panel report-table">
          <div className="table-head">
            <span>Rapport</span>
            <span>Chantier</span>
            <span>Effectif</span>
            <span>Statut</span>
            <span />
          </div>
          {loadingData ? (
            <p role="status">Chargement des rapports…</p>
          ) : !dataError && visibleReports.length === 0 ? (
            <p>Aucun rapport ne correspond à ce filtre.</p>
          ) : null}
          {visibleReports.map((report) => (
            <article className="table-row" key={report.id}>
              <div>
                <strong>{formatReportDate(report.reportDate)}</strong>
                <small>Par {report.authorName}</small>
              </div>
              <span>{report.siteName}</span>
              <span>
                <Icon name="team" size={14} /> {report.crewCount}
              </span>
              <span
                className={`report-status status--${report.status.replace("À ", "").toLowerCase()}`}
              >
                {report.status}
              </span>
              {report.status === "À valider" && can("validate_reports") ? (
                <button
                  className="validate-button"
                  onClick={async () => {
                    try {
                      const validatedReport = await api.validateReport(
                        report.id,
                      )
                      setReports((current) =>
                        current.map((item) =>
                          item.id === report.id
                            ? {
                                ...item,
                                status: validatedReport.status,
                                validatedAt: validatedReport.validatedAt,
                              }
                            : item,
                        ),
                      )
                      notify("Rapport validé et publié.")
                    } catch (error) {
                      notify(
                        error instanceof Error
                          ? error.message
                          : "Le rapport n’a pas pu être validé.",
                      )
                    }
                  }}
                >
                  <Icon name="check" /> Valider
                </button>
              ) : (
                <button
                  className="row-action"
                  onClick={() => notify(report.workDone)}
                  aria-label={`Lire le rapport du ${formatReportDate(report.reportDate)}`}
                >
                  <Icon name="chevron" />
                </button>
              )}
            </article>
          ))}
        </section>
      </div>
    )
  }

  if (active === "Équipe") {
    const assignableSites = sites.filter((site) => site.status !== "Archivé")
    const visibleMembers = teamMembers.filter(
      (member) =>
        (teamFilter === "Désactivés"
          ? !member.active
          : member.active &&
            (teamFilter === "Tous" ||
              (teamFilter === "Sous-traitants"
                ? member.role === "SOUS_TRAITANT"
                : teamFilter === "Internes"
                  ? member.role !== "SOUS_TRAITANT"
                  : true))) &&
        `${member.fullName} ${member.email} ${member.roleLabel} ${member.assignedSite ?? ""}`
          .toLowerCase()
          .includes(teamSearch.toLowerCase()),
    )
    const activeMemberCount = teamMembers.filter(
      (member) => member.active,
    ).length
    const siteMemberCount = teamMembers.filter(
      (member) => member.active && member.assignedSite,
    ).length
    const subcontractorCount = teamMembers.filter(
      (member) => member.active && member.role === "SOUS_TRAITANT",
    ).length
    return (
      <div className="module-page">
        {teamMemberEditTarget && (
          <EditTeamMemberDialog
            member={teamMemberEditTarget}
            onClose={() => setTeamMemberEditTarget(null)}
            onConfirm={saveTeamMemberProfile}
          />
        )}
        {teamMemberDeleteTarget && (
          <ConfirmActionDialog
            title="Supprimer l’accès du membre"
            description={`L’accès de ${teamMemberDeleteTarget.fullName} sera supprimé. Son historique sera conservé.`}
            confirmLabel="Supprimer l’accès"
            onClose={() => setTeamMemberDeleteTarget(null)}
            onConfirm={confirmTeamMemberRemoval}
          />
        )}
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow="Collaborateurs"
          title="Équipe"
          description={
            can("manage_team")
              ? "Gérez les accès, les rôles et les affectations de votre entreprise."
              : "Consultez les personnes affectées à votre périmètre."
          }
          action="Ajouter un membre"
          icon="plus"
          showAction={can("manage_team")}
          onAction={() => openAction("member", "Créer un compte membre")}
        />
        <div className="team-overview">
          <div>
            <Icon name="team" />
            <span>Membres actifs</span>
            <strong>{activeMemberCount}</strong>
            <small>{teamMembers.length} comptes dans l’entreprise</small>
          </div>
          <div>
            <Icon name="building" />
            <span>Sur le terrain</span>
            <strong>{siteMemberCount}</strong>
            <small>avec une affectation chantier</small>
          </div>
          <div>
            <Icon name="user" />
            <span>Invités externes</span>
            <strong>{subcontractorCount}</strong>
            <small>sous-traitants à accès limité</small>
          </div>
        </div>
        <div className="module-toolbar">
          <div className="module-search">
            <Icon name="search" />
            <input
              aria-label="Rechercher un membre"
              placeholder="Nom, rôle ou chantier…"
              value={teamSearch}
              onChange={(event) => setTeamSearch(event.target.value)}
            />
          </div>
          <div className="filter-pills">
            {[
              "Tous",
              "Internes",
              "Sous-traitants",
              ...(can("manage_team") ? ["Désactivés"] : []),
            ].map((filter) => (
              <button
                className={teamFilter === filter ? "active" : ""}
                key={filter}
                onClick={() => setTeamFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="team-grid">
          {loadingData ? (
            <p role="status">Chargement de l’équipe…</p>
          ) : visibleMembers.length === 0 ? (
            <p>Aucun membre ne correspond à ce filtre.</p>
          ) : (
            visibleMembers.map((member) => {
              const canManageMember =
                can("manage_team") &&
                member.id !== user.id &&
                member.role !== "ADMIN_ENTERPRISE"
              return (
                <article className="member-card" key={member.id}>
                  <div className="member-avatar">{member.initials}</div>
                  <div className="member-info">
                    <h3>{member.fullName}</h3>
                    <p>{member.roleLabel}</p>
                    <span>
                      <Icon name="pin" size={13} />
                      {member.assignedSite ?? "Sans affectation spécifique"}
                    </span>
                    <small>
                      {member.email}
                      {member.phone ? ` · ${member.phone}` : ""}
                    </small>
                  </div>
                  {canManageMember ? (
                    <div className="member-access-controls">
                      <label>
                        <span>Rôle</span>
                        <select
                          value={member.role}
                          disabled={updatingMemberIds.includes(member.id)}
                          onChange={(event) => {
                            const role = event.target.value as ManagedRole
                            const assignedSiteId = siteScopedRoles.includes(role)
                              ? member.assignedSiteId ?? assignableSites[0]?.id ?? null
                              : null
                            void saveMemberAccess(member, {
                              role,
                              assignedSiteId,
                            })
                          }}
                        >
                          {managedRoles.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Chantier</span>
                        <select
                          value={member.assignedSiteId ?? ""}
                          disabled={updatingMemberIds.includes(member.id)}
                          onChange={(event) =>
                            void saveMemberAccess(member, {
                              assignedSiteId: event.target.value || null,
                            })
                          }
                        >
                          <option value="">Aucun chantier spécifique</option>
                          {assignableSites.map((site) => (
                            <option key={site.id} value={site.id}>
                              {site.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="member-active-toggle">
                        <span>Compte actif</span>
                        <input
                          type="checkbox"
                          checked={member.active}
                          disabled={updatingMemberIds.includes(member.id)}
                          onChange={(event) =>
                            void saveMemberAccess(member, {
                              active: event.target.checked,
                            })
                          }
                        />
                      </label>
                      <button
                        className="member-delete"
                        type="button"
                        disabled={
                          !member.active ||
                          updatingMemberIds.includes(member.id)
                        }
                        onClick={() => void removeTeamMember(member)}
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <div className="member-state">
                      <i
                        className={
                          member.active ? "" : "member-state--inactive"
                        }
                      />
                      {member.active ? "Actif" : "Désactivé"}
                    </div>
                  )}
                </article>
              )
            })
          )}
        </div>
      </div>
    )
  }

  if (active === "Budget") {
    const costBudgetFcfa = Number(financeSummary?.costBudgetFcfa ?? 0)
    const engagedFcfa = Number(financeSummary?.engagedFcfa ?? 0)
    const remainingFcfa = costBudgetFcfa - engagedFcfa
    const categoryTotals = new Map<string, number>()
    for (const entry of financeEntries.filter(
      (item) => item.entryType === "engagement",
    )) {
      categoryTotals.set(
        entry.category,
        (categoryTotals.get(entry.category) ?? 0) + Number(entry.amountFcfa),
      )
    }
    const budgetRows = [...categoryTotals.entries()]
    const engagementEntries = financeEntries.filter(
      (entry) => entry.entryType === "engagement",
    )
    const engagementBySite = new Map<string, number>()
    for (const entry of engagementEntries) {
      engagementBySite.set(
        entry.siteId,
        (engagementBySite.get(entry.siteId) ?? 0) + Number(entry.amountFcfa),
      )
    }
    return (
      <div className="module-page">
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow="Contrôle des coûts"
          title="Suivi budgétaire"
          description="Distinguez l’enveloppe annuelle de fonctionnement, les coûts prévus des chantiers et les montants contractuels facturés aux clients."
          action="Nouvel engagement"
          icon="plus"
          showAction={can("manage_finance") || can("manage_finance_planning")}
          onAction={() =>
            openAction("budget", "Ajouter un engagement budgétaire")
          }
        />
        {can("manage_finance_planning") && !can("manage_finance") && (
          <div className="finance-role-notice">
            Vous pouvez préparer les engagements prévisionnels. Le Comptable conserve la validation des dépenses réellement payées.
          </div>
        )}
        <section className="data-panel company-operating-budget">
          <div className="panel__heading">
            <div>
              <h3>Budget de fonctionnement de l’entreprise</h3>
              <p>
                Enveloppe annuelle des frais généraux. Elle est indépendante des coûts prévus et des montants facturés pour les chantiers.
              </p>
            </div>
            {companyOperatingBudget?.updatedAt && (
              <small>
                Mis à jour le {new Date(companyOperatingBudget.updatedAt).toLocaleDateString("fr-FR")}
              </small>
            )}
          </div>
          {can("manage_company_budget") ? (
            <form className="company-budget-form" onSubmit={(event) => void saveCompanyBudget(event)}>
              <label>
                <span>Exercice</span>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={companyBudgetYear}
                  onChange={(event) => setCompanyBudgetYear(Number(event.target.value))}
                  required
                />
              </label>
              <label>
                <span>Enveloppe annuelle (FCFA)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={companyBudgetAmount}
                  onChange={(event) => setCompanyBudgetAmount(event.target.value)}
                  placeholder="À définir après arbitrage"
                  required
                />
              </label>
              <label className="company-budget-notes">
                <span>Hypothèses / périmètre</span>
                <input
                  value={companyBudgetNotes}
                  onChange={(event) => setCompanyBudgetNotes(event.target.value)}
                  maxLength={2000}
                  placeholder="Frais généraux inclus, décision de direction…"
                />
              </label>
              <button className="module-primary" type="submit" disabled={companyBudgetSaving}>
                <Icon name="check" />
                {companyBudgetSaving ? "Enregistrement…" : "Enregistrer le budget annuel"}
              </button>
            </form>
          ) : (
            <div className="company-budget-readonly">
              <strong>
                {companyOperatingBudget?.amountFcfa === null ||
                companyOperatingBudget?.amountFcfa === undefined
                  ? "Non défini"
                  : formatFcfa(Number(companyOperatingBudget.amountFcfa))}
              </strong>
              <span>Exercice {companyOperatingBudget?.fiscalYear ?? companyBudgetYear}</span>
              {companyOperatingBudget?.notes && <p>{companyOperatingBudget.notes}</p>}
            </div>
          )}
        </section>
        <div className="cash-metrics">
          <div>
            <span>Coûts prévus</span>
            <strong>{formatFcfa(costBudgetFcfa)}</strong>
            <small>Somme des enveloppes de coûts des chantiers</small>
          </div>
          <div>
            <span>Engagé</span>
            <strong>{formatFcfa(engagedFcfa)}</strong>
            <small>
              {costBudgetFcfa
                ? `${Math.round((engagedFcfa / costBudgetFcfa) * 100)}% des coûts prévus`
                : "Aucun engagement"}
            </small>
          </div>
          <div>
            <span>Reste disponible</span>
            <strong>{formatFcfa(remainingFcfa)}</strong>
            <small className={remainingFcfa >= 0 ? "positive" : "danger-text"}>
              {remainingFcfa >= 0 ? "Enveloppe disponible" : "Dépassement des coûts prévus"}
            </small>
          </div>
          <div className="cash-alert">
            <Icon name="alert" />
            <span>Dépenses réalisées</span>
            <strong>
              {formatFcfa(Number(financeSummary?.expensesFcfa ?? 0))}
            </strong>
            <small>Sorties de trésorerie</small>
          </div>
        </div>
        <section className="data-panel budget-panel">
          <div className="panel__heading">
            <div>
              <h3>Enveloppes de coûts par chantier</h3>
              <p>
                Comparez les coûts prévus de chaque chantier aux engagements qui lui sont affectés. Le montant contractuel client est suivi séparément.
              </p>
            </div>
          </div>
          {!loadingData && sites.length === 0 && (
            <p>Aucun chantier disponible pour cette entreprise.</p>
          )}
          {sites.map((site) => {
            const siteBudget = site.costBudgetFcfa === null ? null : Number(site.costBudgetFcfa)
            const siteEngaged = engagementBySite.get(site.id) ?? 0
            const siteRatio = siteBudget ? (siteEngaged / siteBudget) * 100 : null
            return (
              <article className="budget-row" key={site.id}>
                <div>
                  <strong>{site.name}</strong>
                  <small>
                    {site.status ?? "Statut non défini"} ·{" "}
                    {siteBudget === null ? "Enveloppe de coûts non définie" : `Coûts prévus ${formatFcfa(siteBudget)}`}
                  </small>
                </div>
                <span>
                  <small>Engagé</small>
                  {formatFcfa(siteEngaged)}
                </span>
                <span>
                  <small>Reste sur coûts prévus</small>
                  {siteBudget === null
                    ? "—"
                    : formatFcfa(siteBudget - siteEngaged)}
                </span>
                <div className="budget-progress">
                  <strong>
                    {siteRatio === null ? "—" : `${Math.round(siteRatio)}%`}
                  </strong>
                  <div className="progress">
                    <i
                      className={siteRatio !== null && siteRatio > 100 ? "is-over-budget" : ""}
                      style={{
                        width: `${Math.min(100, siteRatio ?? 0)}%`,
                      }}
                    />
                  </div>
                </div>
              </article>
            )
          })}
        </section>
        <section className="data-panel budget-panel">
          <div className="panel__heading">
            <div>
              <h3>Consommation par poste</h3>
              <p>Engagements enregistrés par catégorie</p>
            </div>
            <span className="amount-total">
              {financeEntries.length} opération
              {financeEntries.length === 1 ? "" : "s"}
            </span>
          </div>
          {loadingData ? (
            <p role="status">Chargement du budget…</p>
          ) : !dataError && budgetRows.length === 0 ? (
            <p>Aucun engagement budgétaire enregistré.</p>
          ) : null}
          {budgetRows.map(([category, amount]) => (
            <article className="budget-row" key={category}>
              <div>
                <strong>{category}</strong>
                <small>Engagements cumulés</small>
              </div>
              <span>
                <small>Engagé</small>
                {formatFcfa(amount)}
              </span>
              <span>
                <small>Part du budget</small>
                {costBudgetFcfa
                  ? `${Math.round((amount / costBudgetFcfa) * 100)}%`
                  : "—"}
              </span>
              <div className="budget-progress">
                <strong>
                  {costBudgetFcfa
                    ? `${Math.round((amount / costBudgetFcfa) * 100)}%`
                    : "—"}
                </strong>
                <div className="progress">
                  <i
                    style={{
                      width: `${Math.min(100, costBudgetFcfa ? (amount / costBudgetFcfa) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>
              <button
                className="row-action"
                aria-label={`Afficher les engagements ${category}`}
                onClick={() =>
                  notify(`${formatFcfa(amount)} engagés pour ${category}.`)
                }
              >
                <Icon name="chevron" />
              </button>
            </article>
          ))}
        </section>
        <section className="data-panel dossier-list">
          <div className="panel__heading">
            <div>
              <h3>Détail des engagements</h3>
              <p>Les engagements prévisionnels restent modifiables et tracés.</p>
            </div>
          </div>
          {!loadingData && engagementEntries.length === 0 && (
            <p>Aucun engagement budgétaire enregistré.</p>
          )}
          {engagementEntries.map((entry) => (
            <article key={entry.id}>
              <strong>{entry.category}</strong>
              <span>{entry.siteName} · {entry.description}</span>
              <b>{formatFcfa(Number(entry.amountFcfa))}</b>
              <small>{entry.status}</small>
              {entry.status === "prévu" &&
                (can("manage_finance") || can("manage_finance_planning")) ? (
                <button
                  className="row-action"
                  aria-label={`Modifier l’engagement ${entry.category}`}
                  onClick={() =>
                    openAction(
                      "budget",
                      `Modifier l’engagement ${entry.category}`,
                      entry.id,
                      {
                        "Poste budgétaire": entry.category,
                        Description: entry.description,
                        "Montant engagé FCFA": String(entry.amountFcfa),
                        siteId: entry.siteId,
                      },
                    )
                  }
                >
                  <Icon name="settings" />
                </button>
              ) : <span />}
            </article>
          ))}
        </section>
      </div>
    )
  }

  if (active === "Dossiers de paiement") {
    const statusOptions: Record<PaymentDossierStatus, PaymentDossierStatus[]> =
      {
        "En préparation": ["Prêt à transmettre"],
        "Prêt à transmettre": ["En instruction", "À corriger"],
        "En instruction": ["À corriger", "Payé", "Refusé"],
        "À corriger": ["En préparation", "Prêt à transmettre"],
        Payé: [],
        Refusé: [],
      }
    const prepared = paymentDossiers.filter((item) =>
      ["En préparation", "Prêt à transmettre"].includes(item.status),
    )
    const underReview = paymentDossiers.filter((item) =>
      ["En instruction", "À corriger"].includes(item.status),
    )
    const paid = paymentDossiers.filter((item) => item.status === "Payé")
    return (
      <div className="module-page">
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow="Facturation travaux"
          title="Situations clients à encaisser"
          description="Préparez les créances liées aux travaux et suivez leur instruction jusqu’à l’encaissement."
          action="Nouvelle situation"
          icon="plus"
          showAction={can("manage_finance") || can("manage_finance_planning")}
          onAction={() => openAction("payment", "Créer une situation client")}
        />
        {can("manage_finance_planning") && !can("manage_finance") && (
          <div className="finance-role-notice">
            L’Admin entreprise prépare les dossiers. Le Comptable est responsable de leur transmission, du suivi de statut et de la confirmation du paiement.
          </div>
        )}
        <div className="task-summary">
          <div>
            <span>En préparation</span>
            <strong>{prepared.length}</strong>
            <small>
              {formatFcfa(
                prepared.reduce(
                  (sum, item) => sum + Number(item.amountFcfa),
                  0,
                ),
              )}
            </small>
          </div>
          <div>
            <span>En instruction</span>
            <strong>{underReview.length}</strong>
            <small>
              {formatFcfa(
                underReview.reduce(
                  (sum, item) => sum + Number(item.amountFcfa),
                  0,
                ),
              )}
            </small>
          </div>
          <div>
            <span>Encaissés</span>
            <strong>{paid.length}</strong>
            <small>
              {formatFcfa(
                paid.reduce((sum, item) => sum + Number(item.amountFcfa), 0),
              )}
            </small>
          </div>
          <div className="task-summary__progress">
            <span>Dossiers suivis</span>
            <strong>{paymentDossiers.length}</strong>
            <div className="progress">
              <i
                style={{
                  width: `${
                    paymentDossiers.length
                      ? Math.round((paid.length / paymentDossiers.length) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
        <div className="public-warning payment-warning">
          <Icon name="lock" />
          <p>
            <strong>Clients publics : relance manuelle uniquement</strong>Aucun
            message de relance n’est envoyé automatiquement par la plateforme.
          </p>
        </div>
        <div className="finance-role-notice">
          Ces situations représentent les montants dus par les clients. Les factures fournisseurs à payer sont gérées séparément dans « Factures fournisseurs ».
        </div>
        <section className="data-panel payment-table">
          <div className="table-head">
            <span>Référence</span>
            <span>Chantier</span>
            <span>Objet</span>
            <span>Montant</span>
            <span>Statut</span>
          </div>
          {loadingData ? (
            <p role="status">Chargement des dossiers de paiement…</p>
          ) : !dataError && paymentDossiers.length === 0 ? (
            <p>Aucun dossier de paiement enregistré.</p>
          ) : null}
          {paymentDossiers.map((payment) => (
            <article className="table-row" key={payment.id}>
              <div>
                <strong>{payment.reference}</strong>
                <small>
                  Mis à jour le{" "}
                  {new Date(payment.updatedAt).toLocaleDateString("fr-FR")}
                  {payment.dueDate
                    ? ` · Échéance ${new Date(`${payment.dueDate}T12:00:00`).toLocaleDateString("fr-FR")}`
                    : ""}
                  {payment.paymentReference
                    ? ` · Réf. encaissement ${payment.paymentReference}`
                    : ""}
                </small>
              </div>
              <span>{payment.siteName}</span>
              <span>
                {payment.subject}
                {payment.status === "En préparation" &&
                  (can("manage_finance") || can("manage_finance_planning")) && (
                    <button
                      className="text-button"
                      type="button"
                      onClick={() =>
                        openAction(
                          "payment",
                          `Modifier le dossier ${payment.reference}`,
                          payment.id,
                          {
                            "Objet du dossier": payment.subject,
                            "Montant FCFA": String(payment.amountFcfa),
                            "Date limite": payment.dueDate ?? "",
                            siteId: payment.siteId,
                          },
                        )
                      }
                    >
                      Modifier
                    </button>
                  )}
              </span>
              <strong>{formatFcfa(Number(payment.amountFcfa))}</strong>
              <select
                className="payment-status"
                aria-label={`Statut du dossier ${payment.reference}`}
                value={payment.status}
                disabled={
                  !can("manage_finance") ||
                  statusOptions[payment.status].length === 0
                }
                onChange={(event) => {
                  const status = event.target.value as PaymentDossierStatus
                  if (status === "Payé") {
                    openAction(
                      "paymentReceipt",
                      `Confirmer l’encaissement ${payment.reference}`,
                      payment.id,
                    )
                  } else {
                    void updatePaymentStatus(payment, status)
                  }
                }}
              >
                <option value={payment.status}>
                  {payment.status === "Payé" ? "Encaissé" : payment.status}
                </option>
                {statusOptions[payment.status].map((status) => (
                  <option key={status} value={status}>
                    {status === "Payé" ? "Encaissé" : status}
                  </option>
                ))}
              </select>
            </article>
          ))}
        </section>
      </div>
    )
  }

  if (active === "Trésorerie") {
    const receipts = Number(financeSummary?.plannedReceiptsFcfa ?? 0)
    const received = Number(financeSummary?.receivedFcfa ?? 0)
    const cashBalance = Number(financeSummary?.cashBalanceFcfa ?? 0)
    const treasuryEntries = financeEntries.filter(
      (entry) =>
        entry.entryType === "encaissement" || entry.entryType === "depense",
    )
    return (
      <div className="module-page">
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow="Pilotage financier"
          title="Trésorerie"
          description="Suivez les prévisions et les mouvements réellement constatés, sans confondre trésorerie prévue et encaissée."
          action="Prévoir une opération"
          icon="plus"
          showAction={can("manage_finance") || can("manage_finance_planning")}
          onAction={() =>
            openAction("treasury", "Enregistrer une opération de trésorerie")
          }
        />
        {can("manage_finance_planning") && !can("manage_finance") && (
          <div className="finance-role-notice">
            Vous pouvez enregistrer une prévision d’encaissement ou de dépense. Seul le Comptable peut confirmer qu’une opération a été réalisée.
          </div>
        )}
        <div className="cash-metrics">
          <div>
            <span>À encaisser</span>
            <strong>{formatFcfa(receipts)}</strong>
            <small>Encaissements prévus</small>
          </div>
          <div>
            <span>Déjà encaissé</span>
            <strong>{formatFcfa(received)}</strong>
            <small>Encaissements réalisés</small>
          </div>
          <div>
            <span>Solde des opérations</span>
            <strong>{formatFcfa(cashBalance)}</strong>
            <small>Encaissements réalisés moins dépenses</small>
          </div>
          <div className="cash-alert">
            <Icon name="alert" />
            <span>Dépenses réalisées</span>
            <strong>
              {formatFcfa(Number(financeSummary?.expensesFcfa ?? 0))}
            </strong>
            <small>Sorties enregistrées</small>
          </div>
        </div>
        <div className="finance-grid">
          <section className="data-panel cash-chart">
            <div className="panel__heading">
              <div>
                <h3>Encaissements à venir</h3>
                <p>Total des encaissements encore prévus</p>
              </div>
              <span className="amount-total">{formatFcfa(receipts)}</span>
            </div>
            <p>
              {loadingData
                ? "Chargement des opérations…"
                : `${financeEntries.filter((entry) => entry.entryType === "encaissement" && entry.status === "prévu").length} encaissement(s) planifié(s).`}
            </p>
          </section>
          <section className="data-panel tension-panel">
            <div className="panel__heading">
              <div>
                <h3>Actions recommandées</h3>
                <p>Pour préserver votre trésorerie</p>
              </div>
            </div>
            <div className="public-warning">
              <Icon name="lock" />
              <p>
                <strong>Client public protégé</strong>Aucune relance automatique
                ne sera envoyée.
              </p>
            </div>
          </section>
        </div>
        <section className="data-panel dossier-list">
          <div className="panel__heading">
            <div>
              <h3>Opérations récentes</h3>
              <p>Encaissements et dépenses des chantiers</p>
            </div>
          </div>
          {loadingData ? (
            <p role="status">Chargement de la trésorerie…</p>
          ) : !dataError && treasuryEntries.length === 0 ? (
            <p>Aucune opération de trésorerie enregistrée.</p>
          ) : null}
          {treasuryEntries.map((entry) => (
            <article key={entry.id}>
              <strong>{entry.siteName}</strong>
              <span>
                {entry.description} · {entry.category}
              </span>
              <b>{formatFcfa(Number(entry.amountFcfa))}</b>
              <small>
                {entry.entryType === "encaissement"
                  ? "Encaissement"
                  : "Dépense"}{" "}
                · {entry.status}
              </small>
              {entry.status === "prévu" && can("manage_finance") && (
                <button
                  className="row-action"
                  aria-label={`Marquer comme réalisée : ${entry.description}`}
                  onClick={() => void realizeFinanceEntry(entry)}
                >
                  <Icon name="check" />
                </button>
              )}
              {entry.status === "prévu" &&
                (can("manage_finance") || can("manage_finance_planning")) && (
                  <button
                    className="row-action"
                    aria-label={`Modifier la prévision : ${entry.description}`}
                    onClick={() =>
                      openAction(
                        "treasury",
                        `Modifier la prévision : ${entry.description}`,
                        entry.id,
                        {
                          Description: entry.description,
                          "Montant FCFA": String(entry.amountFcfa),
                          Échéance: entry.dueDate ?? "",
                          entryType: entry.entryType,
                          siteId: entry.siteId,
                        },
                      )
                    }
                  >
                    <Icon name="settings" />
                  </button>
                )}
            </article>
          ))}
        </section>
      </div>
    )
  }

  if (active === "Factures fournisseurs") {
    const payable = supplierInvoices.filter(
      (invoice) => invoice.status === "Approuvée",
    )
    const underReview = supplierInvoices.filter(
      (invoice) => invoice.status === "À contrôler",
    )
    const paid = supplierInvoices.filter(
      (invoice) => invoice.status === "Payée",
    )
    return (
      <div className="module-page">
        {dataError && <div className="auth-error" role="alert">{dataError}</div>}
        <SectionHeader
          eyebrow="Achats et fournisseurs"
          title="Factures fournisseurs"
          description="Suivez les factures à payer séparément des situations de travaux à encaisser."
          action="Enregistrer une facture"
          icon="plus"
          showAction={can("manage_finance") || can("manage_finance_planning")}
          onAction={() => openAction("supplierInvoice", "Enregistrer une facture fournisseur")}
        />
        <div className="task-summary">
          <div>
            <span>À contrôler</span>
            <strong>{underReview.length}</strong>
            <small>{formatFcfa(underReview.reduce((sum, invoice) => sum + Number(invoice.amountFcfa), 0))}</small>
          </div>
          <div>
            <span>Approuvées à payer</span>
            <strong>{payable.length}</strong>
            <small>{formatFcfa(payable.reduce((sum, invoice) => sum + Number(invoice.amountFcfa), 0))}</small>
          </div>
          <div>
            <span>Payées</span>
            <strong>{paid.length}</strong>
            <small>{formatFcfa(paid.reduce((sum, invoice) => sum + Number(invoice.amountFcfa), 0))}</small>
          </div>
        </div>
        <div className="finance-role-notice">
          L’Admin prépare et soumet la facture avec sa pièce justificative hors plateforme. Le Comptable valide la facture et consigne la référence du paiement ; le règlement crée alors automatiquement la dépense réalisée du chantier.
        </div>
        <section className="data-panel supplier-invoice-list">
          {loadingData ? (
            <p role="status">Chargement des factures fournisseurs…</p>
          ) : !dataError && supplierInvoices.length === 0 ? (
            <p>Aucune facture fournisseur enregistrée.</p>
          ) : null}
          {supplierInvoices.map((invoice) => (
            <article className="supplier-invoice-row" key={invoice.id}>
              <div>
                <strong>{invoice.supplierName}</strong>
                <span>{invoice.invoiceReference} · {invoice.siteName}</span>
                <small>{invoice.category}{invoice.description ? ` · ${invoice.description}` : ""}</small>
              </div>
              <div>
                <strong>{formatFcfa(Number(invoice.amountFcfa))}</strong>
                <small>
                  {invoice.dueDate
                    ? `À payer avant le ${new Date(`${invoice.dueDate}T12:00:00`).toLocaleDateString("fr-FR")}`
                    : "Sans échéance saisie"}
                </small>
              </div>
              <span className={`supplier-invoice-status supplier-invoice-status--${invoice.status === "Payée" ? "paid" : invoice.status === "Refusée" ? "rejected" : "pending"}`}>
                {invoice.status}
              </span>
              <div className="supplier-invoice-actions">
                {invoice.status === "En préparation" &&
                  (can("manage_finance_planning") || can("manage_finance")) && (
                    <>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() =>
                          openAction("supplierInvoice", `Modifier ${invoice.invoiceReference}`, invoice.id, {
                            Fournisseur: invoice.supplierName,
                            "Référence de facture": invoice.invoiceReference,
                            "Poste de dépense": invoice.category,
                            Description: invoice.description,
                            "Montant FCFA": String(invoice.amountFcfa),
                            "Date de facture": invoice.invoiceDate ?? "",
                            "Date limite de paiement": invoice.dueDate ?? "",
                            siteId: invoice.siteId,
                          })
                        }
                      >
                        Modifier
                      </button>
                      {can("manage_finance_planning") && (
                        <button className="text-button" type="button" onClick={() => void submitSupplierInvoice(invoice)}>
                          Soumettre au Comptable
                        </button>
                      )}
                    </>
                  )}
                {invoice.status === "À contrôler" && can("manage_finance") && (
                  <>
                    <button className="text-button" type="button" onClick={() => void updateSupplierInvoiceStatus(invoice, "Approuvée")}>
                      Approuver
                    </button>
                    <button className="text-button danger-text" type="button" onClick={() => void updateSupplierInvoiceStatus(invoice, "Refusée")}>
                      Refuser
                    </button>
                  </>
                )}
                {invoice.status === "Approuvée" && can("manage_finance") && (
                  <button
                    className="module-primary"
                    type="button"
                    onClick={() =>
                      openAction("supplierInvoicePayment", `Enregistrer le paiement ${invoice.invoiceReference}`, invoice.id)
                    }
                  >
                    Enregistrer le paiement
                  </button>
                )}
                {invoice.status === "Payée" && invoice.paymentReference && (
                  <small>Réf. paiement : {invoice.paymentReference}</small>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    )
  }

  if (active === "Pointage") {
    const openShift = attendance.find((record) => record.clockOutAt === null)
    const formatTime = (value: string) =>
      new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    const formatDate = (value: string) =>
      new Intl.DateTimeFormat("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date(value))
    const durationFor = (record: AttendanceRecord) => {
      const end = record.clockOutAt
        ? new Date(record.clockOutAt).getTime()
        : Date.now()
      const minutes = Math.max(
        0,
        Math.floor((end - new Date(record.clockInAt).getTime()) / 60_000),
      )
      return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`
    }
    const totalMinutes = attendance.reduce((total, record) => {
      const duration = durationFor(record).split(" h ").map(Number)
      return total + (duration[0] ?? 0) * 60 + (duration[1] ?? 0)
    }, 0)
    return (
      <div className="module-page">
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow="Présence terrain"
          title="Mon pointage"
          description={`Historique de présence pour ${user.assignedSite ?? "votre chantier affecté"}.`}
          action={openShift ? "Pointer le départ" : "Pointer l’arrivée"}
          icon={openShift ? "logout" : "pin"}
          showAction={can("clock_in")}
          onAction={() => void toggleAttendance()}
        />
        <div className="clock-layout">
          <section className="clock-card">
            <span
              className={`clock-status ${
                openShift ? "clock-status--active" : ""
              }`}
            >
              <i /> {openShift ? "Présent sur chantier" : "Hors chantier"}
            </span>
            <strong>{openShift ? formatTime(openShift.clockInAt) : "—"}</strong>
            <p>
              {openShift
                ? `Arrivée ${formatDate(openShift.clockInAt)} · ${openShift.siteName}`
                : "Aucun pointage ouvert"}
            </p>
            <button
              onClick={() => void toggleAttendance()}
              disabled={!can("clock_in") || clockBusy || loadingData}
            >
              <Icon name={openShift ? "logout" : "pin"} size={24} />
              <span>
                {clockBusy
                  ? "Enregistrement…"
                  : openShift
                    ? "Pointer mon départ"
                    : "Pointer mon arrivée"}
                <small>Le pointage est enregistré sur le serveur.</small>
              </span>
            </button>
            <div className="offline-safe">
              <Icon name="lock" />
              <span>
                Pointage sécurisé
                <small>Une connexion réseau est nécessaire.</small>
              </span>
            </div>
          </section>
          <section className="data-panel attendance-history">
            <div className="panel__heading">
              <div>
                <h3>Cette semaine</h3>
                <p>
                  {attendance.length} pointage
                  {attendance.length === 1 ? "" : "s"} · 7 derniers jours
                </p>
              </div>
              <strong>
                {Math.floor(totalMinutes / 60)} h{" "}
                {String(totalMinutes % 60).padStart(2, "0")}
              </strong>
            </div>
            {loadingData ? (
              <p role="status">Chargement des pointages…</p>
            ) : !dataError && attendance.length === 0 ? (
              <p>Aucun pointage cette semaine.</p>
            ) : null}
            {attendance.map((record) => (
              <article key={record.id}>
                <strong>{formatDate(record.clockInAt)}</strong>
                <span>Arrivée {formatTime(record.clockInAt)}</span>
                <span>
                  Départ{" "}
                  {record.clockOutAt
                    ? formatTime(record.clockOutAt)
                    : "En cours"}
                </span>
                <b>{durationFor(record)}</b>
                <i>
                  <Icon name="check" size={13} />{" "}
                  {record.clockOutAt ? "Clôturé" : "Ouvert"}
                </i>
              </article>
            ))}
          </section>
        </div>
      </div>
    )
  }

  if (active === "Profil") {
    async function updateSensitiveDataConsent(accepted: boolean) {
      setConsentSaving(true)
      try {
        const result = await api.savePrivacyConsent(accepted)
        setSensitiveConsent(result.sensitiveDataConsented)
        onProfileUpdate({ ...user, sensitiveDataConsented: result.sensitiveDataConsented })
        notify(accepted
          ? "Votre consentement à un accès support justifié est enregistré."
          : "Votre consentement à un accès support a été retiré.")
      } catch (error) {
        notify(error instanceof Error ? error.message : "Votre choix de consentement n’a pas été enregistré.")
      } finally {
        setConsentSaving(false)
      }
    }

    async function uploadProfilePhoto(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.currentTarget.files?.[0]
      if (!file) return
      event.currentTarget.value = ""
      if (!(["image/jpeg", "image/png", "image/webp"] as string[]).includes(file.type)) {
        setProfileError("Choisissez une image JPEG, PNG ou WebP.")
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        setProfileError("La photo doit peser au maximum 2 Mo.")
        return
      }

      setProfilePhotoSaving(true)
      setProfileError("")
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () =>
            typeof reader.result === "string"
              ? resolve(reader.result)
              : reject(new Error("La lecture de la photo a échoué."))
          reader.onerror = () => reject(new Error("La lecture de la photo a échoué."))
          reader.readAsDataURL(file)
        })
        const result = await api.updateProfilePhoto({
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
          imageBase64: dataUrl.slice(dataUrl.indexOf(",") + 1),
        })
        const profilePhotoUrl = `${result.profilePhotoUrl}?v=${Date.now()}`
        setProfilePhotoPreview(profilePhotoUrl)
        setProfilePhotoChecked(true)
        onProfileUpdate({ ...user, profilePhotoUrl })
        notify("Votre photo de profil a été mise à jour.")
      } catch (error) {
        setProfileError(
          error instanceof Error ? error.message : "La photo n’a pas pu être enregistrée.",
        )
      } finally {
        setProfilePhotoSaving(false)
      }
    }

    async function removeProfilePhoto() {
      setProfilePhotoSaving(true)
      setProfileError("")
      try {
        await api.removeProfilePhoto()
        setProfilePhotoPreview(null)
        setProfilePhotoChecked(true)
        onProfileUpdate({ ...user, profilePhotoUrl: null })
        notify("Votre photo de profil a été supprimée.")
      } catch (error) {
        setProfileError(
          error instanceof Error ? error.message : "La photo n’a pas pu être supprimée.",
        )
      } finally {
        setProfilePhotoSaving(false)
      }
    }

    async function saveProfile(event: FormEvent) {
      event.preventDefault()
      if (profileSaving) return
      setProfileSaving(true)
      setProfileError("")
      try {
        const updatedUser = await api.updateProfile({
          fullName: profileName,
          email: profileEmail,
          phone: profilePhone.trim() || null,
        })
        onProfileUpdate(updatedUser)
        setSaved(true)
        notify("Vos informations personnelles ont été mises à jour.")
      } catch (error) {
        setProfileError(
          error instanceof Error
            ? error.message
            : "Votre profil n’a pas pu être enregistré.",
        )
      } finally {
        setProfileSaving(false)
      }
    }

    return (
      <div className="module-page">
        <SectionHeader
          eyebrow="Compte personnel"
          title="Mon profil"
          description="Modifiez votre nom, vos coordonnées et votre adresse email."
          action=""
          icon="user"
          showAction={false}
        />
        <form
          className="settings-card profile-card"
          onSubmit={(event) => void saveProfile(event)}
        >
          {profileError && (
            <div className="auth-error" role="alert">
              {profileError}
            </div>
          )}
          <div className="profile-hero">
            <span className="user-avatar profile-avatar">
              <UserAvatar
                user={user}
                photoUrl={
                  profilePhotoPreview ??
                  (profilePhotoChecked ? null : user.profilePhotoUrl)
                }
                alt="Photo de profil"
                onPhotoLoaded={() => {
                  setProfilePhotoPreview(user.profilePhotoUrl)
                  setProfilePhotoChecked(true)
                }}
                onPhotoError={() => {
                  setProfilePhotoPreview(null)
                  setProfilePhotoChecked(true)
                }}
              />
            </span>
            <div>
              <h3>{user.fullName}</h3>
              <p>{user.roleLabel}</p>
              <small>
                <Icon name="lock" size={13} /> Accès limité à :{" "}
                {user.assignedSite ?? user.tenantName}
              </small>
            </div>
          </div>
          <div className="profile-photo-controls">
            <label className="profile-photo-picker">
              <Icon name="camera" size={16} />
              <span>{profilePhotoSaving ? "Mise à jour…" : "Ajouter ou modifier la photo"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={profilePhotoSaving}
                onChange={(event) => void uploadProfilePhoto(event)}
              />
            </label>
            {profilePhotoPreview && (
              <button
                className="text-button"
                type="button"
                disabled={profilePhotoSaving}
                onClick={() => void removeProfilePhoto()}
              >
                Retirer la photo
              </button>
            )}
            <small>JPEG, PNG ou WebP · 2 Mo maximum</small>
          </div>
          <div className="form-grid">
            <label>
              <span>Nom complet</span>
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                value={profileName}
                onChange={(event) => {
                  setProfileName(event.target.value)
                  setSaved(false)
                }}
              />
            </label>
            <label>
              <span>Rôle</span>
              <input value={user.roleLabel} disabled />
            </label>
            <label>
              <span>Email</span>
              <input
                autoComplete="email"
                type="email"
                required
                maxLength={254}
                value={profileEmail}
                onChange={(event) => {
                  setProfileEmail(event.target.value)
                  setSaved(false)
                }}
              />
            </label>
            <label>
              <span>Téléphone</span>
              <input
                autoComplete="tel"
                type="tel"
                minLength={7}
                maxLength={30}
                value={profilePhone}
                onChange={(event) => {
                  setProfilePhone(event.target.value)
                  setSaved(false)
                }}
              />
            </label>
          </div>
          <div className="permission-summary">
            <Icon name="lock" />
            <div>
              <strong>Votre périmètre est protégé</strong>
              <p>
                Les modules non autorisés sont absents de votre navigation.
                Votre rôle ne peut être modifié que par un administrateur
                entreprise.
              </p>
            </div>
            {user.requiresUserConsent && (
              <label className="permission-summary">
                <Icon name="lock" />
                <span>
                  <strong>Accès support aux données sensibles</strong>
                  <p>
                    Votre choix n’autorise que les consultations nécessaires au support et chaque accès est journalisé. Vous pouvez le retirer à tout moment.
                  </p>
                  <span className="checkbox">
                    <input
                      type="checkbox"
                      checked={sensitiveConsent}
                      disabled={consentSaving}
                      onChange={(event) => void updateSensitiveDataConsent(event.target.checked)}
                    />
                    <span>{consentSaving ? "Enregistrement…" : "J’autorise un accès support justifié"}</span>
                  </span>
                </span>
              </label>
            )}
          </div>
          <div className="settings-actions">
            <button
              className="module-primary"
              type="submit"
              disabled={profileSaving}
            >
              <Icon name={profileSaving ? "cloud" : saved ? "check" : "user"} />
              {profileSaving
                ? "Enregistrement…"
                : saved
                  ? "Profil enregistré"
                  : "Enregistrer mon profil"}
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (active === "Entreprises") {
    const activeTenants = platformTenants.filter(
      (tenant) => tenant.status === "Actif",
    ).length
    const trialTenants = platformTenants.filter(
      (tenant) => tenant.status === "Essai",
    ).length
    const activeUsers = platformTenants.reduce(
      (sum, tenant) => sum + tenant.userCount,
      0,
    )
    return (
      <div className="module-page">
        {platformTenantEditTarget && (
          <EditTenantDialog
            tenant={platformTenantEditTarget}
            onClose={() => setPlatformTenantEditTarget(null)}
            onConfirm={savePlatformTenantName}
          />
        )}
        {platformTenantStatusTarget && (
          <ConfirmActionDialog
            title={platformTenantStatusTarget.status === "Archivé" ? "Archiver l’entreprise" : "Réactiver l’entreprise"}
            description={`${platformTenantStatusTarget.status === "Archivé" ? "L’entreprise ne sera plus active dans la plateforme." : "L’entreprise sera réactivée."} ${platformTenantStatusTarget.tenant.name}`}
            confirmLabel={platformTenantStatusTarget.status === "Archivé" ? "Archiver" : "Réactiver"}
            onClose={() => setPlatformTenantStatusTarget(null)}
            onConfirm={confirmPlatformTenantStatus}
          />
        )}
        {subscriptionTerminationTarget && (
          <ConfirmActionDialog
            title="Résilier l’abonnement"
            description={`Résilier l’abonnement de ${subscriptionTerminationTarget.name} bloquera immédiatement l’accès de toute l’entreprise.`}
            confirmLabel="Résilier l’abonnement"
            onClose={() => setSubscriptionTerminationTarget(null)}
            onConfirm={confirmSubscriptionTermination}
          />
        )}
        {selectedPlatformTenant && (
          <DetailDialog
            title={selectedPlatformTenant.name}
            onClose={() => setSelectedPlatformTenant(null)}
          >
            <dl className="detail-list">
              <div><dt>Statut</dt><dd>{selectedPlatformTenant.status}</dd></div>
              <div><dt>Plan</dt><dd>{selectedPlatformTenant.planName ?? "Aucun plan"}</dd></div>
              <div><dt>Utilisateurs actifs</dt><dd>{selectedPlatformTenant.userCount}</dd></div>
              <div><dt>Chantiers actifs</dt><dd>{selectedPlatformTenant.activeSiteCount}</dd></div>
              <div><dt>Chantiers historisés</dt><dd>{selectedPlatformTenant.siteCount - selectedPlatformTenant.activeSiteCount}</dd></div>
              <div><dt>Créée le</dt><dd>{new Date(selectedPlatformTenant.createdAt).toLocaleDateString("fr-FR")}</dd></div>
            </dl>
          </DetailDialog>
        )}
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow="Back-office éditeur"
          title="Entreprises clientes"
          description="Gérez les licences sans accéder aux données métier des entreprises."
          action="Créer une entreprise"
          icon="plus"
          onAction={() => openAction("tenant", "Créer une entreprise cliente")}
        />
        <div className="editor-boundary">
          <Icon name="lock" />
          <div>
            <strong>Barrière de confidentialité active</strong>
            <p>
              Les chantiers, tâches, photos et données financières des tenants
              ne sont jamais exposés dans cet espace.
            </p>
          </div>
        </div>
        <section className="data-panel registration-request-panel">
          <div className="registration-request-panel__heading">
            <div>
              <span className="eyebrow">Préinscriptions publiques</span>
              <h2>Demandes d’ouverture d’espace</h2>
              <p>Une demande ne crée aucun accès. Vérifiez-la puis créez l’entreprise et son administrateur.</p>
            </div>
            <strong>
              {loadingData
                ? "…"
                : `${registrationRequests.filter((item) => item.status === "Nouvelle").length} nouvelle(s)`}
            </strong>
          </div>
          {loadingData ? (
            <p role="status">Chargement des demandes…</p>
          ) : null}
          {!loadingData && !dataError && registrationRequests.length === 0 ? (
            <p>Aucune demande d’inscription pour le moment.</p>
          ) : null}
          <div className="registration-request-list">
            {registrationRequests.map((request) => (
              <article className="registration-request" key={request.id}>
                <div className="registration-request__identity">
                  <strong>{request.companyName}</strong>
                  <span>{request.adminFullName} · {request.adminEmail}</span>
                  {request.phone && <span>{request.phone}</span>}
                </div>
                <p>{request.message}</p>
                <small>Reçue le {new Date(request.createdAt).toLocaleDateString("fr-FR")}</small>
                <div className="registration-request__actions">
                  <select
                    aria-label={`Statut de la demande de ${request.companyName}`}
                    value={request.status}
                    onChange={(event) =>
                      void updateRegistrationRequestStatus(
                        request,
                        event.target.value as Exclude<
                          RegistrationRequestStatus,
                          "Entreprise créée"
                        >,
                      )
                    }
                    disabled={request.status === "Entreprise créée"}
                  >
                    {(request.status === "Entreprise créée"
                      ? ["Entreprise créée"]
                      : ["Nouvelle", "En cours", "Refusée"]
                    ).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={request.status === "Entreprise créée" || request.status === "Refusée"}
                    onClick={() =>
                      openAction(
                        "tenant",
                        `Créer l’espace de ${request.companyName}`,
                        request.id,
                        {
                          "Raison sociale": request.companyName,
                          "Nom de l’administrateur": request.adminFullName,
                          "Email administrateur": request.adminEmail,
                          "Téléphone administrateur": request.phone ?? "",
                        },
                      )
                    }
                  >
                    Créer l’entreprise
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <div className="cash-metrics editor-metrics">
          <div>
            <span>Entreprises actives</span>
            <strong>{loadingData ? "…" : activeTenants}</strong>
            <small>Comptes autorisés</small>
          </div>
          <div>
            <span>Essais en cours</span>
            <strong>{loadingData ? "…" : trialTenants}</strong>
            <small>Abonnements d’essai</small>
          </div>
          <div>
            <span>Utilisateurs licenciés</span>
            <strong>{loadingData ? "…" : activeUsers}</strong>
            <small>Comptes actifs agrégés</small>
          </div>
          <div>
            <span>Impayés</span>
            <strong>
              {loadingData
                ? "…"
                : platformTenants.filter((tenant) => tenant.status === "Impayé")
                    .length}
            </strong>
            <small>À régulariser</small>
          </div>
        </div>
        <section className="data-panel tenant-list">
          <div className="table-head">
            <span>Entreprise</span>
            <span>Plan</span>
            <span>Utilisateurs</span>
            <span>Statut</span>
            <span>Renouvellement</span>
          </div>
          {loadingData ? (
            <p role="status">Chargement des entreprises…</p>
          ) : null}
          {!loadingData && !dataError && platformTenants.length === 0 ? (
            <p>Aucune entreprise cliente enregistrée.</p>
          ) : null}
          {platformTenants.map((tenant) => {
            const plan = subscriptionPlans.find(
              (item) => item.id === tenant.planId,
            )
            const status = tenant.subscriptionStatus ?? "Actif"
            return (
              <article className="table-row" key={tenant.id}>
                <div>
                  <strong>{tenant.name}</strong>
                  <small>Tenant isolé · {tenant.siteCount} chantier(s) · {tenant.status}</small>
                  <small>
                    {tenant.renewsAt
                      ? `Accès valable jusqu’au ${formatDateOnly(tenant.renewsAt)} inclus`
                      : "Aucune date de fin définie · accès client bloqué"}
                  </small>
                  <div className="tenant-row-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => void showPlatformTenantDetails(tenant)}
                    >Détails</button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setPlatformTenantEditTarget(tenant)}
                    >Modifier</button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setPlatformTenantStatusTarget({
                        tenant,
                        status: tenant.status === "Archivé" ? "Actif" : "Archivé",
                      })}
                    >{tenant.status === "Archivé" ? "Réactiver" : "Archiver"}</button>
                  </div>
                </div>
                <select
                  aria-label={`Plan de ${tenant.name}`}
                  value={tenant.planId ?? ""}
                  onChange={(event) =>
                    void updateTenantSubscription(
                      tenant,
                      event.target.value,
                      status,
                    )
                  }
                >
                  <option value="" disabled>
                    Sans plan
                  </option>
                  {tenant.planId &&
                    !subscriptionPlans.some(
                      (item) => item.id === tenant.planId && item.active,
                    ) && (
                      <option value={tenant.planId}>
                        {tenant.planName ?? "Plan indisponible"} · inactif
                      </option>
                    )}
                  {subscriptionPlans
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
                <span>
                  {tenant.userCount} / {plan?.maxUsers ?? "∞"} utilisateurs
                </span>
                <select
                  aria-label={`Statut de ${tenant.name}`}
                  value={status}
                  onChange={(event) => {
                    const nextStatus = event.target
                      .value as NonNullable<PlatformTenant["subscriptionStatus"]>
                    if (nextStatus === "Résilié") {
                      setSubscriptionTerminationTarget(tenant)
                      return
                    }
                    void updateTenantSubscription(
                      tenant,
                      tenant.planId ?? "",
                      nextStatus,
                    )
                  }}
                >
                  {([
                    "Essai",
                    "Actif",
                    "Impayé",
                    "Suspendu",
                    "Résilié",
                  ] as const).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Fin de validité de ${tenant.name}`}
                  type="date"
                  value={dateInputValue(tenant.renewsAt)}
                  title="La date indiquée est incluse; les accès sont bloqués à partir du lendemain."
                  onChange={(event) =>
                    void updateTenantSubscription(
                      tenant,
                      tenant.planId ?? "",
                      status,
                      event.target.value || null,
                    )
                  }
                />
              </article>
            )
          })}
        </section>
      </div>
    )
  }

  if (active === "Utilisateurs") {
    const pageCount = Math.max(1, Math.ceil(platformUserTotal / 25))
    return (
      <div className="module-page">
        {platformUserEditTarget && (
          <EditPlatformUserDialog
            user={platformUserEditTarget}
            onClose={() => setPlatformUserEditTarget(null)}
            onConfirm={savePlatformUserProfile}
          />
        )}
        {platformSupportTarget && (
          <PlatformSupportAccessDialog
            key={platformSupportTarget.id}
            user={platformSupportTarget}
            onClose={() => setPlatformSupportTarget(null)}
            onConfirm={confirmPlatformSupportAccess}
          />
        )}
        {platformUserConfirmation && (
          <ConfirmPlatformUserActionDialog
            user={platformUserConfirmation.user}
            action={platformUserConfirmation.action}
            onClose={() => setPlatformUserConfirmation(null)}
            onConfirm={confirmPlatformUserAction}
          />
        )}
        {temporaryPasswordTarget && (
          <TemporaryPasswordDialog
            user={temporaryPasswordTarget}
            onClose={() => setTemporaryPasswordTarget(null)}
            onConfirm={(password) => saveTemporaryPassword(temporaryPasswordTarget, password)}
          />
        )}
        {supportUserDetail && (
          <DetailDialog title="Mode support temporaire" onClose={() => setSupportUserDetail(null)}>
            <p>Accès personnel audité. Fermez cette fenêtre dès que le dépannage est terminé.</p>
            <dl className="detail-list">
              <div><dt>Nom</dt><dd>{supportUserDetail.fullName}</dd></div>
              <div><dt>Email</dt><dd>{supportUserDetail.email}</dd></div>
              <div><dt>Téléphone</dt><dd>{supportUserDetail.phone ?? "Non renseigné"}</dd></div>
              <div><dt>Rôle</dt><dd>{supportUserDetail.role}</dd></div>
              <div><dt>Consentement</dt><dd>{supportUserDetail.consented ? "Enregistré" : "Accès d’urgence journalisé"}</dd></div>
            </dl>
          </DetailDialog>
        )}
        {dataError && <div className="auth-error" role="alert">{dataError}</div>}
        <SectionHeader
          eyebrow="Administration de la plateforme"
          title="Utilisateurs"
          description="Recherchez, modifiez ou bloquez les comptes. Les coordonnées restent masquées hors mode support justifié."
          action="Gérer les utilisateurs"
          icon="team"
          showAction={false}
        />
        <div className="editor-boundary">
          <Icon name="lock" />
          <div><strong>Accès personnel contrôlé</strong><p>Les changements de mot de passe et révocations de session sont journalisés. Chaque éditeur doit activer la MFA TOTP; l’ajout d’un second éditeur permet la continuité d’accès.</p></div>
        </div>
        <form className="module-toolbar" onSubmit={(event) => void createPlatformEditor(event)}>
          <input
            aria-label="Nom du nouvel éditeur"
            autoComplete="name"
            placeholder="Nom du nouvel éditeur"
            minLength={2}
            maxLength={120}
            value={newEditorName}
            onChange={(event) => setNewEditorName(event.target.value)}
            required
          />
          <input
            aria-label="Email du nouvel éditeur"
            type="email"
            autoComplete="email"
            placeholder="Email professionnel"
            maxLength={254}
            value={newEditorEmail}
            onChange={(event) => setNewEditorEmail(event.target.value)}
            required
          />
          <button className="module-primary" type="submit" disabled={creatingPlatformEditor}>
            {creatingPlatformEditor ? "Envoi…" : "Inviter un éditeur"}
          </button>
        </form>
        <div className="module-toolbar">
          <div className="module-search">
            <Icon name="search" />
            <input aria-label="Rechercher un utilisateur" placeholder="Nom, entreprise ou coordonnées…" value={platformUserSearch} onChange={(event) => { setPlatformUserSearch(event.target.value); setPlatformUserPage(1) }} />
          </div>
          <select aria-label="Filtrer par statut" value={platformUserStatus} onChange={(event) => { setPlatformUserStatus(event.target.value as typeof platformUserStatus); setPlatformUserPage(1) }}>
            <option value="all">Tous les comptes</option>
            <option value="active">Actifs</option>
            <option value="blocked">Bloqués</option>
          </select>
          <select
            aria-label="Filtrer par rôle"
            value={platformUserRole}
            onChange={(event) => {
              setPlatformUserRole(event.target.value as UserRole | "all")
              setPlatformUserPage(1)
            }}
          >
            <option value="all">Tous les rôles</option>
            {(["EDITOR", "ADMIN_ENTERPRISE", "CONDUCTEUR", "CHEF_CHANTIER", "COMPAGNON", "SOUS_TRAITANT", "COMPTABLE", "MAITRE_OUVRAGE"] as const).map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <select
            aria-label="Filtrer par entreprise"
            value={platformUserTenantId}
            onChange={(event) => {
              setPlatformUserTenantId(event.target.value)
              setPlatformUserPage(1)
            }}
          >
            <option value="all">Toutes les entreprises</option>
            <option value="platform">Espace éditeur</option>
            {platformTenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
            ))}
          </select>
        </div>
        <section className="data-panel dossier-list">
          {loadingData ? <p role="status">Chargement des utilisateurs…</p> : null}
          {!loadingData && platformUsers.length === 0 ? <p>Aucun compte trouvé.</p> : null}
          {platformUsers.map((platformUser) => (
            <article className="table-row" key={platformUser.id}>
              <div><strong>{platformUser.fullName}</strong><small>{platformUser.tenantName} · {platformUser.role}</small></div>
              <span>{platformUser.emailMasked}{platformUser.phoneMasked ? ` · ${platformUser.phoneMasked}` : ""}</span>
              <span>{platformUser.assignedSite ?? "Sans chantier affecté"}</span>
              <span>{platformUser.active ? "Actif" : "Bloqué"} · {platformUser.mustChangePassword ? "changement de mot de passe requis" : "mot de passe normal"}</span>
              <div className="platform-user-actions">
                <button className="text-button" type="button" onClick={() => void editPlatformUser(platformUser)}>Modifier</button>
                <button className="text-button" type="button" onClick={() => void openPlatformSupportAccess(platformUser)}>Mode support</button>
                {platformUser.role === "EDITOR"
                  ? <button className="text-button" type="button" disabled={!platformUser.active} onClick={() => void resendPlatformEditorInvitation(platformUser)}>Réinitialiser par email</button>
                  : <button className="text-button" type="button" disabled={!platformUser.active} onClick={() => void resetPlatformUserPassword(platformUser)}>Mot de passe provisoire</button>}
                {platformUser.role !== "EDITOR" && platformUser.id !== user.id && <button className="text-button" type="button" disabled={!platformUser.active} onClick={() => void revokePlatformUserSessions(platformUser)}>Forcer la déconnexion</button>}
                {platformUser.role !== "EDITOR" && platformUser.id !== user.id && <button className="text-button" type="button" onClick={() => void togglePlatformUser(platformUser)}>{platformUser.active ? "Bloquer" : "Réactiver"}</button>}
              </div>
            </article>
          ))}
        </section>
        <div className="pagination-controls">
          <span>{platformUserTotal} compte(s) · page {platformUserPage} / {pageCount}</span>
          <button className="secondary-button" type="button" disabled={platformUserPage <= 1} onClick={() => setPlatformUserPage((page) => Math.max(1, page - 1))}>Précédent</button>
          <button className="secondary-button" type="button" disabled={platformUserPage >= pageCount} onClick={() => setPlatformUserPage((page) => Math.min(pageCount, page + 1))}>Suivant</button>
        </div>
      </div>
    )
  }

  if (active === "Journal d’audit") {
    return (
      <div className="module-page">
        {dataError && <div className="auth-error" role="alert">{dataError}</div>}
        <SectionHeader eyebrow="Administration de la plateforme" title="Journal d’audit" description="Historique des opérations sensibles et des accès support." action="Consulter le journal" icon="clipboard" showAction={false} />
        <div className="module-toolbar">
          <label>Action
            <input aria-label="Filtrer par action" placeholder="Toutes les actions" value={auditActionFilter} onChange={(event) => setAuditActionFilter(event.target.value)} />
          </label>
        </div>
        <section className="data-panel dossier-list">
          {loadingData ? <p role="status">Chargement du journal…</p> : null}
          {!loadingData && platformAuditLogs.length === 0 ? <p>Aucune opération auditée.</p> : null}
          {platformAuditLogs.map((entry) => (
            <article className="table-row" key={entry.id}>
              <div><strong>{auditActionLabels[entry.action] ?? entry.action}</strong><small>{entry.actorName ?? "Compte clôturé"} · {entry.actorRole}</small></div>
              <span>{entry.tenantName ?? "Plateforme"}</span>
              <span>{entry.targetType} · {entry.targetId}</span>
              <span>{new Date(entry.createdAt).toLocaleString("fr-FR")}</span>
              <small>{JSON.stringify(entry.payloadMasked)}</small>
            </article>
          ))}
        </section>
      </div>
    )
  }

  if (active === "Abonnements") {
    const today = new Date().toISOString().slice(0, 10)
    const overdueInvoices = platformInvoices.filter(
      (invoice) => invoice.status === "À payer" && invoice.dueAt < today,
    )
    const overdueAmount = overdueInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.amountFcfa),
      0,
    )
    const renewals = platformTenants.filter((tenant) => {
      const renewsAt = dateInputValue(tenant.renewsAt)
      if (!renewsAt) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const days =
        (new Date(`${renewsAt}T00:00:00`).getTime() - today.getTime()) /
        86_400_000
      return days >= 0 && days <= 30
    }).length
    return (
      <div className="module-page">
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow="Back-office éditeur"
          title="Abonnements"
          description="Suivez les plans, renouvellements et paiements de licence."
          action="Nouvelle facture"
          icon="plus"
          onAction={() => openAction("invoice", "Émettre une facture d’abonnement")}
        />
        <div className="plan-grid__heading">
          <h2>Offres d’abonnement</h2>
          <button
            className="text-button"
            onClick={() => openAction("plan", "Créer un plan d’abonnement")}
          >
            + Nouveau plan
          </button>
        </div>
        <div className="plan-grid">
          {loadingData ? (
            <p role="status">Chargement des abonnements…</p>
          ) : null}
          {!loadingData && !dataError && subscriptionPlans.length === 0 ? (
            <p>Aucun plan d’abonnement configuré. Créez un plan pour pouvoir ouvrir les espaces clients.</p>
          ) : null}
          {subscriptionPlans.map((plan) => (
            <article
              className={
                plan.name === "Plan PME" ? "plan-card featured" : "plan-card"
              }
              key={plan.id}
            >
              {plan.name === "Plan PME" && <span>Plan par défaut</span>}
              <h3>{plan.name}</h3>
              <strong>
                {Number(plan.monthlyPriceFcfa) === 0
                  ? "Sur devis"
                  : formatFcfa(Number(plan.monthlyPriceFcfa))}
                <small>
                  {Number(plan.monthlyPriceFcfa) === 0 ? "" : " / mois"}
                </small>
              </strong>
              <p>
                <Icon name="team" />
                {plan.maxUsers ?? "Illimité"} utilisateurs
              </p>
              <p>
                <Icon name="building" />
                {plan.maxSites ?? "Illimité"} chantiers actifs
              </p>
              <p>
                <Icon name="cloud" />
                {plan.maxStorageMb ? `${plan.maxStorageMb} Mo` : "Illimité"} de stockage
              </p>
              <small>
                {plan.active ? "Plan actif" : "Plan inactif"} · {plan.subscriberCount ?? 0} abonnement(s)
              </small>
              <div className="plan-card__actions">
                <button
                  onClick={() =>
                    openAction(
                      "plan",
                      `Configurer le plan ${plan.name}`,
                      plan.id,
                      {
                        "Nom du plan": plan.name,
                        "Tarif mensuel FCFA": plan.monthlyPriceFcfa,
                        "Limite utilisateurs": String(plan.maxUsers ?? ""),
                        "Limite chantiers": String(plan.maxSites ?? ""),
                        "Limite stockage (Mo)": String(plan.maxStorageMb ?? ""),
                      },
                    )
                  }
                >
                  Configurer
                </button>
                <button
                  className={
                    plan.active ? "plan-card__toggle" : "plan-card__toggle plan-card__toggle--inactive"
                  }
                  onClick={() => void togglePlanActive(plan, !plan.active)}
                >
                  {plan.active ? "Désactiver" : "Activer"}
                </button>
              </div>
            </article>
          ))}
        </div>
        <section className="data-panel billing-summary">
          <div>
            <span>Revenu mensuel récurrent</span>
            <strong>
              {loadingData
                ? "…"
                : platformOverview
                  ? formatFcfa(Number(platformOverview.monthlyRevenueFcfa))
                  : "—"}
            </strong>
            <small>Abonnements actifs uniquement</small>
          </div>
          <div>
            <span>Factures en retard</span>
            <strong>{loadingData ? "…" : overdueInvoices.length}</strong>
            <small>{loadingData ? "…" : `${formatFcfa(overdueAmount)} à recouvrer`}</small>
          </div>
          <div>
            <span>Renouvellements à 30 jours</span>
            <strong>{loadingData ? "…" : renewals}</strong>
            <small>Échéances enregistrées</small>
          </div>
        </section>
        <section className="data-panel invoice-register">
          <div className="invoice-register__heading">
            <div>
              <h2>Factures émises</h2>
              <p>Suivi des échéances et des encaissements reçus manuellement.</p>
            </div>
          </div>
          <div className="invoice-register__head">
            <span>Facture / entreprise</span>
            <span>Montant</span>
            <span>Échéance</span>
            <span>Statut</span>
            <span>Actions</span>
          </div>
          {loadingData ? <p role="status">Chargement des factures…</p> : null}
          {!loadingData && platformInvoices.length === 0 ? (
            <p className="invoice-register__empty">Aucune facture émise.</p>
          ) : null}
          {platformInvoices.map((invoice) => (
            <article className="invoice-register__row" key={invoice.id}>
              <div>
                <strong>{invoice.invoiceNumber}</strong>
                <small>{invoice.tenantName} · {invoice.description}</small>
              </div>
              <strong>{formatFcfa(Number(invoice.amountFcfa))}</strong>
              <span>{new Date(`${invoice.dueAt}T12:00:00`).toLocaleDateString("fr-FR")}</span>
              <span className={`invoice-status invoice-status--${invoice.status === "Payée" ? "paid" : invoice.status === "Annulée" ? "cancelled" : invoice.dueAt < today ? "overdue" : "pending"}`}>
                {invoice.status === "À payer" && invoice.dueAt < today
                  ? "En retard"
                  : invoice.status}
              </span>
              <div className="invoice-register__actions">
                <button
                  className="invoice-register__print"
                  onClick={() => setInvoiceToPrint(invoice)}
                >
                  Imprimer
                </button>
                {invoice.status === "À payer" ? (
                  <>
                    <button
                      onClick={() =>
                        openAction(
                          "invoice",
                          `Encaisser ${invoice.invoiceNumber}`,
                          invoice.id,
                        )
                      }
                    >
                      Enregistrer le paiement
                    </button>
                    <button
                      className="invoice-register__cancel"
                      onClick={() => void updatePlatformInvoiceStatus(invoice, "Annulée")}
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <small>
                    {invoice.paymentMethod ?? ""}
                    {invoice.paymentReference ? ` · ${invoice.paymentReference}` : ""}
                    {invoice.closedBy ? ` · ${invoice.closedBy}` : ""}
                  </small>
                )}
              </div>
            </article>
          ))}
        </section>
        {invoiceToPrint && (
          <article className="invoice-print-sheet">
            <header>
              <strong>CHANTIER CONNECT</strong>
              <span>FACTURE D’ABONNEMENT</span>
            </header>
            <h1>{invoiceToPrint.invoiceNumber}</h1>
            <dl>
              <div><dt>Entreprise</dt><dd>{invoiceToPrint.tenantName}</dd></div>
              <div><dt>Description</dt><dd>{invoiceToPrint.description}</dd></div>
              <div><dt>Date d’émission</dt><dd>{new Date(`${invoiceToPrint.issuedAt}T12:00:00`).toLocaleDateString("fr-FR")}</dd></div>
              <div><dt>Échéance</dt><dd>{new Date(`${invoiceToPrint.dueAt}T12:00:00`).toLocaleDateString("fr-FR")}</dd></div>
              <div><dt>Statut</dt><dd>{invoiceToPrint.status}</dd></div>
              {invoiceToPrint.paymentMethod && (
                <div><dt>Mode d’encaissement</dt><dd>{invoiceToPrint.paymentMethod}</dd></div>
              )}
              {invoiceToPrint.paymentReference && (
                <div><dt>Référence</dt><dd>{invoiceToPrint.paymentReference}</dd></div>
              )}
              {invoiceToPrint.closedBy && (
                <div><dt>Clôturée par</dt><dd>{invoiceToPrint.closedBy}</dd></div>
              )}
            </dl>
            <footer>
              <span>Montant de la facture</span>
              <strong>{formatFcfa(Number(invoiceToPrint.amountFcfa))}</strong>
            </footer>
          </article>
        )}
      </div>
    )
  }

  if (active === "Support") {
    const newTickets = supportTickets.filter(
      (ticket) => ticket.status === "Nouveau",
    ).length
    const activeTickets = supportTickets.filter(
      (ticket) => ticket.status === "En cours",
    ).length
    const waitingTickets = supportTickets.filter(
      (ticket) => ticket.status === "En attente client",
    ).length
    const resolvedTickets = supportTickets.filter(
      (ticket) => ticket.status === "Résolu",
    ).length
    return (
      <div className="module-page">
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow="Back-office éditeur"
          title="Support technique"
          description="Traitez les demandes techniques sans ouvrir les données métier du client."
          action="Nouveau ticket"
          icon="plus"
          onAction={() => openAction("ticket", "Créer un ticket support")}
        />
        <div className="task-summary">
          <div>
            <span>Nouveaux</span>
            <strong>{loadingData ? "…" : newTickets}</strong>
            <small>Tickets à prendre en charge</small>
          </div>
          <div>
            <span>En cours</span>
            <strong>{loadingData ? "…" : activeTickets}</strong>
            <small>
              {loadingData
                ? "…"
                : (
                supportTickets.filter(
                  (ticket) =>
                    ticket.status === "En cours" &&
                    ["Haute", "Urgente"].includes(ticket.priority),
                ).length
              )}{" "}
              prioritaires
            </small>
          </div>
          <div>
            <span>En attente client</span>
            <strong>{loadingData ? "…" : waitingTickets}</strong>
            <small>Relance manuelle</small>
          </div>
          <div className="task-summary__progress">
            <span>Résolus</span>
            <strong>
              {loadingData
                ? "…"
                : `${resolvedTickets} / ${supportTickets.length}`}
            </strong>
            <div className="progress">
              <i />
            </div>
          </div>
        </div>
        <section className="data-panel support-list">
          {loadingData ? <p role="status">Chargement des tickets…</p> : null}
          {!loadingData && !dataError && supportTickets.length === 0 ? (
            <p>Aucun ticket de support enregistré.</p>
          ) : null}
          {supportTickets.map((ticket) => (
            <article key={ticket.id}>
              <span className="action-icon action-icon--blue">
                <Icon name="alert" />
              </span>
              <div>
                <small>
                  {ticket.tenantName} · {ticket.priority} ·{" "}
                  {new Date(ticket.createdAt).toLocaleDateString("fr-FR")}
                </small>
                <strong>{ticket.subject}</strong>
                {ticket.description && <small>{ticket.description}</small>}
              </div>
              <select
                aria-label={`Statut du ticket ${ticket.subject}`}
                value={ticket.status}
                onChange={(event) =>
                  void updateTicketStatus(
                    ticket,
                    event.target.value as SupportTicketStatus,
                  )
                }
              >
                {([
                  "Nouveau",
                  "En cours",
                  "En attente client",
                  "Résolu",
                ] as const).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </article>
          ))}
        </section>
      </div>
    )
  }

  if (active === "Paramètres" && user.role === "EDITOR") {
    return (
      <div className="module-page">
        {dataError && (
          <div className="auth-error" role="alert">
            {dataError}
          </div>
        )}
        <SectionHeader
          eyebrow="Configuration éditeur"
          title="Paramètres plateforme"
          description="Configuration technique du back-office, séparée des paramètres des entreprises."
          action={saved ? "Enregistré" : "Enregistrer"}
          icon="settings"
          showAction={false}
        />
        <form
          key={platformSettings?.updatedAt ?? "loading"}
          className="settings-card"
          onSubmit={(event) => void savePlatformSettings(event)}
        >
          <div className="settings-heading">
            <div>
              <h3>Identité de la plateforme</h3>
              <p>
                Informations visibles sur les abonnements et communications
                techniques.
              </p>
            </div>
            <span className="company-logo">CC</span>
          </div>
          <div className="form-grid">
            <label>
              <span>Nom commercial</span>
              <input
                name="name"
                defaultValue={platformSettings?.name ?? ""}
                required
              />
            </label>
            <label>
              <span>Email support</span>
              <input
                name="supportEmail"
                type="email"
                defaultValue={platformSettings?.supportEmail ?? ""}
                required
              />
            </label>
            <label>
              <span>Tentatives de connexion autorisées / 15 min</span>
              <input
                name="requestLimit"
                type="number"
                min={10}
                max={10000}
                defaultValue={platformSettings?.requestLimit ?? 120}
                required
              />
            </label>
          </div>
          <div className="permission-summary">
            <Icon name="lock" />
            <div>
              <strong>Accès métier désactivé</strong>
              <p>
                Le rôle éditeur ne permet ni la création de chantiers, ni la
                consultation des contenus d’un tenant.
              </p>
            </div>
          </div>
          <div className="settings-actions">
            <button
              className="module-primary"
              type="submit"
              disabled={loadingData}
            >
              <Icon name="check" />
              {loadingData ? "Chargement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="module-page settings-page">
      {dataError && (
        <div className="auth-error" role="alert">
          {dataError}
        </div>
      )}
      <SectionHeader
        eyebrow="Administration"
        title="Paramètres"
        description="Configurez votre entreprise, vos accès et vos préférences de travail."
        action="Enregistrer"
        icon="settings"
        showAction={false}
      />
      <div className="settings-layout">
        <nav className="settings-nav">
          {[
            ["Entreprise", "building"],
            ["Mon profil", "user"],
            ["Sécurité", "lock"],
            ["Notifications", "alert"],
            ["Hors ligne", "cloud"],
            ["Abonnement", "wallet"],
          ].map(([tab, icon]) => (
            <button
              className={settingsTab === tab ? "active" : ""}
              key={tab}
              onClick={() => setSettingsTab(tab)}
            >
              <Icon name={icon as IconName} />
              {tab}
            </button>
          ))}
        </nav>
        {settingsTab === "Entreprise" ? (
          <form
            key={tenantSettings?.updatedAt ?? "loading"}
            className="settings-card"
            onSubmit={(event) => void saveCompanySettings(event)}
          >
            <div className="settings-heading">
              <div>
                <h3>Informations de l’entreprise</h3>
                <p>
                  Ces informations apparaissent sur vos rapports et dossiers de
                  paiement.
                </p>
              </div>
              <span className="company-logo">OB</span>
            </div>
            <div className="form-grid">
              <label>
                <span>Nom de l’entreprise</span>
                <input
                  name="legalName"
                  defaultValue={tenantSettings?.legalName ?? user.tenantName}
                  required
                />
              </label>
              <label>
                <span>Numéro contribuable</span>
                <input
                  name="taxId"
                  defaultValue={tenantSettings?.taxId ?? ""}
                />
              </label>
              <label>
                <span>Email professionnel</span>
                <input
                  name="email"
                  type="email"
                  defaultValue={tenantSettings?.email ?? ""}
                />
              </label>
              <label>
                <span>Téléphone</span>
                <input
                  name="phone"
                  defaultValue={tenantSettings?.phone ?? ""}
                />
              </label>
              <label className="full-field">
                <span>Adresse</span>
                <input
                  name="address"
                  defaultValue={tenantSettings?.address ?? ""}
                />
              </label>
              <label>
                <span>Ville</span>
                <input name="city" defaultValue={tenantSettings?.city ?? ""} />
              </label>
              <label>
                <span>Pays</span>
                <input
                  name="country"
                  defaultValue={tenantSettings?.country ?? "Gabon"}
                />
              </label>
            </div>
            <div className="settings-section">
              <div>
                <h3>Préférences régionales</h3>
                <p>Format utilisé dans votre espace entreprise.</p>
              </div>
              <div className="form-grid">
                <label>
                  <span>Langue</span>
                  <select name="language" defaultValue="fr">
                    <option value="fr">Français</option>
                  </select>
                </label>
                <label>
                  <span>Devise</span>
                  <select name="currency" defaultValue="XAF">
                    <option value="XAF">FCFA (XAF)</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="settings-actions">
              <button className="outline-button" type="reset">
                Annuler
              </button>
              <button className="module-primary" type="submit">
                <Icon name="check" />
                Enregistrer les modifications
              </button>
            </div>
          </form>
        ) : (
          <form
            key={tenantSettings?.updatedAt ?? "loading"}
            className="settings-card preference-card"
            onSubmit={(event) => void saveCompanySettings(event)}
          >
            <div className="settings-heading">
              <div>
                <h3>{settingsTab}</h3>
                <p>
                  Gérez les préférences {settingsTab.toLowerCase()} de votre
                  espace entreprise.
                </p>
              </div>
              <span className="company-logo">
                <Icon
                  name={
                    ({
                      "Mon profil": "user",
                      Sécurité: "lock",
                      Notifications: "alert",
                      "Hors ligne": "cloud",
                      Abonnement: "wallet",
                    }[settingsTab] ?? "settings") as IconName
                  }
                />
              </span>
            </div>
            <div className="preference-list">
              {[
                settingsTab === "Sécurité"
                  ? "Authentification renforcée"
                  : "Activer cette fonctionnalité",
                settingsTab === "Notifications"
                  ? "Alertes importantes par email"
                  : "Synchronisation automatique",
                settingsTab === "Abonnement"
                  ? "Recevoir les factures mensuelles"
                  : "Conserver les données sur cet appareil",
              ].map((label, index) => {
                const preferenceKey = `${settingsTab}-${index}`
                return (
                  <label key={label}>
                    <span>
                      <strong>{label}</strong>
                      <small>
                        Paramètre réservé aux administrateurs de l’entreprise.
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      name={`preference.${preferenceKey}`}
                      defaultChecked={
                        tenantSettings?.preferences[preferenceKey] ??
                        index !== 2
                      }
                    />
                  </label>
                )
              })}
            </div>
            <div className="settings-actions">
              <button className="module-primary" type="submit">
                <Icon name="check" />
                Enregistrer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function RecentActivityPanel({ user }: { user: AuthUser }) {
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    api
      .recentActivity()
      .then((result) => {
        if (active) setActivities(result)
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "L’historique n’a pas pu être chargé.",
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user.id])

  return (
    <section className="panel recent-activity-panel">
      <div className="panel__heading">
        <div>
          <h3>Activité récente</h3>
          <p>
            {user.role === "ADMIN_ENTERPRISE"
              ? "Dernières opérations de l’entreprise"
              : "Vos dernières opérations"}
          </p>
        </div>
        <span className="count-pill">{activities.length}</span>
      </div>
      {loading && <p role="status">Chargement de l’activité…</p>}
      {error && <div className="auth-error" role="alert">{error}</div>}
      {!loading && !error && activities.length === 0 && (
        <p className="recent-activity-empty">Aucune activité récente enregistrée.</p>
      )}
      <div className="recent-activity-list">
        {activities.map((activity, index) => {
          const icon: IconName =
            activity.kind === "Tâche"
              ? "task"
              : activity.kind === "Photo"
                ? "camera"
                : activity.kind === "Pointage"
                  ? "calendar"
                  : activity.kind === "Finance"
                    ? "wallet"
                    : "clipboard"
          return (
            <article key={`${activity.kind}-${activity.occurredAt}-${index}`}>
              <span className="recent-activity-icon"><Icon name={icon} size={16} /></span>
              <div>
                <strong>{activity.title}</strong>
                <small>{activity.kind} · {activity.detail} · {activity.siteName}</small>
              </div>
              <time dateTime={activity.occurredAt}>
                {new Date(activity.occurredAt).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function EditorRecentActivityPanel() {
  const [activities, setActivities] = useState<PlatformAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    api.platformAuditLogs({ limit: 8 }).then((result) => {
      if (active) setActivities(result)
    }).catch((reason: unknown) => {
      if (active) {
        setError(reason instanceof Error ? reason.message : "Le journal d’audit n’a pas pu être chargé.")
      }
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  return (
    <section className="panel recent-activity-panel">
      <div className="panel__heading">
        <div>
          <h3>Activité récente</h3>
          <p>Dernières opérations inscrites au journal d’audit</p>
        </div>
        <span className="count-pill">{activities.length}</span>
      </div>
      {loading && <p role="status">Chargement de l’activité…</p>}
      {error && <div className="auth-error" role="alert">{error}</div>}
      {!loading && !error && activities.length === 0 && (
        <p className="recent-activity-empty">Aucune activité récente enregistrée.</p>
      )}
      <div className="recent-activity-list">
        {activities.map((activity) => (
          <article key={activity.id}>
            <span className="recent-activity-icon"><Icon name="clipboard" size={16} /></span>
            <div>
              <strong>{auditActionLabels[activity.action] ?? activity.action}</strong>
              <small>
                {activity.actorName ?? "Compte clôturé"} · {activity.tenantName ?? "Plateforme"} · {
                  ({ user: "utilisateur", tenant: "entreprise", site: "chantier", subscription: "abonnement" } as Record<string, string>)[activity.targetType] ??
                  activity.targetType
                }{activity.targetName ? ` · ${activity.targetName}` : ""}
              </small>
            </div>
            <time dateTime={activity.createdAt}>
              {new Date(activity.createdAt).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </article>
        ))}
      </div>
    </section>
  )
}

function RestrictedDashboard({
  user,
  onNavigate,
}: {
  user: AuthUser
  onNavigate: (section: string) => void
}) {
  const [sites, setSites] = useState<Site[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [photos, setPhotos] = useState<SitePhoto[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(
    null,
  )
  const [paymentDossiers, setPaymentDossiers] = useState<PaymentDossier[]>([])
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([])
  const [platformOverview, setPlatformOverview] =
    useState<PlatformOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let active = true
    const load = async () => {
      if (user.role === "EDITOR") {
        const overview = await api.platformOverview()
        if (!active) return
        setPlatformOverview(overview)
        setLoading(false)
        setLoadError("")
        return
      }
      const canReadFinance = user.capabilities.includes("manage_finance")
      const [
        siteRows,
        taskRows,
        reportRows,
        photoRows,
        teamRows,
        finance,
        paymentResult,
        supplierInvoiceResult,
      ] =
        await Promise.all([
          user.capabilities.some((capability) =>
            ["manage_sites", "manage_finance", "read_assigned"].includes(
              capability,
            ),
          )
            ? api.sites()
            : Promise.resolve([] as Site[]),
          user.capabilities.some((capability) =>
            ["manage_tasks", "update_assigned_tasks"].includes(capability),
          )
            ? api.tasks()
            : Promise.resolve([] as Task[]),
          user.capabilities.some((capability) =>
            [
              "read_validated_reports",
              "validate_reports",
              "create_reports",
            ].includes(capability),
          )
            ? api.reports()
            : Promise.resolve([] as Report[]),
          user.capabilities.includes("capture_photos") ||
          user.capabilities.includes("read_assigned")
            ? api.photos()
            : Promise.resolve([] as SitePhoto[]),
          user.capabilities.includes("manage_team") ||
          user.capabilities.includes("read_team")
            ? api.team()
            : Promise.resolve([] as TeamMember[]),
          user.capabilities.includes("manage_finance") ||
          user.capabilities.includes("read_finance")
            ? api.finance()
            : Promise.resolve(null),
          canReadFinance
            ? api.paymentDossiers()
            : Promise.resolve({ data: [] as PaymentDossier[], summary: [] }),
          canReadFinance
            ? api.supplierInvoices()
            : Promise.resolve({ data: [] as SupplierInvoice[] }),
        ])
      if (!active) return
      setSites(siteRows)
      setTasks(taskRows)
      setReports(reportRows)
      setPhotos(photoRows)
      setTeam(teamRows)
      setFinanceSummary(finance?.summary ?? null)
      setPaymentDossiers(paymentResult.data)
      setSupplierInvoices(supplierInvoiceResult.data)
      setLoading(false)
      setLoadError("")
    }
    void load().catch((error: unknown) => {
      if (!active) return
      setLoadError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les indicateurs de votre espace.",
      )
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [user.id, user.role, user.capabilities])

  const firstName = user.fullName.split(" ")[0]
  const assignedSite = sites.find((site) => site.name === user.assignedSite)
  const openTasks = tasks.filter((task) => task.status !== "Terminée")
  const blockedTasks = tasks.filter((task) => task.status === "Bloquée")
  const completedTasks = tasks.filter((task) => task.status === "Terminée")
  const pendingReports = reports.filter(
    (report) => report.status === "À valider",
  )
  const validatedReports = reports.filter(
    (report) => report.status === "Validé",
  )
  const nextTask = tasks
    .filter((task) => task.dueDate && task.status !== "Terminée")
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0]
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const nextTaskIsOverdue = Boolean(
    nextTask?.dueDate && nextTask.dueDate < todayKey,
  )
  const latestValidatedReport = [...validatedReports].sort((first, second) =>
    second.reportDate.localeCompare(first.reportDate) ||
    second.createdAt.localeCompare(first.createdAt),
  )[0]
  const reportsToday = reports.filter(
    (report) => report.reportDate === todayKey,
  ).length
  const overdueTasks = tasks.filter(
    (task) =>
      task.dueDate !== null &&
      task.dueDate < todayKey &&
      task.status !== "Terminée",
  )
  const paymentDossiersInProgress = paymentDossiers.filter((dossier) =>
    ["Prêt à transmettre", "En instruction", "À corriger"].includes(dossier.status),
  )
  const overduePaymentDossiers = paymentDossiersInProgress.filter(
    (dossier) => dossier.dueDate !== null && dossier.dueDate < todayKey,
  )
  const approvedSupplierInvoices = supplierInvoices.filter(
    (invoice) => invoice.status === "Approuvée",
  )
  const overdueSupplierInvoices = approvedSupplierInvoices.filter(
    (invoice) => invoice.dueDate !== null && invoice.dueDate < todayKey,
  )
  const formatDate = (date: string | null | undefined) => {
    if (!date) return "Non définie"
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(`${date}T12:00:00`)
      : new Date(date)
    return Number.isNaN(parsed.getTime())
      ? "Non définie"
      : parsed.toLocaleDateString("fr-FR")
  }
  const deliveryDaysRemaining = assignedSite?.endDate
    ? Math.ceil(
        (Date.parse(`${assignedSite.endDate}T00:00:00Z`) -
          Date.parse(`${todayKey}T00:00:00Z`)) /
          86_400_000,
      )
    : null
  const deliveryIsOverdue =
    deliveryDaysRemaining !== null &&
    deliveryDaysRemaining < 0 &&
    assignedSite?.status !== "Terminé"
  const compactFcfa = (value: string | undefined) =>
    value === undefined ? "—" : formatFcfa(Number(value))

  let eyebrow = "Votre espace"
  let title = `Bonjour ${firstName},`
  let description = `Connecté comme ${user.roleLabel}.`
  let metrics: Array<{
    icon: IconName
    label: string
    value: string
    detail: string
    tone: string
  }> = []

  switch (user.role) {
    case "EDITOR":
      eyebrow = "Pilotage plateforme"
      description =
        "Vue agrégée des entreprises, abonnements et demandes de support."
      metrics = [
        {
          icon: "building",
          label: "Entreprises actives",
          value: loading
            ? "…"
            : String(platformOverview?.activeTenantCount ?? "—"),
          detail: loading
            ? "Chargement des données"
            : platformOverview
              ? `${platformOverview.tenantCount} entreprise(s) au total`
              : "Données indisponibles",
          tone: "orange",
        },
        {
          icon: "wallet",
          label: "Revenu mensuel",
          value: loading ? "…" : compactFcfa(platformOverview?.monthlyRevenueFcfa),
          detail: platformOverview
            ? "Abonnements actifs"
            : "Données indisponibles",
          tone: "green",
        },
        {
          icon: "alert",
          label: "Tickets ouverts",
          value: loading
            ? "…"
            : String(platformOverview?.openTicketCount ?? "—"),
          detail: platformOverview ? "À traiter par le support" : "Données indisponibles",
          tone: "red",
        },
        {
          icon: "team",
          label: "Utilisateurs actifs",
          value: loading
            ? "…"
            : String(platformOverview?.activeUserCount ?? "—"),
          detail: loading
            ? "Chargement des données"
            : platformOverview
              ? `${platformOverview.trialTenantCount} essai(s) en cours`
              : "Données indisponibles",
          tone: "blue",
        },
      ]
      break
    case "CONDUCTEUR":
      eyebrow = "Pilotage de chantier"
      description = `Coordonnez les opérations et validez les rapports de ${user.assignedSite ?? "votre chantier affecté"}.`
      metrics = [
        {
          icon: "building",
          label: "Chantier affecté",
          value: assignedSite ? "1" : "0",
          detail: assignedSite?.status ?? "Affectation requise",
          tone: "blue",
        },
        {
          icon: "task",
          label: "Tâches à suivre",
          value: String(openTasks.length),
          detail: `${blockedTasks.length} bloquée(s) · ${overdueTasks.length} en retard`,
          tone: blockedTasks.length > 0 || overdueTasks.length > 0 ? "red" : "green",
        },
        {
          icon: "clipboard",
          label: "Rapports à valider",
          value: String(pendingReports.length),
          detail: `${reports.length} rapport(s) sur ce chantier`,
          tone: "orange",
        },
        {
          icon: "team",
          label: "Équipe du chantier",
          value: String(team.filter((member) => member.active).length),
          detail: "Membres actifs affectés",
          tone: "blue",
        },
      ]
      break
    case "CHEF_CHANTIER":
      eyebrow = "Poste de commandement"
      description = `Suivez l’équipe, les blocages et les comptes rendus de ${user.assignedSite ?? "votre chantier affecté"}.`
      metrics = [
        {
          icon: "team",
          label: "Effectif affecté",
          value: String(assignedSite?.teamCount ?? 0),
          detail: "Membres actifs sur le chantier",
          tone: "blue",
        },
        {
          icon: "task",
          label: "Tâches à traiter",
          value: String(openTasks.length),
          detail: `${blockedTasks.length} bloquée(s) · ${overdueTasks.length} en retard`,
          tone: blockedTasks.length > 0 || overdueTasks.length > 0 ? "red" : "green",
        },
        {
          icon: "camera",
          label: "Photos du chantier",
          value: String(photos.length),
          detail: "Preuves enregistrées",
          tone: "orange",
        },
        {
          icon: "clipboard",
          label: "Rapports en attente",
          value: String(pendingReports.length),
          detail: `${reportsToday} rapport(s) déposé(s) aujourd’hui`,
          tone: "red",
        },
      ]
      break
    case "COMPAGNON":
      eyebrow = "Ma journée"
      description = `Suivez vos tâches, signalez les blocages et partagez les preuves terrain${user.assignedSite ? ` sur ${user.assignedSite}` : ""}.`
      metrics = [
        {
          icon: "task",
          label: "Mes tâches",
          value: String(openTasks.length),
          detail: `${completedTasks.length} terminée(s)`,
          tone: "blue",
        },
        {
          icon: "alert",
          label: "Tâches bloquées",
          value: String(blockedTasks.length),
          detail: blockedTasks.length > 0 ? "À signaler au chef de chantier" : "Aucun blocage",
          tone: blockedTasks.length > 0 ? "red" : "green",
        },
        {
          icon: "camera",
          label: "Mes photos",
          value: String(
            photos.filter((photo) => photo.authorId === user.id).length,
          ),
          detail: "Preuves déposées",
          tone: "orange",
        },
        {
          icon: "calendar",
          label: "Prochaine échéance",
          value: formatDate(nextTask?.dueDate),
          detail: nextTask
            ? nextTaskIsOverdue
              ? `En retard · ${nextTask.title}`
              : nextTask.title
            : "Aucune tâche avec échéance",
          tone: nextTaskIsOverdue ? "red" : "green",
        },
      ]
      break
    case "SOUS_TRAITANT":
      eyebrow = "Accès externe limité"
      description = `Consultez vos missions, signalez les blocages et transmettez vos preuves pour ${user.assignedSite ?? "votre chantier affecté"}.`
      metrics = [
        {
          icon: "task",
          label: "Missions à réaliser",
          value: String(openTasks.length),
          detail: `${blockedTasks.length} bloquée(s) · ${overdueTasks.length} en retard`,
          tone: blockedTasks.length > 0 || overdueTasks.length > 0 ? "red" : "blue",
        },
        {
          icon: "alert",
          label: "Blocages signalés",
          value: String(blockedTasks.length),
          detail: blockedTasks.length > 0 ? "À signaler au responsable du chantier" : "Aucun blocage",
          tone: blockedTasks.length > 0 ? "red" : "green",
        },
        {
          icon: "camera",
          label: "Mes preuves",
          value: String(
            photos.filter((photo) => photo.authorId === user.id).length,
          ),
          detail: "Photos transmises",
          tone: "orange",
        },
        {
          icon: "calendar",
          label: "Prochaine échéance",
          value: formatDate(nextTask?.dueDate),
          detail: nextTask
            ? nextTaskIsOverdue
              ? `En retard · ${nextTask.title}`
              : nextTask.title
            : "Aucune mission avec échéance",
          tone: nextTaskIsOverdue ? "red" : "blue",
        },
      ]
      break
    case "COMPTABLE":
      eyebrow = "Pilotage comptable"
      description =
        "Traitez les créances client, contrôlez les factures fournisseurs et suivez les mouvements de trésorerie."
      metrics = [
        {
          icon: "wallet",
          label: "Dossiers clients à suivre",
          value: String(paymentDossiersInProgress.length),
          detail: overduePaymentDossiers.length
            ? `${overduePaymentDossiers.length} en retard`
            : `${formatFcfa(paymentDossiersInProgress.reduce((sum, item) => sum + Number(item.amountFcfa), 0))} en attente`,
          tone: overduePaymentDossiers.length ? "red" : "green",
        },
        {
          icon: "alert",
          label: "Factures approuvées à payer",
          value: String(approvedSupplierInvoices.length),
          detail: overdueSupplierInvoices.length
            ? `${overdueSupplierInvoices.length} en retard`
            : formatFcfa(approvedSupplierInvoices.reduce((sum, item) => sum + Number(item.amountFcfa), 0)),
          tone: overdueSupplierInvoices.length ? "red" : "orange",
        },
        {
          icon: "wallet",
          label: "À encaisser",
          value: compactFcfa(financeSummary?.plannedReceiptsFcfa),
          detail: "Prévisions de trésorerie",
          tone: "blue",
        },
        {
          icon: "chart",
          label: "Trésorerie nette",
          value: compactFcfa(financeSummary?.cashBalanceFcfa),
          detail: `${compactFcfa(financeSummary?.expensesFcfa)} de dépenses réalisées`,
          tone: "green",
        },
      ]
      break
    case "MAITRE_OUVRAGE":
      eyebrow = "Portail maître d’ouvrage"
      title = `Bienvenue ${firstName},`
      description = `Consultez en lecture seule l’avancement de ${user.assignedSite ?? "votre chantier affecté"}.`
      metrics = [
        {
          icon: "building",
          label: "Avancement",
          value:
            assignedSite?.progress === null ||
            assignedSite?.progress === undefined
              ? "—"
              : `${assignedSite.progress}%`,
          detail: assignedSite?.status ?? "Chantier affecté",
          tone: "green",
        },
        {
          icon: "camera",
          label: "Photos du chantier",
          value: String(photos.length),
          detail: "Preuves consultables",
          tone: "orange",
        },
        {
          icon: "clipboard",
          label: "Rapports publiés",
          value: String(validatedReports.length),
          detail: latestValidatedReport
            ? `Dernière publication : ${formatDate(latestValidatedReport.reportDate)}`
            : "Aucun rapport publié",
          tone: "blue",
        },
        {
          icon: "calendar",
          label: "Livraison prévue",
          value: formatDate(assignedSite?.endDate),
          detail:
            assignedSite?.status === "Terminé"
              ? "Chantier terminé"
              : deliveryDaysRemaining === null
                ? "Aucune échéance communiquée"
                : deliveryIsOverdue
                  ? `Échéance dépassée de ${Math.abs(deliveryDaysRemaining)} jour${Math.abs(deliveryDaysRemaining) > 1 ? "s" : ""}`
                  : deliveryDaysRemaining === 0
                    ? "Échéance prévue aujourd’hui"
                    : `Dans ${deliveryDaysRemaining} jour${deliveryDaysRemaining > 1 ? "s" : ""}`,
          tone: deliveryIsOverdue ? "red" : "green",
        },
      ]
      break
    case "ADMIN_ENTERPRISE":
      eyebrow = "Pilotage entreprise"
      description = `Vue opérationnelle de ${user.tenantName} à partir des données enregistrées.`
      metrics = [
        {
          icon: "building",
          label: "Chantiers actifs",
          value: String(
            sites.filter((site) => site.status === "En cours").length,
          ),
          detail: `${sites.length} chantier(s) au portefeuille`,
          tone: "orange",
        },
        {
          icon: "task",
          label: "Tâches à traiter",
          value: String(openTasks.length),
          detail: `${blockedTasks.length} bloquée(s)`,
          tone: "blue",
        },
        {
          icon: "clipboard",
          label: "Rapports à valider",
          value: String(pendingReports.length),
          detail: `${validatedReports.length} validé(s)`,
          tone: "red",
        },
        {
          icon: "wallet",
          label: "Trésorerie nette",
          value: compactFcfa(financeSummary?.cashBalanceFcfa),
          detail: "Encaissements réalisés moins dépenses",
          tone: "green",
        },
      ]
      break
  }

  return (
    <div className="role-home">
      <div className="welcome">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <span className="role-badge">
          <Icon name="lock" />
          {user.roleLabel}
        </span>
      </div>
      <section className="metrics">
        {metrics.map(({ icon, label, value, detail, tone }) => (
          <MetricCard
            key={label}
            icon={icon}
            label={label}
            value={value}
            detail={detail}
            tone={tone}
            onClick={(() => {
              if (
                ![
                  "EDITOR",
                  "ADMIN_ENTERPRISE",
                  "CONDUCTEUR",
                  "CHEF_CHANTIER",
                  "COMPAGNON",
                  "SOUS_TRAITANT",
                  "COMPTABLE",
                ].includes(user.role)
              ) {
                return undefined
              }
              return () => {
                const editorDestinations: Record<string, string> = {
                  "Entreprises actives": "Entreprises",
                  "Revenu mensuel": "Abonnements",
                  "Tickets ouverts": "Support",
                  "Utilisateurs actifs": "Utilisateurs",
                }
                const enterpriseDestinations: Record<string, string> = {
                  "Chantiers actifs": "Chantiers",
                  "Tâches à traiter": "Mes tâches",
                  "Rapports à valider": "Rapports",
                  "Trésorerie nette": "Trésorerie",
                }
                const conductorDestinations: Record<string, string> = {
                  "Chantier affecté": "Chantiers",
                  "Tâches à suivre": "Mes tâches",
                  "Rapports à valider": "Rapports",
                  "Équipe du chantier": "Équipe",
                }
                const foremanDestinations: Record<string, string> = {
                  "Effectif affecté": "Équipe",
                  "Tâches à traiter": "Mes tâches",
                  "Photos du chantier": "Photos",
                  "Rapports en attente": "Rapports",
                }
                const companionDestinations: Record<string, string> = {
                  "Mes tâches": "Mes tâches",
                  "Tâches bloquées": "Mes tâches",
                  "Missions à réaliser": "Mes tâches",
                  "Blocages signalés": "Mes tâches",
                  "Mes photos": "Photos",
                  "Mes preuves": "Photos",
                  "Prochaine échéance": "Mes tâches",
                }
                const accountantDestinations: Record<string, string> = {
                  "Dossiers clients à suivre": "Dossiers de paiement",
                  "Factures approuvées à payer": "Factures fournisseurs",
                  "À encaisser": "Trésorerie",
                  "Trésorerie nette": "Trésorerie",
                }
                const destination =
                  user.role === "EDITOR"
                    ? editorDestinations[label]
                    : user.role === "ADMIN_ENTERPRISE"
                      ? enterpriseDestinations[label]
                      : user.role === "CONDUCTEUR"
                        ? conductorDestinations[label]
                        : user.role === "CHEF_CHANTIER"
                          ? foremanDestinations[label]
                          : user.role === "COMPTABLE"
                            ? accountantDestinations[label]
                            : companionDestinations[label]
                if (destination) onNavigate(destination)
              }
          })()}
        />
        ))}
      </section>
      {loading && (
        <p role="status">Chargement des indicateurs de votre espace…</p>
      )}
      {loadError && (
        <div className="auth-error" role="alert">
          {loadError}
        </div>
      )}
      <section className="role-actions" aria-label="Accès rapides autorisés">
        {(user.role === "ADMIN_ENTERPRISE"
          ? ["Chantiers", "Équipe", "Dossiers de paiement", "Paramètres"].filter(
              (section) => user.sections.includes(section),
            )
          : user.role === "CONDUCTEUR"
            ? ["Mes tâches", "Rapports", "Équipe", "Photos"].filter(
                (section) => user.sections.includes(section),
              )
            : user.role === "CHEF_CHANTIER"
              ? ["Chantiers", "Mes tâches", "Équipe", "Rapports", "Pointage", "Photos"].filter(
                  (section) => user.sections.includes(section),
                )
                : user.role === "COMPAGNON"
                  ? ["Mes tâches", "Pointage", "Photos"].filter(
                      (section) => user.sections.includes(section),
                    )
                  : user.role === "SOUS_TRAITANT"
                    ? ["Mes tâches", "Photos"].filter(
                        (section) => user.sections.includes(section),
                      )
                      : user.role === "COMPTABLE"
                        ? ["Dossiers de paiement", "Factures fournisseurs", "Trésorerie", "Rapports"].filter(
                            (section) => user.sections.includes(section),
                          )
            : user.sections
              .filter(
                (section) =>
                  !["Tableau de bord", "Profil", "Paramètres"].includes(section),
              )
              .slice(0, 4))
          .map((section) => (
            <button key={section} onClick={() => onNavigate(section)}>
              <span>
                <Icon name={sectionIcons[section]} />
              </span>
              <strong>{section}</strong>
              <small>
                {user.role === "MAITRE_OUVRAGE"
                  ? "Consulter"
                  : "Ouvrir mon espace"}
              </small>
              <Icon name="chevron" />
            </button>
          ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel__heading">
            <div>
              <h3>
                {user.role === "EDITOR"
                  ? "Pilotage de la plateforme"
                  : user.role === "COMPTABLE"
                    ? "Périmètre comptable"
                    : "Votre périmètre"}
              </h3>
              <p>Informations autorisées pour votre rôle</p>
            </div>
            <span className="count-pill">
              {user.role === "MAITRE_OUVRAGE" ? "RO" : "✓"}
            </span>
          </div>
          <div className="scope-card">
            <span>
              <Icon name={user.role === "EDITOR" ? "building" : "pin"} />
            </span>
            <div>
              <strong>
                {user.role === "EDITOR"
                  ? `${platformOverview?.tenantCount ?? 0} entreprises strictement isolées`
                  : (user.assignedSite ?? user.tenantName)}
              </strong>
              <p>
                {user.role === "EDITOR"
                  ? "Seuls les indicateurs de licence et de support sont agrégés."
                  : `Connecté comme ${user.roleLabel}. Les données hors de ce périmètre sont masquées.`}
              </p>
            </div>
          </div>
          <div className="scope-list">
            {user.sections
              .filter(
                (section) =>
                  !["Tableau de bord", "Profil", "Paramètres"].includes(
                    section,
                  ),
              )
              .slice(0, 4)
              .map((section) => (
                <div key={section}>
                  <Icon name={sectionIcons[section]} />
                  <span>
                    <strong>{section}</strong>
                    <small>Accès autorisé</small>
                  </span>
                  <Icon name="check" />
                </div>
              ))}
          </div>
        </section>
        {user.tenantId ? (
          <RecentActivityPanel user={user} />
        ) : user.role === "EDITOR" ? (
          <EditorRecentActivityPanel />
        ) : (
        <section className="panel">
          <div className="panel__heading">
            <div>
              <h3>Sécurité de l’espace</h3>
              <p>Contrôles actifs pour cette session</p>
            </div>
          </div>
          <div className="security-list">
            <div>
              <Icon name="lock" />
              <span>
                <strong>Tenant isolé</strong>
                <small>{user.tenantId ?? "Back-office éditeur séparé"}</small>
              </span>
            </div>
            <div>
              <Icon name="user" />
              <span>
                <strong>Rôle vérifié</strong>
                <small>{user.roleLabel}</small>
              </span>
            </div>
            <div>
              <Icon name="cloud" />
              <span>
                <strong>Session synchronisée</strong>
                <small>Vérifiée à chaque requête authentifiée</small>
              </span>
            </div>
          </div>
          {user.role === "MAITRE_OUVRAGE" && (
            <div className="readonly-notice">
              <Icon name="lock" />
              <span>
                <strong>Mode lecture seule</strong>
                <small>
                  Aucune donnée ne peut être créée, modifiée ou supprimée.
                </small>
              </span>
            </div>
          )}
        </section>
        )}
      </div>
    </div>
  )
}

function Dashboard({
  user,
  onLogout,
  onUserUpdate,
  installPrompt,
  onInstall,
}: {
  user: AuthUser
  onLogout: () => Promise<void>
  onUserUpdate: (user: AuthUser) => void
  installPrompt: InstallPromptEvent | null
  onInstall: () => Promise<void>
}) {
  const [active, setActive] = useState("Tableau de bord")
  const [dark, setDark] = useState(
    () => window.localStorage.getItem("cc-theme") === "dark",
  )
  const [mobileMenu, setMobileMenu] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [toast, setToast] = useState("")
  const [dataRevision, setDataRevision] = useState(0)
  const mainSections = user.sections.filter(
    (section) => !["Paramètres", "Profil"].includes(section),
  )
  const currentDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

  useEffect(() => {
    window.localStorage.setItem("cc-theme", dark ? "dark" : "light")
  }, [dark])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(""), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  function openAction(
    kind: ActionKind,
    title: string,
    id?: string,
    initialValues?: Record<string, string>,
  ) {
    setPendingAction({ kind, title, id, initialValues })
  }

  async function confirmAction(
    action: Exclude<PendingAction, null>,
    values: Record<string, string>,
  ) {
    if (action.kind === "site") {
      if (values.imageBase64 && values.removeSiteImage === "on") {
        throw new Error(
          "Choisissez soit une nouvelle image, soit la suppression de l’image actuelle.",
        )
      }
      let coverImage: {
        contentType: "image/jpeg" | "image/png" | "image/webp"
        imageBase64: string
      } | undefined
      if (values.imageBase64) {
        if (
          values.contentType !== "image/jpeg" &&
          values.contentType !== "image/png" &&
          values.contentType !== "image/webp"
        ) {
          throw new Error("Choisissez une image JPEG, PNG ou WebP.")
        }
        coverImage = {
          contentType: values.contentType,
          imageBase64: values.imageBase64,
        }
      }
      if (action.id) {
        await api.updateSite(action.id, {
          name: values["Nom du chantier"] ?? "",
          description: values["Description du projet"]?.trim() || null,
          location: values["Adresse / quartier"]?.trim() ?? "",
          city: values.Ville?.trim() || null,
          province: values.Province?.trim() || null,
          clientName: values["Maître d’ouvrage / client"]?.trim() || null,
          workType: values["Nature des travaux"]?.trim() || null,
          contractReference: values["Référence du marché"]?.trim() || null,
          status: (values.Statut ?? "En cours") as NonNullable<Site["status"]>,
          costBudgetFcfa: Number(values["Enveloppe de coûts prévue (FCFA)"] ?? 0),
          contractAmountFcfa: values["Montant contractuel facturé au client (FCFA)"]
            ? Number(values["Montant contractuel facturé au client (FCFA)"])
            : null,
          startDate: values["Date de début"] || null,
          endDate: values["Échéance prévisionnelle"] || null,
          plannedDurationDays: values["Délai prévu (jours)"]
            ? Number(values["Délai prévu (jours)"])
            : null,
        })
        if (coverImage) {
          await api.uploadSiteImage(action.id, coverImage)
        } else if (values.removeSiteImage === "on") {
          await api.deleteSiteImage(action.id)
        }
      } else {
        await api.createSite({
          name: values["Nom du chantier"] ?? "",
          description: values["Description du projet"]?.trim() || null,
          location: values["Adresse / quartier"]?.trim() ?? "",
          city: values.Ville?.trim() || null,
          province: values.Province?.trim() || null,
          clientName: values["Maître d’ouvrage / client"]?.trim() || null,
          workType: values["Nature des travaux"]?.trim() || null,
          contractReference: values["Référence du marché"]?.trim() || null,
          status: (values.Statut ?? "En cours") as NonNullable<Site["status"]>,
          costBudgetFcfa: Number(values["Enveloppe de coûts prévue (FCFA)"] ?? 0),
          contractAmountFcfa: values["Montant contractuel facturé au client (FCFA)"]
            ? Number(values["Montant contractuel facturé au client (FCFA)"])
            : null,
          startDate: values["Date de début"] || null,
          endDate: values["Échéance prévisionnelle"] || null,
          plannedDurationDays: values["Délai prévu (jours)"]
            ? Number(values["Délai prévu (jours)"])
            : null,
          coverImage,
        })
      }
      setDataRevision((revision) => revision + 1)
      setToast(action.id ? "Chantier mis à jour." : "Chantier créé.")
      return
    }
    if (action.kind === "supplierInvoice") {
      const amountFcfa = Number(values["Montant FCFA"])
      if (!Number.isSafeInteger(amountFcfa) || amountFcfa <= 0) {
        throw new Error("Le montant de la facture doit être un entier positif en FCFA.")
      }
      const input = {
        siteId: values.siteId ?? "",
        supplierName: values.Fournisseur ?? "",
        invoiceReference: values["Référence de facture"] ?? "",
        category: values["Poste de dépense"] ?? "",
        description: values.Description ?? "",
        amountFcfa,
        invoiceDate: values["Date de facture"] || null,
        dueDate: values["Date limite de paiement"] || null,
      }
      if (action.id) {
        await api.updateSupplierInvoice(action.id, input)
      } else {
        await api.createSupplierInvoice(input)
      }
      setDataRevision((revision) => revision + 1)
      setToast(action.id ? "Facture fournisseur modifiée." : "Facture fournisseur enregistrée.")
      return
    }
    if (action.kind === "paymentReceipt") {
      if (!action.id) throw new Error("Dossier à encaisser introuvable.")
      const updated = await api.updatePaymentDossierStatus(
        action.id,
        "Payé",
        values["Référence d’encaissement"],
      )
      if (updated.status !== "Payé") {
        throw new Error("L’encaissement n’a pas été confirmé par l’API.")
      }
      setDataRevision((revision) => revision + 1)
      setToast("Encaissement enregistré et ajouté à la trésorerie.")
      return
    }
    if (action.kind === "supplierInvoicePayment") {
      if (!action.id) throw new Error("Facture à régler introuvable.")
      await api.updateSupplierInvoiceStatus(
        action.id,
        "Payée",
        values["Référence du paiement"],
      )
      setDataRevision((revision) => revision + 1)
      setToast("Paiement fournisseur enregistré et dépense ajoutée à la trésorerie.")
      return
    }
    if (action.kind === "report") {
      const crewCount = Number(values["Effectif présent"])
      if (!Number.isInteger(crewCount) || crewCount < 0 || crewCount > 500) {
        throw new Error("L’effectif doit être un nombre entier entre 0 et 500.")
      }
      await api.createReport({
        siteId: values.siteId ?? "",
        workDone: values["Travaux réalisés"] ?? "",
        crewCount,
        ...(values["Date du rapport"]
          ? { reportDate: values["Date du rapport"] }
          : {}),
      })
      setDataRevision((revision) => revision + 1)
      setToast("Rapport journalier créé et envoyé pour validation.")
      return
    }
    if (action.kind === "member") {
      const selectedRole = managedRoles.find(
        (item) => item.value === values.role,
      )
      if (!selectedRole) {
        throw new Error("Sélectionnez un rôle valide.")
      }
      const assignedSiteId = values.assignedSiteId || null
      if (
        siteScopedRoles.includes(selectedRole.value) &&
        !assignedSiteId
      ) {
        throw new Error("Sélectionnez un chantier pour ce rôle.")
      }
      const member = await api.createTeamMember({
        fullName: values["Nom complet"] ?? "",
        email: values["Email professionnel"] ?? "",
        phone: values.Téléphone?.trim() || null,
        role: selectedRole.value,
        assignedSiteId,
        temporaryPassword: values["Mot de passe provisoire"] ?? "",
      })
      setDataRevision((revision) => revision + 1)
      setToast(
        `Compte de ${member.fullName} créé. Transmettez-lui son mot de passe provisoire de façon sécurisée.`,
      )
      return
    }
    if (action.kind === "task") {
      await api.createTask({
        siteId: values.siteId ?? "",
        title: values.Tâche ?? "",
        description: values.Description ?? "",
        category: values.Catégorie?.trim() || "Général",
        priority: (values.priority ?? "Normale") as Task["priority"],
        assignedTo: values.assignedTo || null,
        dueDate: values.Échéance || null,
      })
      setDataRevision((revision) => revision + 1)
      setToast("Tâche créée.")
      return
    }
    if (action.kind === "photo") {
      const contentType = values.contentType
      if (
        contentType !== "image/jpeg" &&
        contentType !== "image/png" &&
        contentType !== "image/webp"
      ) {
        throw new Error("Choisissez une photo JPEG, PNG ou WebP.")
      }
      await api.createPhoto({
        siteId: values.siteId ?? "",
        caption: values.Légende ?? "",
        contentType,
        imageBase64: values.imageBase64 ?? "",
        ...(values.latitude && values.longitude
          ? {
              latitude: Number(values.latitude),
              longitude: Number(values.longitude),
            }
          : {}),
      })
      setDataRevision((revision) => revision + 1)
      setToast("Photo ajoutée aux preuves du chantier.")
      return
    }
    if (action.kind === "budget" || action.kind === "treasury") {
      const amount = Number(
        action.kind === "budget"
          ? values["Montant engagé FCFA"]
          : values["Montant FCFA"],
      )
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error(
          "Le montant doit être un nombre entier positif en FCFA.",
        )
      }
      const entryType: FinanceEntry["entryType"] =
        action.kind === "budget"
          ? "engagement"
          : values.entryType === "depense"
            ? "depense"
            : "encaissement"
      const input = {
        entryType,
        siteId: values.siteId ?? "",
        category:
          action.kind === "budget"
            ? (values["Poste budgétaire"] ?? "")
            : values.entryType === "depense"
              ? "Dépense"
              : "Encaissement",
        description:
          action.kind === "budget"
            ? (values.Description ?? "")
            : (values.Description ?? ""),
        amountFcfa: amount,
        dueDate: action.kind === "treasury" ? values.Échéance || null : null,
      }
      if (action.id) {
        await api.updateFinanceEntry(action.id, input)
      } else {
        await api.createFinanceEntry(input)
      }
      setDataRevision((revision) => revision + 1)
      setToast(
        action.id
          ? "Prévision financière modifiée."
          : action.kind === "budget"
            ? "Engagement budgétaire enregistré."
            : "Opération de trésorerie enregistrée.",
      )
      return
    }
    if (action.kind === "payment") {
      const amount = Number(values["Montant FCFA"])
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error(
          "Le montant doit être un nombre entier positif en FCFA.",
        )
      }
      const input = {
        siteId: values.siteId ?? "",
        subject: values["Objet du dossier"] ?? "",
        amountFcfa: amount,
        dueDate: values["Date limite"] || null,
      }
      if (action.id) {
        await api.updatePaymentDossier(action.id, input)
      } else {
        await api.createPaymentDossier(input)
      }
      setDataRevision((revision) => revision + 1)
      setToast(action.id ? "Dossier de paiement modifié." : "Dossier de paiement créé.")
      return
    }
    if (action.kind === "tenant") {
      const tenant = await api.createPlatformTenant({
        name: values["Raison sociale"] ?? "",
        adminFullName: values["Nom de l’administrateur"] ?? "",
        adminEmail: values["Email administrateur"] ?? "",
        phone: values["Téléphone administrateur"] || null,
        temporaryPassword: values["Mot de passe provisoire"] ?? "",
        planId: values.planId ?? "",
        ...(action.id ? { registrationRequestId: action.id } : {}),
      })
      setDataRevision((revision) => revision + 1)
      setToast(
        `Entreprise ${tenant.name} créée en essai de 14 jours. Le compte administrateur ${values["Email administrateur"]} est prêt; remettez-lui le mot de passe provisoire par un canal sécurisé.`,
      )
      return
    }
    if (action.kind === "plan") {
      const monthlyPriceFcfa = Number(values["Tarif mensuel FCFA"])
      const maxUsers = values["Limite utilisateurs"]
        ? Number(values["Limite utilisateurs"])
        : null
      const maxSites = values["Limite chantiers"]
        ? Number(values["Limite chantiers"])
        : null
      const maxStorageMb = values["Limite stockage (Mo)"]
        ? Number(values["Limite stockage (Mo)"])
        : null
      if (
        !Number.isSafeInteger(monthlyPriceFcfa) ||
        monthlyPriceFcfa < 0 ||
        (maxUsers !== null &&
          (!Number.isSafeInteger(maxUsers) || maxUsers < 1)) ||
        (maxSites !== null && (!Number.isSafeInteger(maxSites) || maxSites < 1)) ||
        (maxStorageMb !== null &&
          (!Number.isSafeInteger(maxStorageMb) || maxStorageMb < 1))
      ) {
        throw new Error("Vérifiez le tarif et les limites du plan.")
      }
      await api.saveSubscriptionPlan(
        {
          name: values["Nom du plan"] ?? "",
          monthlyPriceFcfa,
          maxUsers,
          maxSites,
          maxStorageMb,
        },
        action.id,
      )
      setDataRevision((revision) => revision + 1)
      setToast("Plan d’abonnement enregistré.")
      return
    }
    if (action.kind === "ticket") {
      const priorities: SupportTicket["priority"][] = [
        "Basse",
        "Normale",
        "Haute",
        "Urgente",
      ]
      const priority =
        priorities.find((value) => value === values.priority) ?? "Normale"
      await api.createSupportTicket({
        tenantId: values.tenantId ?? "",
        subject: values.Objet ?? "",
        description: values.Description ?? "",
        priority,
      })
      setDataRevision((revision) => revision + 1)
      setToast("Ticket de support créé.")
      return
    }
    if (action.kind === "invoice") {
      if (action.id) {
        await api.updatePlatformInvoiceStatus(action.id, {
          status: "Payée",
          paymentMethod: values.paymentMethod as InvoicePaymentMethod,
          paymentReference: values["Référence d’encaissement"] || null,
        })
        setDataRevision((revision) => revision + 1)
        setToast("Encaissement enregistré. L’abonnement reste à activer séparément.")
        return
      }

      const amountFcfa = Number(values["Montant FCFA"])
      if (!Number.isSafeInteger(amountFcfa) || amountFcfa <= 0) {
        throw new Error("Le montant de la facture doit être un entier positif en FCFA.")
      }
      const invoice = await api.createPlatformInvoice({
        tenantId: values.tenantId ?? "",
        description: values.Description ?? "",
        amountFcfa,
        issuedAt: values["Date d’émission"] ?? "",
        dueAt: values.Échéance ?? "",
      })
      setDataRevision((revision) => revision + 1)
      setToast(`Facture ${invoice.invoiceNumber} émise pour ${invoice.tenantName}.`)
      return
    }
    throw new Error("Cette opération n’est pas prise en charge.")
  }

  function navigate(section: string) {
    if (!user.sections.includes(section)) return
    setActive(section)
    setMobileMenu(false)
  }

  return (
    <div
      className={`app-shell ${dark ? "dark" : ""} ${
        user.role === "EDITOR"
          ? "app-shell--editor"
          : `app-shell--workspace ${
              user.role === "ADMIN_ENTERPRISE"
                ? "app-shell--enterprise-admin"
                : ""
            }`
      }`}
    >
      <ActionDialog
        action={pendingAction}
        user={user}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          <span>{toast}</span>
          <button aria-label="Fermer" onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}
      {mobileMenu && (
        <button
          className="sidebar-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenu ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <Brand />
        </div>
        <div className="tenant">
          <span className="tenant__logo">
            {user.role === "EDITOR" ? "CC" : "OB"}
          </span>
          <div>
            <strong>{user.tenantName}</strong>
            <small>{user.tenantPlan}</small>
          </div>
          {user.role !== "EDITOR" && <Icon name="lock" size={16} />}
        </div>
        <nav className="sidebar__nav" aria-label="Navigation principale">
          <span className="nav-label">Menu principal</span>
          {mainSections.map((section) => (
            <button
              className={active === section ? "active" : ""}
              key={section}
              onClick={() => navigate(section)}
            >
              <Icon name={sectionIcons[section]} />
              <span>{section}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__footer">
          {user.sections.includes("Paramètres") && (
            <button
              onClick={() => {
                setActive("Paramètres")
                setMobileMenu(false)
              }}
            >
              <Icon name="settings" />
              <span>Paramètres</span>
            </button>
          )}
          {user.sections.includes("Profil") && (
            <button
              onClick={() => {
                setActive("Profil")
                setMobileMenu(false)
              }}
            >
              <Icon name="user" />
              <span>Mon profil</span>
            </button>
          )}
          <button
            onClick={() => {
              void onLogout().catch(() =>
                setToast(
                  "Déconnexion impossible. Vérifiez la connexion au serveur.",
                ),
              )
            }}
          >
            <Icon name="logout" />
            <span>Déconnexion</span>
          </button>
          <div className="profile-mini">
            <span className="user-avatar">
              <UserAvatar user={user} />
            </span>
            <div>
              <strong>{user.fullName}</strong>
              <small>{user.roleLabel}</small>
            </div>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileMenu(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="topbar__title">
            <h2>{active}</h2>
            <p>{currentDate}</p>
          </div>
          <div className="topbar__actions">
            {installPrompt && (
              <button
                className="install-app-button"
                type="button"
                onClick={() =>
                  void onInstall().catch((error: unknown) =>
                    setToast(
                      error instanceof Error
                        ? error.message
                        : "L’installation n’a pas pu être lancée.",
                    ),
                  )
                }
              >
                <Icon name="download" />
                <span>Installer l’application</span>
              </button>
            )}
            <div className="connection">
              <i /> Connecté <span>• Session authentifiée</span>
            </div>
            <button
              className="icon-button"
              aria-label="Changer de thème"
              onClick={() => setDark(!dark)}
            >
              <Icon name="moon" />
            </button>
            <span className="avatar user-avatar">
              <UserAvatar user={user} />
            </span>
          </div>
        </header>

        <main className="dashboard">
          {active === "Tableau de bord" ? (
            <RestrictedDashboard user={user} onNavigate={navigate} />
          ) : (
            <ModuleView
              active={active}
              user={user}
              openAction={openAction}
              notify={setToast}
              onProfileUpdate={onUserUpdate}
              dataRevision={dataRevision}
              onDataChange={() =>
                setDataRevision((revision) => revision + 1)
              }
            />
          )}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navigation mobile">
        {mainSections.slice(0, 3).map((section) => (
          <button
            className={active === section ? "active" : ""}
            key={section}
            onClick={() => setActive(section)}
          >
            <Icon name={sectionIcons[section]} />
            <span>{section === "Tableau de bord" ? "Accueil" : section}</span>
          </button>
        ))}
        <button
          onClick={() =>
            setActive(
              user.sections.includes("Profil") ? "Profil" : "Tableau de bord",
            )
          }
        >
          <Icon name="user" />
          <span>Profil</span>
        </button>
      </nav>
      {user.capabilities.includes("capture_photos") && (
        <button
          className="photo-fab"
          aria-label="Prendre une photo"
          onClick={() => openAction("photo", "Ajouter une preuve photo")}
        >
          <Icon name="camera" size={26} />
        </button>
      )}
    </div>
  )
}

export default function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(
    null,
  )
  const [authResolved, setAuthResolved] = useState(false)
  const [authError, setAuthError] = useState("")
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("L’enregistrement de l’application hors ligne a échoué.", error)
    })
  }, [])

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const handleInstalled = () => setInstallPrompt(null)
    window.addEventListener("beforeinstallprompt", handleInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  useEffect(() => {
    let syncRequest = 0
    const syncSession = () => {
      const requestId = ++syncRequest
      api
        .currentUser()
        .then((user) => {
          if (requestId !== syncRequest) return
          setAuthenticatedUser(user)
          setAuthError("")
        })
        .catch(() => {
          if (requestId !== syncRequest) return
          setAuthError(
            "La vérification de votre session a échoué. Réessayez dans quelques instants.",
          )
        })
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "cc-session-change") syncSession()
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  useEffect(() => {
    let active = true
    api
      .currentUser()
      .then((user) => {
        if (active) {
          setAuthenticatedUser(user)
          setAuthError("")
        }
      })
      .catch(() => {
        if (active) {
          setAuthError(
            "La vérification de votre session a échoué. Réessayez dans quelques instants.",
          )
        }
      })
      .finally(() => {
        if (active) setAuthResolved(true)
      })
    return () => {
      active = false
    }
  }, [])

  async function login(user: AuthUser) {
    setAuthenticatedUser(user)
    setAuthError("")
    window.localStorage.setItem("cc-session-change", crypto.randomUUID())
  }

  async function logout() {
    await api.logout()
    setAuthenticatedUser(null)
    window.localStorage.setItem("cc-session-change", crypto.randomUUID())
  }

  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  if (!authResolved) {
    return (
      <main className="auth-checking" role="status">
        Vérification de la session…
      </main>
    )
  }

  if (authenticatedUser) {
    return (
    <Dashboard
      key={authenticatedUser.id}
      user={authenticatedUser}
      onLogout={logout}
      onUserUpdate={setAuthenticatedUser}
      installPrompt={installPrompt}
      onInstall={installApp}
    />
    )
  }

  if (window.location.pathname === "/inscription") {
    return <RegistrationPage />
  }

  if (window.location.pathname === "/reinitialiser-mot-de-passe") {
    return <PasswordResetPage />
  }

  if (window.location.pathname === "/connexion") {
    return <StandaloneLogin onLogin={login} initialError={authError} />
  }

  return <LandingPage />
}
