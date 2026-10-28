# Chantier Connect

Plateforme BTP avec espaces séparés par entreprise et par rôle. Le code est organisé en deux projets autonomes : [frontend/](frontend/) (React/Vite/Cloudflare) et [backend/](backend/) (Node/Express/PostgreSQL/Supabase). Chaque dossier contient son propre `package.json` et README pour être publié dans un dépôt GitHub distinct.

## Développement local

Configurez `backend/.env` à partir de [backend/.env.example](backend/.env.example), puis lancez chaque projet dans son propre terminal :

```powershell
cd backend
npm install
npm run migrate
npm run dev
```

```powershell
cd frontend
npm install
npm run dev
```

Vite sert l’interface sur le port 8443 et relaie `/api/*` vers `http://127.0.0.1:3001`. Ne lancez jamais le seed de démonstration en production.

## Déploiement

1. Déployez [backend/](backend/) sur un hébergeur Node avec `npm install`, `npm run build` et `npm start`. Configurez les variables runtime `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET` (au moins 64 caractères aléatoires), `MFA_ENCRYPTION_KEY` (clé Base64 aléatoire de 32 octets), `RESEND_API_KEY`, `EMAIL_FROM`, `APP_ORIGIN` (origine HTTPS publique du frontend) et `NODE_ENV=production`. Utilisez l’URL PostgreSQL Supabase, de préférence son pooler en mode session, port 5432. Appliquez les migrations de `backend/migrations/` après vérification sur une base de recette. Le health check du backend est `/api/health`.
2. Déployez [frontend/](frontend/) sur Cloudflare Workers. `API_ORIGIN` est définie dans `frontend/wrangler.jsonc` avec l’origine HTTPS Render. Si elle change, mettez à jour cette valeur avant le déploiement. Le Worker sert les fichiers frontend et relaie `/api/*` au backend Node; il ne se connecte jamais directement à PostgreSQL.
3. Vérifiez `https://<backend>/api/health` puis `https://<frontend>/api/health`. Les deux doivent retourner `{"status":"ok","database":"connected"}`.

Le frontend est installable comme PWA. Sa coque peut s’ouvrir hors connexion,
mais les opérations métier et les données nécessitent le backend en ligne.
L’administrateur entreprise peut ajouter une image de couverture à chaque
chantier; elle est privée au tenant et incluse dans son quota de stockage.

`DATABASE_URL` et `JWT_SECRET` ne doivent être configurés que sur le backend. Après le basculement, supprimez les anciens secrets backend du Worker Cloudflare. `API_ORIGIN` n’est pas secret. Le proxy conserve le chemin, la query string et les cookies afin que les sessions restent same-site depuis le domaine Cloudflare.

## Dépôts GitHub séparés

Créez les dépôts backend et frontend, puis exécutez les commandes Git à partir du dossier concerné. Pour le backend, les commandes fournies dans `backend/README.md` supposent que le répertoire courant est `backend/`. Pour le frontend, définissez `frontend/` comme racine du dépôt. Ne poussez jamais `.env`.

## Fonctionnalités et validation

L’application comprend la connexion par email/téléphone, le contrôle de rôles et la séparation des données par entreprise, des espaces terrain/pilotage/finance/back-office éditeur, ainsi que la gestion d’abonnements et de factures manuelles. Les paiements Mobile Money ne sont pas activés dans cette version.

Le [Guide d’entreprise](GUIDE-ENTREPRISE.md) décrit les rôles client, leurs espaces, leurs responsabilités et le flux recommandé entre chantier, rapports et comptabilité.

**État au 28 octobre 2026 : MVP utilisable en pilote accompagné; production commerciale générale non validée.** Build backend/frontend, vérification des types du frontend/Worker, contrôle des prérequis de production et simulation isolée locale des rôles, MFA, audits, quotas et migrations réussis. L’API locale et le frontend ont répondu en HTTP 200 après application des 16 migrations. Le smoke test des comptes de démonstration n’a pas pu valider les mots de passe existants; l’Éditeur doit encore terminer son enrôlement MFA. La configuration réelle des emails et la recette de préproduction ne sont pas validées. Le [compte rendu historique du pilote](tests-audits/audits/etat-pilote-2026-10-18.md) décrit les résultats obtenus le 18 octobre.
