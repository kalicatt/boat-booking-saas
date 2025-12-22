# Tests End-to-End (E2E) - Playwright

## Vue d'ensemble

Les tests E2E simulent le comportement réel d'un utilisateur sur l'application. Ils testent l'intégration complète de tous les composants (frontend, backend, base de données).

## Installation

```bash
# Installer Playwright
npm install -D @playwright/test

# Installer les navigateurs
npx playwright install chromium
```

## Structure

```
tests/e2e/
├── booking.spec.ts       # Tests du flux de réservation
└── screenshots/          # Screenshots générés lors des tests
```

## Exécution des Tests

### Localement

```bash
# Lancer tous les tests E2E
npm run test:e2e

# Lancer en mode UI (interface graphique)
npx playwright test --ui

# Lancer en mode debug
npx playwright test --debug

# Lancer un test spécifique
npx playwright test booking.spec.ts

# Lancer avec un navigateur visible
npx playwright test --headed
```

### En CI/CD

Les tests E2E sont automatiquement exécutés dans le pipeline GitHub Actions sur chaque PR et push vers `main`/`develop`.

## Scénarios Testés

### 1. Flux de Réservation Complet ✅

**Test**: `should allow user to make a booking from start to finish`

**Étapes**:
1. Navigation vers la page d'accueil
2. Clic sur le bouton de réservation
3. Sélection de la date (demain)
4. Sélection de l'heure (10:00)
5. Sélection du nombre de passagers (2 adultes, 1 enfant)
6. Remplissage des informations de contact
7. Soumission du formulaire
8. Vérification de la confirmation ou redirection vers paiement

**Assertions**:
- Le titre de la page contient "Sweet Narcisse"
- Le formulaire de réservation est affiché
- Les champs sont remplis correctement
- La confirmation ou la page de paiement s'affiche

### 2. Validation des Champs Requis ✅

**Test**: `should validate required fields`

**Étapes**:
1. Navigation vers le formulaire de réservation
2. Tentative de soumission sans remplir les champs
3. Vérification des messages d'erreur

**Assertions**:
- Des messages d'erreur sont affichés
- Le formulaire n'est pas soumis

### 3. Affichage des Créneaux Disponibles ✅

**Test**: `should show available time slots`

**Étapes**:
1. Navigation vers le formulaire
2. Sélection d'une date
3. Attente du chargement des créneaux
4. Vérification de l'affichage

**Assertions**:
- Au moins un créneau horaire est disponible

### 4. Navigation entre Pages ✅

**Test**: `should navigate to different pages`

**Étapes**:
- Test de tous les liens de navigation principaux
- Vérification du chargement de chaque page

### 5. Design Responsive ✅

**Test**: `should work on mobile viewport`

**Étapes**:
1. Configuration viewport mobile (375x667)
2. Navigation et interaction
3. Vérification du menu mobile

**Assertions**:
- L'application est utilisable sur mobile
- Le menu mobile fonctionne

## Configuration

### playwright.config.ts

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Variables d'Environnement

Pour les tests E2E, configurez :

```env
# .env.test
PLAYWRIGHT_BASE_URL=http://localhost:3000
RECAPTCHA_SECRET_KEY=test-key  # Mock reCAPTCHA en test
```

## Debugging

### Mode UI

```bash
npx playwright test --ui
```

Interface graphique interactive pour :
- Voir les tests en temps réel
- Inspecter les étapes
- Voir les screenshots et vidéos
- Re-exécuter des tests spécifiques

### Mode Debug

```bash
npx playwright test --debug
```

Ouvre le Playwright Inspector pour :
- Exécuter pas à pas
- Inspecter les sélecteurs
- Voir les logs console

### Traces

Après un échec, visualiser la trace :

```bash
npx playwright show-trace trace.zip
```

## Screenshots et Vidéos

### Screenshots

Pris automatiquement en cas d'échec, ou manuellement :

```typescript
await page.screenshot({ 
  path: 'tests/e2e/screenshots/my-screenshot.png',
  fullPage: true 
})
```

### Vidéos

Enregistrées en cas d'échec (configuré dans `playwright.config.ts`) :

```typescript
video: 'retain-on-failure'
```

## Bonnes Pratiques

### 1. Sélecteurs Robustes

✅ **Bon** : Utiliser les rôles ARIA et attributs data-testid
```typescript
page.getByRole('button', { name: /submit/i })
page.locator('[data-testid="booking-form"]')
```

❌ **Mauvais** : Sélecteurs CSS fragiles
```typescript
page.locator('.btn-primary.submit-btn')
```

### 2. Attentes Explicites

✅ **Bon** : Attendre les éléments
```typescript
await page.waitForSelector('[data-testid="success"]')
await expect(page.getByText('Confirmed')).toBeVisible()
```

❌ **Mauvais** : Timeouts arbitraires
```typescript
await page.waitForTimeout(5000)
```

### 3. Isolation des Tests

Chaque test doit être indépendant :
- Pas de dépendance sur l'ordre d'exécution
- Nettoyage des données après chaque test
- État initial cohérent

### 4. Data-testid pour Tests

Ajouter des attributs `data-testid` aux composants critiques :

```tsx
<form data-testid="booking-form">
  <button data-testid="submit-booking">Réserver</button>
</form>
```

## Intégration CI/CD

### GitHub Actions

Les tests E2E sont intégrés dans `.github/workflows/ci.yml` :

```yaml
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npm run test:e2e
    
    - uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```

### Artifacts

En cas d'échec, le rapport HTML est uploadé comme artifact GitHub Actions :
- Screenshots des échecs
- Vidéos des échecs
- Traces pour debugging

## Métriques

- **Temps d'exécution** : ~2-3 minutes (avec serveur de dev)
- **Couverture** : Scénarios critiques business
- **Navigateurs** : Chromium (extensible à Firefox, WebKit)
- **Viewports** : Desktop (1280x720), Mobile (375x667)

## Prochaines Améliorations

- [ ] Tests de paiement (avec Stripe en mode test)
- [ ] Tests multilingues (FR, EN, DE, ES)
- [ ] Tests de performance (Lighthouse CI)
- [ ] Tests de charge (Artillery ou k6)
- [ ] Visual regression testing (Percy/Chromatic)

## Support

Pour toute question :
- 📖 Documentation Playwright : https://playwright.dev
- 💬 Équipe : #testing channel

---

**Dernière mise à jour** : 22 décembre 2025  
**Version Playwright** : 1.48+
