# Lancement commercial Chantier Connect

## Formules de lancement

Prix mensuels indicatifs en FCFA, à inscrire au devis et au contrat. Les capacités reprennent les limites actuellement configurées dans les plans.

| Formule | Prix mensuel | Limites | Pour qui |
| --- | ---: | --- | --- |
| Découverte | 25 000 FCFA | 5 utilisateurs, 2 chantiers | Petite équipe qui veut centraliser les preuves et le suivi |
| PME | 75 000 FCFA | 30 utilisateurs, 10 chantiers | Entreprise avec plusieurs équipes et un suivi financier |
| Entreprise | 150 000 FCFA | 100 utilisateurs, 100 chantiers | Organisation multi-sites nécessitant un déploiement accompagné |

Pour cette version, factures et règlements sont gérés manuellement. Le paiement Mobile Money automatisé n’est pas disponible; les routes préparatoires ne constituent pas un moyen d’encaissement. Le prix final, les taxes applicables, les limites et les conditions de résiliation doivent apparaître dans le contrat signé.

## Checklist avant production

- Déployer sur un domaine contrôlé avec HTTPS et une configuration `production` dédiée.
- Utiliser une base PostgreSQL de production distincte; appliquer les migrations, sans exécuter le seed de démonstration.
- Vérifier les secrets de production, la politique de cookies sécurisés, le proxy de confiance et les règles réseau PostgreSQL.
- Configurer `MFA_ENCRYPTION_KEY` comme secret Base64 de 32 octets avant la migration 016; la sauvegarder avec les autres secrets, et enrôler tous les comptes Éditeur avec une application TOTP.
- Créer et tester un second compte Éditeur, conserver ses codes de secours dans un emplacement séparé et vérifier la procédure de récupération via email avant le lancement.
- Appliquer toutes les migrations, y compris `016_editor_mfa.sql`, dans la base de préproduction avant de déployer la version API correspondante.
- Mettre en place des sauvegardes chiffrées et réaliser un exercice documenté de restauration.
- Surveiller le health check, les erreurs API, l’espace disque et les connexions PostgreSQL; définir un responsable d’astreinte.
- Tester les parcours d’accès et l’isolation des tenants avec au moins deux entreprises et chaque rôle.
- Tester la récupération de compte, la désactivation d’un utilisateur, l’expiration d’un abonnement et la restauration de session.
- Tester la connexion Éditeur avec TOTP, l’usage unique d’un code de secours, son rejet après usage, et la récupération MFA par réinitialisation email.
- Vérifier les mentions légales et fiscales des factures avec un conseil local; la sortie imprimée de l’application ne remplace pas cette validation.
- Formaliser le contrat, les conditions de service, la politique de confidentialité, la conservation des données et la procédure de support.
- Effectuer un pilote limité avec des données non critiques avant l’ouverture commerciale générale.

Le mode de commercialisation retenu pour le lancement est **vente assistée avec règlement manuel** : devis/contrat, création du tenant et facture, puis confirmation du règlement et de l’échéance depuis le back-office Éditeur. Ce lancement ne comprend ni achat autonome ni encaissement Mobile Money automatisé.

## Onboarding client

1. Qualifier l’entreprise, ses chantiers, ses rôles, son nombre d’utilisateurs et ses besoins de preuve/finance.
2. Valider l’offre et signer les conditions; créer le tenant, l’administrateur et la première facture avec son échéance.
3. Avec l’administrateur, créer les chantiers, affecter les rôles, inviter l’équipe et régler les limites du plan.
4. Réaliser une séance de prise en main courte par parcours : pilotage, terrain, rapports et finance.
5. Tester les accès avec un utilisateur terrain et un comptable; vérifier les données visibles, une photo, un rapport et un encaissement manuel.
6. Confirmer la réception, mettre à jour manuellement la facture et l’échéance d’abonnement, puis faire un point après la première semaine et le premier mois.

Ne pas présenter comme acquis un paiement mobile automatisé, une disponibilité garantie ou une conformité fiscale sans validation et contractualisation explicites.
