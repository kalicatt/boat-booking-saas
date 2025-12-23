# 🎯 Roadmap Admin Redesign - Sweet Narcisse

**Objectif**: Transformer l'interface admin en système professionnel optimisé pour la production avec effets tunnel pour maximiser la fluidité et l'efficacité.

**Philosophie**: Plus pratique que joli. Workflows optimisés. Actions rapides. Minimum de clics.

---

## 📊 Phase 1: Dashboard (Aujourd'hui) - PRIORITÉ HAUTE

### État actuel
- ✅ KPIs basiques (bookings/revenue/boats/occupancy)
- ⚠️ Manque de données actionnables
- ⚠️ Pas de vue temps réel
- ⚠️ Pas de quick actions contextuelles

### Améliorations
```
🎯 Effet Tunnel: Vue d'ensemble → Action en 1 clic

1. KPIs Enrichis
   - Revenus du jour vs objectif (barre de progression)
   - Prochains départs (dans les 2h) avec alertes
   - Check-ins en attente (badge rouge si > 0)
   - Météo du jour intégrée (icône + temp + vent)
   - Taux de remplissage par créneau

2. Actions Rapides (Hero Section)
   - Bouton "Check-in rapide" → scanner QR ou saisir ref
   - Bouton "Nouvelle résa express" → formulaire minimal (nom, phone, slot, boat)
   - Bouton "Signaler incident" → formulaire rapide

3. Timeline Aujourd'hui
   - Ligne de temps visuelle (08:00 → 20:00)
   - Départs/retours sur timeline interactive
   - Statuts en couleur (À venir/En cours/Terminé/En retard)
   - Click → détails + actions (check-in, contact, modifier)

4. Alertes & Notifications
   - Section sticky en haut: alertes critiques
   - "3 bateaux doivent rentrer dans 15min"
   - "2 clients en attente de check-in"
   - "Météo: alerte vent > 25km/h à 14h"

5. Statistiques Flash
   - Mini graphiques sparkline (revenus 7 derniers jours)
   - Comparaison vs semaine dernière (↑ +15% ou ↓ -5%)
```

**Priorité**: 🔴 CRITIQUE
**Durée estimée**: 4-6 heures
**Fichiers**: `app/admin/page-pro.tsx`, `ProDashboardClient.tsx`, nouveaux composants `Timeline.tsx`, `QuickActions.tsx`

---

## 📅 Phase 2: Planning - PRIORITÉ HAUTE

### État actuel
- ❌ Pas encore implémenté (ancienne version)

### Améliorations
```
🎯 Effet Tunnel: Vue planning → Créer/modifier résa en 2 clics

1. Vue Calendar Pro
   - Grille hebdomadaire avec slots horaires
   - Bateaux en colonnes, heures en lignes
   - Drag & drop pour déplacer réservations
   - Color coding: Confirmé/En attente/Annulé/Bloqué
   - Click cellule vide → formulaire express inline

2. Formulaire Express Inline
   - Overlay rapide sans quitter la page
   - Champs: Client (autocomplete), Durée, Nb personnes
   - Validation temps réel
   - Bouton "Enregistrer & Suivante" pour enchaîner

3. Filtres Intelligents
   - Dropdown rapide: Aujourd'hui / Cette semaine / Mois
   - Toggle: Afficher bloqués / Afficher annulés
   - Search bar: chercher par nom client ou bateau

4. Actions Bulk
   - Checkbox sur réservations
   - Actions groupées: Confirmer tout / Envoyer rappels / Exporter

5. Sidebar Info
   - Stats du jour sélectionné
   - Disponibilités en temps réel
   - Suggestions: "Créneau 14h vide,"
```

**Priorité**: 🔴 CRITIQUE
**Durée estimée**: 8-10 heures
**Fichiers**: `app/admin/planning/page.tsx`, composants `WeekCalendar.tsx`, `BookingFormInline.tsx`, `SlotCell.tsx`

---

## 📋 Phase 3: Réservations (Liste) - PRIORITÉ HAUTE

### État actuel
- ⚠️ DataTable basique créé

### Améliorations
```
🎯 Effet Tunnel: Recherche → Action client en 1 clic

1. Filtres Avancés Sticky
   - Barre de filtres toujours visible
   - Statut (multi-select chips)
   - Date range picker
   - Bateau (multi-select)
   - Search: nom, email, phone, booking ref
   - Bouton "Reset filtres"

2. Table Enrichie
   - Colonnes: Ref / Client / Date / Heure / Bateau / Personnes / Statut / Montant / Actions
   - Tri sur toutes colonnes
   - Row hover → highlight + actions rapides apparaissent
   - Click row → slide panel latéral (détails complets)

3. Actions Rapides par Row
   - Icône Email: envoyer confirmation
   - Icône Phone: copier numéro
   - Icône Edit: modifier inline ou modal
   - Icône Trash: annuler avec motif
   - Icône Print: générer facture PDF

4. Slide Panel Détails
   - S'ouvre à droite (400px)
   - Toutes infos client + résa
   - Timeline des événements (créé, confirmé, modifié)
   - Boutons actions: Modifier / Annuler / Contacter / Facture
   - Fermeture: click outside ou ESC

5. Actions Bulk
   - Select all / select page
   - Envoyer rappels groupés
   - Exporter CSV sélection
   - Changer statut en masse
```

**Priorité**: 🟠 HAUTE
**Durée estimée**: 6-8 heures
**Fichiers**: `app/admin/reservations/page.tsx`, `BookingTable.tsx`, `BookingSlidePanel.tsx`, `FilterBar.tsx`

---

## 🚤 Phase 4: Flotte (Gestion Bateaux)

### Améliorations
```
🎯 Effet Tunnel: Vue flotte → Maintenance/calendrier en 1 clic

1. Vue Cartes Bateaux
   - Grid de cards: photo, nom, capacité, statut
   - Statut visuel: Disponible (vert) / En mer (bleu) / Maintenance (orange) / Hors service (rouge)
   - Badge: "Rentre dans 45min"
   - Click card → détails + calendrier maintenance

2. Calendrier Maintenance
   - Vue annuelle avec maintenances planifiées
   - Drag & drop pour planifier
   - Alertes: "Maintenance obligatoire dans 10 jours"

3. Historique Bateau
   - Nb sorties ce mois
   - Dernier entretien
   - Prochaine révision
   - Incidents signalés

4. Quick Actions
   - Marquer "En maintenance"
   - Planifier entretien
   - Signaler incident
```

**Priorité**: 🟡 MOYENNE
**Durée estimée**: 5-6 heures
**Fichiers**: `app/admin/fleet/page.tsx`, `BoatCard.tsx`, `MaintenanceCalendar.tsx`

---

## 🕒 Phase 5: Heures & Paie

### Améliorations
```
🎯 Effet Tunnel: Saisie heures → Export paie en 3 clics

1. Tableau Heures Hebdomadaire
   - Grille: Employés en lignes, jours en colonnes
   - Saisie inline: click cellule → input heures
   - Calcul auto: total heures, heures sup, montant
   - Validation: highlight si anomalie (>12h/jour)

2. Quick Entry
   - Formulaire rapide: employé, date, heures, type (normal/sup/nuit)
   - Bouton "Enregistrer & Suivant"
   - Templates: "Journée standard 8h" en 1 clic

3. Export Paie
   - Sélectionner période (semaine/mois)
   - Preview total par employé
   - Export CSV formaté pour logiciel paie
   - Historique exports

4. Stats
   - Coût main d'œuvre du mois
   - Heures par employé (graphique)
   - Comparaison vs mois précédent
```

**Priorité**: 🟡 MOYENNE
**Durée estimée**: 6-7 heures
**Fichiers**: `app/admin/hours/page.tsx`, `HoursGrid.tsx`, `QuickEntryForm.tsx`

---

## 💶 Phase 6: Comptabilité & Caisse

### Améliorations
```
🎯 Effet Tunnel: Voir transactions → Clôture caisse en 2 clics

1. Tableau de Bord Compta
   - Revenus du jour (encaissés vs à encaisser)
   - Moyens de paiement: CB / Espèces / Virement / PayPal
   - Barre de progression vs objectif mensuel

2. Liste Transactions
   - Filtres: date, type paiement, statut
   - Colonnes: Date / Réf résa / Client / Montant / Méthode / Statut
   - Actions: Marquer encaissé, générer facture

3. Clôture Caisse
   - Formulaire rapide: saisir espèces comptées
   - Calcul écart vs attendu
   - Alerte si écart > 5%
   - Export rapport PDF

4. Rapports
   - Revenus quotidiens (graphique ligne 30 jours)
   - Répartition moyens paiement (pie chart)
   - Export comptable CSV
```

**Priorité**: 🟡 MOYENNE
**Durée estimée**: 5-6 heures
**Fichiers**: `app/admin/accounting/page.tsx`, `TransactionsList.tsx`, `CashClosing.tsx`

---

## 👥 Phase 7: Équipe & Comptes

### Améliorations
```
🎯 Effet Tunnel: Voir équipe → Créer/modifier utilisateur en 2 clics

1. Liste Employés
   - Cards avec photo, nom, rôle, statut
   - Filtres: Actifs / Inactifs / Par rôle
   - Click → détails + permissions

2. Formulaire Express
   - Modal avec tabs: Infos / Permissions / Horaires
   - Infos: nom, email, phone, rôle, date embauche
   - Permissions: checkboxes par module
   - Validation temps réel

3. Gestion Permissions
   - Matrix: Utilisateur × Modules
   - Quick toggles
   - Rôles prédéfinis: Admin / Manager / Staff

4. Activité Récente
   - Dernière connexion
   - Actions récentes (créé résa, modifié bateau, etc.)
```

**Priorité**: 🟢 BASSE
**Durée estimée**: 4-5 heures
**Fichiers**: `app/admin/employees/page.tsx`, `EmployeeCard.tsx`, `PermissionsMatrix.tsx`

---

## 📊 Phase 8: Statistiques

### Améliorations
```
🎯 Effet Tunnel: Vue stats → Insights actionnables

1. Dashboard Analytics
   - Period selector: Aujourd'hui / 7j / 30j / Année / Custom
   - KPIs clés: Revenus / Nb réservations / Taux remplissage / Panier moyen

2. Graphiques Interactifs
   - Revenus dans le temps (line chart)
   - Répartition par bateau (bar chart)
   - Heures populaires (heat map)
   - Taux annulation (KPI avec trend)

3. Insights Auto
   - "Lundi est votre jour le moins rentable (-35% vs moyenne)"
   - "14h-16h a 95% de remplissage, augmentez les prix?"
   - "Bateau Narcisse est le plus demandé (+42%)"

4. Export Rapports
   - PDF rapport mensuel
   - CSV données brutes
   - Partage par email
```

**Priorité**: 🟢 BASSE
**Durée estimée**: 6-8 heures
**Fichiers**: `app/admin/stats/page.tsx`, composants charts (recharts)

---

## 🕵️ Phase 9: Logs & Audit

### Améliorations
```
🎯 Effet Tunnel: Rechercher événement → Détails en 1 clic

1. Timeline Événements
   - Liste chronologique reverse (plus récent en haut)
   - Filtres: Type / Utilisateur / Date / Module

2. Carte Événement
   - Icône selon type (create/update/delete)
   - Utilisateur + timestamp
   - Détails: "John a modifié la résa #1234"
   - Click → détails complets (avant/après)

3. Search Avancé
   - Par booking ref
   - Par utilisateur
   - Par IP
   - Par date range

4. Export Audit
   - CSV pour compliance
   - Filtrage avancé
```

**Priorité**: 🟢 BASSE
**Durée estimée**: 3-4 heures
**Fichiers**: `app/admin/logs/page.tsx`, `LogTimeline.tsx`

---

## 🌤️ Phase 10: Météo

### Améliorations
```
🎯 Effet Tunnel: Vue météo → Décision annulation en 1 clic

1. Météo Temps Réel
   - Widget aujourd'hui: temp, vent, vagues, visibilité
   - Alertes si conditions dangereuses

2. Prévisions 7 Jours
   - Cards par jour
   - Highlight si conditions limites

3. Actions Rapides
   - Si alerte: bouton "Annuler créneaux à risque"
   - Liste réservations concernées
   - Envoi email automatique clients

4. Historique Météo
   - Corrélation météo × annulations
   - Stats: "Pluie = -60% réservations"
```

**Priorité**: 🟡 MOYENNE
**Durée estimée**: 3-4 heures
**Fichiers**: `app/admin/weather/page.tsx`, `WeatherWidget.tsx`, `WeatherAlerts.tsx`

---

## ⛔ Phase 11: Blocages Réservation

### Améliorations
```
🎯 Effet Tunnel: Voir calendrier → Bloquer créneau en 1 clic

1. Calendrier Blocages
   - Vue mensuelle
   - Blocages existants en rouge
   - Click date → créer blocage

2. Formulaire Rapide
   - Date + heure / Durée / Bateau (ou tous) / Motif
   - Templates: "Maintenance", "Météo", "Événement privé"

3. Liste Blocages
   - Filtres: Actifs / Passés / Par bateau
   - Actions: Modifier / Supprimer / Dupliquer

4. Impact Preview
   - "Ce blocage affecte 3 créneaux disponibles"
   - "Revenus potentiels perdus: 450€"
```

**Priorité**: 🟡 MOYENNE
**Durée estimée**: 4-5 heures
**Fichiers**: `app/admin/blocks/page.tsx`, `BlockCalendar.tsx`

---

## 📰 Phase 12: CMS & Site

### Améliorations
```
🎯 Effet Tunnel: Modifier contenu → Publier en 2 clics

1. Éditeur de Contenu
   - Sections éditables: Hero / À propos / Tarifs / FAQ
   - WYSIWYG simple
   - Preview avant publication

2. Galerie Photos
   - Upload drag & drop
   - Crop/resize inline
   - Réorganiser ordre

3. Avis Clients
   - Modération avis
   - Approuver / Rejeter / Répondre
   - Publication automatique si 4-5★

4. Quick Publish
   - Bouton "Publier modifications"
   - Preview mobile/desktop
   - Rollback si besoin
```

**Priorité**: 🟢 BASSE
**Durée estimée**: 6-7 heures
**Fichiers**: `app/admin/cms/page.tsx`, `ContentEditor.tsx`, `ImageGallery.tsx`

---

## ⚙️ Phase 13: Paramètres & Configuration

### Améliorations
```
🎯 Effet Tunnel: Modifier config → Sauvegarder en 1 clic

1. Tabs Organisation
   - Général / Réservations / Paiements / Notifications / Sécurité

2. Settings avec Validation
   - Inputs avec validation temps réel
   - Toggle switches pour booléens
   - Color pickers pour branding

3. Preview Impact
   - "Cette modification affectera 12 réservations futures"
   - Confirmation si changement critique

4. Historique Changements
   - Qui a modifié quoi et quand
   - Rollback possible
```

**Priorité**: 🟢 BASSE
**Durée estimée**: 4-5 heures
**Fichiers**: `app/admin/settings/page.tsx`, `SettingsTabs.tsx`

---

## 🎨 Composants Réutilisables à Créer

### Effets Tunnel & UX
- **SlidePanel**: Panel latéral pour détails (résa, client, bateau)
- **QuickActionButton**: Boutons actions contextuelles avec tooltips
- **InlineForm**: Formulaires édition inline dans tables
- **ConfirmDialog**: Confirmation actions critiques (annulation, suppression)
- **Toast**: Notifications succès/erreur non-bloquantes
- **LoadingState**: Skeleton loaders pendant chargements
- **EmptyState**: États vides avec CTA (ex: "Aucune résa, créer la première?")

### Data Display
- **StatCard**: Cards KPIs avec trends et sparklines
- **Timeline**: Timeline événements/activité
- **DataGrid**: Table avancée avec tri/filtres/pagination
- **Calendar**: Calendrier drag & drop
- **Charts**: Line/Bar/Pie charts (recharts)

### Forms
- **FormField**: Wrapper input avec label/error/hint
- **DateRangePicker**: Sélection période
- **AsyncSelect**: Autocomplete avec search API
- **MultiSelect**: Sélection multiple avec chips
- **FileUpload**: Upload drag & drop avec preview

---

## 📐 Design System Pro

### Couleurs
```typescript
// Primary Actions
sky-600: Actions principales (CTA, boutons primaires)
sky-700: Hover états
sky-500: Accents légers

// Statuts
emerald-600: Succès, confirmé, actif
amber-600: En attente, warning
red-600: Erreur, annulé, critique
blue-600: Info, en cours
slate-400: Inactif, désactivé

// Backgrounds
slate-900: Sidebar
slate-50: Main content background (mode clair)
white: Cards, modals

// Text
slate-900: Headings
slate-700: Body text
slate-500: Secondary text
slate-400: Placeholders
```

### Typography
```typescript
// Headings
text-2xl font-bold: Page titles
text-xl font-semibold: Section headers
text-lg font-medium: Card titles
text-base font-medium: Subheadings

// Body
text-sm: Regular text
text-xs: Captions, meta info
```

### Spacing
```typescript
// Sections
py-8: Spacing entre sections principales
py-6: Spacing dans cards
py-4: Spacing dans forms

// Components
gap-6: Entre cards
gap-4: Entre form fields
gap-2: Entre éléments inline
```

### Interactions
```typescript
// Transitions
transition-all duration-200: Hovers, états
transition-colors duration-150: Changements couleur

// Hovers
hover:bg-slate-100: Rows, cards
hover:bg-sky-700: Boutons primaires
hover:shadow-lg: Élévation

// Focus
focus:ring-2 focus:ring-sky-500: Inputs
focus:outline-none: Reset default
```

---

## 🚀 Plan d'Implémentation Suggéré

### Sprint 1 (Semaine 1)
1. ✅ Phase 1: Dashboard - FAIT
2. 🔴 Améliorer Dashboard (retirer btn nouvelle résa, enrichir KPIs)
3. 📅 Phase 2: Planning (vue calendar + formulaire express)

### Sprint 2 (Semaine 2)
4. 📋 Phase 3: Réservations (filtres avancés + slide panel)
5. 🚤 Phase 4: Flotte (cards + maintenance)

### Sprint 3 (Semaine 3)
6. 🕒 Phase 5: Heures & Paie
7. 💶 Phase 6: Comptabilité

### Sprint 4 (Semaine 4)
8. 🌤️ Phase 10: Météo (priorité car impact direct activité)
9. ⛔ Phase 11: Blocages

### Sprint 5 (Semaine 5)
10. 👥 Phase 7: Équipe
11. 📊 Phase 8: Statistiques

### Sprint 6 (Semaine 6 - Polish)
12. 🕵️ Phase 9: Logs
13. 📰 Phase 12: CMS
14. ⚙️ Phase 13: Paramètres

---

## ✅ Checklist Qualité par Phase

Pour chaque phase, valider:
- [ ] TypeScript: 0 erreurs compilation
- [ ] UI: Responsive mobile/tablet/desktop
- [ ] UX: Maximum 2 clics pour actions courantes
- [ ] Performance: Chargement < 1s
- [ ] Accessibilité: Keyboard navigation + ARIA labels
- [ ] États: Loading/Empty/Error gérés
- [ ] Validation: Formulaires avec feedback temps réel
- [ ] Confirmation: Actions critiques confirmées
- [ ] Feedback: Toasts succès/erreur
- [ ] Tests: Scénarios principaux testés manuellement

---

## 🎯 Objectifs de Performance

### Temps d'Exécution Cibles
- Créer réservation: < 30 secondes (vs 2-3 min actuellement)
- Check-in client: < 10 secondes
- Clôture caisse: < 1 minute
- Rechercher réservation: < 3 secondes
- Modifier planning: < 20 secondes

### Métriques UX
- Taux complétion formulaires: > 95%
- Taux erreur saisie: < 5%
- Temps formation nouveau staff: < 2 heures
- Satisfaction utilisateurs: > 4.5/5

---

**Dernière mise à jour**: 22 décembre 2025
**Statut global**: 🟡 Phase 1 complétée, Phase 2 en cours
