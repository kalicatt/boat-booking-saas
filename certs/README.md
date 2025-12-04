# Local HTTPS certificates

This folder stores developer TLS material generated with [`scripts/setup-dev-https.ps1`](../scripts/setup-dev-https.ps1).

The `.gitignore` already excludes `*.pem`, so only documentation files are committed. After running the script you should see:

- `certs/dev-cert.pem`
- `certs/dev-key.pem`

Both files are required by the HTTPS dev server (`npm run dev:https`).
