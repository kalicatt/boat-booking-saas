# 📝 Système de Logs Structurés - Pino

Ce document décrit le système de logging structuré mis en place avec [Pino](https://getpino.io/), un logger JSON haute performance pour Node.js.

## 🎯 Pourquoi Pino ?

- **Performance** : ~30x plus rapide que Winston, ~10x plus rapide que Bunyan
- **Logs structurés** : Format JSON pour faciliter le parsing et l'analyse
- **Faible overhead** : Minimal impact sur les performances de l'application
- **Niveaux de log** : trace, debug, info, warn, error, fatal
- **Pretty printing** : Affichage coloré et lisible en développement
- **Production-ready** : Rotation de logs, streaming, transport vers Elasticsearch/CloudWatch

## 📦 Installation

```bash
npm install pino pino-pretty
```

## 🚀 Utilisation

### Dans les fichiers `lib/`

```typescript
import { logger, logError, logWarn, logInfo } from '@/lib/logger'

// Méthode 1 : Utiliser le logger Pino directement
logger.info({ userId: 123, action: 'login' }, 'User logged in')
logger.error({ error, bookingId: 456 }, 'Booking failed')

// Méthode 2 : Utiliser les helpers (crée aussi un log en BDD)
await logInfo('User logged in', { userId: 123 })
await logError('Booking failed', { error, bookingId: 456 })
await logWarn('Rate limit approaching', { userId: 123 })
```

### Dans les routes API (`app/api/`)

```typescript
import { apiLogger } from '@/lib/apiLogger'

export async function POST(req: Request) {
  try {
    // ... votre code
    apiLogger.info('/api/bookings', 'Booking created', { bookingId: 123 })
  } catch (error) {
    apiLogger.error('/api/bookings', error, { userId: req.userId })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

## 📊 Niveaux de Log

| Niveau | Valeur | Usage | Exemple |
|--------|--------|-------|---------|
| **fatal** | 60 | Erreur critique qui crash l'app | Impossible de se connecter à la DB |
| **error** | 50 | Erreur qui nécessite attention | Paiement échoué, email non envoyé |
| **warn** | 40 | Situation anormale mais gérable | Rate limit atteint, cache Redis down |
| **info** | 30 | Événement important | Booking créé, user logged in |
| **debug** | 20 | Information de debugging | Cache hit/miss, query SQL |
| **trace** | 10 | Détails très verbeux | Chaque étape d'une fonction |

## 🎨 Format des Logs

### En développement (NODE_ENV=development)

```
[12:34:56] INFO (12345): User logged in
    userId: 123
    action: "login"
```

Format coloré et lisible grâce à `pino-pretty`.

### En production (NODE_ENV=production)

```json
{
  "level": "INFO",
  "time": "2025-12-22T12:34:56.789Z",
  "pid": 12345,
  "hostname": "sweet-narcisse-vps",
  "node_env": "production",
  "userId": 123,
  "action": "login",
  "msg": "User logged in"
}
```

Format JSON structuré, facile à parser et à indexer.

## 🔧 Configuration

### Variables d'environnement

```bash
# Niveau de log (trace, debug, info, warn, error, fatal)
LOG_LEVEL=info

# En production
NODE_ENV=production

# En développement (active pino-pretty)
NODE_ENV=development
```

### Configuration avancée (lib/logger.ts)

```typescript
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  // Pretty printing en développement
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
})
```

## 🗄️ Double Logging (Pino + Base de Données)

Les fonctions `logInfo()`, `logWarn()`, `logError()` créent **deux logs** :

1. **Log Pino** : JSON structuré vers stdout/stderr
2. **Log BDD** : Enregistrement dans la table `Log` pour audit

```typescript
await logError('Payment failed', { bookingId: 123 })
// → Log Pino en console
// → Log en BDD (table Log)
```

## 📈 Bonnes Pratiques

### ✅ À FAIRE

```typescript
// Log structuré avec contexte
logger.info({ userId: 123, bookingId: 456 }, 'Booking created')

// Erreur avec objet Error complet
logger.error({ error, bookingId: 123 }, 'Payment failed')

// Contexte métier utile
apiLogger.error('/api/bookings', error, {
  bookingId: 123,
  userId: 456,
  amount: 100,
  paymentMethod: 'stripe',
})
```

### ❌ À ÉVITER

```typescript
// Console.log non structuré (ancien système)
console.log('User logged in')  // ❌

// Message trop vague
logger.info('Error')  // ❌

// Pas de contexte
logger.error(error)  // ❌

// Logs sensibles
logger.info({ password: 'secret123' })  // ❌ SÉCURITÉ
```

## 🔍 Recherche et Analyse

### Rechercher dans les logs

```bash
# En production (logs JSON)
cat logs/app.log | grep "bookingId\":123"

# Avec jq (JSON parser)
cat logs/app.log | jq 'select(.bookingId == 123)'

# Filtrer par niveau
cat logs/app.log | jq 'select(.level == "ERROR")'

# Compter les erreurs par route
cat logs/app.log | jq -r 'select(.level == "ERROR") | .route' | sort | uniq -c
```

### Intégration avec ELK Stack (futur)

Les logs JSON Pino sont parfaits pour Elasticsearch :

```bash
# Streamer vers Elasticsearch
node app.js | pino-elasticsearch --node http://localhost:9200
```

## 🔄 Migration depuis console.log

### Ancien code

```typescript
console.log('Booking created')
console.error('Payment failed:', error)
console.warn('Cache miss')
```

### Nouveau code

```typescript
import { logger } from '@/lib/logger'

logger.info({ bookingId: 123 }, 'Booking created')
logger.error({ error, bookingId: 123 }, 'Payment failed')
logger.warn({ key: 'bookings:123' }, 'Cache miss')
```

### Dans les routes API

```typescript
// Ancien
console.error('POST /api/bookings', error)

// Nouveau
import { apiLogger } from '@/lib/apiLogger'
apiLogger.error('/api/bookings', error, { bookingId: 123 })
```

## 📊 Métriques et Monitoring

Les logs Pino peuvent être utilisés pour :

- **Alertes** : Détecter les erreurs en temps réel
- **Métriques** : Compter les événements (bookings/h, erreurs/h)
- **Debugging** : Tracer les requêtes de bout en bout
- **Audit** : Garder une trace de toutes les actions

### Exemple : Alerte sur erreurs

```bash
# Alert si > 10 erreurs en 5 minutes
tail -f logs/app.log | jq -r 'select(.level == "ERROR")' | wc -l
```

## 🛠️ Outils Compatibles

- **pino-pretty** : Pretty print en développement ✅ (installé)
- **pino-roll** : Rotation de logs par jour/heure
- **pino-http** : Logging automatique des requêtes HTTP
- **pino-elasticsearch** : Stream vers Elasticsearch
- **pino-cloudwatch** : Stream vers AWS CloudWatch
- **pino-datadog** : Stream vers Datadog

## 🚀 Prochaines Étapes

1. **Rotation des logs** : Installer `pino-roll` pour rotation quotidienne
2. **HTTP logging** : Ajouter `pino-http` pour logger toutes les requêtes
3. **Centralisation** : Stream vers Elasticsearch ou CloudWatch
4. **Dashboards** : Visualiser les logs dans Grafana/Kibana
5. **Alertes** : Configurer des alertes sur erreurs critiques

## 📚 Ressources

- [Documentation Pino](https://getpino.io/)
- [Pino API Reference](https://getpino.io/docs/api)
- [Pino Best Practices](https://getpino.io/docs/best-practices)
- [Benchmarks Pino vs autres loggers](https://getpino.io/docs/benchmarks)

---

**Implémenté le** : 22 décembre 2025  
**Version** : 1.0.0  
**Item ROADMAP** : #12 - Logs Structurés (Pino)
