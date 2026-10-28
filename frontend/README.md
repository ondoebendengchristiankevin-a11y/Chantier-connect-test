# Chantier Connect — Frontend

Application React/Vite et Cloudflare Worker. Le Worker sert les fichiers statiques et relaie les routes `/api/*` vers le backend Node configuré par `API_ORIGIN`. Aucune URL de base de données ou clé JWT ne doit être définie dans ce projet.

## Cloudflare

1. Déployez d’abord le projet backend Node, configurez ses secrets Supabase, puis vérifiez `https://<backend>/api/health` ; le résultat attendu est `{"status":"ok","database":"connected"}`.
2. `API_ORIGIN` est définie dans `wrangler.jsonc` sur `https://chantier-connect-backend.onrender.com`. Si l’URL du backend change, modifiez cette valeur et redéployez. Elle peut aussi être définie dans le tableau de bord Cloudflare ; le déploiement utilise `--keep-vars` pour conserver les variables runtime gérées dans le dashboard.
3. Pour les déploiements Workers Builds reliés à GitHub, configurez le répertoire racine sur `/frontend`, la commande de build sur `pnpm run build` et la commande de déploiement sur `pnpm run deploy:built`. Cette dernière utilise la version Wrangler épinglée dans ce projet et le fichier de configuration de sortie généré par Vite. Évitez `pnpm dlx wrangler deploy`, qui télécharge une version différente au lieu d’utiliser celle du projet.
4. En local, construisez avec `npm run build` puis déployez avec `npm run deploy`.
5. Vérifiez `https://<frontend>/api/health`. La réponse provient du backend et doit confirmer `database: connected`.

Ne définissez pas `DATABASE_URL` ou `JWT_SECRET` dans Cloudflare : ces secrets appartiennent uniquement au service backend. Supprimez aussi de Cloudflare les anciens secrets backend inutilisés. `API_ORIGIN` n’est pas un secret.

## Application installable (PWA)

L’application fournit un manifeste Web, les icônes Android/iOS et un service
worker qui met en cache la coque de l’application pour son ouverture hors
connexion. Les requêtes `/api/*` ne sont jamais mises en cache : connexion,
données et actions métier nécessitent toujours le backend et une connexion
réseau. Sur les navigateurs compatibles, le bouton **Installer l’application**
apparaît dans l’espace connecté; sur iOS, utiliser **Partager > Sur l’écran
d’accueil**.

## Développement

```powershell
npm install
npm run dev
```

Vite sert l’interface sur `http://localhost:8443` et relaie `/api/*` vers `http://127.0.0.1:3001`. Démarrez le backend dans un autre terminal. Pour une API locale différente, définissez `VITE_API_ORIGIN` dans `.env`.

`npm run typecheck` vérifie les types de l’interface et du Worker. Il révèle actuellement des erreurs TypeScript préexistantes dans `src/App.tsx`; le build de production Vite reste indépendant de ce contrôle.

## Dépôt GitHub indépendant

Créez un dépôt GitHub pour le frontend, puis lancez les commandes depuis ce dossier en remplaçant `<URL_DU_DEPOT_FRONTEND>` :

```powershell
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin <URL_DU_DEPOT_FRONTEND>
git push -u origin main
```
