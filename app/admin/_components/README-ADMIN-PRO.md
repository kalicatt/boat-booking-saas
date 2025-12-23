# 🎯 Admin Pro - Design System & Architecture

## Vue d'ensemble

Le nouveau système admin est conçu pour être **professionnel, pratique et optimisé pour la production**. L'accent est mis sur l'efficacité opérationnelle et les workflows rapides plutôt que sur l'esthétique.

## Architecture

### Layout Structure
```
┌─────────────────────────────────────────┐
│ ProSidebar (fixed left, 256px)         │
├─────────────────────────────────────────┤
│ ProTopbar (sticky top)                  │
│  - Breadcrumb / Page title              │
│  - Quick actions (+ Nouvelle résa)      │
│  - Weather badge                        │
│  - Notifications                        │
├─────────────────────────────────────────┤
│ Main Content Area                       │
│  - KPI Cards                            │
│  - Data Tables                          │
│  - Forms                                │
│  - Workflows                            │
└─────────────────────────────────────────┘
```

## Composants Réutilisables

### 1. **KPICard** - Indicateurs de performance
```tsx
<KPICard
  title="Réservations aujourd'hui"
  value={42}
  icon="📅"
  variant="info"
  trend={{ value: 12, label: 'vs hier' }}
  action={{ label: 'Voir tout', onClick: () => {} }}
/>
```

**Variants:** `default | success | warning | danger | info`

### 2. **DataTable** - Tables de données
```tsx
<DataTable
  columns={[
    { key: 'name', label: 'Nom', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Statut', render: (row) => <Badge /> }
  ]}
  data={items}
  onRowClick={(row) => navigate(row.id)}
  actions={(row) => <><EditButton /><DeleteButton /></>}
/>
```

**Features:**
- Tri par colonnes
- Actions par ligne
- Row click handler
- Custom cell rendering
- States: loading, empty

### 3. **PageHeader** - En-tête de page
```tsx
<PageHeader
  title="Réservations"
  description="Gérer toutes les réservations"
  breadcrumb={[
    { label: 'Admin', href: '/admin' },
    { label: 'Réservations' }
  ]}
  actions={<Button>+ Nouveau</Button>}
/>
```

### 4. **Button** - Boutons
```tsx
<Button variant="primary" size="md" loading={saving}>
  Enregistrer
</Button>
<Button variant="danger" icon={<TrashIcon />}>
  Supprimer
</Button>
```

**Variants:** `primary | secondary | danger | ghost`  
**Sizes:** `sm | md | lg`

### 5. **TableControls** - Contrôles de table
```tsx
<TableControls
  searchValue={search}
  onSearchChange={setSearch}
  filters={<FilterDropdown />}
  actions={
    <>
      <Button>Export CSV</Button>
      <Button variant="primary">+ Nouveau</Button>
    </>
  }
/>
```

## Principes de Design

### 1. **Hiérarchie Claire**
- Sidebar pour navigation principale
- Topbar pour actions contextuelles
- KPI cards en haut pour vue d'ensemble
- Tables en dessous pour les données détaillées

### 2. **Couleurs Fonctionnelles**
- **Sky (bleu ciel)**: Actions principales, liens actifs
- **Emerald (vert)**: Succès, confirmations
- **Amber (jaune)**: Avertissements, en attente
- **Red (rouge)**: Erreurs, suppressions
- **Slate (gris)**: Texte, bordures, backgrounds

### 3. **Espacement Cohérent**
- Padding cards: `p-5` ou `p-6`
- Gaps grids: `gap-4` ou `gap-6`
- Margins sections: `mb-6`

### 4. **États Visuels**
- **Hover**: Légère élévation + changement couleur
- **Active**: Background coloré + ombre
- **Loading**: Spinner + opacité réduite
- **Disabled**: Opacité 50% + cursor not-allowed

## Workflows Optimisés

### Principe "Tunnel/Funnel"
Chaque workflow suit un chemin clair et linéaire:

**Exemple: Création de réservation**
```
1. Dashboard → Click "Nouvelle résa"
2. Form minimal → Date + Heure + Nb personnes
3. Recherche client → Sélection ou création rapide
4. Confirmation → Récap + Paiement
5. Success → Retour dashboard avec notification
```

**Optimisations:**
- Minimum de clics
- Validation inline
- Pré-remplissage intelligent
- Raccourcis clavier
- Actions en masse pour les listes

## Migration de l'Ancien Système

### Étapes pour migrer une page

1. **Créer le composant client** `[page]Client.tsx`
2. **Utiliser ProLayout** via `AdminLayoutSwitcher`
3. **Ajouter KPI cards** pour les métriques importantes
4. **Remplacer les tiles par DataTable**
5. **Ajouter TableControls** (search + filters)
6. **Implémenter les actions rapides**

### Exemple de migration

**Avant:**
```tsx
// Old dashboard with tiles
<div className="grid grid-cols-2 gap-4">
  <Link href="/admin/planning">Planning</Link>
  <Link href="/admin/reservations">Réservations</Link>
</div>
```

**Après:**
```tsx
// New dashboard with KPIs + Quick actions
<KPIGrid>
  <KPICard title="Réservations aujourd'hui" value={42} />
  <KPICard title="CA du jour" value="1250€" />
</KPIGrid>

<DataTable columns={...} data={upcomingBookings} />
```

## Composants À Créer (Roadmap)

- [ ] **Modal** - Modales réutilisables
- [ ] **Form fields** - Input, Select, DatePicker avec validation
- [ ] **Tabs** - Navigation entre sections
- [ ] **Timeline** - Pour historique/logs
- [ ] **StatCard** - Graphiques mini pour stats
- [ ] **Wizard** - Pour workflows multi-étapes
- [ ] **BulkActions** - Actions en masse sur sélection
- [ ] **QuickFilters** - Filtres prédéfinis cliquables

## Accessibilité & Performance

- **Keyboard navigation**: Tous les composants accessibles au clavier
- **ARIA labels**: Labels appropriés pour screen readers
- **Focus management**: Indicateurs de focus visibles
- **Lazy loading**: Tables chargent par lots
- **Optimistic updates**: UI réactive avant confirmation serveur
- **Error boundaries**: Erreurs isolées par section

## Best Practices

### DO ✅
- Utiliser les composants du design system
- Maintenir la hiérarchie visuelle
- Valider côté client ET serveur
- Afficher les loading states
- Donner du feedback utilisateur
- Optimiser les requêtes DB

### DON'T ❌
- Créer des composants custom pour des patterns existants
- Mélanger les variants de couleurs
- Oublier les états (loading, error, empty)
- Cacher les erreurs
- Créer des workflows complexes sans nécessité
- Faire des requêtes DB inutiles

## Migration Plan

1. ✅ **Phase 1: Core System** (FAIT)
   - ProLayout + Sidebar + Topbar
   - KPICard, DataTable, PageHeader
   - Button system

2. 🔄 **Phase 2: Main Pages** (EN COURS)
   - Dashboard (page-pro.tsx)
   - Reservations list
   - Planning view

3. ⏳ **Phase 3: Secondary Pages**
   - Fleet management
   - Hours tracking
   - Accounting

4. ⏳ **Phase 4: Advanced Features**
   - Bulk operations
   - Advanced filters
   - Export/Import
   - Analytics dashboards

## Support

Pour toute question sur l'utilisation du design system:
1. Consulter ce README
2. Regarder les exemples dans `/admin/_components`
3. Tester dans `/admin/page-pro.tsx`
