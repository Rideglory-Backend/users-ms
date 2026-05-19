# ── Stage 1: BUILD ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

# Set up /build with shared libs alongside the service so file: deps resolve:
#   /build/rideglory-common-lib/
#   /build/rideglory-contracts/
#   /build/users-ms/              ← WORKDIR
WORKDIR /build
COPY rideglory-common-lib ./rideglory-common-lib
COPY rideglory-contracts ./rideglory-contracts

WORKDIR /build/users-ms
COPY users-ms/package.json users-ms/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY users-ms/ .
RUN DATABASE_URL=postgresql://x:x@localhost/x pnpm exec prisma generate
RUN pnpm build

# ── Stage 2: RUNTIME ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /build
COPY rideglory-common-lib ./rideglory-common-lib
COPY rideglory-contracts ./rideglory-contracts

WORKDIR /build/users-ms
COPY users-ms/package.json users-ms/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm store prune

COPY --from=builder /build/users-ms/dist ./dist
COPY users-ms/prisma ./prisma
COPY users-ms/healthcheck.js ./healthcheck.js

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node healthcheck.js

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
