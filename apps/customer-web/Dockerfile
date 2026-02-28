# ──────────────────────────────────────────────
# Daltaners Customer Web — Multi-stage Dockerfile
# Build context: monorepo root
# Usage: docker build -f apps/customer-web/Dockerfile -t daltaners/customer-web .
# ──────────────────────────────────────────────

# Stage 1: Base image with pnpm
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/
COPY apps/customer-web/package.json ./apps/customer-web/
RUN pnpm install --frozen-lockfile

# Stage 3: Build
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/customer-web/ ./apps/customer-web/
RUN pnpm --filter @daltaners/customer-web run build

# Stage 4: Production — Nginx serving static files
FROM nginx:1.25-alpine AS production
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
COPY --from=build /app/apps/customer-web/dist /usr/share/nginx/html
COPY apps/customer-web/nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R appuser:appgroup /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown appuser:appgroup /var/run/nginx.pid
USER appuser
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
