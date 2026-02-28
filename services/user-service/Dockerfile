# ──────────────────────────────────────────────
# Daltaners User Service — Multi-stage Dockerfile
# Build context: monorepo root
# Usage: docker build -f services/user-service/Dockerfile -t daltaners/user-service .
# ──────────────────────────────────────────────

# Stage 1: Base image with pnpm
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
COPY services/user-service/package.json ./services/user-service/
RUN pnpm install --frozen-lockfile

# Stage 3: Build
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/types/ ./packages/types/
COPY packages/utils/ ./packages/utils/
COPY packages/config/ ./packages/config/
COPY services/user-service/ ./services/user-service/
RUN pnpm --filter @daltaners/types run build 2>/dev/null || true && \
    pnpm --filter @daltaners/utils run build 2>/dev/null || true && \
    pnpm --filter @daltaners/config run build 2>/dev/null || true && \
    pnpm --filter @daltaners/user-service run build

# Stage 4: Deploy — create standalone production package
FROM base AS deploy
COPY --from=build /app /app
RUN pnpm deploy --filter @daltaners/user-service --prod /app/deploy

# Stage 5: Production
FROM node:20-alpine AS production
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
WORKDIR /app
COPY --from=deploy --chown=appuser:appgroup /app/deploy ./
COPY --from=build --chown=appuser:appgroup /app/services/user-service/dist ./dist
USER appuser
EXPOSE 3002
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3002/api/v1/health/live || exit 1
CMD ["node", "dist/main.js"]
