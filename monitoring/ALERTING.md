# Sweet Narcisse - Configuration des Alertes

## 📱 Canaux de Notification

### 1. Email (SMTP) ✅
- **Configuration**: Variables SMTP déjà en place
- **Destinataire**: admin@sweetnarcisse.fr
- **Alertes**: Critiques + Warnings
- **Format**: HTML avec détails complets

### 2. Ntfy.sh (Push Notifications) 🆓
- **URL**: https://ntfy.sh/sweetnarcisse-alerts
- **Gratuit**: Illimité
- **App mobile**: [Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy) | [iOS](https://apps.apple.com/app/ntfy/id1625396347)
- **Setup**:
  1. Installer l'app ntfy sur votre téléphone
  2. S'abonner au topic `sweetnarcisse-alerts`
  3. Recevoir les notifications en temps réel

**Tags utilisés**:
- 🚨 Critiques: `rotating_light,warning` (priorité urgent)
- ⚠️ Warnings: `warning` (priorité normal)

### 3. Discord Webhook (Optionnel) 🆓
- **Variable**: `DISCORD_WEBHOOK_URL` dans `.env.production.local`
- **Setup**:
  1. Serveur Discord → Paramètres → Intégrations → Webhooks
  2. Créer un webhook pour #alerts
  3. Copier l'URL dans la variable d'environnement

## 🚨 Alertes Configurées

### Infrastructure
- **HighDiskUsage**: Disque > 85% (critique)
- **HighMemoryUsage**: RAM > 90% (warning)
- **HighCPUUsage**: CPU > 80% pendant 10min (warning)

### Application
- **ApplicationDown**: App hors ligne > 2min (critique)
- **HighErrorRate**: Erreurs 5xx > 5% (critique)
- **HighLatency**: P95 > 2000ms pendant 10min (warning)
- **RateLimiterBlockSpike**: > 25 blocages en 5min (warning)
- **DatabaseConnectionFailure**: PostgreSQL inaccessible > 1min (critique)

### Business
- **NoBookingsToday**: Aucune réservation après 14h pendant 30min (warning)
- **HighCancellationRate**: > 20% d'annulations sur 1h (warning)

## ⏱️ Temporisation

- **Critiques**: Répétition toutes les 1h
- **Warnings**: Répétition toutes les 6h
- **Résolution**: Notification quand l'alerte est résolue

## 🔇 Inhibition

- Si `ApplicationDown` est déclenché → silence `HighErrorRate` et `HighLatency` (évite les doublons)

## 📊 Dashboard Alertmanager

- **URL**: http://51.178.17.205:9093
- **Interface**: Voir les alertes actives, les silences configurés

## 🧪 Test

```bash
# Tester une alerte manuellement
curl -H "Content-Type: application/json" -d '[{
  "labels": {"alertname":"TestAlert","severity":"critical"},
  "annotations": {"summary":"Test notification","description":"Ceci est un test"}
}]' http://localhost:9093/api/v1/alerts
```
