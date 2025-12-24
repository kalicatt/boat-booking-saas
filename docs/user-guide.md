# 📘 Guide Utilisateur – Sweet Narcisse

Manuel complet pour les administrateurs, employés et opérateurs de la plateforme de réservation Sweet Narcisse.

---

## 📋 Table des Matières

- [Premiers Pas](#-premiers-pas)
- [Interface Client](#-interface-client-site-web)
- [Back-Office Administrateur](#-back-office-administrateur)
- [Application Mobile](#-application-mobile-employés)
- [Gestion des Réservations](#-gestion-des-réservations)
- [Paiements](#-paiements)
- [Gestion de Flotte](#-gestion-de-flotte)
- [Employés et Permissions](#-employés-et-permissions)
- [Statistiques et Rapports](#-statistiques-et-rapports)
- [FAQ et Dépannage](#-faq-et-dépannage)

---

## 🚀 Premiers Pas

### Accès à la Plateforme

| Interface | URL | Usage |
|-----------|-----|-------|
| **Site Client** | `https://sweet-narcisse.fr` | Réservations en ligne |
| **Back-Office** | `https://sweet-narcisse.fr/admin` | Administration |
| **App Mobile** | Google Play Store | Embarquements |

### Navigateurs Supportés

- ✅ Google Chrome (recommandé)
- ✅ Mozilla Firefox
- ✅ Safari
- ✅ Microsoft Edge

### Connexion au Back-Office

1. Accédez à `/admin`
2. Entrez votre **email** et **mot de passe**
3. Cliquez sur **Se connecter**

> 💡 **Conseil** : En cas d'oubli de mot de passe, contactez votre administrateur.

---

## 🌐 Interface Client (Site Web)

### Page d'Accueil

La page d'accueil présente :

- **Carrousel Hero** : Images principales de la Petite Venise
- **Widget de Réservation** : Formulaire de réservation rapide
- **Informations Pratiques** : Horaires, tarifs, localisation
- **Météo** : Conditions météo actuelles et prévisions
- **Avis Clients** : Témoignages TripAdvisor

### Processus de Réservation (Client)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Étape 1    │ -> │  Étape 2    │ -> │  Étape 3    │ -> │  Étape 4    │
│  Date &     │    │  Créneau    │    │ Coordonnées │    │  Paiement   │
│  Passagers  │    │  Horaire    │    │   Client    │    │  Sécurisé   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

#### Étape 1 : Sélection Date & Passagers

- Choisir la **date** de la promenade
- Indiquer le nombre de :
  - 👨 Adultes
  - 👦 Enfants (3-12 ans)
  - 👶 Bébés (0-2 ans, gratuit)

#### Étape 2 : Choix du Créneau

- Les créneaux disponibles s'affichent en vert
- Les créneaux complets sont grisés
- Durée standard : **30 minutes**

#### Étape 3 : Coordonnées

Renseigner :
- Prénom et nom
- Adresse email (confirmation envoyée)
- Numéro de téléphone
- Valider le captcha reCAPTCHA

#### Étape 4 : Paiement

Moyens de paiement acceptés :
- 💳 Carte bancaire (Visa, Mastercard, Amex)
- 🍎 Apple Pay
- 📱 Google Pay
- 🅿️ PayPal

### Confirmation de Réservation

Après paiement, le client reçoit :

1. **Page de confirmation** avec récapitulatif
2. **Email de confirmation** contenant :
   - Référence de réservation
   - QR code pour l'embarquement
   - Détails de la réservation
   - Lien d'annulation

---

## 🔧 Back-Office Administrateur

### Tableau de Bord

Le dashboard affiche en temps réel :

| Élément | Description |
|---------|-------------|
| **Réservations du jour** | Nombre et statut |
| **Chiffre d'affaires** | CA journalier |
| **Météo** | Conditions actuelles + alertes |
| **Flotte** | État des barques |
| **Actions rapides** | Liens vers fonctions courantes |

### Navigation

```
📊 Tableau de bord
├── 📅 Planning
├── 📋 Réservations
├── ⛵ Flotte
├── 👥 Employés
├── 💰 Comptabilité
├── 📈 Statistiques
├── 📝 CMS (Contenu)
└── ⚙️ Paramètres
```

### Barre de Recherche

Recherche rapide par :
- Référence de réservation (ex: `SN-ABC123`)
- Email client
- Numéro de téléphone
- Nom du client

---

## 📱 Application Mobile (Employés)

### Installation

1. Télécharger **Sweet Narcisse** sur Google Play Store
2. Ouvrir l'application
3. Se connecter avec les identifiants employé

### Écran Principal

```
┌────────────────────────────────────────┐
│  🚣 Sweet Narcisse                     │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │     📊 Statistiques du jour      │  │
│  │     Embarquements: 24/30         │  │
│  │     CA: 480€                     │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────┐  ┌──────────────┐   │
│  │   📷 Scan    │  │  📋 Liste    │   │
│  │     QR       │  │ Réservations │   │
│  └──────────────┘  └──────────────┘   │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │      💳 Encaissement             │  │
│  │         Tap to Pay               │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### Scan QR - Embarquement

1. Appuyer sur **Scan QR**
2. Scanner le QR code du client
3. Vérifier les informations affichées :
   - Nom du client
   - Nombre de passagers
   - Statut de paiement
4. Confirmer l'embarquement

### Tap to Pay - Encaissement

Pour les paiements sur place :

1. Appuyer sur **Tap to Pay**
2. Entrer le montant
3. Demander au client de présenter sa carte
4. Attendre la confirmation

> ⚠️ **Important** : Le téléphone doit avoir le NFC activé.

---

## 📅 Gestion des Réservations

### Planning Interactif

Le planning affiche toutes les réservations sur une grille horaire.

#### Code Couleur des Statuts

| Couleur | Statut | Description |
|---------|--------|-------------|
| 🟡 Jaune | `PENDING` | En attente de paiement |
| 🟢 Vert | `CONFIRMED` | Payée et confirmée |
| 🔵 Bleu | `EMBARQUED` | Client embarqué |
| ⚫ Gris | `CANCELLED` | Annulée |
| 🔴 Rouge | `NO_SHOW` | Client absent |

#### Actions sur une Réservation

Cliquer sur une réservation pour :

- 👁️ **Voir les détails**
- ✏️ **Modifier** (date, heure, passagers)
- 📧 **Renvoyer la confirmation**
- 💰 **Ajouter un paiement manuel**
- ❌ **Annuler** (avec remboursement automatique)

### Créer une Réservation Manuelle

1. Cliquer sur **+ Nouvelle réservation**
2. Sélectionner date et créneau
3. Renseigner les coordonnées client
4. Choisir le mode de paiement :
   - Paiement immédiat (CB/PayPal)
   - Paiement différé (espèces/virement)
5. Valider

### Modifier une Réservation

1. Ouvrir la réservation
2. Cliquer sur **Modifier**
3. Changer les informations souhaitées
4. Sauvegarder

> ⚠️ Un email de modification est automatiquement envoyé au client.

### Annuler une Réservation

1. Ouvrir la réservation
2. Cliquer sur **Annuler**
3. Choisir le type d'annulation :
   - **À la demande du client** : Remboursement selon CGV
   - **Annulation opérationnelle** : Remboursement intégral
4. Confirmer

---

## 💰 Paiements

### Moyens de Paiement Acceptés

| Mode | En ligne | Sur place |
|------|----------|-----------|
| Carte bancaire | ✅ | ✅ (Tap to Pay) |
| Apple Pay | ✅ | ✅ |
| Google Pay | ✅ | ✅ |
| PayPal | ✅ | ❌ |
| Espèces | ❌ | ✅ |
| Virement | ❌ | ✅ |

### Paiements Manuels

Pour les paiements hors ligne (espèces, virement) :

1. Ouvrir la réservation
2. Cliquer sur **Ajouter paiement manuel**
3. Sélectionner le type :
   - 💵 Espèces
   - 🏦 Virement bancaire
   - 🔄 Autre
4. Entrer le montant
5. Ajouter une note si nécessaire
6. Valider

### Remboursements

Les remboursements sont automatiques pour :
- Cartes bancaires → Via Stripe (3-5 jours)
- PayPal → Via PayPal (immédiat)

Pour les paiements manuels, effectuer le remboursement manuellement et noter dans le système.

### Comptabilité

L'onglet **Comptabilité** permet :

- 📊 Visualiser le CA par jour/semaine/mois
- 📥 Exporter en CSV pour le comptable
- 🔍 Rapprochement bancaire
- 📋 Registre des paiements manuels

---

## ⛵ Gestion de Flotte

### Liste des Barques

Chaque barque affiche :
- Nom
- Capacité maximale
- Statut (disponible/maintenance/hors service)
- Date dernière maintenance

### États d'une Barque

| Statut | Icône | Description |
|--------|-------|-------------|
| Disponible | 🟢 | Prête à naviguer |
| En maintenance | 🟠 | Temporairement indisponible |
| Hors service | 🔴 | Réparation nécessaire |

### Signaler une Maintenance

1. Aller dans **Flotte**
2. Sélectionner la barque
3. Cliquer sur **Signaler maintenance**
4. Décrire le problème
5. La barque est automatiquement retirée du planning

---

## 👥 Employés et Permissions

### Rôles Disponibles

| Rôle | Permissions |
|------|-------------|
| **SUPERADMIN** | Accès total, gestion des admins |
| **ADMIN** | Gestion employés, réservations, flotte |
| **EMPLOYEE** | Embarquements, scan QR, encaissement |

### Créer un Employé

1. Aller dans **Employés**
2. Cliquer sur **+ Ajouter**
3. Renseigner :
   - Email
   - Prénom et nom
   - Rôle
   - Permissions spécifiques
4. L'employé reçoit un email d'invitation

### Permissions Granulaires

| Permission | Description |
|------------|-------------|
| `VIEW_BOOKINGS` | Voir les réservations |
| `EDIT_BOOKINGS` | Modifier les réservations |
| `MANAGE_FLEET` | Gérer la flotte |
| `VIEW_ACCOUNTING` | Voir la comptabilité |
| `MANAGE_EMPLOYEES` | Gérer les employés |
| `MANAGE_CMS` | Gérer le contenu |

---

## 📈 Statistiques et Rapports

### Métriques Disponibles

| Métrique | Description |
|----------|-------------|
| **Réservations** | Nombre total, par période |
| **Chiffre d'affaires** | CA brut, net, par mode de paiement |
| **Taux de remplissage** | Occupation des créneaux |
| **Taux d'annulation** | % de réservations annulées |
| **No-show** | Clients absents |

### Exports

Formats disponibles :
- 📊 CSV (comptabilité)
- 📄 PDF (rapports)

### Alertes Météo

Le système envoie des alertes automatiques si :
- Vent > seuil configuré
- Pluie prévue
- Conditions dangereuses

---

## ❓ FAQ et Dépannage

### Questions Fréquentes

<details>
<summary><strong>Comment modifier l'email d'un client ?</strong></summary>

1. Ouvrir la réservation
2. Cliquer sur le nom du client
3. Modifier l'email
4. Sauvegarder

</details>

<details>
<summary><strong>Que faire si le scan QR ne fonctionne pas ?</strong></summary>

1. Vérifier que la caméra est autorisée
2. Essayer avec plus de lumière
3. Si le QR est illisible, rechercher la réservation manuellement par référence

</details>

<details>
<summary><strong>Comment gérer un client qui n'a pas reçu son email ?</strong></summary>

1. Vérifier les spams du client
2. Depuis la réservation, cliquer sur **Renvoyer confirmation**
3. Si toujours pas reçu, vérifier l'adresse email

</details>

<details>
<summary><strong>Un client veut payer en espèces mais a réservé en ligne</strong></summary>

1. Annuler la réservation en ligne (remboursement automatique)
2. Créer une nouvelle réservation manuelle
3. Enregistrer le paiement espèces

</details>

### Problèmes Techniques

| Problème | Solution |
|----------|----------|
| Page blanche | Vider le cache navigateur (Ctrl+F5) |
| Erreur de connexion | Vérifier identifiants, réinitialiser mot de passe |
| Planning ne charge pas | Actualiser la page, vérifier connexion internet |
| Paiement échoué | Vérifier la carte du client, essayer un autre moyen |
| App mobile plante | Fermer et rouvrir l'application |

### Contact Support

En cas de problème non résolu :

- 📧 Email : servaislucas68@gmail.com
- 📞 Urgence : Contacter l'administrateur système

---

## 📝 Notes de Version

### Version 1.0.6 (Actuelle)

- ✨ Tap to Pay depuis le planning web
- 🔧 Amélioration du formulaire mobile
- 🐛 Correction de l'affichage des réservations futures
- 📱 Meilleur support PWA

---

**Dernière mise à jour** : Décembre 2025  
**Version du document** : 1.0  
**Auteur** : Lucas Servais
