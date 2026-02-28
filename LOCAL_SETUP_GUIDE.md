# Daltaners Platform — Local Development Setup Guide

## Prerequisites

Before starting, install the following on your machine:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20+ | JavaScript runtime |
| **pnpm** | 9.15.4 | Package manager (enforced by `packageManager` field) |
| **Docker Desktop** | Latest | Runs infrastructure containers |
| **Docker Compose** | v2+ | Orchestrates multi-container setup |
| **Git** | Latest | Version control |

### Install Node.js 20

**Windows (winget):**
```powershell
winget install OpenJS.NodeJS.LTS
```

**macOS (Homebrew):**
```bash
brew install node@20
```

**Linux (nvm):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
```

### Install pnpm

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

Verify:
```bash
node -v    # Should be v20.x.x
pnpm -v    # Should be 9.15.4
docker -v  # Should show Docker version
```

---

## Step 1: Clone the Repository

```bash
git clone <repository-url> daltaners
cd daltaners
```

---

## Step 2: Set Up Environment Variables

Copy the example file and adjust if needed:

```bash
cp .env.example .env
```

The defaults in `.env.example` are pre-configured for local Docker development:

| Variable | Default | Notes |
|----------|---------|-------|
| POSTGRES_HOST | localhost | |
| POSTGRES_PORT | 5432 | |
| POSTGRES_USER | daltaners | |
| POSTGRES_PASSWORD | daltaners_dev_password | Change in production |
| POSTGRES_DB | daltaners | |
| REDIS_HOST | localhost | |
| REDIS_PORT | 6379 | |
| KAFKA_BROKERS | localhost:9092 | |
| ELASTICSEARCH_NODE | http://localhost:9200 | |
| CASSANDRA_HOST | localhost | |
| CASSANDRA_PORT | 9042 | |
| JWT_SECRET | change-this-to-a-strong-secret-in-production | Change in production |

**No changes needed for local development** — the defaults work out of the box.

---

## Step 3: Install Dependencies

From the project root:

```bash
pnpm install
```

This installs dependencies for all 10 services, 3 apps, and 4 shared packages via pnpm workspaces.

---

## Step 4: Start Infrastructure Services

Start PostgreSQL, Redis, Kafka, Elasticsearch, and Cassandra:

```bash
docker compose up -d
```

Or using the npm script:

```bash
pnpm run docker:up
```

### Wait for All Services to Be Healthy

Check the status of all containers:

```bash
docker compose ps
```

All services should show `(healthy)` status. This can take 30–90 seconds, especially for Cassandra and Elasticsearch.

You can watch the health status live:

```bash
# Watch until all services are healthy
docker compose ps --format "table {{.Name}}\t{{.Status}}"
```

### Verify Individual Services

```bash
# PostgreSQL
docker exec daltaners-postgres pg_isready -U daltaners -d daltaners

# Redis
docker exec daltaners-redis redis-cli ping

# Kafka
docker exec daltaners-kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# Elasticsearch
curl http://localhost:9200/_cluster/health

# Cassandra (takes the longest — up to 60s)
docker exec daltaners-cassandra cqlsh -e "DESCRIBE KEYSPACES;"
```

---

## Step 5: Create Kafka Topics

The Kafka container has an init script mounted but it does not auto-execute. Create topics manually:

```bash
docker exec daltaners-kafka bash /docker-entrypoint-initdb.d/init-kafka-topics.sh
```

Verify topics were created:

```bash
docker exec daltaners-kafka kafka-topics --list --bootstrap-server localhost:9092
```

You should see:
```
daltaners.delivery.assignments
daltaners.delivery.tracking
daltaners.inventory.events
daltaners.notifications.outbound
daltaners.orders.events
daltaners.orders.status
daltaners.payments.events
daltaners.users.events
```

---

## Step 6: Build Shared Packages

The services depend on shared packages (`@daltaners/types`, `@daltaners/utils`, `@daltaners/config`). Build them first:

```bash
pnpm --filter @daltaners/types run build
pnpm --filter @daltaners/utils run build
pnpm --filter @daltaners/config run build
```

Or build everything at once (Turbo handles the dependency order):

```bash
pnpm run build
```

---

## Step 7: Start Development Servers

### Option A: Start Everything (All Services + All Apps)

```bash
pnpm run dev
```

Turbo runs all `dev` scripts in parallel. This starts all 10 NestJS services and all 3 React apps.

**Note:** This uses significant resources (10 Node.js processes + 3 Vite dev servers). If your machine is resource-constrained, use Option B.

### Option B: Start Specific Services

Start only the services you need:

```bash
# Start auth service (required by most other services)
pnpm --filter @daltaners/auth-service run dev

# Start additional services as needed
pnpm --filter @daltaners/user-service run dev
pnpm --filter @daltaners/catalog-service run dev
pnpm --filter @daltaners/order-service run dev

# Start a frontend app
pnpm --filter @daltaners/customer-web run dev
```

---

## Step 8: Access the Application

### Frontend Apps (Vite Dev Server)

| App | URL | Purpose |
|-----|-----|---------|
| Customer Web | http://localhost:5173 | Customer-facing storefront |
| Vendor Dashboard | http://localhost:5174 | Vendor store management |
| Admin Panel | http://localhost:5175 | Platform administration |

All three apps proxy `/api` requests to the auth-service at `localhost:3001` during development.

### Backend APIs

| Service | URL | Swagger Docs |
|---------|-----|-------------|
| Auth | http://localhost:3001/api/v1 | http://localhost:3001/api/docs |
| User | http://localhost:3002/api/v1 | http://localhost:3002/api/docs |
| Vendor | http://localhost:3003/api/v1 | http://localhost:3003/api/docs |
| Catalog | http://localhost:3004/api/v1 | http://localhost:3004/api/docs |
| Inventory | http://localhost:3005/api/v1 | http://localhost:3005/api/docs |
| Order | http://localhost:3006/api/v1 | http://localhost:3006/api/docs |
| Delivery | http://localhost:3007/api/v1 | http://localhost:3007/api/docs |
| Payment | http://localhost:3008/api/v1 | http://localhost:3008/api/docs |
| Notification | http://localhost:3010/api/v1 | http://localhost:3010/api/docs |
| Zone | http://localhost:3014/api/v1 | http://localhost:3014/api/docs |

### Health Check Endpoints

Every service exposes three health endpoints (no authentication required):

```bash
# Liveness — is the process alive?
curl http://localhost:3001/api/v1/health/live

# Readiness — is the service ready to accept traffic?
curl http://localhost:3001/api/v1/health/ready

# Startup — has the service finished initializing?
curl http://localhost:3001/api/v1/health/startup
```

### Infrastructure UIs

| Service | URL |
|---------|-----|
| Elasticsearch | http://localhost:9200 |
| Kafka (no built-in UI) | localhost:9092 |

---

## Running with Docker (Alternative to Native Dev)

If you prefer running the entire platform in containers instead of native Node.js:

```bash
# Start infrastructure
docker compose up -d

# Create Kafka topics
docker exec daltaners-kafka bash /docker-entrypoint-initdb.d/init-kafka-topics.sh

# Build and start all application services
docker compose -f docker-compose.yml -f docker-compose.services.yml up -d

# Build and start a specific service
docker compose -f docker-compose.yml -f docker-compose.services.yml up -d auth-service
```

Access the apps:

| App | URL |
|-----|-----|
| Customer Web | http://localhost:8080 |
| Admin Panel | http://localhost:8081 |
| Vendor Dashboard | http://localhost:8082 |

Backend services use the same ports (3001–3014) as in native dev.

---

## Running Tests

```bash
# Run all tests across all services
pnpm run test

# Run tests for a specific service
pnpm --filter @daltaners/auth-service run test

# Run tests with coverage
pnpm --filter @daltaners/auth-service run test:cov

# Run tests in watch mode
pnpm --filter @daltaners/auth-service run test:watch
```

---

## Common Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm run build` | Build all packages and services |
| `pnpm run dev` | Start all services and apps in dev mode |
| `pnpm run test` | Run all tests |
| `pnpm run lint` | Lint all code |
| `pnpm run typecheck` | Type-check all TypeScript |
| `pnpm run format` | Format all files with Prettier |
| `pnpm run docker:up` | Start infrastructure containers |
| `pnpm run docker:down` | Stop infrastructure containers |
| `pnpm run docker:reset` | Stop, delete volumes, and restart infrastructure |

---

## Troubleshooting

### "Port already in use"

Another process is using the port. Find and stop it:

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <pid> /F

# macOS/Linux
lsof -i :3001
kill -9 <pid>
```

### Cassandra Takes Too Long to Start

Cassandra is the slowest container to boot (60–90 seconds). If services fail to connect, wait and retry:

```bash
# Check Cassandra health
docker logs daltaners-cassandra --tail 20

# Restart a service after Cassandra is ready
pnpm --filter @daltaners/notification-service run dev
```

### Kafka Topics Not Created

If services fail with "topic not found" errors:

```bash
docker exec daltaners-kafka bash /docker-entrypoint-initdb.d/init-kafka-topics.sh
```

### "pnpm: command not found"

Enable corepack:

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

### Database Connection Refused

Ensure PostgreSQL is healthy:

```bash
docker compose ps postgres
docker logs daltaners-postgres --tail 20
```

If the container keeps restarting, the port may be used by a local PostgreSQL installation. Either stop the local instance or change the port mapping in `docker-compose.yml`.

### TypeORM Migration Errors

If the database schema is out of date:

```bash
pnpm --filter @daltaners/auth-service run migration:run
```

### Reset Everything (Nuclear Option)

Stop all containers, delete all data, and start fresh:

```bash
pnpm run docker:reset
docker exec daltaners-kafka bash /docker-entrypoint-initdb.d/init-kafka-topics.sh
```

**Warning:** This deletes all database data.
