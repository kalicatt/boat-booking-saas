# Release Guide

Concise steps to cut a new version (e.g., 1.1.0), build Docker images, and deploy safely.

## 1) Bump version and tag

```powershell
# Edit package.json version to 1.1.0
git add package.json
git commit -m "release: v1.1.0"
git tag v1.1.0
git push origin master --tags
```

## 2) Build Docker images (versioned + latest)

```powershell
$workspace = "c:\SweetNarcisse\SweetNarcisse-demo"
Push-Location $workspace

docker build -t yourrepo/sweetnarcisse:1.1.0 -t yourrepo/sweetnarcisse:latest .

# Option A: Push to registry
docker push yourrepo/sweetnarcisse:1.1.0
docker push yourrepo/sweetnarcisse:latest

# Option B: Save tar for manual transfer
docker save yourrepo/sweetnarcisse:1.1.0 -o sweetnarcisse-1.1.0.tar

Pop-Location
```

## 3) Deploy on VPS (pinned version)

```bash
docker pull yourrepo/sweetnarcisse:1.1.0
docker rm -f sweetnarcisse || true
docker run -d -p 3000:3000 --name sweetnarcisse yourrepo/sweetnarcisse:1.1.0
```

## 4) Post-deploy checks

- Health check: `curl -I http://yourdomain` → 200.
- Verify payments: Stripe webhook and PayPal mode configured.
- Logs: `docker logs -f sweetnarcisse` for runtime issues.

## 5) Rollback (if needed)

```bash
docker rm -f sweetnarcisse || true
docker run -d -p 3000:3000 --name sweetnarcisse yourrepo/sweetnarcisse:1.0.0
```

## Notes
- Maintain `CHANGELOG.md` for each release.
- Keep env variables consistent across versions.
- Avoid using `latest` on servers; pin explicit tags.
