Roadmap Kiosque : Borne Self-Service (Optionnel)
Ce module est une version ultra-simplifiée de l'application, conçue pour tourner en boucle sur un iPad à l'entrée.

Objectif Business : Capturer le flux de passage ("Walk-ins") sans mobiliser de staff.

🏗️ Phase 1 : Routing & Sécurité (Kiosk Mode)
Objectif : Créer un espace étanche. Le client ne doit pas pouvoir accéder à l'admin ou sortir du tunnel.

1. Nouvelle Route "Public Kiosk"
Route : app/kiosk/page.tsx

Layout spécifique : app/kiosk/layout.tsx (Pas de Header, pas de Footer, juste un bouton "Abandonner/Retour Accueil").

Protection : Pas d'authentification requise, mais peut-être un paramètre d'URL secret pour l'activer (ex: ?mode=kiosk&token=SECRET).

2. Gestion de Session (Auto-Reset)
Si un client part au milieu, la borne doit se réinitialiser.

Composant : components/kiosk/InactivityTimer.tsx

Logique :

Timer de 60s.

Reset à chaque clic/touch.

Si 0 : Redirection vers app/kiosk (Écran d'accueil).

🎨 Phase 2 : UX "Express" (Tunnel 3 clics)
Objectif : Aller à l'essentiel. Pas de choix complexe.

1. Écran d'Accueil (Attract Loop)
Contenu : Vidéo de fond ou belle photo.

Gros Bouton : "🛶 LOUER UNE BARQUE MAINTENANT".

2. Sélection Simplifiée
Logique :

Ne propose que le prochain créneau disponible (ou les 2 suivants).

Pas de calendrier complexe.

Sélecteur simple : "Combien de personnes ?" [ 1 ] [ 2 ] [ 3 ] ...

3. Formulaire Minimaliste
Champs :

Nom (Pour l'appel au micro/ponton).

Email (Pour envoyer le ticket).

Pas de téléphone, pas d'adresse.

💳 Phase 3 : Paiement "No-Hardware"
Objectif : Payer sans TPE physique externe.

1. Intégration Apple Pay / Google Pay (Priorité)
Puisque le client est sur un iPad (Web), on utilise le Payment Request Button de Stripe.

Tech : Réutiliser components/StripeWalletButton.tsx.

Expérience : Le client clique sur "Payer", valide avec son téléphone/montre s'il a configuré son wallet.

2. Fallback "Scan to Pay" (Si pas de wallet)
Si le client n'a pas Apple Pay configuré, on ne veut pas qu'il tape sa CB sur un clavier public (long et pénible).

Solution : Afficher un QR Code dynamique.

Logique :

Générer un lien de paiement Stripe Checkout unique.

Afficher le QR Code à l'écran : "Scannez pour payer sur votre téléphone".

La borne écoute le webhook (Polling ou WebSocket) : dès que le paiement est validé sur le téléphone du client, la borne affiche "Succès !".

📩 Phase 4 : Ticket & Embarquement
Objectif : Délivrer le sésame sans imprimante.

1. Écran de Succès
Message : "C'est tout bon !".

Info : "Présentez-vous au ponton. Numéro de commande : #AB12".

Gros Timer : "Retour à l'accueil dans 10s".

2. Email Instantané
Utiliser l'API d'envoi existante pour envoyer le récapitulatif immédiatement (avec lien d'annulation).

✅ Checklist Technique
[ ] Route : /kiosk créée avec layout dédié.

[ ] Timer : La borne revient à l'accueil si personne ne touche l'écran pendant 60s.

[ ] Paiement : Testé avec Apple Pay (Web) et Google Pay.

[ ] QR Code : (Optionnel) Système de paiement déporté fonctionnel.

[ ] Matériel : iPad configuré en "Accès Guidé" (Guided Access) pour empêcher de quitter le navigateur.