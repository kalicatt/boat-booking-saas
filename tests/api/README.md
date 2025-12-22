# API Integration Tests

## Overview

Tests d'intégration pour les endpoints critiques de l'API Sweet Narcisse.

## Tests Disponibles

### 1. Availability API (`tests/api/availability.test.ts`)
Tests de l'endpoint `/api/availability` pour les créneaux horaires.

**Couverture**:
- ✅ Validation des paramètres requis (date, lang, adults/children/babies)
- ✅ Retour de slots vides si people count = 0
- ✅ Retour de slots disponibles pour dates futures
- ✅ Support multi-langues (en/fr/de/es/it)
- ✅ Calcul correct avec différents groupes de personnes

**Exécution**:
```bash
npm test -- tests/api/availability.test.ts
```

### 2. Bookings API (`tests/api/bookings.test.ts`)
Tests de l'endpoint `/api/bookings` pour la création de réservations.

**Couverture**:
- ⚠️ Validation des champs requis
- ⚠️ Validation email
- ⚠️ Vérification de la capacité du bateau
- ⚠️ Création de réservation PENDING
- ⚠️ Prévention de double réservation

**Note**: Tests incomplets - nécessitent configuration Prisma et mocks

### 3. Contact API (`tests/api/contact.test.ts`)
Tests de l'endpoint `/api/contact/private` pour les demandes de contact.

**Couverture**:
- ⚠️ Validation champs requis
- ⚠️ Validation email
- ⚠️ Validation longueur message
- ⚠️ Soumission valide

### 4. Stripe Webhook (`tests/api/stripe-webhook.test.ts`)
Tests de l'endpoint `/api/payments/stripe/webhook` pour les paiements.

**Couverture**:
- ⚠️ Validation signature Stripe
- ⚠️ Traitement payment_intent.succeeded
- ⚠️ Ignorance événements non supportés

## Configuration

### Prérequis

```bash
npm install --save-dev vitest @vitejs/plugin-react
```

### Variables d'environnement

```env
# Tests nécessitent une DB
DATABASE_URL="postgresql://user:pass@localhost:5432/sweetnarcisse_test"

# Stripe (webhook tests)
STRIPE_WEBHOOK_SECRET="whsec_test_secret"
```

## Exécuter les Tests

### Tous les tests API
```bash
npm test -- tests/api
```

### Test spécifique
```bash
npm test -- tests/api/availability.test.ts
```

### Mode watch
```bash
npx vitest tests/api
```

### Coverage
```bash
npx vitest --coverage tests/api
```

## Structure

```
tests/
  api/
    availability.test.ts     # GET /api/availability
    bookings.test.ts         # POST /api/bookings
    contact.test.ts          # POST /api/contact/private
    stripe-webhook.test.ts   # POST /api/payments/stripe/webhook
```

## Mocking

### Rate Limiter
```typescript
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 10 })),
  getClientIp: vi.fn(() => '127.0.0.1')
}))
```

### Mailer
```typescript
vi.mock('@/lib/mailer', () => ({
  sendMail: vi.fn(() => Promise.resolve({ accepted: ['test@example.com'] }))
}))
```

### Auth
```typescript
vi.mock('@/auth', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: '1', email: 'test@example.com' } }))
}))
```

## Limitations Actuelles

1. **Tests incomplets**: Bookings/Contact/Stripe nécessitent mocks approfondis
2. **Pas de DB test**: Tests utilisent DB de dev (risque de pollution)
3. **Pas de fixtures**: Données de test créées manuellement
4. **Pas de cleanup auto**: Cleanup manuel dans afterAll()

## Améliorations Futures

- [ ] Base de données de test dédiée
- [ ] Fixtures pour données de test
- [ ] Tests E2E avec Playwright
- [ ] Coverage >80% des endpoints API
- [ ] CI/CD integration (GitHub Actions)
- [ ] Tests de performance (load testing)
- [ ] Tests de sécurité (injection, XSS)

## Résultats Actuels

```
Test Files  1 passed (1)
     Tests  5 passed (5)
  Duration  3.06s
```

**Status**: 🟡 Tests availability fonctionnels, autres endpoints en cours
