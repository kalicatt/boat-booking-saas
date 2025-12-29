# Email – Inbox unifiée (Option B) + formulaires

## Objectif
- Lire plusieurs boîtes mail (ex: `contact@`, `facturation@`) dans une **inbox unifiée**.
- Boîte principale : `reservations@`.
- Assurer que le **formulaire “groupe”** arrive sur `reservations@`.

## Option B (recommandée) : client mail + inbox unifiée
### 1) Ajouter les boîtes en IMAP
- Utiliser Thunderbird / Outlook / client iOS/Android.
- Ajouter chaque boîte OVH/Zimbra en **IMAP** (SSL/TLS).
- Récupérer les paramètres exacts (serveurs/ports) depuis l’espace OVH (Zimbra).

### 2) Activer l’inbox unifiée
- **Thunderbird** : activer les “Dossiers unifiés / Unified Folders” (ou équivalent selon version).
- **Mobile (iOS/Android)** : beaucoup d’apps ont une vue “Tous les comptes / All inboxes”.

### 3) Bonnes pratiques
- Activer **MFA** si disponible.
- Définir une “identité d’envoi” par boîte (répondre en `contact@` ou `facturation@` selon le cas).

## Formulaire “Groupe” (site) : où arrivent les messages
- Le formulaire groupe appelle l’API : `POST /api/contact/group`.
- Côté backend, le destinataire est :
  - `GROUP_CONTACT_EMAIL` si défini
  - sinon `ADMIN_EMAIL` si défini
  - sinon par défaut `reservations@` (via `EMAIL_ROLES.reservations`)

### Variables d’environnement à poser
- `GROUP_CONTACT_EMAIL=reservations@sweet-narcisse.fr`
- (optionnel) `ADMIN_EMAIL=reservations@sweet-narcisse.fr`

Fichiers concernés :
- app/api/contact/group/route.ts
- docker-compose.yml

## Sécurité (rappel)
- Ne jamais stocker mots de passe / tokens / clés API dans le repo.
- En cas d’exposition (même accidentelle) : **révoquer/rotater** les secrets concernés (GitHub tokens, SMTP/boîtes mail, Resend, Stripe, accès VPS, etc.).
