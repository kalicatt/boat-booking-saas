Roadmap : Gestion Avancée de Flotte (Maintenance & Batterie)
Ce module vise à digitaliser le "Carnet de Santé" des barques et à automatiser la gestion des charges électriques pour éviter les pannes en pleine exploitation.

Objectif Business : Zéro panne client, optimisation de la durée de vie du matériel et organisation fluide du staff technique.

🏗️ Phase 1 : Architecture de Données (Le Carnet de Santé)
Objectif : Stocker les cycles de batterie et l'historique des réparations pour chaque barque.

1. Mise à jour du Schéma Prisma
Nous devons enrichir le modèle Boat avec des paramètres techniques et créer une table d'historique.

Fichier : prisma/schema.prisma

Modifications :

Extrait de code

model Boat {
  id          Int       @id @default(autoincrement())
  name        String    // Ex: "Barque 1"
  capacity    Int       @default(12)
  status      BoatStatus @default(ACTIVE)
  
  // --- NOUVEAUX CHAMPS TECHNIQUES ---
  
  // Gestion Batterie
  batteryCycleDays  Int       @default(4) // Fréquence de charge (ex: tous les 4 jours)
  lastChargeDate    DateTime  @default(now()) // Date de la dernière charge complète
  
  // Maintenance Préventive (Compteurs)
  totalTrips        Int       @default(0) // Total historique
  tripsSinceService Int       @default(0) // Sorties depuis la dernière révision
  hoursSinceService Float     @default(0.0) // Heures naviguées depuis révision
  
  // Relations
  bookings          Booking[]
  maintenanceLogs   MaintenanceLog[]
}

// Journal des interventions (Réparation, Charge, Inspection)
model MaintenanceLog {
  id          String   @id @default(cuid())
  boatId      Int
  boat        Boat     @relation(fields: [boatId], references: [id])
  type        MaintenanceType
  description String?  // Ex: "Changement hélice", "Charge complète"
  performedBy String?  // Nom du staff
  cost        Float?   // Coût de la pièce si applicable
  createdAt   DateTime @default(now())
}

enum MaintenanceType {
  CHARGE      // Recharge batterie
  INSPECTION  // Contrôle routine
  REPAIR      // Réparation suite casse
  CLEANING    // Grand nettoyage
}
Commande : npx prisma migrate dev --name add_fleet_management

⚡ Phase 2 : Logique "Batterie Intelligente"
Objectif : Calculer automatiquement quelles barques doivent être branchées ce soir.

1. Algorithme de Calcul de Charge
Il ne s'agit pas de mesurer le voltage (IoT complexe), mais de suivre le cycle d'usage (Méthode empirique fiable).

Logique :

Une barque a une autonomie déclarée (batteryCycleDays, ex: 4 jours).

Si (Aujourd'hui - DateDernièreCharge) >= batteryCycleDays ➔ ALERTE ROUGE.

Si (Aujourd'hui - DateDernièreCharge) == batteryCycleDays - 1 ➔ ALERTE ORANGE (Prévoir ce soir).

2. Mise à jour automatique des Compteurs
À chaque fois qu'une réservation passe en COMPLETED, on incrémente les compteurs de la barque.

Fichier : app/api/admin/bookings/[id]/complete/route.ts (ou équivalent)

Action :

TypeScript

// Lors de la clôture d'une résa
await prisma.boat.update({
  where: { id: booking.boatId },
  data: {
    totalTrips: { increment: 1 },
    tripsSinceService: { increment: 1 },
    // Ajout de la durée réelle ou théorique
    hoursSinceService: { increment: durationInHours } 
  }
})
🖥️ Phase 3 : Dashboard "Chef de Flotte"
Objectif : Une vue unique pour savoir quelle barque nécessite une attention immédiate.

1. Page "État du Parc"
Route : app/admin/fleet/page.tsx

Interface (Grille de Cartes) :

Chaque carte représente une barque.

Badge Batterie :

🟢 (J+1 / J+2) : OK.

🟠 (J+3) : A charger ce soir.

🔴 (J+4 ou +) : CRITIQUE (Ne pas louer).

Badge Mécanique :

Si tripsSinceService > 500 ➔ Alerte "Révision Moteur/Rames".

2. Actions Rapides (Konsta UI / Mobile Friendly)
Sur la carte de la barque, deux boutons géants pour le staff sur le ponton :

⚡ BTO : "Marquer comme Chargée"

Action Back : Crée un MaintenanceLog type CHARGE + Reset lastChargeDate à now().

🛠️ BTN : "Signaler Incident"

Action Back : Ouvre un modal pour saisir "Rame cassée", passe le statut de la barque en MAINTENANCE (bloque les résas futures).

🚨 Phase 4 : Alertes Quotidiennes (Le "Manifeste de Charge")
Objectif : Recevoir chaque matin ou soir la liste des tâches techniques.

1. Intégration au Script Daily
Votre script daily-maintenance.ps1 est parfait pour ça. On ajoute une section qui scanne l'état des batteries.

Fichier : daily-maintenance.ps1

Ajout : Appel API vers une route de reporting.

PowerShell

Write-Host "6. Vérification des Batteries & Maintenance..."
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/fleet/check-status" -Method POST
2. Route API de Notification
Fichier : app/api/admin/fleet/check-status/route.ts

Logique :

Récupérer toutes les barques ACTIVE.

Filtrer celles dont le cycle de charge est dépassé ou imminent.

Filtrer celles dont le seuil de révision (ex: 500 sorties) est atteint.

Action : Envoyer un Email "Rapport Technique" à l'admin (ou au responsable technique).

Sujet : "🛠️ Maintenance : 3 Barques à charger + 1 Révision".

Contenu : "Barque 4 (Critique batterie), Barque 2 (A charger ce soir)..."

✅ Checklist d'Implémentation
[ ] DB : Champs batteryCycleDays et lastChargeDate ajoutés.

[ ] Admin : Possibilité de modifier le paramètre "Jours autonomie" par barque (car une vieille batterie tient moins longtemps qu'une neuve).

[ ] UI : Le Dashboard affiche clairement les batteries critiques en rouge.

[ ] Workflow : Le bouton "Marquer Chargée" est accessible en 1 clic sur mobile (Scan & Charge).

[ ] Protection : Impossible d'attribuer une barque en "Batterie Critique" à une nouvelle réservation (Warning à la création).