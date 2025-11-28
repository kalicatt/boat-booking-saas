# Multi-stage build for Next.js
FROM node:22-bookworm AS deps
WORKDIR /app
COPY package.json package-lock.json* npm-shrinkwrap.json* ./
ENV npm_config_ignore_scripts=true
RUN npm install --legacy-peer-deps

FROM node:22-bookworm AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate --schema=prisma/schema.prisma || true
RUN npm run build

FROM node:22-bookworm AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
ENV npm_config_ignore_scripts=true
RUN npm install --omit=dev --legacy-peer-deps
ENV npm_config_ignore_scripts=
EXPOSE 3000
CMD ["npm", "run", "start"]
