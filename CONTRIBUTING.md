# Guide de Contribution – Sweet Narcisse

Merci de votre intérêt pour contribuer à Sweet Narcisse ! Ce document explique comment participer efficacement au projet.

---

## 📋 Table des Matières

- [Code de Conduite](#code-de-conduite)
- [Comment Contribuer](#comment-contribuer)
- [Signaler un Bug](#-signaler-un-bug)
- [Proposer une Fonctionnalité](#-proposer-une-fonctionnalité)
- [Soumettre du Code](#-soumettre-du-code)
- [Standards de Code](#-standards-de-code)
- [Processus de Review](#-processus-de-review)

---

## Code de Conduite

En participant à ce projet, vous vous engagez à respecter notre [Code de Conduite](CODE_OF_CONDUCT.md). Nous attendons de tous les contributeurs qu'ils maintiennent un environnement respectueux et inclusif.

---

## Comment Contribuer

### Types de Contributions Acceptées

| Type | Description | Bienvenue |
|------|-------------|-----------|
| 🐛 Corrections de bugs | Résolution de problèmes identifiés | ✅ Oui |
| 📝 Documentation | Amélioration des docs existants | ✅ Oui |
| 🌍 Traductions | Nouvelles langues ou corrections | ✅ Oui |
| ♿ Accessibilité | Améliorations WCAG | ✅ Oui |
| 🔒 Sécurité | Corrections de vulnérabilités | ✅ Oui |
| ✨ Nouvelles fonctionnalités | Ajouts majeurs | ⚠️ Discussion préalable requise |

### Avant de Commencer

1. **Vérifiez les issues existantes** pour éviter les doublons
2. **Discutez des changements majeurs** via une issue avant de coder
3. **Lisez la documentation technique** dans `docs/developer-guide.md`

---

## 🐛 Signaler un Bug

### Template de Bug Report

```markdown
## Description
[Description claire et concise du bug]

## Étapes de Reproduction
1. Aller sur '...'
2. Cliquer sur '...'
3. Voir l'erreur

## Comportement Attendu
[Ce qui devrait se passer]

## Comportement Actuel
[Ce qui se passe réellement]

## Environnement
- OS: [ex: Windows 11]
- Navigateur: [ex: Chrome 120]
- Version: [ex: 1.0.6]

## Screenshots
[Si applicable]

## Logs
[Erreurs console si disponibles]
```

### Checklist Bug Report

- [ ] J'ai vérifié que ce bug n'est pas déjà signalé
- [ ] J'ai inclus les étapes de reproduction
- [ ] J'ai testé sur la dernière version
- [ ] J'ai inclus les logs/screenshots pertinents

---

## 💡 Proposer une Fonctionnalité

### Template de Feature Request

```markdown
## Problème à Résoudre
[Quel problème cette fonctionnalité résout-elle ?]

## Solution Proposée
[Description de la fonctionnalité]

## Alternatives Envisagées
[Autres solutions considérées]

## Contexte Additionnel
[Mockups, exemples d'autres produits, etc.]
```

### Processus de Validation

1. **Issue créée** → Discussion ouverte
2. **Validation** → Label `approved` ajouté
3. **Assignation** → Contributeur assigné ou libre
4. **Développement** → PR créée
5. **Review** → Merge ou itération

---

## 💻 Soumettre du Code

### Prérequis

```bash
# Forker le repo puis cloner
git clone https://github.com/VOTRE_USERNAME/SweetNarcisse-demo.git
cd SweetNarcisse-demo

# Installer les dépendances
npm install --legacy-peer-deps

# Configurer l'environnement
cp .env.example .env.local

# Vérifier que tout fonctionne
npm run lint
npm test
npm run build
```

### Workflow Git

```bash
# Créer une branche depuis master
git checkout master
git pull origin master
git checkout -b type/description-courte

# Types de branches:
# - fix/description    → Correction de bug
# - feat/description   → Nouvelle fonctionnalité
# - docs/description   → Documentation
# - refactor/description → Refactoring
# - test/description   → Tests

# Faire vos modifications...

# Commiter avec message conventionnel
git commit -m "fix: description du correctif"

# Pousser et créer la PR
git push origin type/description-courte
```

### Convention de Commits

Nous utilisons [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<scope>): <description>

[body optionnel]

[footer optionnel]
```

| Type | Description |
|------|-------------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation uniquement |
| `style` | Formatage (pas de changement de code) |
| `refactor` | Refactoring sans changement fonctionnel |
| `test` | Ajout ou modification de tests |
| `chore` | Maintenance, dépendances |

**Exemples :**

```
feat(booking): add group reservation support
fix(payment): handle Stripe webhook timeout
docs(readme): update installation instructions
refactor(api): simplify auth middleware
```

### Template de Pull Request

```markdown
## Description
[Description des changements]

## Type de Changement
- [ ] 🐛 Bug fix
- [ ] ✨ Nouvelle fonctionnalité
- [ ] 📝 Documentation
- [ ] ♻️ Refactoring
- [ ] 🔒 Sécurité

## Issue Liée
Fixes #[numéro]

## Checklist
- [ ] Mon code suit les conventions du projet
- [ ] J'ai testé mes changements localement
- [ ] J'ai ajouté des tests si nécessaire
- [ ] J'ai mis à jour la documentation si nécessaire
- [ ] `npm run lint` passe sans erreur
- [ ] `npm test` passe sans erreur
- [ ] `npm run build` réussit

## Screenshots
[Si changements visuels]
```

---

## 📏 Standards de Code

### TypeScript

```typescript
// ✅ Bon
interface BookingData {
  id: string
  date: Date
  guests: number
}

async function createBooking(data: BookingData): Promise<Booking> {
  // Validation
  const validated = bookingSchema.parse(data)
  return await prisma.booking.create({ data: validated })
}

// ❌ Mauvais
async function createBooking(data: any) {
  return await prisma.booking.create({ data })
}
```

### React Components

```tsx
// ✅ Bon - Composant typé avec props claires
interface BookingCardProps {
  booking: Booking
  onCancel: (id: string) => void
  className?: string
}

export function BookingCard({ booking, onCancel, className }: BookingCardProps) {
  return (
    <div className={cn('rounded-lg p-4', className)}>
      {/* ... */}
    </div>
  )
}

// ❌ Mauvais - Props any, pas de typage
export function BookingCard(props) {
  return <div>{/* ... */}</div>
}
```

### Conventions de Nommage

| Élément | Convention | Exemple |
|---------|------------|---------|
| Composants | PascalCase | `BookingWidget.tsx` |
| Hooks | camelCase avec `use` | `useBookings.ts` |
| Utils | camelCase | `formatDate.ts` |
| Constants | SCREAMING_SNAKE | `MAX_GUESTS` |
| Types/Interfaces | PascalCase | `BookingData` |
| API Routes | kebab-case | `all-bookings/route.ts` |

### Structure des Fichiers

```
components/
├── BookingWidget.tsx      # Composant principal
├── BookingWidget.test.tsx # Tests
├── BookingWidget.types.ts # Types (si complexes)
└── index.ts               # Export

lib/
├── booking/
│   ├── createBooking.ts
│   ├── cancelBooking.ts
│   └── index.ts
```

---

## 🔍 Processus de Review

### Critères de Review

| Critère | Vérification |
|---------|-------------|
| **Fonctionnel** | Le code fait ce qu'il est censé faire |
| **Lisible** | Facile à comprendre et maintenir |
| **Testé** | Tests appropriés ajoutés |
| **Sécurisé** | Pas de vulnérabilité introduite |
| **Performant** | Pas de régression de performance |
| **Documenté** | Commentaires si logique complexe |

### Délais de Review

- **Bugs critiques** : 24-48h
- **Corrections mineures** : 3-5 jours
- **Fonctionnalités** : 1-2 semaines

### Après le Merge

1. La branche est automatiquement supprimée
2. Les changements sont déployés en staging
3. Après validation, déploiement en production

---

## 🙏 Remerciements

Chaque contribution, quelle que soit sa taille, est précieuse. Les contributeurs significatifs seront mentionnés dans le README et le CHANGELOG.

---

## ❓ Questions ?

- **Technique** : Ouvrez une issue avec le label `question`
- **Général** : servaislucas68@gmail.com

---

Merci de contribuer à Sweet Narcisse ! 🚣
