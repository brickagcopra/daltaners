# CLAUDE.md — Daltaners Platform Development Guide

## Project Overview

Daltaners is a Filipino O2O (Online-to-Offline) e-commerce and groceries platform built as a microservices architecture. Before writing ANY code, always read the relevant skill files and this document fully.

**Tech Stack:** NestJS 10 · PostgreSQL 16 · CassandraDB 4 · Redis 7 · Elasticsearch 8 · React 19 · React Native 0.74+ · Zustand · Tailwind CSS · Shadcn/ui · Docker · Kubernetes · Apache Kafka

**Reference Documents:**
- `Daltaners_PRD.txt` — Product Requirements Document (features, personas, business rules)
- `Daltaners_PDD.txt` — Product Design Document (architecture, schemas, infra)

---
 Remember to always consider your context window when you're working on a certain feature or file or codes. Divide or allocate tasks according to your context limits to make sure you finish particular tasks within a context limit cycle and then let me know.Then tell me to use the /CLEAR command to reset your context.
Create a file for completed tasks and pending tasks so I can track the progress of our work. Please make sure to update the "Completed" and "Pending" tasks.

## Critical Rules — Read Before Every Task

### 1. Security-First Development

**NEVER** do any of the following:
- Store secrets, API keys, or credentials in source code or Docker images
- Use `any` type for request/response DTOs — always validate with `class-validator`
- Trust client-provided MIME types or file extensions — always verify magic bytes
- Disable CORS, CSRF, or rate limiting for convenience
- Use `SELECT *` or unparameterized queries
- Return stack traces or internal error details to clients in production
- Skip input sanitization on any user-facing endpoint
- Use `eval()`, `Function()`, or dynamic `require()` with user input

**ALWAYS** do the following:
- Validate ALL inputs with `class-validator` + `class-transformer` DTOs
- Use parameterized queries via TypeORM — never build raw SQL from user input
- Apply rate limiting on every public endpoint (`@nestjs/throttler`)
- Use Helmet middleware for HTTP security headers
- Implement RBAC guards on every controller method
- Sanitize HTML output to prevent XSS (`sanitize-html` or `DOMPurify`)
- Log security events (failed logins, permission denials, suspicious patterns)
- Use `bcrypt` (cost factor ≥ 12) for password hashing
- Rotate JWT refresh tokens on every use and blacklist old ones in Redis

### 2. Performance-First Patterns

**NEVER:**
- Make synchronous blocking calls inside request handlers
- Load entire collections into memory — always paginate
- Skip database indexes on columns used in WHERE, JOIN, or ORDER BY
- Make N+1 queries — use eager loading or DataLoader patterns
- Return unnecessary fields — always use `select` projections
- Skip caching for data that doesn't change every request

**ALWAYS:**
- Use cursor-based pagination for large datasets
- Cache with Redis using a consistent key schema (documented below)
- Set appropriate TTLs — don't cache forever
- Use database connection pooling (PgBouncer for PostgreSQL)
- Compress API responses with gzip/brotli
- Implement circuit breakers for external service calls
- Use Kafka for async processing — don't block the request thread for non-critical work
- Use database transactions only for operations that truly require atomicity

### 3. Code Architecture Standards

**EVERY microservice must follow this structure:**
```
src/
  main.ts
  app.module.ts
  config/                    # Environment + database + kafka config
  common/
    decorators/              # @CurrentUser, @Roles, @Permissions
    filters/                 # AllExceptionsFilter, HttpExceptionFilter
    guards/                  # JwtAuthGuard, RolesGuard, ThrottlerGuard
    interceptors/            # LoggingInterceptor, TransformInterceptor, TimeoutInterceptor
    pipes/                   # ValidationPipe (global), ParseUUIDPipe
    interfaces/
    dto/                     # Shared DTOs (pagination, response envelope)
    constants/
    utils/
  modules/
    {domain}/
      {domain}.module.ts
      {domain}.controller.ts
      {domain}.service.ts
      {domain}.repository.ts
      dto/
      entities/
      events/
      subscribers/
      tests/
  health/                    # Kubernetes readiness + liveness probes
```

**Module rules:**
- One module per bounded context — don't combine unrelated concerns
- Controllers handle HTTP only — no business logic
- Services contain business logic — no HTTP or database concerns
- Repositories handle data access — use the Repository pattern
- DTOs validate input — one DTO per endpoint direction (create, update, response)

---

## Database Rules

### PostgreSQL (ACID Transactions, Relational Data)
- **Use for:** Users, vendors, products, orders, payments, inventory, zones, wallets
- **Always** use migrations (TypeORM migration files) — never modify schemas manually
- **Always** add indexes for foreign keys and frequently queried columns
- **Use** PostGIS for geospatial queries (zone boundaries, store proximity)
- **Use** BRIN indexes for timestamp columns in large append-only tables
- **Use** `gen_random_uuid()` for primary keys — never auto-increment integers
- **Use** `TIMESTAMPTZ` (not `TIMESTAMP`) for all time columns
- **Partition** the orders table by month for query performance

### CassandraDB (High-Write Throughput, Time-Series)
- **Use for:** GPS tracking, order events, chat messages, notification logs, analytics events, search logs, product views
- **ALWAYS** design the partition key to avoid hotspots — distribute writes evenly
- **ALWAYS** set TTL on every table — no infinite data retention
- **NEVER** use secondary indexes as a substitute for proper data modeling
- **NEVER** do full table scans — every query must hit a specific partition
- **Model** tables around query patterns, not around entity relationships
- **Use** `TimeWindowCompactionStrategy` for time-series tables

### Redis (Cache, Sessions, Real-Time)
- **Key naming convention:** `{service}:{entity}:{identifier}` (e.g., `catalog:product:uuid`)
- **Always** set TTL — no orphaned keys
- **Use** Redis GEO commands for delivery personnel proximity queries
- **Use** Redis Pub/Sub for cross-instance Socket.IO communication
- **Use** Lua scripts for atomic multi-step operations (stock reservation)
- **Cache invalidation:** Write-through for critical data; event-driven for others

### Elasticsearch (Search)
- **Use for:** Product search, store search, auto-complete
- **Keep** Elasticsearch as a read-only projection — PostgreSQL is source of truth
- **Sync** via Debezium CDC → Kafka → Elasticsearch sink connector
- **Use** Filipino/English synonym analyzers for Filipino product names
- **Use** edge n-gram tokenizer for autocomplete

---

## API Design Standards

### URL Convention
```
Base:    /api/v1/{resource}
CRUD:    GET /api/v1/products         POST /api/v1/products
Detail:  GET /api/v1/products/:id     PATCH /api/v1/products/:id
Nested:  GET /api/v1/stores/:storeId/products
Actions: POST /api/v1/orders/:id/cancel
```

### Response Envelope
```typescript
// Success
{ success: true, data: { ... }, meta: { page, limit, total }, timestamp: string }

// Error
{ success: false, error: { code: string, message: string, details: [], statusCode: number }, timestamp: string }
```

### Rules
- Use `PATCH` for partial updates, `PUT` for full replacement
- Return `201` for created resources with `Location` header
- Return `204` for successful deletions with no body
- Use cursor-based pagination for customer-facing endpoints
- Use offset-based pagination for admin panel endpoints
- Always version APIs in the URL path: `/api/v1/`, `/api/v2/`
- Never break existing API contracts — add new fields, don't remove old ones

---

## Image & File Upload Rules — CRITICAL

> **Before implementing ANY file upload feature, read the image security skill at:**
> `skills/daltaners-image-security/SKILL.md`

### Hard Rules
1. **NEVER** trust `file.mimetype` or `file.originalname` — always validate magic bytes
2. **NEVER** save original user uploads directly to S3 — always process through the image pipeline
3. **NEVER** allow uploads larger than 10MB for images or 25MB for documents
4. **ALWAYS** check pixel dimensions BEFORE decompression to prevent image/decompression bombs
5. **ALWAYS** strip EXIF metadata (GPS, camera info) from user photos for privacy
6. **ALWAYS** generate all size variants (thumbnail, medium, large, original) server-side
7. **ALWAYS** serve images via CDN, never directly from S3
8. **ALWAYS** scan uploaded documents with ClamAV before storage
9. **ALWAYS** use a separate, isolated processing container for image operations
10. **ALWAYS** use `sharp` with `limitInputPixels` set to prevent decompression bombs

---

## Event-Driven Architecture Rules

### Kafka Topics — Naming Convention
```
daltaners.{domain}.{event-type}
```
Examples: `daltaners.orders.placed`, `daltaners.inventory.low`, `daltaners.payments.completed`

### Event Schema (CloudEvents)
```typescript
interface DaltanersEvent<T> {
  specversion: '1.0';
  id: string;          // UUID v4
  source: string;      // 'daltaners/{service-name}'
  type: string;        // 'com.daltaners.{domain}.{action}'
  datacontenttype: 'application/json';
  time: string;        // ISO 8601
  data: T;
}
```

### Rules
- Every event must be idempotent — consumers must handle duplicates safely
- Use `idempotency_key` on payment events
- Dead letter queues for every consumer group
- Consumer group naming: `daltaners-{service-name}-{purpose}-group`
- Retry policy: 3 retries with exponential backoff (1s, 5s, 25s), then DLQ
- Never lose events — use `acks: -1` (all replicas) for producers

---

## Authentication & Authorization

### JWT Structure
```json
{
  "sub": "user_uuid",
  "role": "customer | vendor_owner | vendor_staff | delivery | admin",
  "permissions": ["order:create", "order:read"],
  "vendor_id": "uuid | null",
  "jti": "unique_token_id"
}
```

### Token Lifecycle
- Access token: 15 minutes TTL
- Refresh token: 30 days TTL, rotated on every use
- Blacklist revoked JTIs in Redis with TTL matching token expiry

### Guard Decorators
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendor_owner', 'vendor_staff')
@RequirePermissions('product:manage')
```

---

## Testing Requirements

### Minimum Coverage
- Unit tests: 80% line coverage per service
- Integration tests: All repository methods, all Kafka consumers
- E2E tests: Critical user flows (order placement, payment, delivery)

### Test Naming
```
describe('OrderService')
  describe('createOrder')
    it('should create order with valid input')
    it('should throw when store is closed')
    it('should reserve inventory on order creation')
    it('should publish ORDER_PLACED event')
```

### Test Stack
- **Unit:** Jest + mocks
- **Integration:** Jest + Testcontainers (PostgreSQL, Redis, Kafka)
- **E2E:** Supertest against running service
- **Performance:** k6 scripts in `/tests/performance/`

---

## Docker & Kubernetes Rules

### Dockerfile Standards
- Multi-stage builds (builder + production)
- Run as non-root user (`appuser:appgroup`)
- Use `node:20-alpine` base image
- Include `HEALTHCHECK` instruction
- `.dockerignore` must exclude: `node_modules`, `.git`, `*.md`, `tests/`, `.env*`

### Kubernetes Standards
- Every deployment needs: readiness probe, liveness probe, startup probe
- Every critical service needs: PodDisruptionBudget (minAvailable ≥ 2)
- Every deployment needs: resource requests AND limits
- Use `topologySpreadConstraints` to distribute across AZs
- Secrets via HashiCorp Vault or Kubernetes Secrets (sealed-secrets in GitOps)
- Never use `latest` tag — always pin image versions
- Horizontal Pod Autoscaler on all stateless services

---

## Monitoring & Logging Standards

### Structured Logging Format
```json
{
  "level": "info",
  "message": "Order created",
  "service": "order-service",
  "traceId": "abc-123",
  "userId": "user-uuid",
  "orderId": "order-uuid",
  "duration": 145,
  "timestamp": "2026-02-27T10:00:00Z"
}
```

### Rules
- Use `pino` or `winston` with JSON format — never `console.log`
- Include `traceId` (from OpenTelemetry) in every log line
- Log request/response at `info` level (sanitize PII)
- Log errors at `error` level with full stack trace
- Never log: passwords, tokens, credit card numbers, full phone numbers
- Expose `/metrics` endpoint (Prometheus format) on every service

---

## Git & CI/CD Standards

### Branch Naming
```
feature/{ticket-id}-short-description
bugfix/{ticket-id}-short-description
hotfix/{ticket-id}-short-description
```

### Commit Messages (Conventional Commits)
```
feat(order-service): add order cancellation endpoint
fix(payment-service): handle duplicate webhook events
perf(catalog-service): add product search index
refactor(auth-service): extract token service
docs(delivery-service): update API documentation
test(inventory-service): add stock reservation tests
chore(deps): bump sharp to 0.33.x
```

### PR Requirements
- All CI checks must pass (lint, type-check, tests, security scan)
- Minimum 1 reviewer approval
- No `TODO` or `FIXME` without linked ticket
- Database migration included if schema changes
- API documentation updated if endpoints change
