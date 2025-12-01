# Release Guide

Concise steps to cut a new version (e.g., 1.0.4), build Docker images, and deploy safely.

## 1) Bump version and tag

```powershell
# Edit package.json version to 1.0.4 or run the helper
npm run release
git add .
git commit -m "release: v1.0.4"
git tag v1.0.4
git push origin master
git push origin v1.0.4
```

## 2) Build Docker images (versioned + latest)

```powershell
$workspace = "c:\SweetNarcisse\SweetNarcisse-demo"
Push-Location $workspace

docker build -t yourrepo/sweetnarcisse:1.0.4 -t yourrepo/sweetnarcisse:latest .

# Option A: Push to registry
docker push yourrepo/sweetnarcisse:1.0.4
docker push yourrepo/sweetnarcisse:latest

# Option B: Save tar for manual transfer
docker save yourrepo/sweetnarcisse:1.0.4 -o sweetnarcisse-1.0.4.tar

Pop-Location
```

## 3) Deploy on VPS (pinned version)

```bash
docker pull yourrepo/sweetnarcisse:1.0.4
docker rm -f sweetnarcisse || true
docker run -d -p 3000:3000 --name sweetnarcisse yourrepo/sweetnarcisse:1.0.4
```

## 4) Post-deploy checks

- Health check: `curl -I http://yourdomain` → 200.
- Verify payments: Stripe webhook and PayPal mode configured.
- Logs: `docker logs -f sweetnarcisse` for runtime issues.

## 5) Rollback (if needed)

```bash
docker rm -f sweetnarcisse || true
docker run -d -p 3000:3000 --name sweetnarcisse yourrepo/sweetnarcisse:1.0.2
```

---

## Branch Protection (Recommended)
- Protect `master`: require pull requests, code review, and disallow force-pushes.
- Enable required status checks (CI build/tests) before merge.
- Restrict who can push to `master` directly.

## CI: Tag-Based Docker Builds
When you push a tag like `v1.0.0`, GitHub Actions will build and push a Docker image:
- Workflow file: `.github/workflows/docker-release.yml`
- Choose registry:
	- GHCR: set repository variable `REGISTRY=ghcr.io` (Settings > Secrets and variables > Actions > Variables). Uses `GITHUB_TOKEN`.
	- Docker Hub: set `REGISTRY=docker.io` and add secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.
- Image tags:
	- GHCR: `ghcr.io/<org-or-user>/sweetnarcisse:<tag>` and `:latest`
	- Docker Hub: `<username>/sweetnarcisse:<tag>` and `:latest`

## Prevent Committing Large Artifacts
- Keep `*.tar` in `.gitignore`.
- Optional pre-commit hook (blocks tars):
```
#!/usr/bin/env bash
blocked=$(git diff --cached --name-only | grep -E '\\.tar$' || true)
if [ -n "$blocked" ]; then
	echo "Error: refusing to commit tar files:\n$blocked"; exit 1
fi
```
Save as `.git/hooks/pre-commit` and `chmod +x .git/hooks/pre-commit`.

## Notes
- Maintain `CHANGELOG.md` for each release.
- Keep env variables consistent across versions.
- Avoid using `latest` on servers; pin explicit tags.
