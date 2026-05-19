# ── Stage 1: BUILD ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /build
COPY rideglory-common-lib ./rideglory-common-lib
COPY rideglory-contracts ./rideglory-contracts

WORKDIR /build/rideglory-common-lib
RUN npm install --ignore-scripts && npm run build

WORKDIR /build/rideglory-contracts
RUN npm install --ignore-scripts && npm run build

WORKDIR /build/users-ms
COPY users-ms/package.json users-ms/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY users-ms/ .
RUN DATABASE_URL=postgresql://x:x@localhost/x pnpm exec prisma generate
RUN pnpm build
RUN node_modules/.bin/tsc --skipLibCheck --module commonjs --esModuleInterop --moduleResolution node --outDir . prisma.config.ts

# ── Stage 2: RUNTIME ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /build/users-ms

COPY --from=builder /build/users-ms/node_modules ./node_modules
COPY --from=builder /build/users-ms/dist ./dist
COPY --from=builder /build/users-ms/prisma.config.js ./prisma.config.js
COPY users-ms/prisma ./prisma
COPY users-ms/healthcheck.js ./healthcheck.js

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node healthcheck.js

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
