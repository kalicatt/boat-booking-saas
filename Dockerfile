# 1. Installer les dépendances (y compris dev pour la compilation)
FROM node:22-bookworm AS deps
WORKDIR /app
COPY package.json package-lock.json* npm-shrinkwrap.json* ./
ENV npm_config_ignore_scripts=true
RUN npm ci --legacy-peer-deps

# 2. Construire l'application et le script de seed
FROM node:22-bookworm AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Variables NEXT_PUBLIC nécessaires au build (substituées par docker-compose)
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_STRIPE_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_PAYPAL_CLIENT_ID
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_WIND_ALERT_THRESHOLD

ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_STRIPE_KEY=$NEXT_PUBLIC_STRIPE_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_PAYPAL_CLIENT_ID=$NEXT_PUBLIC_PAYPAL_CLIENT_ID
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_WIND_ALERT_THRESHOLD=$NEXT_PUBLIC_WIND_ALERT_THRESHOLD

# Générer le client Prisma (Utiliser le binaire local pour éviter le bug de version v7)
RUN ./node_modules/.bin/prisma generate --schema=prisma/schema.prisma

# Compiler le seed.ts en seed.js (Force l'émission du fichier JS)
RUN ./node_modules/.bin/tsc prisma/seed.ts --module CommonJS --target ES2022 --moduleResolution node --esModuleInterop --skipLibCheck --noEmit false

# Construire le site Next.js
RUN npm run build

# Retirer les dépendances de développement pour ne conserver que la prod
RUN npm prune --omit=dev

# 3. Image de production (légère)
FROM node:22-bookworm AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Créer un utilisateur non privilégié pour exécuter l'app
RUN groupadd --system nextjs && useradd --system --gid nextjs --home /app --shell /usr/sbin/nologin nextjs

# Copier les fichiers nécessaires
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# S'assurer que l'utilisateur non-root possède les artefacts copiés
RUN chown -R nextjs:nextjs /app

ENV npm_config_ignore_scripts=
EXPOSE 3000
USER nextjs
CMD ["npm", "run", "start"]
