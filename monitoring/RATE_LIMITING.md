# Rate Limiting Configuration

## Vue d'ensemble

Le système de rate limiting protège l'application contre:
- Les attaques par déni de service (DoS)
- Les tentatives de brute force sur les endpoints sensibles
- L'usage abusif des APIs

## Architecture

- **Backend**: [@upstash/redis](https://upstash.com/) (fallback mémoire si Redis indisponible)
- **Algorithme**: Token Bucket avec refill progressif
- **Métriques**: Exposition Prometheus pour monitoring Grafana
- **Identification**: IP client (x-forwarded-for, x-real-ip, fallback)

## Configuration Endpoints

| Endpoint | Limite | Fenêtre | Description |
|----------|--------|---------|-------------|
| `/api/contact/private` | 5 req/IP | 5 min | Contact formulaire privé |
| `/api/contact/group` | 5 req/IP | 5 min | Contact formulaire groupe |
| `/api/bookings` | Voir code | 1 min | Création de réservation |
| `/api/bookings/release` | 30 req/IP | 1 min | Libération de slot |
| `/api/auth/change-password` | 10 req/IP | 5 min | Changement de mot de passe |
| `/api/auth/update-profile` | 30 req/IP | 1 min | Mise à jour profil |
| `/api/auth/profile` (PUT) | 40 req/user+IP | 1 min | Mise à jour profil utilisateur |

## Variables d'environnement

```bash
# Upstash Redis (production recommandé)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# OU alternative générique
RATE_LIMIT_REDIS_URL=https://xxx.upstash.io
RATE_LIMIT_REDIS_TOKEN=xxx
```

**Plan gratuit Upstash**: 10 000 requêtes/jour, suffisant pour cette application.

## Implémentation

### Utilisation basique

```typescript
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(request: Request) {
  const ip = getClientIp(request.headers)
  
  const rl = await rateLimit({
    key: `api:endpoint:${ip}`,
    limit: 10,          // 10 requêtes max
    windowMs: 60_000    // dans une fenêtre de 1 minute
  })

  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many requests' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.retryAfter || 0) / 1000))
        }
      }
    )
  }

  // Traitement normal...
}
```

### Configuration avancée

```typescript
// Rate limiting par utilisateur + IP
const userId = session.user.id
const rl = await rateLimit({
  key: `user:${userId}:${ip}`,
  limit: 100,
  windowMs: 3600_000  // 1 heure
})

// Rate limiting par email (contacts)
const rl = await rateLimit({
  key: `contact:email:${email.toLowerCase()}`,
  limit: 3,
  windowMs: 300_000  // 5 minutes
})
```

## Monitoring

### Métriques Prometheus

- `rate_limiter_allowed_total{bucket}`: Nombre de requêtes autorisées par bucket
- `rate_limiter_blocked_total{bucket}`: Nombre de requêtes bloquées par bucket

### Dashboard Grafana

Accès: http://51.178.17.205:3001/d/rate-limiting

**Panneaux disponibles**:
1. **Requests Allowed**: Taux de requêtes autorisées par bucket (5min)
2. **Requests Blocked**: Taux de requêtes bloquées par bucket (5min)
3. **Top 10 Blocked Buckets**: Buckets les plus bloqués (1h)
4. **Block Rate Percentage**: % de requêtes bloquées (gauge avec seuils)
5. **Total Allowed vs Blocked**: Compteurs 24h
6. **Active Buckets**: Nombre de buckets actifs
7. **Blocked Buckets**: Nombre de buckets avec blocages

### Alertes Prometheus

Alerte configurée dans `monitoring/alerts.yml`:

```yaml
- alert: RateLimiterBlockSpike
  expr: sum(rate(rate_limiter_blocked_total[5m])) > 25
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Rate limiter blocking many requests"
    description: "{{ $value }} requests/s are being blocked by rate limiter"
```

**Seuils**:
- Warning: >25 blocages en 5 minutes
- Notification: ntfy.sh (sweetnarcisse-alerts)

## Algorithme Token Bucket

### Principe

1. Chaque bucket (key) a une capacité maximale de tokens
2. Chaque requête consomme 1 token
3. Les tokens se rechargent progressivement au fil du temps
4. Refill rate = capacity / window (ex: 10 tokens / 60s = 0.167 token/s)

### Implémentation Redis (Lua script)

```lua
-- Calcul du temps écoulé depuis dernier refill
local elapsed = now - timestamp

-- Refill proportionnel au temps écoulé
local refill = elapsed * refill_rate
tokens = min(capacity, tokens + refill)

-- Consommation token
if tokens >= 1 then
  allowed = 1
  tokens = tokens - 1
else
  allowed = 0
  retry_after = ceil((1 - tokens) / refill_rate)
end
```

### Avantages

- Lissage du trafic (pas de reset brutal)
- Burst toléré jusqu'à la capacité max
- Refill progressif évite les pics après expiration

## Fallback mémoire

Si Redis est indisponible, fallback automatique sur Map mémoire:

```typescript
const memoryBuckets = new Map<string, Bucket>()

// Algorithme simplifié (reset brutal)
if (elapsed >= windowMs) {
  bucket.tokens = limit - 1  // Reset complet
} else {
  bucket.tokens -= 1  // Décrément
}
```

**Limitations**:
- Reset brutal (pas de refill progressif)
- État non partagé entre instances
- Perte des données au redémarrage

**Usage**: Développement local uniquement. **Production doit utiliser Redis.**

## Tests

### Test manuel via curl

```bash
# Test endpoint avec rate limiting
for i in {1..6}; do
  curl -X POST https://sweetnarcisse.com/api/contact/private \
    -H "Content-Type: application/json" \
    -d '{"subject":"test","message":"test"}' \
    -w "\nHTTP %{http_code}\n"
  sleep 1
done

# Après 5 requêtes: HTTP 429 (Too Many Requests)
# Header: Retry-After: 60 (secondes)
```

### Test via tests unitaires

```typescript
// tests/rateLimit.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit } from '@/lib/rateLimit'

describe('rateLimit', () => {
  beforeEach(() => {
    // Clear memory buckets
    memoryBuckets.clear()
  })

  it('allows requests within limit', async () => {
    const rl1 = await rateLimit({ key: 'test:1', limit: 3, windowMs: 60000 })
    expect(rl1.allowed).toBe(true)
    expect(rl1.remaining).toBe(2)

    const rl2 = await rateLimit({ key: 'test:1', limit: 3, windowMs: 60000 })
    expect(rl2.allowed).toBe(true)
    expect(rl2.remaining).toBe(1)
  })

  it('blocks requests exceeding limit', async () => {
    // Consume all tokens
    await rateLimit({ key: 'test:2', limit: 2, windowMs: 60000 })
    await rateLimit({ key: 'test:2', limit: 2, windowMs: 60000 })

    const rl = await rateLimit({ key: 'test:2', limit: 2, windowMs: 60000 })
    expect(rl.allowed).toBe(false)
    expect(rl.retryAfter).toBeGreaterThan(0)
  })
})
```

## Troubleshooting

### Redis connexion échoue

**Symptômes**: Logs "Rate limit redis fallback"

**Solutions**:
1. Vérifier variables `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`
2. Tester connexion: `curl -H "Authorization: Bearer $TOKEN" $URL/get/test`
3. Vérifier quota Upstash (10k req/jour gratuit)

### Tous les utilisateurs sont bloqués

**Symptômes**: 429 même pour nouvelles IPs

**Causes possibles**:
1. IP détectée incorrectement (tous = "unknown")
2. Nginx reverse proxy ne forward pas x-forwarded-for
3. Limite trop basse pour le trafic réel

**Solutions**:
```nginx
# nginx.conf
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
```

### Métriques ne s'incrémentent pas

**Symptômes**: `rate_limiter_*_total` absent de /api/metrics

**Causes**:
1. Aucune requête rate-limited depuis redémarrage
2. Endpoint non configuré avec rateLimit()

**Vérification**:
```bash
# Générer du trafic
for i in {1..10}; do curl https://sweetnarcisse.com/api/contact/private; done

# Vérifier métriques
curl https://sweetnarcisse.com/api/metrics | grep rate_limiter
```

## Recommandations

### Production

1. **Toujours utiliser Redis** (Upstash gratuit suffit)
2. **Monitorer le dashboard Grafana** régulièrement
3. **Ajuster les limites** selon le trafic réel (voir métriques)
4. **Configurer les alertes** pour détecter les attaques DoS

### Sécurité

1. **Ne jamais exposer** les métriques publiquement (/api/metrics protégé)
2. **Logger les blocages** suspects (>100 req/min d'une IP)
3. **Combiner** avec d'autres protections (Cloudflare, fail2ban)
4. **Rate limit par email** en plus de l'IP pour les contacts

### Performance

1. **Redis > Mémoire** (état partagé, persistance)
2. **Lua script atomique** (pas de race conditions)
3. **TTL 2x window** pour cleanup automatique
4. **Async metrics** (Promise.resolve() non-bloquant)

## Références

- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html#rate-limiting)
