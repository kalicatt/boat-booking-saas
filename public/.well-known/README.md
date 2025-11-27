Apple Pay domain verification

1) In Stripe Dashboard > Payments > Apple Pay, add your production domain.
2) Download the domain association file.
3) Replace the placeholder file at:
   public/.well-known/apple-developer-merchantid-domain-association
   with the EXACT content from Stripe (no extension, same filename).
4) Ensure the file is publicly accessible at:
   https://<your-domain>/.well-known/apple-developer-merchantid-domain-association

Notes:
- Serve over HTTPS in production.
- Do not change the filename or add an extension.
- Keep CSP allowing js.stripe.com, api.stripe.com, apple-pay-gateway.apple.com.
