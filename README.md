This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Payments

Stripe (cards, Apple Pay, Google Pay via Payment Request) and PayPal are integrated with booking-linked flows. A webhook finalizes state on the server, and daily maintenance cancels stale pending bookings.

### Apple Pay / Google Pay (Stripe Payment Request)

- UI: A wallet button renders when the browser supports Apple Pay (Safari/macOS/iOS) or Google Pay (Chrome/Android). It appears in the booking payment section.
- Flow: On wallet approval the app creates a pending booking, then a booking-linked PaymentIntent, confirms with the wallet token, and verifies server-side before success.

Setup steps:
- Enable Apple Pay and Google Pay in Stripe Dashboard > Payments > Payment methods.
- Apple Pay domain verification (required):
	- In Stripe Dashboard, add your domain and download the `apple-developer-merchantid-domain-association` file.
	- Place it at `public/.well-known/apple-developer-merchantid-domain-association` and re-verify in Stripe.
- Environment:
	- Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
	- Serve the site over HTTPS in production.
- Security headers: CSP allows `js.stripe.com`, `api.stripe.com`, `pay.google.com`, `payments.google.com`, and `apple-pay-gateway.apple.com`.

Notes:
- The wallet button hides automatically if the device/browser isn’t eligible.
- Use Apple Wallet or a Google Pay profile for testing on real devices; Stripe test mode is supported.

