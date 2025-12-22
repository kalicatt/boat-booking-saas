# Blue-Green Deployment Documentation

## Overview

Blue-Green deployment enables zero-downtime deployments by running two identical production environments:
- **Blue**: Primary production instance (port 3001)
- **Green**: Secondary production instance (port 3002)

## Architecture

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (reverse   │
                    │   proxy)    │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    ┌─────────────────┐       ┌─────────────────┐
    │   Blue (3001)   │       │  Green (3002)   │
    │   [ACTIVE]      │       │   [STANDBY]     │
    └─────────────────┘       └─────────────────┘
              │                         │
              └────────────┬────────────┘
                           │
                    ┌──────┴──────┐
                    │  PostgreSQL │
                    │   (shared)  │
                    └─────────────┘
```

## Quick Start

### Initial Setup

```bash
# Create the docker network if not exists
docker network create sweet-narcisse

# Start blue instance (default)
docker compose -f docker-compose.yml -f docker-compose.bluegreen.yml up -d app-blue

# Verify health
curl http://localhost:3001/api/health
```

### Deploy New Version

```bash
# Deploy to the inactive color (auto-detected)
./scripts/blue-green-switch.sh deploy

# Or specify the target color explicitly
./scripts/blue-green-switch.sh green
```

### Rollback

```bash
# Instant rollback to previous version
./scripts/blue-green-switch.sh rollback
```

### Check Status

```bash
./scripts/blue-green-switch.sh status
```

## Deployment Process

1. **Pull new image** (if `DOCKER_IMAGE_TAG` is set)
2. **Start new color instance**
3. **Health check** (up to 30 retries, 2s interval)
4. **Switch nginx upstream** to new instance
5. **Wait for traffic drain** (10s grace period)
6. **Stop old instance**
7. **Save deployment state**

## Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.bluegreen.yml` | Blue/Green container definitions |
| `nginx/bluegreen-upstream.conf` | Nginx upstream configuration |
| `scripts/blue-green-switch.sh` | Deployment script |
| `/var/lib/sweet-narcisse/deployment-state.json` | Runtime state |

## Environment Variables

Set these in your deployment environment:

```bash
export DOCKER_IMAGE_TAG=v1.2.3  # Optional: specific version
export DATABASE_URL=...
export NEXTAUTH_URL=...
export NEXTAUTH_SECRET=...
# ... other env vars from .env
```

## Health Checks

The script verifies instance health before switching:

```bash
# Check blue health
curl http://localhost:8080/health/blue

# Check green health  
curl http://localhost:8080/health/green

# Check active instance health
curl http://localhost:8080/health/active

# Get deployment status (JSON)
curl http://localhost:8080/deployment/status
```

## Manual Operations

### Start specific instance
```bash
docker compose -f docker-compose.yml -f docker-compose.bluegreen.yml up -d app-blue
docker compose -f docker-compose.yml -f docker-compose.bluegreen.yml up -d app-green
```

### Stop specific instance
```bash
docker compose -f docker-compose.yml -f docker-compose.bluegreen.yml stop app-blue
docker compose -f docker-compose.yml -f docker-compose.bluegreen.yml stop app-green
```

### View logs
```bash
docker logs -f sweet-narcisse-blue
docker logs -f sweet-narcisse-green
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy
on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: root
          key: ${{ secrets.VPS_SSH_KEY }}
          port: 5522
          script: |
            cd /opt/sweetnarcisse
            export DOCKER_IMAGE_TAG=${{ github.ref_name }}
            ./scripts/blue-green-switch.sh deploy
```

## Troubleshooting

### Health check fails
```bash
# Check container logs
docker logs sweet-narcisse-blue

# Check if port is accessible
curl -v http://localhost:3001/api/health

# Check container status
docker ps -a | grep sweet-narcisse
```

### Nginx reload fails
```bash
# Test nginx config
nginx -t

# Check nginx error log
tail -f /var/log/nginx/error.log
```

### Rollback not working
```bash
# Check state file
cat /var/lib/sweet-narcisse/deployment-state.json

# Manual switch
./scripts/blue-green-switch.sh blue  # or green
```

## Limitations

- **Database migrations**: Must be backward-compatible for both versions during switch
- **Session persistence**: Sessions stored in Redis work across both instances
- **File storage**: Both instances share MinIO, no file sync needed

## Best Practices

1. **Always test migrations** with both versions before deploying
2. **Use semantic versioning** for Docker image tags
3. **Monitor both instances** during the switch window
4. **Keep rollback ready** for at least 24h after deployment
5. **Run database migrations** before deploying new app version
