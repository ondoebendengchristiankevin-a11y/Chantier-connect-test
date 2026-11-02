# Tests et audits

Ce dossier regroupe les contrôles automatisés du projet et les comptes rendus d’état associés.

## Contenu

- [`tests/check-roles.mjs`](./tests/check-roles.mjs) : smoke test des autorisations, des chantiers visibles et, avec un second compte, du cloisonnement entre deux entreprises. La recette Éditeur utilise `CHECK_ROLES_EDITOR_TOTP_SECRET`; l’enrôlement initial est possible uniquement sur une cible locale avec l’opt-in documenté ci-dessous.
- [`tests/check-tenant-isolation.mjs`](./tests/check-tenant-isolation.mjs) : crée une base PostgreSQL locale temporaire, exécute toutes les migrations et vérifie les lectures et écritures entre deux tenants isolés, l’enrôlement MFA Éditeur, les codes de secours, les audits et les seuils de licences; la base temporaire est supprimée à la fin.
- [`tests/check-production-config.mjs`](./tests/check-production-config.mjs) : vérifie que la configuration backend refuse une production sans TLS PostgreSQL, sans clé JWT suffisamment robuste ou sans clé de chiffrement MFA.
- [`audits/etat-pilote-2026-10-18.md`](./audits/etat-pilote-2026-10-18.md) : résultats vérifiés et points restant à valider avant la production.

## Lancer le contrôle des rôles

Depuis la racine du projet, après avoir démarré l’API et préparé une base locale avec les comptes de démonstration :

```powershell
pnpm check:roles
```

Pour exercer également le contrôle entre deux entreprises, fournir localement les variables `CHECK_ROLES_SECOND_TENANT_EMAIL` et `CHECK_ROLES_SECOND_TENANT_PASSWORD` correspondant à un administrateur d’un second tenant de recette. Le test de création utilise volontairement un chantier étranger et doit être rejeté.

Le script limite ses requêtes à une API HTTP sur la machine locale. Il ne migre, ne réinitialise et ne peuple aucune base de données.

Pour une vraie préproduction, définir `CHECK_ROLES_BASE_URL` avec l’origine HTTPS de l’API, `CHECK_ROLES_ALLOW_REMOTE=true`, `CHECK_ROLES_USERS_JSON` avec les huit comptes de recette dédiés (leurs rôles et sites attendus) ainsi que les variables du compte administrateur du second tenant. Utiliser des mots de passe de recette temporaires, réservés à l’environnement et ne pas partager leurs valeurs. La cible distante est bloquée sans HTTPS, opt-in explicite et second tenant.

Le compte Éditeur doit avoir terminé son enrôlement MFA à `/connexion`. Fournir sa clé TOTP de recette via `CHECK_ROLES_EDITOR_TOTP_SECRET` dans l’environnement local seulement. Pour initialiser une fois un compte Éditeur de démonstration local, définir `CHECK_ROLES_AUTO_ENROLL_EDITOR_MFA=true` avant `pnpm check:roles`; cette option est refusée pour toute cible distante et conserve la clé générée dans le `.env` racine ignoré par Git afin que les exécutions suivantes puissent vérifier le TOTP. Ne jamais utiliser cette option sur un compte de production ni partager la clé.

Pour simuler l’isolation sans toucher à la base actuellement configurée dans `.env`, après le build et avec un PostgreSQL local autorisant `CREATE DATABASE` et `DROP DATABASE` :

```powershell
pnpm check:tenant-isolation
```

La commande ne peut s’exécuter que si `DATABASE_URL` cible `localhost`, `127.0.0.1` ou `::1` et si `NODE_ENV` n’est pas `production`. Elle crée et supprime une base au nom aléatoire préfixé `cc_isolation_test_`; la simulation ne vaut pas recette en préproduction.

Après `pnpm build`, vérifier les garde-fous de configuration de production avec :

```powershell
pnpm check:production-config
```

## Limites

Ce dossier ne contient pas de suite de tests unitaires ou d’intégration exhaustive. Les contrôles documentés ne constituent ni une certification de sécurité, ni une validation fiscale, ni une recette de préproduction.
