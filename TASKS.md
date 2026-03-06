# Daltaners Platform — Task Tracker

## Completed Tasks

### Batch 1: Customer Web — Core Pages
- [x] Explore existing customer-web codebase (hooks, stores, components, layouts)
- [x] Explore shared packages (@daltaners/types, @daltaners/utils, @daltaners/config, @daltaners/ui)
- [x] Create LoginPage.tsx
- [x] Create RegisterPage.tsx
- [x] Create SearchPage.tsx + SearchFilters + SearchResults components
- [x] Create StorePage.tsx + StoreHeader component
- [x] Create ProductPage.tsx + ProductGrid component
- [x] Verify routing integration (App.tsx already has all routes)
- [x] Create CartPage.tsx (functional version with cart items, summary, checkout link)
- [x] Create placeholder stubs for Batch 2 pages (Checkout, Orders, OrderDetail, Profile) to prevent build errors
- [x] Create TASKS.md for progress tracking

### Batch 2: Customer Web — Shopping Flow
- [x] Create full CheckoutPage.tsx (address selector, delivery type, payment method, coupon, order summary, place order)
- [x] Create OrderCard.tsx component (order preview with status badge, items preview, price)
- [x] Create full OrdersPage.tsx (order list with filter tabs, pagination, empty states)
- [x] Create full OrderDetailPage.tsx (status timeline, items list, delivery info, price breakdown, cancel order)
- [x] Create full ProfilePage.tsx (profile info display/edit, address book with add/delete)

### Batch 3: Backend — Payment Service + Delivery Assignment + Auth Password Reset
- [x] Add password reset flow to auth service (request/reset/change endpoints, SHA256 token hashing, bcrypt password hashing)
- [x] Add wallet payment support (WalletEntity, WalletTransactionEntity, atomic balance deduction, topup, wallet payment method in createPaymentIntent, wallet refund credit-back)
- [x] Add Maya webhook endpoint to payment controller (handleMayaWebhook for PAYMENT_SUCCESS/FAILED/EXPIRED)
- [x] Improve rider assignment algorithm (distance-weighted scoring, vehicle suitability check, zone filtering, expanding radius 5→10→15km, no_rider_available event, estimated pickup time)
- [x] Add delivery assignment management endpoints (reassign, auto-assign, active deliveries list — admin only)

### Batch 4: Backend — Notification Service + Real-time Features
- [x] Implement SendGrid email integration in notification service (real @sendgrid/mail SDK, template support, bulk sending with 1000-batch chunks, email validation, PII masking in logs)
- [x] Implement Firebase push notification service (firebase-admin SDK, multi-device token management via Redis hash, auto-cleanup of invalid tokens, topic-based messaging, device registration/removal endpoints)
- [x] WebSocket gateway for live GPS tracking — already existed in delivery service (delivery.gateway.ts with broadcastLocationUpdate, broadcastStatusUpdate, notifyRider); added notification service WebSocket gateway for real-time user notifications
- [x] Add Socket.IO notification gateway (notification.gateway.ts) with: user room authentication, order room subscriptions, real-time notification emit, order status update emit, delivery location forwarding, role-based broadcasts
- [x] Emit Socket.IO events on order status changes — notification consumer now emits WebSocket events alongside push/email/SMS for all Kafka events (orders, delivery, payments, inventory)
- [x] Fix Kafka topic mismatch: changed delivery consumer from `daltaners.delivery.tracking` to `daltaners.delivery.events` + added `daltaners.delivery.location` consumer for GPS forwarding
- [x] Add device token registration endpoints (POST /notifications/devices, DELETE /notifications/devices/:deviceId)

### Batch 5: Admin Panel + Vendor Dashboard

#### Admin Panel (Batch 5a-5c) — Completed
- [x] Create `lib/cn.ts` utility (clsx + tailwind-merge)
- [x] Create `App.tsx` with React Router v6 routing (login, protected layout, 7 page routes)
- [x] Create `layouts/DashboardLayout.tsx` (collapsible sidebar, 7 nav items, header with user dropdown)
- [x] Create `pages/LoginPage.tsx` (email/password form, auth redirect, error display)
- [x] Create `pages/DashboardPage.tsx` (4 StatCards, OrdersChart, RevenueChart, TopStoresWidget, order status breakdown)
- [x] Create `pages/UsersPage.tsx` (UserTable, search/role/status filters, edit modal, suspend modal)
- [x] Create `pages/VendorsPage.tsx` (VendorTable, search/status/category filters, approval + suspend modals)
- [x] Create `pages/OrdersPage.tsx` (DataTable with 8 columns, search/status/payment filters, pagination)
- [x] Create `pages/ZonesPage.tsx` (ZoneTable, ZoneForm modal for create/edit, pagination)
- [x] Create `pages/CategoriesPage.tsx` (CategoryTree, create/edit/delete modals with product count warning)
- [x] Create `pages/NotificationsPage.tsx` (BroadcastForm + history DataTable, success/error banners)

#### Vendor Dashboard (Batch 5d-5e) — Completed
- [x] Create `pages/LoginPage.tsx` (email/password form, vendor auth, redirect)
- [x] Create `pages/DashboardPage.tsx` (4 StatCards: orders/revenue/pending/low stock, RevenueChart, RecentOrdersWidget)
- [x] Create `pages/OrdersPage.tsx` (OrderTable with status tabs, search, reject modal with reason, pagination)
- [x] Create `pages/OrderDetailPage.tsx` (order items list, status flow actions, customer/delivery/payment info cards)
- [x] Create `pages/ProductsPage.tsx` (ProductTable, search/category/status filters, delete confirmation, pagination)
- [x] Create `pages/ProductFormPage.tsx` (ProductForm wrapper for create/edit modes with navigation)
- [x] Create `pages/InventoryPage.tsx` (StockTable, low stock filter toggle, AdjustStockModal, pagination)
- [x] Create `pages/StoreSettingsPage.tsx` (store profile form, operating hours editor, delivery settings)
- [x] Create `pages/StaffPage.tsx` (staff list cards, invite modal, remove modal, permissions editor)

### Batch 6a: Unit Tests — Auth, Order, Payment Services
- [x] Create Jest config for auth-service (`jest.config.ts`)
- [x] Create `auth.service.spec.ts` — 30+ test cases covering: register, login, refreshTokens, logout, requestOtp, verifyOtp, getMe, requestPasswordReset, resetPassword, changePassword, isTokenBlacklisted
- [x] Create `auth.controller.spec.ts` — 10 test cases covering all controller endpoints
- [x] Create Jest config for order-service (`jest.config.ts`)
- [x] Create `order.service.spec.ts` — 30+ test cases covering: createOrder, getOrder, getOrders, getCustomerOrders, getVendorOrders, cancelOrder, updateStatus, handlePaymentCompleted, handlePaymentFailed, handleDeliveryStatusUpdate, state machine validation, access control
- [x] Create `order.controller.spec.ts` — 7 test cases covering all controller endpoints
- [x] Create Jest config for payment-service (`jest.config.ts`)
- [x] Create `payment.service.spec.ts` — 25+ test cases covering: checkIdempotency, createPaymentIntent (COD/card/wallet/GCash), confirmPayment, handlePaymentFailure, processRefund, wallet operations, webhook handlers, handleOrderPlaced

## Pending Tasks

### Batch 6b: Unit Tests — Remaining Services
- [x] Create Jest config for delivery-service (`jest.config.ts`)
- [x] Create `delivery.service.spec.ts` — 35+ test cases covering: registerRider, toggleOnline, updateGpsLocation, findNearbyRiders, assignRider (scoring algorithm, expanding radius, zone/vehicle filtering), createDelivery, acceptDelivery, rejectDelivery, updateDeliveryStatus (state machine), reassignDelivery, autoAssignDelivery, getActiveDeliveries, getDeliveryById, getDeliveryByOrderId, getMyDeliveries
- [x] Create Jest config for inventory-service (`jest.config.ts`)
- [x] Create `inventory.service.spec.ts` — 25+ test cases covering: createStock, getStock (cache hit/miss), listStock, adjustStock (zero/not found/insufficient), reserveStock (atomic cache + rollback), releaseStock (over-release guard), getLowStockItems, getMovements, low stock event publishing
- [x] Create Jest config for vendor-service (`jest.config.ts`)
- [x] Create `vendor.service.spec.ts` — 25+ test cases covering: createStore (slug generation, Kafka event), findStoreById, findStoresByOwner, updateStore (ownership verification, ForbiddenException), location CRUD with ownership, operating hours, findNearbyStores, staff management (add/conflict/update/remove)
- [x] Create Jest config for user-service (`jest.config.ts`)
- [x] Create `user.service.spec.ts` — 20+ test cases covering: getProfile, updateProfile, createAddress (max 10, auto-default first), getAddresses, updateAddress, deleteAddress (reassign default), setDefaultAddress, handleUserRegistered (idempotent with 23505 error handling)
- [x] Create Jest config for notification-service (`jest.config.ts`)
- [x] Create `notification.service.spec.ts` — 20+ test cases covering: sendNotification per channel (push/email/sms), preference-based skipping, no preferences fallback, delivery failure logging, cache invalidation, getNotifications (cached/uncached unread count), markAsRead, preferences CRUD with Redis caching, broadcastToRole
- [x] Create Jest config for zone-service (`jest.config.ts`)
- [x] Create `zone.service.spec.ts` — 18+ test cases covering: zone CRUD, geospatial lookup, calculateDeliveryFee (Haversine + surge, max radius exceeded, same origin/destination), capacity management (increment at limit, null limit, decrement)

### Batch 6c: Cross-Service Communication Fixes + Test Compilation
- [x] Fix Kafka topic inconsistencies across all 10 services:
  - catalog-service: fixed wrong topic `daltaners.inventory.events` → `daltaners.catalog.events`
  - order-service: fixed consumer topic `daltaners.delivery.tracking` → `daltaners.delivery.events`
  - payment-service: fixed uppercase event types to lowercase (CloudEvents compliance)
  - payment-service: removed legacy `ORDER_PLACED` event type check
  - inventory-service: added missing `INVENTORY_OUT_OF_STOCK` and `INVENTORY_RESTOCKED` topic constants + publisher methods
  - auth-service: created KafkaProducerService to publish `daltaners.users.events` with `registered` event type
- [x] Fix TypeORM `_QueryDeepPartialEntity` JSONB column type errors across 5 services (payment, order, delivery, vendor, user repositories) with `as any` cast
- [x] Create shared `tsconfig.test.json` with relaxed settings for test compilation
- [x] Update all 9 `jest.config.ts` files to use `tsconfig.test.json`
- [x] Fix enum type errors in delivery-service tests (VehicleType), vendor-service tests (StoreCategory, StoreStatus, StaffRole), zone-service tests (nullable boundary/capacity_limit)
- [x] Fix ioredis geodist type issue in delivery location.service.ts
- [x] Fix Date serialization comparison in payment-service tests
- [x] Fix floating-point rounding in zone-service surge multiplier test
- [x] Fix ConfigService.get mock type cast in auth-service tests
- [x] Remove unused ConflictException import from payment.service.ts
- [x] **All 311 tests passing across 9 services** (auth:51, order:45, payment:34, delivery:53, inventory:28, vendor:38, user:23, notification:17, zone:21)

## Pending Tasks

### Batch 6d: Catalog Service Unit Tests
- [x] Create `jest.config.ts` for catalog-service (was missing)
- [x] Fix `redis.service.ts` ConfigService.get type error (`undefined` → `|| undefined`)
- [x] Create `catalog.service.spec.ts` — 58 test cases covering: createCategory (slug generation, parent validation, cache invalidation), getCategoryTree (cache hit/miss), getCategoryById, updateCategory (self-parent guard), deleteCategory, createProduct (slug, category validation, Kafka event, Kafka failure tolerance), getProductById, getProductBySlug, getProducts, getProductsByStoreId, updateProduct (admin vs vendor ownership, category validation, slug regeneration, Kafka event), deleteProduct, addProductImage (product validation, vendor ownership), removeProductImage (cross-product guard, delete failure), setPrimaryImage, addProductVariant (product validation, vendor ownership), updateProductVariant (cross-product guard, update failure), deleteProductVariant (cross-product guard, delete failure)
- [x] **All 369 tests passing across all 10 services** (auth:51, order:45, payment:34, delivery:53, inventory:28, vendor:38, user:23, notification:17, zone:21, catalog:58)

### Batch 6e: Frontend Error Boundaries & Build Fixes
- [x] Create `ErrorBoundary` component for customer-web (`components/common/ErrorBoundary.tsx`) — React class component with "Try Again" and "Refresh Page" recovery actions
- [x] Create `ErrorBoundary` component for admin-panel (`components/common/ErrorBoundary.tsx`)
- [x] Create `ErrorBoundary` component for vendor-dashboard (`components/common/ErrorBoundary.tsx`)
- [x] Wrap all 3 App.tsx routes with `<ErrorBoundary>` for global error catching
- [x] Add `timeout: 15000` to customer-web `lib/api.ts` (admin-panel and vendor-dashboard already had it)
- [x] Fix admin-panel build: remove unused `useNavigate` import from `DashboardLayout.tsx`
- [x] Fix vendor-dashboard build: fix `tsconfig.node.json` (`composite: true` + `emitDeclarationOnly`)
- [x] Fix vendor-dashboard build: fix `totalPages` type errors in InventoryPage, OrdersPage, ProductsPage (compute from `meta.total / meta.limit`)
- [x] **All 3 frontend apps build successfully**

### Batch 7: Docker Containerization
- [x] Create `.dockerignore` (excludes node_modules, .git, tests, .env*, *.md, coverage, .turbo)
- [x] Create `services/auth-service/Dockerfile` (multi-stage: base→deps→build→deploy→production, port 3001)
- [x] Create `services/user-service/Dockerfile` (port 3002)
- [x] Create `services/vendor-service/Dockerfile` (port 3003)
- [x] Create `services/catalog-service/Dockerfile` (port 3004)
- [x] Create `services/inventory-service/Dockerfile` (port 3005)
- [x] Create `services/order-service/Dockerfile` (port 3006)
- [x] Create `services/delivery-service/Dockerfile` (port 3007)
- [x] Create `services/payment-service/Dockerfile` (port 3008)
- [x] Create `services/notification-service/Dockerfile` (port 3010)
- [x] Create `services/zone-service/Dockerfile` (port 3014)
- [x] Create `apps/customer-web/Dockerfile` (multi-stage: node build → nginx:1.25-alpine, port 80)
- [x] Create `apps/admin-panel/Dockerfile` (port 80)
- [x] Create `apps/vendor-dashboard/Dockerfile` (port 80)
- [x] Create `apps/customer-web/nginx.conf` (SPA routing, gzip, caching, security headers, API proxy)
- [x] Create `apps/admin-panel/nginx.conf`
- [x] Create `apps/vendor-dashboard/nginx.conf`
- [x] Create `docker-compose.services.yml` (10 backend services + 3 frontend apps, depends_on infra with health checks)
- [x] Create `LOCAL_SETUP_GUIDE.md` (step-by-step local development setup: prerequisites, env, infra, Kafka topics, dev servers, Docker alternative, troubleshooting)
- [x] Create `PRODUCTION_DEPLOYMENT_GUIDE.md` (step-by-step VPS production deployment: server setup, Docker install, SSL/Certbot, Nginx reverse proxy, systemd service, backups, monitoring, deploy flow)

### Batch 6f: Integration Tests (Testcontainers + Real PostgreSQL)
- [x] Install `testcontainers`, `@testcontainers/postgresql`, `pg` as devDependencies in 4 services (order, payment, inventory, delivery)
- [x] Create `jest.integration.config.ts` for all 4 services (60s timeout, sequential, `.integration.spec.ts` regex)
- [x] Create `order-flow.integration.spec.ts` — 22 test cases: createOrder (DB insert, Kafka event, pickup fee, delivery fee), getOrder (fetch, 404, access control), getOrders (pagination, status filter), handlePaymentCompleted (status update, event, idempotency, unknown order), handlePaymentFailed (cancel, event, already cancelled), handleDeliveryStatusUpdate (picked_up, delivered, unknown status, invalid transition), cancelOrder (pending, refund_pending, event, non-cancellable), updateStatus (validation, prepared_at timestamp), full lifecycle (create→confirmed→preparing→ready→picked_up→in_transit→delivered), getCustomerOrders (cursor pagination)
- [x] Create `payment.consumer.integration.spec.ts` — 18 test cases: handleOrderPlaced (card creates processing txn, COD skips, wallet deducts + completes), confirmPayment (status update, event, idempotent), handlePaymentFailure (mark failed, event, idempotent), processRefund (refund txn + reverse original, wallet credit-back, reject non-completed), idempotency (duplicate key prevention), wallet operations (auto-create, topup)
- [x] Create `inventory.consumer.integration.spec.ts` — 16 test cases: createStock (DB insert, duplicate rejection), reserveStock (movement record, Kafka event, insufficient stock), releaseStock (restore quantity, event, over-release guard), reserve-then-release cycle (verify full restoration), adjustStock (increase, decrease, below-zero guard, zero guard), getStock (available quantity, 404), getMovements (history)
- [x] Create `delivery.consumer.integration.spec.ts` — 17 test cases: createDelivery (DB insert, duplicate rejection), acceptDelivery (status change, Kafka + WebSocket events, wrong rider rejection), updateDeliveryStatus state machine (accepted→at_store→picked_up→in_transit→arrived→delivered with timestamp + stats verification, invalid transitions: delivered→picked_up, cancelled→accepted, failed requires reason), handleOrderCancelled (cancel non-terminal, skip delivered), getDeliveryById/getDeliveryByOrderId (fetch, 404), registerRider (DB insert, event, duplicate rejection)
- [x] Add `test:integration` script to 4 service package.json files + root package.json (turbo run)
- [x] Install `@types/pg` devDependency in all 4 services
- [x] Add `testPathIgnorePatterns: ['\\.integration\\.spec\\.ts$']` to all 4 service `jest.config.ts` to exclude integration tests from regular `jest` runs
- [x] **All 369 unit tests still passing across all 10 services** (auth:51, order:45, payment:34, delivery:53, inventory:28, vendor:38, user:23, notification:17, zone:21, catalog:58)
- [x] Fix TypeORM decimal column type bug in `PaymentService.processRefund` — `originalTransaction.amount` returns as string from real PostgreSQL, causing `===` comparison failure (no "reversed" status) and string concatenation in wallet balance arithmetic (`500 + "200" = "500200"`). Fixed with `Number()` coercion on line 347.
- [x] **All 76 integration tests passing** (order:28, payment:16, inventory:16, delivery:16)

### Batch 6g: Full Build Fixes
- [x] Fix `turbo.json` — renamed `pipeline` to `tasks` (required by Turbo v2)
- [x] Fix `@daltaners/types` build — removed unused `GeoCoordinates` imports from `delivery.types.ts`, `user.types.ts`, `vendor.types.ts` (TS6133)
- [x] Create `tsconfig.service.json` — shared base config for NestJS services extending `tsconfig.base.json` with `strictPropertyInitialization: false`, `noUnusedLocals: false`, `noUnusedParameters: false` (standard for TypeORM entities + class-validator DTOs)
- [x] Update all 10 service `tsconfig.json` — extend `tsconfig.service.json` instead of `tsconfig.base.json`, exclude `**/*.spec.ts` from production builds
- [x] **Full monorepo build passing** — 4 packages, 3 apps, 10 services (17 total)
- [x] **All 369 unit tests still passing** after build config changes

### Batch 7b: Mock Data with MSW (Mock Service Worker)
- [x] Create `@daltaners/mock-data` package scaffold (`package.json`, `tsconfig.json`)
- [x] Install MSW v2 as dependency, add `@daltaners/types` as devDependency
- [x] Create `src/helpers.ts` — response envelope helpers: `wrap()`, `paginatedWrap()`, `cursorWrap()`, `errorResponse()`, `getSearchParams()`
- [x] Create `src/data/users.ts` — 8 users (3 customers, 2 vendor owners, 1 staff, 1 rider, 1 admin) with credentials map
- [x] Create `src/data/stores.ts` — 8 Metro Manila stores with locations, operating hours, delivery fees
- [x] Create `src/data/products.ts` — 58 Filipino-themed products across 8 categories (fruits/veggies, meat/seafood, rice, beverages, snacks/canned, bakery, household, health) with typed `MockProduct` interface
- [x] Create `src/data/categories.ts` — 8 top-level categories with children (20 total)
- [x] Create `src/data/orders.ts` — 15 orders in various statuses (pending, confirmed, preparing, ready, picked_up, in_transit, delivered, cancelled)
- [x] Create `src/data/addresses.ts` — 3 customer addresses (home, office, mom's house)
- [x] Create `src/data/zones.ts` — 10 Metro Manila delivery zones with boundaries and fees
- [x] Create `src/data/dashboard.ts` — admin + vendor dashboard stats with chart data
- [x] Create `src/handlers/auth.handlers.ts` — login (customer + vendor), register, refresh, logout, me (6 endpoints)
- [x] Create `src/handlers/products.handlers.ts` — product list (cursor-based, filters, sorting), detail, store products (3 endpoints)
- [x] Create `src/handlers/stores.handlers.ts` — nearby stores, store detail by slug/id (2 endpoints)
- [x] Create `src/handlers/orders.handlers.ts` — my orders, order detail, create order, cancel order (4 endpoints)
- [x] Create `src/handlers/users.handlers.ts` — profile get/update, addresses CRUD (4 endpoints)
- [x] Create `src/handlers/admin.handlers.ts` — users CRUD, vendors approve/suspend, orders list/stats, zones CRUD, categories CRUD, notifications broadcast (15 endpoints)
- [x] Create `src/handlers/vendor.handlers.ts` — store settings, staff management, orders list/status update, products CRUD, inventory list/adjust, dashboard stats (16 endpoints)
- [x] Create `src/browser.ts` — MSW `setupWorker()` export
- [x] Create `src/index.ts` — re-exports handlers + all data
- [x] Generate `mockServiceWorker.js` in all 3 app `public/` directories via `npx msw init`
- [x] Add `vite-env.d.ts` (`/// <reference types="vite/client" />`) to all 3 apps for `import.meta.env` support
- [x] Wire up MSW in `customer-web/src/main.tsx` — conditional dynamic import with `enableMocking()` async wrapper
- [x] Wire up MSW in `admin-panel/src/main.tsx` — same pattern
- [x] Wire up MSW in `vendor-dashboard/src/main.tsx` — same pattern
- [x] Add `@daltaners/mock-data` as workspace devDependency to all 3 apps
- [x] **All 3 apps typecheck cleanly** with MSW integration
- [x] **50 total MSW handler endpoints** covering all API calls across all 3 apps

#### Demo Login Credentials
- Customer: `maria@email.com` / `password123`
- Admin: `admin@daltaners.ph` / `admin123`
- Vendor: `mang.pedro@metromart.ph` / `vendor123`

### Project Rename: Birador → Daltaners
- [x] Replace all `birador` → `daltaners` (lowercase) across 233+ files
- [x] Replace all `Birador` → `Daltaners` (capitalized) across 60+ files
- [x] Replace all `BIRADOR` → `DALTANERS` (uppercase) across 4+ files
- [x] Rename `Birador_PRD.txt` → `Daltaners_PRD.txt`
- [x] Rename `Birador_PDD.txt` → `Daltaners_PDD.txt`
- [x] Update CLAUDE.md references to renamed files
- [x] Update nginx.conf files (3 apps)
- [x] Verify zero remaining occurrences of "birador" in any case

### Batch 8: Infrastructure Seed Data
- [x] Remove obsolete `version: '3.9'` from `docker-compose.yml` (Docker Compose v2 deprecation)
- [x] Fix stale `daltaners-network` Docker network label mismatch
- [x] Create `docker/seed-postgres.sql` — comprehensive PostgreSQL test data:
  - 13 users (1 admin, 3 customers, 4 vendor owners, 2 vendor staff, 3 delivery riders)
  - 13 user profiles with Filipino names and preferences
  - 5 customer addresses (QC, Makati, BGC)
  - 6 Metro Manila delivery zones
  - 4 stores: Tindahan ni Aling Nena (grocery), Kusina de Manila (restaurant), Botica ng Bayan (pharmacy), TechMart PH (electronics)
  - 5 store locations with coordinates
  - 28 operating hours entries (full week per store)
  - 2 store staff assignments
  - 20 top-level + 12 sub-level product categories (Filipino-labeled)
  - 37 products: 24 grocery items (rice, canned goods, noodles, coffee, condiments, snacks, oil, produce, meat, bread, dried fish, dairy, sugar), 7 restaurant dishes (adobo, sinigang, kare-kare, lechon kawali, bistek, halo-halo, palabok), 6 pharmacy products (Biogesic, Neozep, Kremil-S, Poten-Cee, Safeguard, Alaxan), 3 electronics
  - 13 product images
  - 6 product variants (phone case models, food extras)
  - 40 inventory stock entries across all stores
  - 9 stock movement records (restocks, reservations, fulfillments, returns)
  - 6 orders in various statuses: delivered, in_transit, pending, cancelled, preparing (pickup), confirmed
  - Order items for all 6 orders
  - 2 delivery records (delivered + in transit)
  - 7 payment transactions (GCash, Maya, COD, wallet, card, refund)
  - 2 vendor settlement records
  - 3 delivery personnel with GPS coordinates
- [x] Create `docker/seed-cassandra.cql` — CassandraDB test data:
  - 10 GPS location tracking points (2 delivery routes)
  - 3 personnel current location entries
  - 13 order event sourcing entries (full lifecycle for 2 orders)
  - 7 notification log entries (order confirmations, rider updates, vendor alerts)
  - 4 chat messages (Tagalog customer-rider conversation)
  - 7 analytics events (app opens, searches, add to cart, checkout)
  - 7 product view history entries
  - 8 search log entries (Filipino queries: bigas, sinandomeng, adobo, sinigang, etc.)
- [x] Create `docker/seed-data.sh` — runner script with container checks, readiness waits, and summary output

### Batch 9: Connect Frontend to Real Backend Services
- [x] Fix Zookeeper healthcheck — changed `echo ruok | nc localhost 2181 | grep imok` to `echo srvr | nc localhost 2181 | grep Mode` (ruok command not enabled by default in cp-zookeeper 7.6.0)
- [x] Make MSW togglable via env var — changed `import.meta.env.MODE !== 'development'` to `import.meta.env.VITE_ENABLE_MSW === 'true'` (MSW off by default in dev, re-enable with `VITE_ENABLE_MSW=true`)
- [x] Update Vite proxy to route to correct backend services — added path-specific proxies with rewrites:
  - `/api/v1/auth` → `localhost:3001`
  - `/api/v1/users` → `localhost:3002`
  - `/api/v1/stores` → `localhost:3003` (rewrite to `/vendors/stores`)
  - `/api/v1/products` → `localhost:3004` (rewrite to `/catalog/products`)
  - `/api/v1/categories` → `localhost:3004` (rewrite to `/catalog/categories`)
  - `/api/v1/orders` → `localhost:3006`
- [x] Fix frontend route mismatches — updated `useProfile.ts`: `/users/me` → `/users/profile`, `/users/me/addresses` → `/users/addresses`
- [x] Restart Zookeeper + Kafka with fixed healthcheck — all 6 infra containers healthy
- [x] Create all 8 Kafka topics (orders.events, orders.status, payments.events, inventory.events, delivery.tracking, delivery.assignments, notifications.outbound, users.events)
- [x] Stop local PostgreSQL 17 Windows service (port 5432 conflict with Docker container — Node.js was connecting to local PG instead of Docker)
- [x] Reset PostgreSQL password inside Docker container to match `.env` (`daltaners_dev_password`)
- [x] Fix missing `created_at`/`updated_at` columns on `catalog.categories` table (entity expected them, DB lacked them)
- [x] Create missing `payments.wallets` table (entity referenced non-existent table)
- [x] Create missing `payments.wallet_transactions` table
- [x] Create missing `notifications.preferences` table
- [x] Update `docker/init-postgres.sql` with all missing tables/columns/triggers for future use
- [x] Add slug-based lookup to vendor-service `GET stores/:idOrSlug` (frontend calls `/stores/tindahan-ni-aling-nena`, backend only accepted UUIDs)
- [x] Add slug-based lookup to catalog-service `GET products/:idOrSlug` (same issue)
- [x] Fix frontend `useStores.ts` nearby stores query params: `lat`/`lng` → `latitude`/`longitude` (backend DTO expects full names)
- [x] Fix frontend `useProducts.ts` store products route: `/stores/${storeId}/products` → `/products?store_id=${storeId}` (avoids Vite proxy routing conflict between vendor-service and catalog-service)
- [x] All backend APIs verified working through Vite proxy (products, stores, store-by-slug, product-by-slug, nearby stores)
- [x] Fix frontend-backend data shape mismatch in `useProducts.ts`:
  - Added `transformProduct()`: maps `base_price→price`, `images[].url→images[]` (strings), `category.name→category_name`, `store.name→store_name`, `rating_average→rating`, `rating_count→review_count`, derives `in_stock`
  - Added `transformVariant()`: maps `price_adjustment→price`, `stock_quantity>0→in_stock`
  - Added `transformProductsResponse()`: maps `items→data`, `nextCursor→meta.next_cursor`, `hasMore→meta.total`
- [x] Fix frontend-backend data shape mismatch in `useStores.ts`:
  - Added `transformStore()`: maps `rating_average→rating`, `rating_count→review_count`, `minimum_order_value→min_order`, `preparation_time_minutes→delivery_time_min/max`, extracts `address/lat/lng` from `locations[]`, derives `is_open` from `status`, formats category enum
  - Added `transformNearbyStoreItem()`: handles nested `store` object + `distance_meters→distance_km` conversion

### Batch 10: Frontend Bug Fixes
- [x] Fix search box and category filtering — root cause: HomePage and SearchPage used hard-coded slug-based category IDs (e.g., `groceries`, `food`) but backend `ProductQueryDto.category_id` requires UUID format (`@IsUUID()`). Sending non-UUID category_id caused 400 validation errors, breaking both search results and category filtering.
  - Created `useCategories` hook (`hooks/useCategories.ts`) — fetches real categories from `GET /api/v1/categories` (proxied to catalog-service), returns typed `Category[]` tree with 5min stale time
  - Updated `HomePage.tsx` — replaced hard-coded CATEGORIES array with dynamic categories from `useCategories()`, added slug→icon/color mapping for visual presentation, uses real UUID `cat.id` in `/search?category={id}` links
  - Updated `SearchPage.tsx` — replaced hard-coded CATEGORIES array with dynamic categories from `useCategories()` for CategoryPills, added UUID validation on `category` URL param to gracefully ignore invalid/legacy slug-based URLs
  - Search now works correctly: text search sends `search=query` param, category filter sends valid UUID `category_id` param

### Batch 11: Vendor Dashboard Login & Infrastructure Fixes
- [x] Fix vendor dashboard login — root cause: frontend calls `POST /auth/vendor/login` but backend only had `POST /auth/login`. Also response format mismatch (snake_case vs camelCase tokens) and missing VendorUser enrichment (firstName, lastName, vendorId).
  - Added `POST /auth/vendor/login` endpoint to auth controller — validates credentials, checks role is vendor_owner/vendor_staff, enriches response with profile data from users.profiles and vendor store ID
  - Added `findVendorProfile` method to auth repository — cross-schema query joining users.profiles + vendors.stores + vendors.store_staff to get firstName, lastName, vendorId, avatarUrl
  - Returns camelCase response matching VendorUser interface: `{ user: { id, email, firstName, lastName, role, permissions, vendorId, avatarUrl }, accessToken, refreshToken }`
- [x] Fix JWT secret mismatch across services — auth/payment services used different default secret (`change-this-to-a-strong-secret-in-production`) from other services (`daltaners_jwt_secret_dev`). Inventory service used hyphens instead of underscores. Standardized all to `daltaners_jwt_secret_dev`.
- [x] Fix Kafka missing topics — notification-service crashed with `UNKNOWN_TOPIC_OR_PARTITION` because `daltaners.delivery.events` and `daltaners.delivery.location` topics weren't in `init-kafka-topics.sh`. Added missing topics and enabled `KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'` for dev. Added `kafka-init` one-shot container to docker-compose for proper topic creation with correct partition counts.
- [x] Fix vendor-dashboard vite proxy routing — was routing ALL `/api` to auth service (3001). Set up service-specific proxy rules: `/auth` → 3001, `/stores` → 3003 (vendor), `/catalog` → 3004, `/inventory` → 3005, `/orders` → 3006.
- [x] Fix vendor-dashboard frontend hooks — updated API paths to use service-specific prefixes: products use `/catalog/...`, orders use `/orders/vendor/...`, inventory uses `/inventory/stock`, avoiding ambiguous `/stores/{id}/products` vs `/stores/{id}/staff` routing conflicts.
- [x] Added `GET /vendors/stores/me` endpoint to vendor-service — returns the store associated with the current JWT user (works for both vendor_owner and vendor_staff roles).
- [x] Fixed vendor-dashboard token refresh — interceptor now sends `refresh_token` (snake_case) and reads `access_token`/`refresh_token` from response, matching auth service API convention.

### Batch 12: Admin Panel Features — User & Roles Management (Phase 1)

#### Backend — auth-service
- [x] Create `dto/admin-user-query.dto.ts` — pagination, search, role/status filter DTOs with class-validator
- [x] Create `dto/admin-create-user.dto.ts` — email, phone, password, first_name, last_name, role DTO
- [x] Create `dto/admin-update-user.dto.ts` — optional email, phone, role, is_active DTO
- [x] Add `findAllUsersAdmin(query)` to `auth.repository.ts` — paginated, filtered, ILIKE search on email/phone
- [x] Add admin service methods to `auth.service.ts`:
  - `adminListUsers(query)` — paginated list with sanitized user data
  - `adminGetUser(id)` — single user detail
  - `adminCreateUser(dto)` — hash password, create user, publish Kafka event
  - `adminUpdateUser(id, dto)` — update role/status/email/phone with conflict checks
  - `adminResetPassword(id)` — generate temporary password, revoke sessions
- [x] Create `admin.controller.ts` — 5 endpoints under `/auth/admin/*` with admin role guard:
  - `GET /auth/admin/users` — list with filters
  - `GET /auth/admin/users/:id` — get single user
  - `POST /auth/admin/users` — create user
  - `PATCH /auth/admin/users/:id` — update user
  - `POST /auth/admin/users/:id/reset-password` — reset password
- [x] Register `AdminController` in `auth.module.ts`

#### Frontend — admin-panel
- [x] Fix `useUsers.ts` API paths: `/admin/users` → `/auth/admin/users`
- [x] Add `useCreateUser()` mutation to `useUsers.ts`
- [x] Add `useResetUserPassword()` mutation to `useUsers.ts`
- [x] Update `UserTable.tsx` — add reset password button, activate/deactivate toggle
- [x] Update `UsersPage.tsx` — add Create User button + modal, role change in edit modal, password reset modal with temporary password display, activate/deactivate actions

#### Fix Broken Admin Hooks
- [x] Fix `useOrders.ts`: `/admin/orders` → `/orders`, `/admin/orders/stats` → `/orders/admin/stats`
- [x] Fix `useVendors.ts`: `/admin/vendors*` → `/stores/admin/vendors*`

### Admin Panel Features — Phase 2: Inventory Management
- [x] Backend: Create `dto/admin-stock-query.dto.ts` — AdminStockQueryDto (search, store_location_id, status filter) + AdminMovementsQueryDto (stock_id, movement_type filter)
- [x] Backend: Add admin repository methods — `findAllStockAdmin()` with cross-schema JOINs (catalog.products, vendors.store_locations, vendors.stores), `getInventoryStats()` (aggregate counts: total entries/quantity/reserved/low stock/out of stock), `findMovementsAdmin()` with product name + location JOINs
- [x] Backend: Add admin service methods — `adminListStock()`, `adminGetStats()`, `adminListMovements()` with standard response envelope
- [x] Backend: Create `admin.controller.ts` — 4 endpoints under `/inventory/admin/*` with admin role guard: GET stock, GET stats, GET movements, POST adjust
- [x] Backend: Register `AdminInventoryController` in `inventory.module.ts`
- [x] Frontend: Create `hooks/useInventory.ts` — `useInventoryStock()`, `useInventoryStats()`, `useInventoryMovements()` queries + `useAdjustStock()` mutation with cache invalidation
- [x] Frontend: Create `pages/InventoryPage.tsx` — 5 stat cards (total entries/units/reserved/low stock/out of stock), Tabs component (Stock Levels + Movements), DataTable with 9 columns (product, location, qty, reserved, available, status badge, reorder point, updated, adjust button), movement table with 7 columns, search + status filter, pagination, adjust stock modal with current/new quantity preview
- [x] Frontend: Add Inventory nav item (cube/box icon) to DashboardLayout + `/inventory` route to App.tsx
- [x] Fix pre-existing Tailwind CSS build error — `@apply border-border`/`bg-background`/`text-foreground` in `globals.css` fails in Tailwind v3.4.19 `@layer` context; replaced with plain CSS values
- [x] **All 28 inventory-service unit tests still passing**
- [x] **Admin panel builds successfully**

### Admin Panel Features — Phase 3: Accounting
- [x] Backend: Create `dto/admin-transaction-query.dto.ts` — AdminTransactionQueryDto (search, status, method, type, date_from, date_to) + AdminSettlementQueryDto (vendor_id, status, date range) + AdminWalletQueryDto (search, status) with class-validator
- [x] Backend: Add admin repository methods to `payment.repository.ts` — findAllTransactionsAdmin (search/filter/paginate), getTransactionStats (revenue/refunds/pending/failed aggregates), findAllSettlementsAdmin (vendor/status/date filter), getSettlementStats (gross/commission/net/pending aggregates), findAllWalletsAdmin (search/status filter), getWalletStats (total/active/balance/average)
- [x] Backend: Add admin service methods to `payment.service.ts` — adminListTransactions, adminGetTransactionStats, adminListSettlements, adminGetSettlementStats, adminListWallets, adminGetWalletStats — all wrapped in standard response envelope
- [x] Backend: Create `admin.controller.ts` in payment-service — 6 endpoints under `/payments/admin/*` with admin role guard: GET transactions, GET transaction-stats, GET settlements, GET settlement-stats, GET wallets, GET wallet-stats
- [x] Backend: Register `AdminPaymentController` in `payment.module.ts`
- [x] Frontend: Create `hooks/useAccounting.ts` — useTransactions, useTransactionStats, useSettlements, useSettlementStats, useWallets, useWalletStats queries with TanStack React Query
- [x] Frontend: Create `pages/AccountingPage.tsx` with 4 tabs:
  - **Overview**: 12 stat cards across 3 sections (Transactions: revenue/pending/refunds/failed; Settlements: gross/commission/net/pending; Wallets: total/balance/avg/inactive)
  - **Transactions**: DataTable with 7 columns (ID, order, type, method, status, amount, date) + search, status/method/type filters, pagination
  - **Settlements**: DataTable with 8 columns (vendor, period, status, gross, commission, net, final, date) + status filter, pagination
  - **Wallets**: DataTable with 7 columns (ID, user, status, balance, daily limit, monthly limit, created) + search, status filter, pagination
- [x] Frontend: Add Accounting nav item (currency icon) to `DashboardLayout.tsx` + `/accounting` route to `App.tsx`
- [x] **All 34 payment-service unit tests still passing**
- [x] **Admin panel builds successfully**

### Phase 4a: Order-Service Admin Controller
- [x] Create `dto/admin-order-query.dto.ts` — AdminOrderQueryDto (search, status, payment_method, payment_status, order_type, store_id, date_from, date_to) + AdminOrderStatsQueryDto
- [x] Add admin repository methods to `order.repository.ts` — `findAllOrdersAdmin()` (paginated, multi-filter, ILIKE search), `getOrderStats()` (totalOrders, totalRevenue, todayOrders/Revenue, pendingOrders, cancelledOrders, averageOrderValue, ordersByStatus, ordersByDay, topStores)
- [x] Add admin service methods to `order.service.ts` — `adminListOrders(query)`, `adminGetStats(query)` with standard response envelope
- [x] Create `admin.controller.ts` in order-service — 2 endpoints under `/orders/admin/*` with admin role guard: GET orders, GET stats
- [x] Register `AdminOrderController` in `order.module.ts`
- [x] Fix order number prefix: `BIR-` → `DLT-` (Daltaners rebrand)

### Phase 4b: Vendor-Service Admin Controller
- [x] Create `dto/admin-vendor-query.dto.ts` — AdminVendorQueryDto (search, status, category, subscription_tier) + AdminVendorActionDto (reason, commission_rate) + AdminVendorUpdateDto (commission_rate, subscription_tier, is_featured)
- [x] Add admin repository methods to `vendor.repository.ts` — `findAllStoresAdmin()` (paginated, multi-filter, ILIKE search, includes locations), `getVendorStats()` (total/active/pending/suspended stores, by category/tier, avg rating, total orders), `updateStoreStatus()`, `adminUpdateStore()`
- [x] Add admin service methods to `vendor.service.ts` — `adminListStores()`, `adminGetStore()`, `adminGetStats()`, `adminApproveStore()` (Kafka event), `adminSuspendStore()` (Kafka event), `adminReactivateStore()`, `adminUpdateStore()`
- [x] Create `admin.controller.ts` in vendor-service — 7 endpoints under `/vendors/admin/*` with admin role guard: GET stores, GET stats, GET stores/:id, POST approve, POST suspend, POST reactivate, PATCH update
- [x] Register `AdminVendorController` in `vendor.module.ts`

### Phase 4c: Admin Panel Frontend — Real Backend Integration
- [x] Fix Vite proxy routing — add `/api/v1/vendors` → port 3003 (direct, no rewrite) for admin vendor endpoints
- [x] Rewrite `useOrders.ts` — snake_case Order interface matching backend, API path `/orders/admin/orders`, fixed filter params
- [x] Rewrite `useVendors.ts` — snake_case Vendor interface matching Store entity, API path `/vendors/admin/stores`, added `useVendorStats()`, `useReactivateVendor()`
- [x] Update `OrdersPage.tsx` — snake_case property access (order_number, payment_method, payment_status, total_amount, created_at, items.length), fix formatCurrency (no /100 — backend stores PHP directly)
- [x] Update `VendorsPage.tsx` — fix `storeName` → `name`, fix `handleApprove` to pass `commission_rate` (snake_case)
- [x] Update `VendorTable.tsx` — `storeName` → `name`, `ownerName`/`ownerEmail` → `contact_email`/`contact_phone`, `rating` → `rating_average`, `totalOrders` → `total_orders`, removed Revenue column (not in Store entity)
- [x] Update `VendorApprovalModal.tsx` — `storeName` → `name`, `phone` → `contact_phone`, `address` → locations[0] address, removed documents section (not in Store entity)
- [x] Update `TopStoresWidget.tsx` — `storeId` → `store_id`, `storeName` → `store_name`, `orderCount` → `order_count`, fix formatCurrency (no /100)
- [x] Update `DashboardPage.tsx` — fix formatCurrency (no /100)
- [x] Update `RevenueChart.tsx` — fix revenue conversion (no /100)
- [x] **All backend services build successfully**
- [x] **Admin panel builds successfully**

### Phase 4d: Remaining Admin Panel Features
- [x] Frontend: Add date range filters (dateFrom/dateTo) to AccountingPage TransactionsTab and SettlementsTab
- [x] Frontend: Create VendorStatsWidget component (total/active/pending/suspended stores, by-category bars, avg rating, total orders)
- [x] Frontend: Add VendorStatsWidget to DashboardPage using useVendorStats() hook
- [x] MSW Handlers: Add 7 accounting mock handlers (transactions, transaction-stats, settlements, settlement-stats, wallets, wallet-stats) + vendor stats handler to admin.handlers.ts
- [x] Mock Data: Add accountingMockData (8 transactions, 4 settlements, 5 wallets, all stats) and vendorStatsMock to dashboard.ts
- [x] **Admin panel builds successfully**
- [ ] E2E Tests: Admin panel critical user flows (deferred to future batch)

### Phase 5a: Customer Order Tracking (Batch B)
- [x] Install leaflet + react-leaflet + @types/leaflet in customer-web
- [x] Create `stores/socket.store.ts` — Zustand store managing Socket.IO connection (connect, disconnect, authenticate, subscribeOrder, unsubscribeOrder, auto-disconnect on logout)
- [x] Create `hooks/useSocket.ts` — React hook that calls connect() when authenticated, called in MainLayout
- [x] Create `hooks/useOrderTracking.ts` — subscribes to order room for picked_up/on_the_way/in_transit statuses, listens for `delivery_location` + `order_status_update` events, invalidates React Query cache on status change
- [x] Create `components/order/DeliveryMap.tsx` — Leaflet map with OpenStreetMap tiles, pulsing rider marker (green motorcycle icon), destination pin marker, auto-pan on GPS update via MapUpdater component
- [x] Create `components/order/RiderInfoCard.tsx` — Card showing rider name, vehicle type icon, ETA countdown, optional phone contact
- [x] Create `components/order/LiveTrackingBanner.tsx` — animated banner with pulsing green dot for "Live Tracking" / "Reconnecting..." states
- [x] Update `hooks/useOrders.ts` — added `in_transit` to OrderStatus union, added delivery_person/delivery_lat/delivery_lng/store_lat/store_lng fields to Order interface
- [x] Update `components/order/OrderCard.tsx` — added `in_transit` entry to STATUS_BADGE record
- [x] Update `components/order/OrderStatusTimeline.tsx` — added `in_transit` to STATUS_CONFIG and ACTIVE_STATUSES array
- [x] Update `layouts/MainLayout.tsx` — import and call `useSocket()` to initialize WebSocket on auth
- [x] Update `pages/OrderDetailPage.tsx` — integrated LiveTrackingBanner + DeliveryMap + RiderInfoCard, conditionally rendered when tracking active and rider location available
- [x] Update `vite.config.ts` — added `/socket.io` WebSocket proxy to notification-service (port 3010)
- [x] **customer-web typecheck clean + build successful**

### Phase 5b: Promotions Backend (Batch C)
- [x] Add `promotions` schema to init-postgres.sql — `promotions.coupons` table (code, name, discount_type, discount_value, min_order_value, max_discount, applicable_categories/stores UUID[], usage_limit, per_user_limit, is_first_order_only, valid_from/until, is_active) + `promotions.coupon_usages` table (coupon_id, user_id, order_id, discount_amount, redeemed_at, released_at) with indexes (code unique, active+dates composite, GIN on stores/categories) and trigger
- [x] Add 3 sample coupons to seed-postgres.sql: WELCOME50 (50% off first order, max 500), SAVE100 (fixed 100 off), FREEDEL (free delivery)
- [x] Create `entities/coupon.entity.ts` — TypeORM entity for `promotions.coupons` (explicit `schema: 'promotions'`)
- [x] Create `entities/coupon-usage.entity.ts` — TypeORM entity for `promotions.coupon_usages` with ManyToOne relation to CouponEntity
- [x] Create `dto/create-coupon.dto.ts` — admin create DTO with code (uppercase alphanumeric regex), name, discount_type, discount_value, dates, limits, store/category restrictions
- [x] Create `dto/update-coupon.dto.ts` — PartialType(CreateCouponDto) + is_active toggle
- [x] Create `dto/coupon-query.dto.ts` — admin list filters: search, discount_type, is_active, is_expired, pagination
- [x] Create `dto/validate-coupon.dto.ts` — customer validate DTO: code, subtotal, store_id, category_ids
- [x] Create `coupon.repository.ts` — TypeORM queries: CRUD, findByCode, countUserUsages, countUserOrders (cross-schema), recordUsage, releaseUsage, increment/decrementUsageCount (atomic SQL)
- [x] Create `coupon.service.ts` — business logic: admin CRUD, validateCoupon (8 checks: active, date range, usage limit, per-user limit, min order value, applicable store, applicable category, first-order-only), calculateDiscount (percentage/fixed_amount/free_delivery), redeemCoupon, releaseCoupon, Redis caching (10min TTL, key `coupon:code:{CODE}`)
- [x] Create `coupon.controller.ts` — customer endpoint: `POST /orders/coupons/validate` (role: customer)
- [x] Create `admin-coupon.controller.ts` — admin CRUD: `GET/POST /orders/admin/coupons`, `GET/PATCH/DELETE /orders/admin/coupons/:id` (role: admin, soft-delete if has usages)
- [x] Update `order.module.ts` — register CouponEntity, CouponUsageEntity in TypeOrmModule.forFeature; add CouponController, AdminCouponController to controllers; add CouponService, CouponRepository to providers
- [x] Update `order.service.ts` — inject CouponService; in createOrder(): validate coupon → calculate discount → set coupon_id/discount_amount → free_delivery zeroes delivery_fee → redeem after save; in cancelOrder(): call releaseCoupon; in handlePaymentFailed(): call releaseCoupon; in updateStatus(): release coupon on cancelled transition
- [x] Update `dto/create-order.dto.ts` — add optional `category_ids: string[]` field for coupon category validation
- [x] Update `order.service.spec.ts` — add CouponService mock to test providers, mock releaseCoupon in cancel/payment-failed tests
- [x] **order-service builds successfully + all 45 unit tests passing**

### Phase 5c: Promotions Frontend (Batch D)
- [x] Create `hooks/useCoupons.ts` in admin-panel — useAllCoupons (paginated, filtered), useCoupon, useCreateCoupon, useUpdateCoupon, useDeleteCoupon mutations with cache invalidation
- [x] Create `pages/CouponsPage.tsx` in admin-panel — DataTable with 8 columns (code, name, type, discount, usage, status, validity, actions), search + 3 filter dropdowns (type/active/expired), create/edit modal with full form (code, name, description, discount type/value/max, min order, usage limits, per-user limit, first-order-only, valid dates, active toggle), delete confirmation with soft-delete warning
- [x] Add Coupons nav item (tag icon) to `DashboardLayout.tsx` + `/coupons` route to `App.tsx`
- [x] Update customer `useOrders.ts` — add `coupon_code` to CreateOrderPayload, add `useValidateCoupon()` mutation hook with `ValidateCouponPayload` (code, subtotal, store_id, category_ids) and `CouponValidationResult` response type
- [x] Update `CheckoutPage.tsx` — replace hardcoded coupon logic with real validation: calls `POST /orders/coupons/validate`, shows validated discount or error, displays applied coupon with remove button, supports free_delivery discount type, passes `coupon_code` to createOrder payload
- [x] Add 5 mock coupons to `packages/mock-data/src/data/coupons.ts` (WELCOME50, SAVE100, FREEDEL, SUMMER25, EXPIRED10)
- [x] Add 7 MSW handlers to `admin.handlers.ts`: admin CRUD (list/get/create/update/delete) + customer validate endpoint with full validation logic (active check, date range, min order value, percentage/fixed/free_delivery calculation)
- [x] Fix customer-web Tailwind CSS `@apply bg-background` build error — replaced with plain CSS values in `@layer base` (same fix as admin-panel Batch 5)
- [x] **All 3 frontend apps build successfully** (admin-panel, customer-web, vendor-dashboard)

### Phase 5d: Reviews Backend (Batch E)
- [x] Add `reviews` schema to `init-postgres.sql` — `reviews.reviews` table (polymorphic: store/product/delivery_personnel, rating 1-5, title, body, images[], verified_purchase, vendor_response, helpful_count) + `reviews.review_helpful` table (unique per user+review), indexes (BRIN on created_at, composite on reviewable_type+id), trigger for updated_at
- [x] Add 10 review seed records to `seed-postgres.sql` — Filipino-language reviews (Tagalog) across stores/products/delivery, with vendor responses, verified purchase badges, varied ratings, plus 7 helpful vote records
- [x] Create `entities/review.entity.ts` — TypeORM entity for `reviews.reviews` (schema: 'reviews'), all columns with proper types
- [x] Create `entities/review-helpful.entity.ts` — TypeORM entity for `reviews.review_helpful` with ManyToOne to ReviewEntity (CASCADE delete), unique constraint on (review_id, user_id)
- [x] Create `dto/create-review.dto.ts` — CreateReviewDto with class-validator: reviewable_type (enum), reviewable_id (UUID), order_id (optional UUID), rating (1-5), title, body (max 5000), images (max 5 URLs)
- [x] Create `dto/review-query.dto.ts` — ReviewQueryDto (cursor-paginated, filterable by type/id/rating, sortable by created_at/rating/helpful_count) + AdminReviewQueryDto (offset-paginated, search, approval filter)
- [x] Create `dto/vendor-response.dto.ts` — VendorResponseDto with response text (max 2000 chars)
- [x] Create `review.repository.ts` — Full data access layer:
  - CRUD: createReview, findById, updateReview, deleteReview
  - Queries: findReviews (cursor-paginated), findReviewsAdmin (offset-paginated), findReviewsByVendor (store + product reviews), findExistingReview (duplicate check)
  - Aggregation: getAverageRating, getReviewStats (distribution by rating), countByReviewable
  - Cross-schema: updateRatingAggregates (updates catalog.products, vendors.stores, delivery.delivery_personnel), isVerifiedPurchase (checks orders.orders + order_items + deliveries)
  - Helpful votes: addHelpfulVote (with 23505 conflict handling), removeHelpfulVote, hasUserVotedHelpful
- [x] Create `review.service.ts` — Business logic:
  - Customer: createReview (duplicate check, verified purchase detection, auto-approve, rating aggregate update, Kafka event, Redis cache invalidation), getReviews, getReviewStats (cached 10min), deleteReview (ownership check), toggleHelpful
  - Vendor: getVendorReviews, respondToReview (ownership verification for store + products)
  - Admin: adminListReviews, adminApproveReview, adminRejectReview, adminDeleteReview (all with aggregate updates)
- [x] Create `review.controller.ts` — 12 endpoints under `/catalog/reviews`:
  - Public: `GET /` (cursor-paginated list), `GET /stats` (review stats), `GET /:id` (single review)
  - Customer: `POST /` (create), `POST /:id/helpful` (toggle), `DELETE /:id` (delete own)
  - Vendor: `GET /vendor/my-reviews` (store+product reviews), `POST /:id/response` (respond)
  - Admin: `GET /admin/all` (moderation list), `POST /admin/:id/approve`, `POST /admin/:id/reject`, `DELETE /admin/:id`
- [x] Register ReviewEntity, ReviewHelpfulEntity, ReviewController, ReviewService, ReviewRepository in `catalog.module.ts`
- [x] **Catalog service builds successfully**
- [x] **All 58 catalog-service unit tests still passing**
- [x] **Full monorepo build (17 packages) passing**

### Phase 5e: Reviews Frontend (Batch F)
- [x] MSW mock data (12 reviews, Filipino-themed) + 13 MSW handlers (public, customer, vendor, admin)
- [x] Customer: review display + submission on product/store pages — StarRating, ReviewStats, ReviewCard, ReviewForm, ReviewSection components + useReviews (infinite query), useReviewStats, useCreateReview, useToggleHelpful, useDeleteReview hooks
- [x] Vendor: review management page with respond action — ReviewsPage with table, respond modal, useVendorReviews + useRespondToReview hooks, nav item + route
- [x] Admin: review moderation page — ReviewsPage with filters (search, type, status, rating), approve/reject/delete actions, detail modal, useAdminReviews + useApproveReview + useRejectReview + useDeleteAdminReview hooks, nav item + route
- [x] **All 3 frontend apps build successfully**

### Phase 6: Loyalty & Rewards System + Customer Wallet Frontend

#### Batch 6a: Loyalty Service Backend + DB Schema
- [x] Add `loyalty` schema to `init-postgres.sql` — `loyalty.accounts` table (user_id UNIQUE, points_balance, lifetime_points, tier enum Bronze/Silver/Gold/Platinum, tier_expires_at, is_active) + `loyalty.transactions` table (account_id FK, type, points, balance_after, reference_type, reference_id, description) with BRIN indexes
- [x] Add 3 loyalty accounts (Gold/Silver/Bronze) + 8 loyalty transactions to `seed-postgres.sql`
- [x] Add `daltaners.loyalty.events` topic to `init-kafka-topics.sh`
- [x] Add loyalty-service container (port 3017) to `docker-compose.services.yml`
- [x] Create loyalty-service scaffold (~25 files): package.json, tsconfig.json, nest-cli.json, Dockerfile, main.ts (port 3017, Kafka consumer group), app.module.ts (schema: 'loyalty'), common infrastructure (guards, decorators, filters, interceptors, dto, health module)
- [x] Create domain entities: `loyalty-account.entity.ts`, `loyalty-transaction.entity.ts`
- [x] Create DTOs: earn-points, redeem-points, loyalty-query, admin-loyalty-query, adjust-points
- [x] Create `loyalty.repository.ts` — CRUD, atomic addPoints/deductPoints with pessimistic_write locking, findTransactionsByAccountId, findTransactionByReference (idempotency), findAllAccounts (admin), getStats (aggregation)
- [x] Create `loyalty.service.ts` — getMyAccount (auto-create, Redis cached), earnPointsForOrder (idempotent, tier bonus), redeemPoints (balance check), recalculateTier (threshold-based), admin methods (list accounts, stats, adjust points)
- [x] Create `loyalty.controller.ts` — 6 REST endpoints (3 customer: account/transactions/redeem, 3 admin: accounts/stats/adjust)
- [x] Create `loyalty.consumer.ts` — Kafka consumer for `daltaners.orders.events`, earns points on `delivered` status
- [x] Create `loyalty.module.ts`, `redis.service.ts`, `kafka-producer.service.ts`, `jwt.strategy.ts`
- [x] Update `order.service.ts` — add `total_amount` to 3 status_changed event payloads (non-breaking additive change)
- [x] **Loyalty service builds successfully + pnpm install clean**

#### Batch 6b: Customer Wallet + Loyalty Frontend Pages
- [x] Add Vite proxies: `/api/v1/payments` → 3008, `/api/v1/loyalty` → 3017 in customer-web vite.config.ts
- [x] Create `hooks/useWallet.ts` — useWallet, useWalletTransactions, useTopupWallet
- [x] Create `hooks/useLoyalty.ts` — useLoyaltyAccount, useLoyaltyTransactions, useRedeemPoints
- [x] Create `pages/WalletPage.tsx` — balance card with gradient, topup modal (preset P100/500/1000/5000 + custom), wallet info grid, transaction history with pagination
- [x] Create `pages/RewardsPage.tsx` — tier card with tier-specific colors, progress bar (Bronze→Silver→Gold→Platinum), benefits card, points history with filter tabs (All/Earned/Redeemed/Bonus)
- [x] Add `/wallet` and `/rewards` routes to App.tsx inside ProtectedRoute
- [x] Add "Wallet" and "Rewards" links to MainLayout user dropdown menu
- [x] Create MSW mock data: `packages/mock-data/src/data/loyalty.ts` (loyalty accounts, transactions, wallet balance/transactions, admin data)
- [x] Create `packages/mock-data/src/handlers/wallet.handlers.ts` — 3 handlers (balance, topup, transactions)
- [x] Create `packages/mock-data/src/handlers/loyalty.handlers.ts` — 6 handlers (3 customer + 3 admin)
- [x] Update mock-data exports (data/index.ts, handlers/index.ts)
- [x] **customer-web typecheck clean**

#### Batch 6c: Admin Loyalty + Checkout Integration + Tests
- [x] Add `/api/v1/loyalty` → 3017 proxy to admin-panel vite.config.ts
- [x] Create `hooks/useLoyalty.ts` in admin-panel — useLoyaltyAccounts, useLoyaltyStats, useAdjustLoyaltyPoints
- [x] Create `pages/LoyaltyPage.tsx` in admin-panel — 4 stat cards (Total Accounts, Points Outstanding with PHP liability, Avg Balance, By Tier), DataTable with search/tier filter, adjust points modal
- [x] Add Loyalty nav item (trophy icon) to admin DashboardLayout + `/loyalty` route to App.tsx
- [x] Update `CheckoutPage.tsx` — add "Use Loyalty Points" section (points input, "Use All" button, discount preview, loyalty_points_used in payload, loyalty discount in price breakdown)
- [x] Update `useOrders.ts` — add `loyalty_points_used?: number` to CreateOrderPayload
- [x] Create `jest.config.ts` for loyalty-service
- [x] Create `loyalty.service.spec.ts` — 31 test cases covering: getMyAccount (cached/DB/auto-create/cache storage), getMyTransactions (pagination/type filter), earnPointsForOrder (base calc, gold bonus, idempotency, inactive skip, zero amount, Kafka event, cache invalidation), redeemPoints (success, insufficient, inactive, Kafka, no order_id), recalculateTier (all threshold transitions, tier_expires_at), admin methods (list/stats/adjust add/deduct/not found/insufficient/zero/cache invalidation)
- [x] **All 31 loyalty-service tests passing**
- [x] **admin-panel typecheck clean**
- [x] **customer-web typecheck clean**
- [x] **order-service 45 tests still passing**
- [x] **loyalty-service + order-service builds successful**
- [x] **Total unit tests: 400 across 11 services** (auth:51, order:45, payment:34, delivery:53, inventory:28, vendor:38, user:23, notification:17, zone:21, catalog:58, loyalty:31)

### Phase 7a: Quick Production Fixes
- [x] Fix DeliveryGateway CORS — changed hardcoded `cors: { origin: '*' }` to environment-aware pattern matching NotificationGateway (`process.env.NODE_ENV === 'development' ? true : CORS_ORIGINS.split(',')`, `credentials: true`)
- [x] Add endpoint-level rate limiting on auth endpoints — `@Throttle` decorators: `login`, `vendorLogin`, `resetPassword`, `requestOtp` (5 req/60s); `register`, `requestPasswordReset` (3 req/60s)
- [x] Add missing Kafka topics to init script — added `daltaners.catalog.events` (3 partitions), `daltaners.chat.events` (3 partitions); `daltaners.loyalty.events` already existed
- [x] **All 51 auth-service tests passing** (no regressions from @Throttle decorators)
- [x] **All 53 delivery-service tests passing** (no regressions from CORS fix)
- [x] **Full monorepo build passing** (18 tasks, 18 successful)

### Phase 7b: Elasticsearch Product Search Backend
- [x] Add `@elastic/elasticsearch@^8.13.0` dependency to catalog-service
- [x] Create `elasticsearch.service.ts` — ES 8 client with Filipino/English synonym analyzer (36 synonym pairs: bigas↔rice, gatas↔milk, manok↔chicken, etc.), edge n-gram autocomplete (2-15 chars), product indexing/search/suggest/bulk reindex, graceful degradation when ES unavailable, `ELASTICSEARCH_NODE`/`ELASTICSEARCH_ENABLED` env vars, `daltaners_products` index
- [x] Create `dto/search-query.dto.ts` — SearchQueryDto (q, category_id, store_id, brand, min/max_price, dietary_tags, sort_by, sort_order, page, size) + SuggestQueryDto (q, size) with @Transform decorators
- [x] Create `search.controller.ts` — GET /catalog/search (public full-text search with facets), GET /catalog/search/suggest (public autocomplete), POST /catalog/search/reindex (admin-only)
- [x] Create `tests/elasticsearch.service.spec.ts` — 34 unit tests covering: init, index creation, product indexing (primary image fallback, no images, error tolerance), remove, bulk index (partial failures), search (text, filters, pagination, aggregations, failure tolerance), suggest, reindex, deleteIndex
- [x] Update `catalog.module.ts` — register SearchController + ElasticsearchService in controllers/providers/exports
- [x] Update `catalog.service.ts` — hook non-blocking ES indexing into createProduct (fetch full product with relations then index), updateProduct (re-index), deleteProduct (remove from ES + publish PRODUCT_DELETED Kafka event which was previously missing)
- [x] Add `findAllProductsForIndexing()` to catalog.repository.ts — fetches all active products with category/images relations
- [x] **All 434 unit tests passing** (auth:51, order:45, payment:34, delivery:53, inventory:28, vendor:38, user:23, notification:17, zone:21, catalog:93 [+35], loyalty:31)
- [x] **Full monorepo build passing** (18/18 tasks)

### Phase 7c: Customer Web Search Enhancement
- [x] Add `/api/v1/search` → catalog-service (port 3004) Vite proxy with rewrite to `/api/v1/catalog/search`
- [x] Create `hooks/useSearch.ts` — `useSearch()` hook (ES-powered full-text search with filters: q, category_id, store_id, brand, min/max_price, dietary_tags, sort_by/sort_order, offset pagination, aggregations response) + `useSearchSuggestions()` hook (autocomplete from `/search/suggest`, enabled when query >= 2 chars, 60s stale time)
- [x] Update `components/common/SearchBar.tsx` — add autocomplete dropdown with keyboard navigation (ArrowUp/Down/Enter/Escape), suggestion selection, outside-click dismiss, search icon per suggestion item, highlighted active item
- [x] Update `components/search/SearchFilters.tsx` — add faceted filter support: brand filter (from ES aggregations with doc counts), dietary tags multi-select filter (from ES aggregations), active filter count badge on Filters button, sort options aligned to ES fields (_score, total_sold, created_at, base_price asc/desc, rating_average)
- [x] Update `pages/SearchPage.tsx` — dual-mode: uses ES search (useSearch) when text query or facet filters active, falls back to useProducts for browse-by-category; offset-based pagination with Previous/Next + page indicator for ES results; cursor-based Load More for product listing; aggregations passed to SearchFilters for dynamic facets
- [x] Create `packages/mock-data/src/handlers/search.handlers.ts` — 2 MSW handlers: GET /search (full-text with filters, offset pagination, mock aggregations for categories/brands/price_range/dietary_tags) + GET /search/suggest (autocomplete from product names, min 2 chars)
- [x] Register searchHandlers in `packages/mock-data/src/handlers/index.ts` (placed before productsHandlers to avoid route conflicts)
- [x] **Full monorepo build passing** (18/18 tasks)

### Phase 7d: Chat/Messaging Service Backend
- [x] Add PostgreSQL `chat` schema to `init-postgres.sql` — `chat.conversations` table (type order/support/direct, order_id FK, status, last_message_at/preview, message_count, metadata) + `chat.conversation_participants` table (user_id, user_type, display_name, is_muted, unread_count, last_read_at, joined_at/left_at, UNIQUE(conversation_id, user_id)), indexes on order_id/status/last_message_at/user_id/conversation_id, updated_at trigger
- [x] CassandraDB `chat_messages` table already existed in `init-cassandra.cql` (conversation_id partition key, message_id TIMEUUID clustering, sender_id, sender_type, message_type, content, media_url, read_at, 1-year TTL)
- [x] Create chat-service scaffold (port 3013, ~30 files):
  - `package.json` with NestJS, Socket.IO, cassandra-driver, kafkajs, ioredis
  - `tsconfig.json`, `nest-cli.json`, `Dockerfile` (multi-stage, port 3013)
  - `main.ts` (Kafka consumer group `daltaners-chat-service-group`, Swagger docs)
  - `app.module.ts` (PostgreSQL `chat` schema, ThrottlerModule)
  - Common infrastructure (decorators, guards, filters, interceptors, pagination DTO, health module) — identical pattern to other services
  - `jwt.strategy.ts`, `redis.service.ts` (with hash/pub operations for presence), `kafka-producer.service.ts`
  - `cassandra.service.ts` — Cassandra 4 client wrapper (connect/execute/getTimeUuid/fromTimeUuid)
- [x] Create domain entities:
  - `conversation.entity.ts` — TypeORM entity for `chat.conversations` with OneToMany participants (eager)
  - `conversation-participant.entity.ts` — TypeORM entity for `chat.conversation_participants` with ManyToOne cascade
- [x] Create DTOs:
  - `create-conversation.dto.ts` — type (order/support/direct), order_id, title, participants[] with nested ParticipantDto validation
  - `send-message.dto.ts` — message_type (text/image/location/system), content (max 5000), media_url
  - `message-query.dto.ts` — MessageQueryDto (limit, before/after cursors) + ConversationQueryDto (page, limit, type, status filters)
- [x] Create `chat.repository.ts` — hybrid PostgreSQL + CassandraDB data access:
  - PG: createConversation (with participants), findById, findByOrderId, findByUserId (paginated/filtered), isParticipant, updateLastMessage (atomic increment), incrementUnreadCount (SQL update), resetUnreadCount, closeConversation
  - Cassandra: insertMessage (TimeUuid generation), getMessages (cursor-based before/after/latest), markMessagesAsRead
- [x] Create `chat.service.ts` — business logic:
  - Conversations: create (order uniqueness check, Kafka event), get (access control), getAll (paginated), getByOrderId, close (vendor/admin only)
  - Messages: send (participant + status checks, text/image validation, update conversation metadata, increment unread, Kafka event, clear typing), getMessages (cursor pagination with has_more), markAsRead
  - Presence: setTyping (Redis TTL 10s), setOnline/setOffline (Redis TTL 5min), isOnline, getOnlineParticipants
  - Role-to-userType mapping (customer, vendor_owner→vendor, delivery, admin)
- [x] Create `chat.controller.ts` — 8 REST endpoints under `/chat`:
  - POST /conversations (create), GET /conversations (list mine), GET /conversations/:id, GET /conversations/order/:orderId
  - POST /conversations/:id/close, POST /conversations/:id/messages, GET /conversations/:id/messages
  - POST /conversations/:id/read (mark as read), GET /conversations/:id/online (presence)
- [x] Create `chat.gateway.ts` — WebSocket gateway on `/chat` namespace:
  - Client events: authenticate (multi-device tracking), join_conversation, leave_conversation, send_message (real-time broadcast to room), typing (broadcast to others), mark_read (read receipt broadcast)
  - Server methods: emitToConversation, emitToUser
  - Environment-aware CORS, connection/disconnection lifecycle with presence cleanup
- [x] Create `chat.module.ts` — registers all entities, controllers, providers, exports
- [x] Add chat-service container to `docker-compose.services.yml` (port 3013, depends on postgres+redis+kafka+cassandra)
- [x] Add chat seed data to `seed-postgres.sql` — 3 conversations (2 order-based, 1 support), 6 participants (Maria↔Mike, Juan↔Joy, Ana↔Admin)
- [x] Create `jest.config.ts` for chat-service
- [x] Create `chat.service.spec.ts` — **42 test cases** covering: createConversation (success, conflict on duplicate order, direct type skips order check, Kafka event, Kafka failure tolerance, role mapping), getConversation (success, not found, non-participant), getConversations (paginated, filters), getConversationByOrderId (success, not found, non-participant), closeConversation (admin allowed, vendor allowed, customer rejected), sendMessage (text success, metadata update, not found, closed conversation, non-participant, empty text, image without url, image with url, Kafka event, typing cleared), getMessages (success, has_more detection, non-participant, cursor passthrough), markAsRead (success, empty list skip, non-participant), setTyping (set/clear), setOnline/setOffline, isOnline (online/offline), getOnlineParticipants (filtered, not found)
- [x] **All 42 chat-service tests passing**
- [x] **Full monorepo build passing** (19/19 tasks — 4 packages, 3 apps, 12 services)
- [x] **Total unit tests: 476 across 12 services** (auth:51, order:45, payment:34, delivery:53, inventory:28, vendor:38, user:23, notification:17, zone:21, catalog:93, loyalty:31, chat:42)

### Phase 7e: Vendor Coupon Controller + Vendor Dashboard Promotions Page
- [x] Create `vendor-coupon.controller.ts` in order-service — 5 endpoints: GET/POST/PATCH/DELETE `/orders/vendor/coupons` with store scoping via `vendor_id` from JWT
- [x] Create `dto/vendor-coupon-query.dto.ts` — search, discount_type, is_active, is_expired filters with PaginationQueryDto
- [x] Register `VendorCouponController` in `order.module.ts`
- [x] Create vendor-dashboard `pages/PromotionsPage.tsx` — coupon DataTable (code, name, type, discount, usage, status, validity, actions), search + 3 filter dropdowns, create/edit modal with full form, delete confirmation
- [x] Create vendor-dashboard `hooks/useCoupons.ts` — useVendorCoupons, useCreateVendorCoupon, useUpdateVendorCoupon, useDeleteVendorCoupon
- [x] Create vendor-dashboard `pages/FinancialsPage.tsx` — 4 summary cards (earned/paid/pending/commission), settlement table with status/date filters, pagination
- [x] Create vendor-dashboard `hooks/useFinancials.ts` — useSettlementSummary, useSettlements, usePaymentTransactions
- [x] Add MSW handlers for vendor coupons (CRUD) and financials (settlement summary + list) in `vendor.handlers.ts`
- [x] **All routes + nav items already wired in App.tsx + DashboardLayout.tsx**
- [x] **Full monorepo build passing** (19/19 tasks)

### Phase 7f: Vendor Dashboard — Reviews Connection
- [x] Create vendor-dashboard `pages/ReviewsPage.tsx` — review list with star ratings, verified purchase badges, respond modal (max 2000 chars), type filter, pagination
- [x] Create vendor-dashboard `hooks/useReviews.ts` — useVendorReviews, useRespondToReview
- [x] Backend review endpoints already exist: `GET /catalog/reviews/vendor/my-reviews`, `POST /catalog/reviews/:id/response`
- [x] Vite proxy already configured: `/api/v1/catalog` → catalog-service (port 3004)
- [x] **Reviews route + nav item already wired in App.tsx + DashboardLayout.tsx**

### Phase 8a: React Native Mobile App — Scaffold + Shared Infrastructure
- [x] Create `apps/mobile/` project structure with Expo SDK 51 + React Native 0.74.5 config (package.json, tsconfig.json, babel.config.js, tailwind.config.js, app.json, metro.config.js)
- [x] Create theme system — `global.css` (NativeWind base), `colors.ts` (Daltaners palette: primary #FF6B35, secondary #004E89, accent #FFD700, tier/status colors)
- [x] Create i18n setup — English (`en.json`), Filipino/Tagalog (`fil.json`), Cebuano (`ceb.json`), translation function with `{{param}}` interpolation + English fallback
- [x] Create TypeScript types — all interfaces: User, AuthTokens, Store, Product, Order, Cart, Wallet, Loyalty, Delivery, API envelope, pagination
- [x] Create API service (`services/api.ts`) — Axios with JWT interceptor, automatic token refresh queue, 10 service-specific instances (auth, user, vendor, catalog, inventory, order, delivery, payment, chat, loyalty) using `10.0.2.2` for Android emulator
- [x] Create auth token service (`services/auth.ts`) — expo-secure-store wrapper: getTokens, setTokens, clearTokens, getStoredUser, setStoredUser
- [x] Create Socket.IO service (`services/socket.ts`) — connections for notifications (3010), delivery tracking (3007), chat (3013), order subscription, location broadcasting
- [x] Create Zustand stores: auth (login/vendorLogin/register/logout/initialize from SecureStore), cart (multi-store with variants/substitution), location (expo-location with permission/watching/addresses), orderTracking (real-time with rider GPS/ETA/status via Socket.IO)
- [x] Create utility functions (`utils/format.ts`) — formatCurrency (PHP), formatDate/Time, formatDistance (m/km), formatMinutes, getTimeAgo, getInitials, formatPhone (PH)
- [x] Create 11 shared UI components: Button (5 variants, 3 sizes, loading), Input (label/error/password toggle), Card (shadow/onPress), Badge + StatusBadge (order status presets), Avatar (expo-image + initials), StarRating (interactive + display), EmptyState, LoadingSpinner (fullScreen), PriceTag (sale strikethrough), SearchBar (clear button)
- [x] Create navigation — CustomerNavigator (5 tabs + 6 stacks), VendorNavigator (5 tabs + 2 stacks), DeliveryNavigator (3 tabs + 2 stacks), AuthNavigator (Login/Register), RootNavigator (role-based routing)
- [x] Create 13 Customer screens: LoginScreen (email/password with role modes), RegisterScreen (full form + validation), HomeScreen (location header, categories, nearby stores), SearchScreen (ES search + filters), StoreScreen (banner/products grid), ProductScreen (images/variants/quantity), CartScreen (item list + summary), CheckoutScreen (address/payment/coupon/order), OrderHistoryScreen (active/completed tabs), OrderTrackingScreen (timeline/rider/live tracking), ProfileScreen (account menu), WalletScreen (balance/topup/history), RewardsScreen (tier card/progress/points)
- [x] Create 5 Vendor screens: DashboardScreen (4 stat cards + recent orders), OrderManagementScreen (status tabs + accept/reject/progression), ProductManagementScreen (list + search + edit/delete), InventoryScreen (stock levels + adjust), SettingsScreen (store info + hours + delivery)
- [x] Create 5 Delivery screens: HomeScreen (online toggle + GPS + earnings + assignments), ActiveDeliveryScreen (workflow: accepted→at_store→picked_up→in_transit→delivered), NavigationScreen (native maps integration), EarningsScreen (today/week/month + performance stats), ProfileScreen (payout/documents/logout)
- [x] Create 3 app entry points: customer/App.tsx, vendor/App.tsx, delivery/App.tsx + index.ts default export
- [x] **66 total source files created across the mobile app**
- [x] **Full monorepo build passing** (19/19 tasks — mobile uses Expo build system, not turbo)

### Phase 9: Kubernetes Deployment & CI/CD Pipeline

#### K8s Base Configuration
- [x] Create `k8s/base/namespace.yaml` — `daltaners` namespace with labels
- [x] Create `k8s/base/configmap.yaml` — shared ConfigMap: all service discovery URLs (internal DNS), database/cache/messaging connection strings, CORS origins, env settings
- [x] Create `k8s/base/secrets.yaml` — Secret template for DB credentials, JWT secrets, API keys (placeholder values — use sealed-secrets/Vault in production)
- [x] Create `k8s/base/service-account.yaml` — ServiceAccount + Role (pod/service/configmap read) + RoleBinding

#### K8s Backend Services (12 Deployments + Services)
- [x] Create `k8s/services/auth-service.yaml` — Deployment (2 replicas, 100m-500m CPU, 128Mi-512Mi RAM, AZ spread) + ClusterIP Service (port 3001)
- [x] Create `k8s/services/user-service.yaml` — (port 3002)
- [x] Create `k8s/services/vendor-service.yaml` — (port 3003)
- [x] Create `k8s/services/catalog-service.yaml` — 3 replicas, higher resources (200m-1000m CPU, 256Mi-1Gi RAM) for search-heavy workload (port 3004)
- [x] Create `k8s/services/inventory-service.yaml` — (port 3005)
- [x] Create `k8s/services/order-service.yaml` — 3 replicas, higher resources for critical path (port 3006)
- [x] Create `k8s/services/delivery-service.yaml` — 3 replicas, higher resources for real-time GPS (port 3007)
- [x] Create `k8s/services/payment-service.yaml` — higher resources for payment processing (port 3008)
- [x] Create `k8s/services/notification-service.yaml` — (port 3010)
- [x] Create `k8s/services/chat-service.yaml` — (port 3013)
- [x] Create `k8s/services/zone-service.yaml` — (port 3014)
- [x] Create `k8s/services/loyalty-service.yaml` — (port 3017)
- [x] All deployments have: startup/readiness/liveness probes (/health), envFrom configmap+secrets, topologySpreadConstraints, resource requests+limits

#### K8s Frontend Apps + Ingress
- [x] Create `k8s/apps/customer-web.yaml` — Deployment (2 replicas, nginx, port 80) + ClusterIP Service
- [x] Create `k8s/apps/admin-panel.yaml` — Deployment (2 replicas) + ClusterIP Service
- [x] Create `k8s/apps/vendor-dashboard.yaml` — Deployment (2 replicas) + ClusterIP Service
- [x] Create `k8s/apps/ingress.yaml` — 2 Ingress resources:
  - Main Ingress: `daltaners.ph` → customer-web, `admin.daltaners.ph` → admin-panel, `vendor.daltaners.ph` → vendor-dashboard, `api.daltaners.ph` → 12 backend services (path-based routing)
  - WebSocket Ingress: `ws.daltaners.ph` → notification/delivery/chat services (3600s timeout, sticky sessions)
  - TLS via cert-manager + letsencrypt-prod, rate limiting, gzip, 25MB body limit

#### K8s Infrastructure (StatefulSets)
- [x] Create `k8s/infrastructure/postgres.yaml` — StatefulSet (PostGIS 16, 50Gi PVC, pg_isready probes, 500m-2000m CPU, 1-4Gi RAM) + headless Service
- [x] Create `k8s/infrastructure/redis.yaml` — StatefulSet (Redis 7 Alpine, 10Gi PVC, requirepass, maxmemory 512MB LRU, AOF persistence) + headless Service
- [x] Create `k8s/infrastructure/kafka.yaml` — Zookeeper StatefulSet (5Gi PVC, srvr healthcheck) + Kafka StatefulSet (50Gi PVC, 500m-2000m CPU, 1-4Gi RAM) + kafka-init-topics Job (12 topics with correct partitions)
- [x] Create `k8s/infrastructure/cassandra.yaml` — StatefulSet (Cassandra 4.1, 50Gi PVC, cqlsh/nodetool probes, 500m-2000m CPU, 1-4Gi RAM) + headless Service
- [x] Create `k8s/infrastructure/elasticsearch.yaml` — StatefulSet (ES 8.13, 30Gi PVC, sysctl init container for vm.max_map_count, cluster health probes) + headless Service

#### K8s Autoscaling & Hardening
- [x] Create `k8s/autoscaling/hpa.yaml` — HorizontalPodAutoscaler for all 15 deployments:
  - Critical path (order/delivery/payment): min 2-3, max 10-15, CPU target 60%
  - High-traffic (auth/catalog): min 2-3, max 8-12, CPU target 60-70%
  - Standard services: min 2, max 4-8, CPU target 70%
  - Frontend: customer-web max 10, admin max 4, vendor max 6
- [x] Create `k8s/autoscaling/pdb.yaml` — PodDisruptionBudget for all 15 deployments:
  - Critical (order/delivery/payment/auth/catalog/customer-web): minAvailable 2
  - Others: minAvailable 1
- [x] Create `k8s/autoscaling/network-policy.yaml` — 6 NetworkPolicies:
  - Default deny all ingress
  - Allow Ingress controller → frontends (port 80)
  - Allow Ingress controller → backends (service ports)
  - Allow backend → backend (intra-namespace)
  - Allow backend → infrastructure (DB/cache/messaging ports)
  - Allow Kafka → Zookeeper

#### CI/CD Pipeline (GitHub Actions)
- [x] Create `.github/workflows/ci.yml` — Lint + Typecheck + Unit Tests + Integration Tests:
  - Typecheck: `pnpm turbo run build` (all packages)
  - Unit tests: matrix strategy for all 12 services in parallel
  - Integration tests: matrix for 4 services (order/payment/inventory/delivery), runs after unit tests
  - Concurrency: cancel-in-progress per branch
- [x] Create `.github/workflows/build-and-push.yml` — Build & Push Docker Images:
  - Change detection: only builds services/apps with changed files
  - Tag-based builds: all images on version tags
  - GHCR registry with semantic versioning + SHA tags
  - Docker BuildKit layer caching via GHA cache
  - Matrix strategy for parallel builds
- [x] Create `.github/workflows/deploy.yml` — Deploy to Kubernetes:
  - Triggered by successful build workflow or manual dispatch
  - Environment selection (staging/production) with approval gates
  - Infrastructure deployment first, then backends, then frontends
  - Rolling update with image tag from build SHA
  - Rollout status verification for all deployments
  - Post-deployment summary (deployments, pods, services)
- [x] **Full monorepo build still passing** (19/19 tasks)

### Phase 10a: Basic Product Recommendations (Backend + Frontend)
- [x] Create `dto/recommendation-query.dto.ts` — PopularProductsQueryDto (zone_id?, store_id?, category_id?, limit max 20), SimilarProductsQueryDto, FrequentlyBoughtTogetherQueryDto, PersonalizedQueryDto with class-validator + class-transformer
- [x] Create `recommendation.repository.ts` — 4 query methods: findPopularProducts (total_sold + rating_average sort), findFrequentlyBoughtTogether (cross-schema JOIN orders.order_items for co-purchase analysis, fallback to similar), findSimilarProducts (category + store + price proximity scoring), findPersonalizedProducts (user's recent categories/stores with CTE, excludes already purchased, fallback to popular)
- [x] Create `recommendation.service.ts` — Redis cached: popular (15min TTL), together/similar (30min), personalized (10min). Key pattern: `catalog:recommendations:{type}:{params}`. Graceful cache read/write failure handling
- [x] Create `recommendation.controller.ts` — 4 endpoints: GET /catalog/recommendations/popular (public), GET /catalog/recommendations/together/:productId (public), GET /catalog/recommendations/similar/:productId (public), GET /catalog/recommendations/personalized (customer auth). Standard response envelope
- [x] Register RecommendationController, RecommendationService, RecommendationRepository in `catalog.module.ts`
- [x] Create `tests/recommendation.service.spec.ts` — 21 test cases covering: popular (from repo, cached, cache TTL, store filter, category filter, cache read failure, cache write failure), together (from repo, cached, cache TTL), similar (from repo, cached, cache TTL), personalized (from repo, cached, cache TTL, default limit), cache keys (different params, same params, default suffix)
- [x] Create `hooks/useRecommendations.ts` — usePopularProducts, useFrequentlyBoughtTogether, useSimilarProducts, usePersonalizedProducts hooks with React Query + transform to frontend Product shape
- [x] Create `components/product/RecommendationCarousel.tsx` — horizontal scrollable product row with left/right scroll buttons, skeleton loading, scroll-snap, reuses ProductCard
- [x] Update `pages/HomePage.tsx` — add "Popular in Your Area" section (always visible) + "Recommended for You" section (auth only)
- [x] Update `pages/ProductPage.tsx` — add "Frequently Bought Together" + "Similar Products" sections below product details, above reviews
- [x] Add Vite proxy: `/api/v1/recommendations` → catalog-service (port 3004), rewrite to `/api/v1/catalog/recommendations`
- [x] Create MSW handlers for recommendations (4 handlers) + register in handlers/index.ts
- [x] **catalog-service builds successfully**
- [x] **customer-web builds successfully (tsc + vite)**
- [x] **All 113 catalog-service tests passing** (catalog:58, elasticsearch:34, recommendation:21)

### Phase 10b: Customer UX Enhancements (Quick Reorder + i18n)
- [x] Quick Reorder functionality:
  - Added `addItemWithQuantity(item)` method to cart store — adds item with specified quantity (accumulates if already in cart)
  - Updated `OrderCard.tsx` — added "Order Again" button for delivered/cancelled orders; adds all items to cart with correct quantities and navigates to `/cart`
  - Updated `OrderDetailPage.tsx` — replaced placeholder "Order Again" button (navigated to /search) with real reorder that adds items to cart; also shows for cancelled orders
- [x] i18n setup with react-i18next:
  - Installed `i18next`, `react-i18next`, `i18next-browser-languagedetector` as dependencies
  - Created `src/i18n/en.json` — English translations (9 sections: common, nav, auth, home, store, product, cart, checkout, orders, profile, wallet, rewards, search, footer)
  - Created `src/i18n/fil.json` — Filipino/Tagalog translations (full coverage)
  - Created `src/i18n/ceb.json` — Cebuano translations (full coverage)
  - Created `src/i18n/index.ts` — i18n config with browser language detector, localStorage persistence (`daltaners-language` key), English fallback
  - Created `components/common/LanguageSwitcher.tsx` — dropdown with globe icon, shows current language label, flag per option, checkmark on active, outside-click dismiss
  - Updated `main.tsx` — imports `@/i18n` to initialize i18n before app render
  - Updated `layouts/MainLayout.tsx` — added `useTranslation()`, placed LanguageSwitcher in header before cart button, translated user menu items (My Orders, Wallet, Rewards, Profile, Sign Out), Sign In/Sign Up buttons, and full footer (tagline, nav links, legal links, copyright)
- [x] **customer-web builds successfully** (tsc + vite)

### Phase 10c: Vendor Dashboard Enhancements (CSV Import + Analytics)
- [x] CSV Product Import backend (catalog-service):
  - Created `dto/csv-import.dto.ts` — CsvImportResult interface, expected headers, template constants
  - Created `csv-import.service.ts` — Core import logic: CSV parsing with `csv-parse/sync`, header validation, per-row validation (required fields, numeric types, UUID format), semicolon-separated array parsing (dietary_tags, allergens), in-batch slug deduplication, DB transaction via DataSource.createQueryRunner(), async ES indexing + Kafka events (fire-and-forget), max 500 rows / 5MB file limits
  - Updated `catalog.controller.ts` — Added `POST /catalog/products/import` (FileInterceptor, vendor/admin roles, 5MB limit) and `GET /catalog/products/import/template` (@Public, CSV download) — both placed BEFORE `products/:idOrSlug` route to avoid conflicts
  - Updated `catalog.module.ts` — Registered CsvImportService in providers
  - Updated `package.json` — Added `csv-parse: ^5.5.0` and `@types/multer` dependencies
  - Created `tests/csv-import.service.spec.ts` — 15 unit tests covering: valid single/multi-row imports, missing required fields (name, category_id, base_price), invalid UUID format, negative prices, max rows limit, empty CSV, missing headers, semicolon parsing, in-batch slug uniqueness, DB transaction rollback, ES/Kafka failure tolerance, mixed valid/invalid rows, boolean field validation
- [x] Vendor Analytics backend (order-service):
  - Created `dto/vendor-analytics-query.dto.ts` — VendorAnalyticsQueryDto (date_from, date_to)
  - Created `vendor-analytics.controller.ts` — `GET /orders/vendor/:storeId/analytics` with vendor/admin role guard
  - Updated `order.repository.ts` — Added `getVendorAnalytics()` with 8 queries: revenue summary (today/week/month/all_time), order count summary, average order value, orders by status, revenue by day (30 days), orders by day (30 days), top 10 products (JOIN order_items), fulfillment rate, avg preparation time, peak hours (24h)
  - Updated `order.service.ts` — Added `getVendorAnalytics()` method with response envelope
  - Updated `order.module.ts` — Registered VendorAnalyticsController
- [x] CSV Import UI (vendor-dashboard):
  - Created `hooks/useImport.ts` — `useImportProducts()` mutation (FormData upload, 60s timeout), `useDownloadTemplate()` mutation (blob download, auto-triggers file save)
  - Created `components/products/CsvImportModal.tsx` — Full-featured modal with: drag-and-drop file zone (CSV only), client-side 5MB validation, "Download Template" button, upload progress states (idle/uploading/complete/error), results summary (3 stat cards: total/imported/failed), error detail table (row/field/message), file remove/re-upload support
  - Updated `pages/ProductsPage.tsx` — Added "Import CSV" button (outline variant) next to "Add Product", CsvImportModal with state management, invalidates products cache on successful import
- [x] Vendor Analytics Page (vendor-dashboard):
  - Created `hooks/useAnalytics.ts` — `useVendorAnalytics(storeId, dateFrom?, dateTo?)` query hook
  - Created `pages/AnalyticsPage.tsx` — Full analytics dashboard with: date range picker (custom from/to), 4 summary cards (Today's Orders, Today's Revenue, Avg Order Value, Fulfillment Rate), Revenue AreaChart (30 days, green gradient), Orders LineChart (30 days), Orders by Status PieChart (color-coded by status), Top Products table (10 rows with rank/name/qty/revenue), Peak Hours BarChart (24h), Period Summary section (month + all-time stats)
  - Updated `App.tsx` — Added `/analytics` route
  - Updated `layouts/DashboardLayout.tsx` — Added "Analytics" nav item with bar-chart icon (after Financials)
- [x] MSW mock handlers:
  - Updated `handlers/vendor.handlers.ts` — Added 3 handlers: `POST /catalog/products/import` (mock 8 success, 2 failed with errors), `GET /catalog/products/import/template` (CSV blob response), `GET /orders/vendor/:storeId/analytics` (full mock analytics data)
  - Updated `data/dashboard.ts` — Added `vendorAnalyticsMock` export with 30-day generated data, realistic Filipino product names, peak hours, status distribution
  - Updated `data/index.ts` — Exported new `vendorAnalyticsMock`

## Cancelled Tasks

### Phase 10d: WhatsApp Ordering Service — CANCELLED
- ~~New microservice (port 3018) with conversational ordering FSM~~
- **Reason**: Replaced with Messenger integration (planned for future phase)

### Phase 10e: POS System (Web-Based)

#### Phase 10e-1: Backend Scaffold + Entities + DB Schema — COMPLETED
- [x] Created `services/pos-service/` with full NestJS 10 project scaffold (package.json, tsconfig.json, nest-cli.json, jest.config.ts)
- [x] Created `src/main.ts` — Bootstrap with Helmet, CORS, ValidationPipe, Swagger at /api/docs, Kafka consumer (pos-service), port 3015
- [x] Created `src/app.module.ts` — ConfigModule, TypeORM (pos schema), ThrottlerModule, global guards/filters/interceptors
- [x] Created `src/common/` — Full infrastructure (decorators: CurrentUser, Roles, RequirePermissions, Public; guards: JwtAuth, Roles, Permissions, ThrottlerBehindProxy; filters: AllExceptions; interceptors: Transform, Logging, Timeout; interfaces: JwtPayload; dto: PaginationQuery)
- [x] Created `src/config/jwt.strategy.ts` — Passport JWT strategy with daltaners_jwt_secret_dev default
- [x] Created `src/health/` — HealthModule + HealthController (liveness + readiness probes)
- [x] Created 6 entities: TerminalEntity, ShiftEntity, TransactionEntity, TransactionItemEntity, CashMovementEntity, ReceiptEntity
- [x] Created `pos.repository.ts` — Full repository with Terminal CRUD, Shift CRUD, Transaction CRUD (with QueryRunner transactions), Cash Movement CRUD, Receipt CRUD, Reports (shift summary, sales summary, product sales, hourly sales, cashier performance, payment breakdown), Batch sync
- [x] Created `redis.service.ts` — Redis client with get/set/del/getJson/setJson + TTL support
- [x] Created `kafka-producer.service.ts` — CloudEvents Kafka producer (source: daltaners/pos-service)
- [x] Created `pos.module.ts` — Feature module registering all 6 entities, Passport JWT, Redis, Kafka, Repository
- [x] Created `Dockerfile` — Multi-stage build (base→deps→build→deploy→production), port 3015, healthcheck
- [x] Updated `docker/init-postgres.sql` — Added `pos` schema + 6 table DDLs (terminals, shifts, transactions, transaction_items, cash_movements, receipts) with indexes and triggers
- [x] Updated `docker/init-kafka-topics.sh` — Added `daltaners.pos.events` topic (3 partitions)
- [x] Updated `docker-compose.services.yml` — Added pos-service container (port 3015, depends on postgres/redis/kafka)
- [x] Build verified: `nest build` passes with no errors

#### Phase 10e-2: Backend Terminal + Shift + Cash Management — COMPLETED
- [x] Created 7 DTOs: CreateTerminalDto, UpdateTerminalDto, TerminalHeartbeatDto, OpenShiftDto, CloseShiftDto, ShiftQueryDto, CreateCashMovementDto — all with class-validator + class-transformer + Swagger decorators
- [x] Created `pos.service.ts` — Business logic layer with: terminal CRUD (create with code uniqueness check, get, list, update, delete with open-shift guard, heartbeat), shift open/close (inactive terminal guard, duplicate shift guard, expected cash calculation with cash-movement aggregation, cash difference reporting, Kafka events), cash movement CRUD (open-shift guard, performed_by tracking)
- [x] Created `terminal.controller.ts` — 6 endpoints: POST /pos/terminals, GET /pos/terminals/store/:storeId, GET /pos/terminals/:id, PATCH /pos/terminals/:id, DELETE /pos/terminals/:id, POST /pos/terminals/:id/heartbeat
- [x] Created `shift.controller.ts` — 6 endpoints with correct route ordering (literal-prefix routes before parameterized): POST /pos/shifts/open, GET /pos/shifts/terminal/:terminalId, GET /pos/shifts/store/:storeId, GET /pos/shifts/:id, GET /pos/shifts/:id/summary, POST /pos/shifts/:id/close
- [x] Created `cash-movement.controller.ts` — 2 endpoints: POST /pos/shifts/:shiftId/cash-movements, GET /pos/shifts/:shiftId/cash-movements
- [x] Registered all controllers + PosService in `pos.module.ts`
- [x] Authorization: vendor_owner/vendor_staff/admin roles with store-level access control
- [x] **Build passes** (nest build)

#### Phase 10e-3: Backend Transaction Processing + Reports — COMPLETED
- [x] Created 5 DTOs: CreateTransactionDto (with nested CreateTransactionItemDto array validation), TransactionQueryDto, VoidTransactionDto, ReportQueryDto — all with class-validator
- [x] Added transaction methods to `pos.service.ts`: createTransaction (idempotency check, shift-open validation, refund requires original_transaction_id, auto-calculate subtotal/tax/discount/total, cash change calculation, auto-generate POS-YYYYMMDD-XXXXXX receipt number, receipt text formatting, Kafka event), getTransaction, getTransactionByNumber, listTransactionsByShift, listTransactionsByStore, voidTransaction (state machine: only completed→voided, open-shift guard), getReceipt
- [x] Added report methods to `pos.service.ts`: getSalesSummary, getProductSales, getHourlySales, getCashierPerformance, getPaymentBreakdown (all delegating to repository)
- [x] Created `transaction.controller.ts` — 6 endpoints with correct route ordering: POST /pos/transactions, GET /pos/transactions/shift/:shiftId, GET /pos/transactions/store/:storeId, GET /pos/transactions/:id, GET /pos/transactions/:id/receipt, POST /pos/transactions/:id/void
- [x] Created `report.controller.ts` — 6 endpoints: GET /pos/reports/store/:storeId/sales-summary, GET /pos/reports/store/:storeId/product-sales, GET /pos/reports/store/:storeId/hourly-sales, GET /pos/reports/store/:storeId/cashier-performance, GET /pos/reports/store/:storeId/payment-breakdown, GET /pos/reports/shift/:shiftId/summary
- [x] Registered TransactionController + ReportController in `pos.module.ts`
- [x] **Build passes** (nest build)

#### Phase 10e-4: Backend Unit Tests — COMPLETED
- [x] Created `pos.service.spec.ts` — 49 test cases covering:
  - Terminal CRUD (5 tests): create with uniqueness check, duplicate code conflict, auth guards, admin access, vendor cross-store rejection
  - Terminal get/update/delete (4 tests): get by ID, not found, update, delete with open-shift guard
  - Terminal heartbeat (2 tests): success, not found
  - Shift open (3 tests): success with Kafka event, inactive terminal rejection, duplicate open shift conflict
  - Shift close (3 tests): cash difference calculation (opening + cash sales + cash_in - cash_out), not found, already closed
  - Shift get/list (3 tests): get by ID, not found, paginated list
  - Cash movement (3 tests): create on open shift, shift not found, closed shift rejection
  - Transaction create (7 tests): sale success, idempotency dedup, shift not found, closed shift, refund without original_id, insufficient cash tendered, card payment bypass, item total calculation
  - Transaction void (4 tests): void completed, not found, already voided, closed shift guard
  - Transaction get/receipt (4 tests): get by ID, not found, receipt by tx ID, receipt not found
  - Reports (7 tests): sales summary, product sales (default + custom limit), hourly sales, cashier performance, payment breakdown, shift summary, shift summary not found
- [x] **All 49 tests passing**

#### Phase 10e-5: Frontend Scaffold + UI Components + Login — COMPLETED
- [x] POS frontend app scaffold: `package.json` (React 19, Vite 5, TanStack Query v5, Zustand, Tailwind, Recharts, Zod), `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts` (port 5176, proxies: auth→3001, pos→3015, catalog→3004, inventory→3005, stores→3003), `postcss.config.js`, `tailwind.config.ts` (Daltaners palette + dark POS theme colors: pos-bg #1a1d23, pos-surface #23272f, pos-card #2a2f38, pos-border #363b44), `index.html`, `globals.css` (dark theme base styles, POS-specific utility classes, touch-friendly focus styles, custom scrollbar), `vite-env.d.ts`
- [x] UI component toolkit (10 components): `Button.tsx` (7 variants: primary/secondary/success/danger/warning/ghost/outline/dark, 7 sizes: sm/md/lg/xl/icon/icon-sm/icon-lg, loading spinner, kbd shortcut label), `Input.tsx` (label, error, icon left/right, password toggle), `Modal.tsx` (5 sizes, Escape to close, overlay click dismiss, title/description, ModalFooter), `Card.tsx` + `StatCard.tsx` (trend indicator), `Badge.tsx` + `StatusBadge.tsx` (terminal/shift/transaction/payment status presets), `Select.tsx` (custom dropdown arrow), `Table.tsx` (Table/Header/Body/Row/Head/Cell/EmptyTable), `NumpadInput.tsx` (touch numpad with decimal support, backspace, clear, 2-decimal limit) + `QuickAmountButtons` (preset PHP amounts), `Kbd.tsx` + `ShortcutHint.tsx`, `Tabs.tsx` (segmented control with count badges), `Pagination.tsx`
- [x] Auth infrastructure: `stores/auth.store.ts` (Zustand + persist, PosUser interface with vendorId), `lib/api.ts` (Axios + JWT interceptor + token refresh queue), `lib/query-client.ts`, `lib/cn.ts`, `lib/format.ts` (formatCurrency PHP, formatDate/Time/DateTime), `hooks/useAuth.ts` (useLogin via vendor/login, useLogout with cache clear), `hooks/useKeyboardShortcuts.ts` (combo parser, F-key passthrough in inputs, POS_SHORTCUTS presets: F1-F8 for common actions)
- [x] Pages & layouts: `LoginPage.tsx` (dark theme, email/password form, vendor auth, error display, Enter shortcut hint), `POSLayout.tsx` (compact top bar with brand + 5-item nav with F-key labels + live clock + user dropdown with sign out, keyboard navigation F1/F9-F12), `ProtectedRoute.tsx` (vendor_owner/vendor_staff/admin roles), `ErrorBoundary.tsx` (dark theme error card, Try Again + Refresh)
- [x] `App.tsx` with 5 routes: `/` (Terminal), `/shifts`, `/transactions`, `/reports`, `/settings` — all placeholder pages pending Phase 10e-6+
- [x] **POS app typecheck clean + Vite build successful** (263KB JS gzipped to 86KB)

#### Phase 10e-6: MSW Mock Data + Product Grid + Cart + POSPage — COMPLETED
- [x] Created `packages/mock-data/src/data/pos.ts` — Mock data: 3 terminals, 3 shifts (2 open/1 closed), 8 transactions (sales, refund, voided), 3 cash movements, auto-generated receipts, report data (sales summary, product sales, hourly sales, payment breakdown)
- [x] Created `packages/mock-data/src/handlers/pos.handlers.ts` — 25 MSW handlers: terminal CRUD + heartbeat, shift open/close/list/summary, cash movement CRUD, transaction create/list/void/receipt, 6 report endpoints
- [x] Updated `handlers/index.ts` + `data/index.ts` — Registered POS handlers and data exports
- [x] Created `apps/pos/src/types/pos.ts` — Full POS type system: Terminal, Shift, Transaction, TransactionItem, CashMovement, Receipt, POSProduct, CartItem, CartTotals, SalesSummary, ProductSale, PaymentBreakdown
- [x] Created `apps/pos/src/stores/cart.store.ts` — Zustand cart: addItem (auto-increment qty), removeItem, updateQuantity, setItemDiscount, setOrderDiscount, clearCart, holdOrder/recallOrder (hold queue), getTotals (subtotal/tax/discount/total with 12% VAT)
- [x] Created `apps/pos/src/stores/terminal.store.ts` — Zustand + persist: activeTerminal, activeShift, setters, clearSession (persisted to localStorage)
- [x] Created 4 hooks: `useTerminals.ts` (list/get/create/update), `useShifts.ts` (listByStore/get/open/close + cash movements), `useTransactions.ts` (listByShift/Store/create/void), `usePOSProducts.ts` (products by store + categories, 5/10 min stale times)
- [x] Created 6 POS components:
  - `CategoryBar.tsx` — Horizontal scrollable category tabs with "All" + flattened parent/child categories, primary-500 active highlight
  - `ProductCard.tsx` — Thumbnail + name + price (with SALE badge + strikethrough for discounted), touch-friendly click-to-add
  - `ProductGrid.tsx` — Search input + category filter + responsive grid (3-6 cols), skeleton loading, empty state
  - `CartItemRow.tsx` — Image + name + price + qty controls (±) + line total + hover-reveal Remove button
  - `CartPanel.tsx` — Fixed-width sidebar: cart header with hold/recall/clear, scrollable items list, totals breakdown (subtotal/VAT/discount/total), Discount (F6) + Pay (F2) action buttons, shift-required warning
  - `TerminalSetupModal.tsx` — 2-step: select active terminal → enter opening cash with numpad, opens shift via API
  - `QuickPaymentModal.tsx` — Payment method selector (cash/card/GCash/Maya), numpad + quick amount buttons for cash, change calculation, auto-creates transaction + clears cart on success
- [x] Created `apps/pos/src/pages/POSPage.tsx` — Full split layout: shift info bar (terminal name, status, transactions count, sales total) + product grid (left) + cart panel (right 340px), terminal setup modal on first load, payment modal, F2 keyboard shortcut, success toast on transaction complete
- [x] Updated `App.tsx` — Replaced POS Terminal placeholder with POSPage component
- [x] **Typecheck clean + Vite build successful** (293KB JS gzipped to 93KB)

#### Phase 10e-7: Payment Flow + Receipt + Shift Management — COMPLETED
- [x] Enhanced `QuickPaymentModal.tsx` — Updated onComplete callback to pass full Transaction object alongside tx number, enabling receipt display after payment. Supports cash (with numpad + quick amounts + change calculation), card, GCash, Maya payment methods
- [x] Created `ReceiptModal.tsx` — Receipt preview with formatted receipt display (white card, monospace font): header (Daltaners POS), transaction info (TX#, date, type, payment method, VOIDED indicator), itemized list (name, qty x price, discount, line total), totals section (subtotal, VAT 12%, discount, total, tendered, change for cash), footer (item count, thank you). Print button opens new window with thermal-printer-optimized styles (280px width, Courier New, dashed dividers) and triggers window.print()
- [x] Created `DiscountModal.tsx` — Full discount application modal with: scope selector (Entire Order vs Single Item), item picker when scope=item, discount type toggle (Percentage % vs Fixed Amount PHP), quick percentage buttons (5/10/15/20/25/50%), NumpadInput for custom value, live preview of computed discount amount with new total. Applies via cart store's setOrderDiscount or setItemDiscount. Properly clamps discount to not exceed subtotal/item total
- [x] Created `CloseShiftModal.tsx` — Two-step close shift dialog: Step 1 (Count) shows shift summary cards (sales/refunds/transactions/opening cash), Philippine currency denomination counting form (₱1000 to ₱0.25 with bill/coin labels, count x value = subtotal per row), running totals (counted cash, expected cash, difference with color-coded positive/negative/zero). Step 2 (Confirm) shows final summary with opened time, transaction count, sales total, closing cash, difference, optional close notes input. Calls useCloseShift mutation, updates terminal store, Kafka event published on backend
- [x] Created `CashMovementModal.tsx` — Cash in/out during shift: 4 movement types (Cash In, Cash Out, Float, Pickup) with icon + description cards, NumpadInput for amount, optional reason text input. Creates movement via useCreateCashMovement mutation
- [x] Created `ShiftsPage.tsx` — Full shift management page replacing placeholder: Left panel (360px) shows active shift card (status badge, opened time, cashier, opening cash), 4 stat cards (transactions/sales/refunds/voids), payment breakdown by method, cash movements list (type badge, reason, amount, time). Right panel shows shift history (expandable cards with full details: transactions, refunds, voids, opening/closing cash, difference, close time, notes). Header buttons: "Cash In/Out" + "Close Shift" (only when shift is open). Integrates CloseShiftModal + CashMovementModal
- [x] Created `TransactionsPage.tsx` — Full transaction history page replacing placeholder: Top filters (search by TX#/product name, type filter tabs all/sale/refund/exchange, status filter tabs all/completed/voided/pending, result count). Split view: left scrollable list (type icon badge S/R/X, TX number, status badge, items preview, total amount with void strikethrough, timestamp), right detail panel (360px, appears on selection) showing full transaction info (type, payment method, itemized list with discounts, totals breakdown, void reason if voided). Actions: "Receipt" button (opens ReceiptModal), "Void" button (only for completed transactions during open shift) with inline confirmation form (reason input + confirm button, uses useVoidTransaction mutation)
- [x] Updated `CartPanel.tsx` — Added `onDiscount` prop, wired Discount (F6) button to call onDiscount handler instead of empty function
- [x] Updated `POSPage.tsx` — Integrated DiscountModal (state + F6 keyboard shortcut), ReceiptModal (auto-shows after successful payment), updated handlePaymentComplete to accept Transaction object, passes onDiscount to CartPanel
- [x] Updated `App.tsx` — Replaced ShiftsPage + TransactionsPage placeholder routes with real page components (Reports + Settings remain as placeholders for Phase 10e-8)
- [x] **Typecheck clean + Vite build successful** (329KB JS gzipped to 100KB)

#### Phase 10e-8: Reports + Settings + Final Polish — COMPLETED
- [x] Added 3 new types to `types/pos.ts` — `HourlySale`, `CashierPerformance`, `ShiftSummary` (extends Shift)
- [x] Created `hooks/useReports.ts` — 6 hooks: `useSalesSummary`, `useProductSales`, `useHourlySales`, `useCashierPerformance`, `usePaymentBreakdown`, `useShiftSummary` — all with date range params and 60s stale time
- [x] Created `pages/ReportsPage.tsx` — Full reports page with 3 tabs:
  - **X-Report (Current)**: 5 stat cards (net sales, total sales, transactions, avg transaction, refunds), hourly sales bar chart (Recharts BarChart), payment methods pie chart (Recharts PieChart with inner ring), top 10 products table, sales breakdown card (gross sales → refunds → voids → net sales + tax/discount/items)
  - **Z-Report (End of Day)**: Gradient hero card with net sales, 4 stat cards, cashier performance table (name, transactions, total sales, avg), payment method summary table, all products sold table (scrollable)
  - **Shift History**: Sortable shift list with opened date, cashier, status badge, transactions, sales, cash difference (color-coded +/-). Right detail panel shows full shift breakdown: opening/closing/expected cash, difference, transactions, sales/refunds/voids, payment method totals, close notes
  - Period selector (Today, Yesterday, This Week, This Month) with date range calculation
  - Print Report button, loading skeleton states
- [x] Created `pages/SettingsPage.tsx` — Full settings page with 3 tabs:
  - **Terminals**: Terminal list table (name, code, status badge, IP, last heartbeat, active indicator), Add Terminal modal (name + code + IP), Edit Terminal modal (name + status select + IP), uses `useTerminals`/`useCreateTerminal`/`useUpdateTerminal` hooks
  - **Receipt**: Store info form (name, address, phone, TIN), receipt options (footer message, paper width 58/80mm, barcode toggle), live receipt preview (thermal-printer styled white card with store header, TX details, items, totals, footer)
  - **Preferences**: Tax config (VAT rate, currency), display settings (theme dark/light, sound toggle, auto-lock timeout), transaction defaults (default payment method), keyboard shortcuts reference card (F1-F12 guide)
- [x] Updated `App.tsx` — Replaced placeholder routes with real `ReportsPage` and `SettingsPage` components
- [x] **Typecheck clean + Vite build successful** (362KB app JS gzipped to 107KB + 400KB charts gzipped to 108KB)

### Phase 10e: POS System — FULLY COMPLETED
All 8 sub-phases delivered: backend scaffold, entities, terminal/shift/cash management, transaction processing, unit tests (49 passing), frontend scaffold + UI toolkit, product grid + cart, payment flow + receipt + shift management, reports + settings.

### Bugfixes
- [x] Fixed Cassandra datacenter mismatch in chat-service and notification-service (`localDataCenter` default `'datacenter1'` → `'dc1'`)
- [x] Fixed customer-web ReviewSection crash — two errors:
  1. `useReviewStats` returning `undefined` → "Query data cannot be undefined" (TanStack Query v5)
  2. `useReviews` `getNextPageParam` crash → "Cannot read properties of undefined (reading 'cursor')"
  - **Root cause**: No Vite proxy entry for `/api/v1/reviews` → catalog service. When MSW was off (default), requests fell through to Vite SPA fallback returning HTML instead of JSON.
  - **Fix**: Added proxy `/api/v1/reviews` → port 3004 (rewrite to `/api/v1/catalog/reviews`), changed hooks from `/catalog/reviews` to `/reviews` (frontend convention), added defensive optional chaining in `getNextPageParam`, fallback default in `useReviewStats`. Updated MSW handlers to serve both `/api/v1/reviews` and `/api/v1/catalog/reviews` URL patterns.
- [x] Fixed admin-panel AccountingPage crash — `transactions.map is not a function` (AccountingPage.tsx:384)
  - **Root cause**: `data?.data ?? []` fails when response body has non-array `data` property (backend services not running, MSW off by default). The `??` operator only catches null/undefined, not malformed responses.
  - **Fix**: Changed all list extractions in AccountingPage (transactions, settlements, wallets) to use `Array.isArray(data?.data) ? data.data : []`. Also fixed admin `useLoyaltyAccounts` and `useLoyaltyStats` hooks with fallback defaults, and `LoyaltyPage` to use `Array.isArray()` guard.
- [x] Fixed missing PostgreSQL schemas in running Docker database — `relation "loyalty.accounts" does not exist`
  - **Root cause**: Docker PostgreSQL container was created before `loyalty`, `promotions`, `reviews`, `chat`, and `pos` schemas were added to `init-postgres.sql`. The init script only runs on first container creation.
  - **Fix**: Created `docker/fix-missing-schemas.sql` and applied via `docker exec -i daltaners-postgres psql`. Created all 5 missing schemas with 14 tables total: loyalty (accounts, transactions), promotions (coupons, coupon_usages), reviews (reviews, review_helpful), chat (conversations, conversation_participants), pos (terminals, shifts, transactions, transaction_items, cash_movements, receipts) — all with indexes and triggers.
- [x] Fixed admin-panel DashboardPage crash — `Cannot read properties of undefined (reading 'toLocaleString')` (DashboardPage.tsx:46)
  - **Root cause**: `useOrderStats` hook returns raw Axios response; when backend is down, Vite SPA fallback returns HTML string as `data.data`, which passes the `!data?.data` guard but `stats.totalOrders` is `undefined`.
  - **Fix**: Added `defaultStats` fallback + response shape validation in `useOrderStats()` hook, added `typeof stats.totalOrders !== 'number'` type guard in DashboardPage, `Array.isArray()` guards on array props, `typeof` guard on VendorStatsWidget.
- [x] Fixed `data.map is not a function` crash across ALL frontend pages — comprehensive audit
  - **Root cause**: `data?.data || []` pattern used in 17+ locations fails when backend returns non-array `data` (e.g., HTML string from Vite SPA fallback). `||` only catches falsy values, so truthy strings/objects pass through.
  - **Fix**: Changed every `data?.data || []` to `Array.isArray(data?.data) ? data.data : []` across all 3 apps:
    - **admin-panel** (8 pages): UsersPage, OrdersPage, VendorsPage, CouponsPage, ReviewsPage, ZonesPage, NotificationsPage, CategoriesPage, InventoryPage (2 tables + stats guard)
    - **vendor-dashboard** (5 pages): DashboardPage (2 arrays), InventoryPage, OrdersPage, ProductsPage, ReviewsPage
    - **customer-web** (2 pages): HomePage (products + stores), StorePage
  - **All 3 frontend apps typecheck clean**

### Phase 2: Food Delivery, Pharmacy Delivery & Multi-City Expansion

#### Batch 1: Service-Type Business Rules Engine (Backend)
- [x] Created `services/order-service/src/modules/order/service-type-rules.ts` — Strategy pattern with per-type rules (grocery, food, pharmacy, parcel)
  - `grocery`: min ₱200, all delivery types, 20min prep
  - `food`: min ₱150, standard/express/instant only, 15min prep
  - `pharmacy`: min ₱0, standard/express only, 30min prep, requires prescription check
  - `parcel`: min ₱100, standard/scheduled only, 15min prep
  - Exports: `getServiceTypeRules()`, `validateMinimumOrder()`, `validateDeliveryType()`, `validatePrescription()`, `calculateEstimatedDelivery()`
- [x] Modified `order.service.ts` — `createOrder()` now validates service type rules (minimum order, delivery type, prescription check), calculates `estimated_delivery_at`
- [x] Modified `create-order.dto.ts` — Added `prescription_upload_id`, `destination_lat`, `destination_lng` optional fields
- [x] Created `tests/service-type-rules.spec.ts` — 20 tests covering all rule validations per service type

#### Batch 2: Prescription Workflow (Backend + DB)
- [x] Added prescription tables to `docker/init-postgres.sql` — `orders.prescription_uploads` table with status enum, verification fields, doctor info, expiry
- [x] Added FDA fields to `vendors.stores` — `fda_license_number`, `fda_license_expiry`, `pharmacy_license_url`
- [x] Created `prescription-upload.entity.ts`, `create-prescription-upload.dto.ts`, `verify-prescription.dto.ts`, `prescription-query.dto.ts`
- [x] Created `prescription.repository.ts` — CRUD, findByCustomer, findByStatus, findVerifiedById
- [x] Created `prescription.service.ts` — upload, verify, reject, getMyPrescriptions, validateForOrder
- [x] Created `prescription.controller.ts` — Customer: POST upload, GET list/detail; Admin: PATCH verify/reject, GET pending
- [x] Created `vendor-prescription.controller.ts` — Vendor pharmacist endpoints
- [x] Modified `order.module.ts` — Registered prescription entity, repo, service, controllers
- [x] Added `daltaners.prescriptions.events` Kafka topic to init script
- [x] Created `tests/prescription.service.spec.ts` — 20 tests

#### Batch 3: Zone-Based Delivery Fees + Multi-City Seed Data (Backend)
- [x] Created `zone-client.service.ts` — HTTP client calling zone service with circuit breaker (3 failures threshold, 30s open window), fallback to static fee map (₱49/₱79/₱99/₱39)
- [x] Modified `order.service.ts` — Replaced `DELIVERY_FEE_MAP` with ZoneClientService call using destination coords
- [x] Modified `order.module.ts` — Registered HttpModule + ZoneClientService
- [x] Modified zone service — Added `GET /zones/cities` endpoint, `getAvailableCities()`, `findZonesByCity()` in service/repo
- [x] Added Cebu/Davao seed zones to `docker/seed-postgres.sql` — 8 zones (4 Cebu + 4 Davao) with different fee structures
- [x] Created `tests/zone-client.service.spec.ts` — 13 tests (circuit breaker, fallback, timeout)

#### Batch 4: Food Delivery Frontend (Customer Web)
- [x] Created `pages/FoodPage.tsx` — Restaurant browsing with cuisine/dietary filters, open-now filter, prep time display
- [x] Created `components/food/RestaurantCard.tsx` — Card with cuisine, prep time, "Open until X"
- [x] Created `components/food/DietaryBadge.tsx` — Badges for halal/vegan/vegetarian/gluten-free
- [x] Created `components/food/AllergenWarning.tsx` — Warning banner when cart has allergen items
- [x] Created `components/food/PrepTracker.tsx` — Prep progress (confirmed → preparing → ready → picked up)
- [x] Created `hooks/useFoodStores.ts` — Fetch restaurant-category stores
- [x] Modified `cart.store.ts` — Added `special_instructions` to CartItem
- [x] Modified `CheckoutPage.tsx` — Service-type-aware delivery options, minimum order warnings, allergen summary
- [x] Modified `StorePage.tsx` — Prep time for restaurants, dietary tags on products
- [x] Modified `OrderDetailPage.tsx` — PrepTracker for food orders
- [x] Modified `App.tsx` — Added `/food` route
- [x] Modified `MainLayout.tsx` — Added "Food" nav item
- [x] Added food translations to en.json, fil.json, ceb.json
- [x] Updated mock data — Added food products with dietary_tags, allergens, nutritional_info

#### Batch 5: Pharmacy Delivery Frontend (Customer Web + Mock Data)
- [x] Created `pages/PharmacyPage.tsx` — OTC browsing + Rx section with prescription upload CTA, FDA license badges
- [x] Created `components/pharmacy/PrescriptionUpload.tsx` — Upload form (photo + doctor info)
- [x] Created `components/pharmacy/PrescriptionStatusBadge.tsx` — Status badge (pending/verified/rejected/expired)
- [x] Created `components/pharmacy/PrescriptionList.tsx` — List of user's prescriptions
- [x] Created `hooks/usePrescriptions.ts` — Hooks for prescription CRUD
- [x] Created `packages/mock-data/src/data/prescriptions.ts` — 6 mock prescriptions
- [x] Created `packages/mock-data/src/handlers/prescriptions.handlers.ts` — MSW handlers for all prescription endpoints
- [x] Modified `CheckoutPage.tsx` — Pharmacy: no minimum, prescription link for Rx items
- [x] Modified `StorePage.tsx` — Detect pharmacy: FDA badge, OTC/Rx sections
- [x] Modified `App.tsx` — Added `/pharmacy`, `/prescriptions` routes
- [x] Modified `MainLayout.tsx` — Added "Pharmacy" nav item
- [x] Added pharmacy translations to en.json, fil.json, ceb.json
- [x] Registered prescription handlers + data exports

#### Batch 6: Multi-City Frontend + City Selection
- [x] Created `stores/city.store.ts` — Zustand persisted store: selectedCity, cityCoords, setCity (Metro Manila, Cebu, Davao)
- [x] Created `components/common/CitySelector.tsx` — Dropdown in header showing current city
- [x] Created `hooks/useCities.ts` — Fetch available cities from zone service
- [x] Created `packages/mock-data/src/data/zones.ts` — 18 mock zones (10 Manila + 4 Cebu + 4 Davao)
- [x] Created `packages/mock-data/src/handlers/zones.handlers.ts` — MSW handlers for zone endpoints
- [x] Modified `HomePage.tsx` — Replaced hardcoded coords with city store, dynamic city name in heading
- [x] Modified `useStores.ts` — Pass city coords to useNearbyStores
- [x] Modified `MainLayout.tsx` — Added CitySelector to header
- [x] Modified `vite.config.ts` — Added proxy `/api/v1/zones` → localhost:3014
- [x] Modified admin `ZonesPage.tsx` — Added city filter tabs (All/Manila/Cebu/Davao)
- [x] Modified admin `useZones.ts` — Added city parameter
- [x] Added city translations to en.json, fil.json, ceb.json
- [x] Added 6 Cebu/Davao stores to mock data (2 grocery, 2 restaurant, 2 pharmacy)

#### Batch 7: Vendor Dashboard Updates + Integration Tests + Cleanup
- [x] Modified vendor `OrdersPage.tsx` — Added service type filter tabs (All/Grocery/Food/Pharmacy)
- [x] Modified vendor `useOrders.ts` — Added `service_type` to OrderFilters and query params
- [x] Modified vendor `DashboardPage.tsx` — Added "Orders by Service Type" breakdown widget
- [x] Created `tests/food-order-flow.spec.ts` — 16 integration tests (min ₱150, no scheduled, allergens, zone fee)
- [x] Created `tests/pharmacy-order-flow.spec.ts` — 18 integration tests (₱0 min, Rx rejected without prescription, verified Rx accepted)
- [x] Created `tests/zone-delivery-fee.spec.ts` — 13 integration tests (zone-based fee, circuit breaker fallback)
- [x] **All 227 order-service tests passing** across 10 test suites
- [x] Updated COMPLETED_TASKS.md with full Phase 2 documentation

### Phase 2 — FULLY COMPLETED
All 7 batches delivered: service-type business rules engine, prescription workflow, zone-based delivery fees, food delivery frontend, pharmacy delivery frontend, multi-city frontend + city selection, vendor dashboard updates + 50 integration tests (227 total order-service tests passing).

---

### Mobile App Missing Features — Batch 1: Quick Wins (Wire Up Existing Stubs)
- [x] Updated `types/index.ts` — Added `customer_phone` to `DeliveryAssignment`, added `CouponValidationResult` type
- [x] Wired coupon validation in `CheckoutScreen.tsx` — Apply button → `POST /orders/coupons/validate`, shows discount amount, Remove button clears coupon
- [x] Wired phone call in `OrderTrackingScreen.tsx` — Call button → `Linking.openURL(tel:)`, Message button → `Linking.openURL(sms:)`
- [x] Wired Call/Message buttons in `ActiveDeliveryScreen.tsx` — Call → `tel:`, Message → `sms:` using `customer_phone`
- [x] Wired Decline button in delivery `HomeScreen.tsx` — Confirmation Alert → `POST /delivery/:id/decline`
- [x] Added special instructions to `ProductScreen.tsx` — TextInput below quantity, wired to `setSpecialInstructions` in cart store
- [x] Display special instructions in `CartScreen.tsx` — Shows italic text below variant name
- [x] Added image carousel dots in `ProductScreen.tsx` — `onMomentumScrollEnd` + animated dot indicators, uses `SCREEN_WIDTH` instead of hardcoded 400px
- [x] Added stock check in `ProductScreen.tsx` — Fetches from `/inventory/stock/:storeId/:productId`, shows in-stock/low-stock/out-of-stock status, disables Add to Cart when out of stock
- [x] Fixed `utils/index.ts` — Added `t` re-export from `../i18n` (was missing, used across all screens)
- [x] Added i18n strings to `en.json`, `fil.json`, `ceb.json` — checkout (coupon applied/invalid/error), product (special instructions, stock status), delivery (decline confirm, no phone)
- [x] Expanded `ceb.json` — Added missing sections: checkout, product, cart, tracking, delivery

### Mobile App Feature Parity — Batch 1: Customer Order Detail + Reviews
- [x] Add `CreateReviewPayload` interface to `types/index.ts`
- [x] Create `InteractiveStarRating` component (`components/shared/InteractiveStarRating.tsx`) — touchable stars, size prop, onRatingChange callback
- [x] Export `InteractiveStarRating` from `components/shared/index.ts`
- [x] Create `OrderDetailScreen` (`screens/customer/OrderDetailScreen.tsx`) — full order view with items list, payment breakdown (subtotal/delivery/discount/total), status timeline, action buttons (Reorder, Cancel, Track, Dispute, Return, Review)
- [x] Create `ReviewScreen` (`screens/customer/ReviewScreen.tsx`) — interactive star rating, title input, body textarea, submit via `POST /catalog/reviews`, rating labels
- [x] Add `OrderDetail` and `Review` routes to `CustomerStackParamList` in `CustomerNavigator.tsx`
- [x] Register `OrderDetailScreen` and `ReviewScreen` as `Stack.Screen` entries
- [x] Update `OrderHistoryScreen` — completed orders navigate to `OrderDetail` instead of `OrderTracking`

### Mobile App Feature Parity — Batch 2: Customer Disputes (3 screens)
- [x] Add dispute types to `types/index.ts` — `DisputeCategory` (11 categories), `DisputeStatus` (6 statuses), `DisputePriority`, `DisputeResolution`, `Dispute`, `DisputeMessage`, `CreateDisputePayload`
- [x] Create `DisputesScreen` (`screens/customer/DisputesScreen.tsx`) — FlatList of disputes with status filter tabs (All/Open/In Progress/Escalated/Resolved), dispute cards with category badges, status colors, message count, time ago, pull-to-refresh, empty state
- [x] Create `DisputeDetailScreen` (`screens/customer/DisputeDetailScreen.tsx`) — dispute header with status badge, info grid (category/priority/order/store/dates), description section, evidence image gallery, resolution card (when resolved), escalate button, message thread with sender-typed bubbles (customer/vendor/admin/system), message input with send button
- [x] Create `CreateDisputeScreen` (`screens/customer/CreateDisputeScreen.tsx`) — order context card, expandable category picker (11 options with descriptions), subject input (5+ chars), description textarea (20+ chars, 5000 max), resolution preference picker, validation hints, submit with API error handling
- [x] Add `Disputes`, `DisputeDetail`, `CreateDispute` routes to `CustomerStackParamList` in `CustomerNavigator.tsx`
- [x] Register all 3 screens as `Stack.Screen` entries with proper titles
- [x] Add "My Disputes" menu item to `ProfileScreen.tsx` with AlertTriangle icon
- [x] Fix `OrderDetailScreen.tsx` — replace `as never` cast with type-safe `navigation.navigate('CreateDispute', { orderId, orderNumber })`
- [x] Add `profile.disputes` i18n key to `en.json` and `fil.json`

### Mobile App Feature Parity — Batch 3: Customer Returns (3 screens)
- [x] Add return types to `types/index.ts` — `ReturnStatus` (7 statuses), `ReturnReasonCategory` (8 reasons), `ReturnResolution`, `ReturnItemCondition`, `ReturnItem`, `ReturnRequest`, `CreateReturnPayload`
- [x] Create `ReturnsScreen` (`screens/customer/ReturnsScreen.tsx`) — FlatList of returns with status filter tabs (All/Pending/Approved/Refunded/Denied), return cards with request_number, status badge, reason label, items preview, refund amount, item count + time ago footer, pull-to-refresh, empty state
- [x] Create `ReturnDetailScreen` (`screens/customer/ReturnDetailScreen.tsx`) — header with request_number + status badge, return details card (reason/resolution/refund amount/submitted date/order ID with navigation), reason details section, evidence photo gallery, items list with condition badges, vendor response card, cancel button for pending returns with Alert confirmation
- [x] Create `CreateReturnScreen` (`screens/customer/CreateReturnScreen.tsx`) — order context card, multi-step form: item selection with checkboxes + quantity stepper + condition chip selector, reason category dropdown picker, reason details textarea (2000 char max), resolution picker (refund/replacement/store credit), summary with item count + estimated refund, submit with success navigation to ReturnDetail
- [x] Add `Returns`, `ReturnDetail`, `CreateReturn` routes to `CustomerStackParamList` in `CustomerNavigator.tsx`
- [x] Register all 3 screens as `Stack.Screen` entries with proper titles
- [x] Add "My Returns" menu item to `ProfileScreen.tsx` with RotateCcw icon
- [x] Fix `OrderDetailScreen.tsx` — replace `as never` cast with type-safe `navigation.navigate('CreateReturn', { orderId })`
- [x] Add `profile.returns` i18n key to `en.json` and `fil.json`

## Pending Tasks

### Mobile App Feature Parity — Remaining Batches
- [ ] **Batch 4**: Customer Food + Pharmacy (FoodScreen, PharmacyScreen)
- [ ] **Batch 5**: Vendor Analytics + Reviews + Disputes (AnalyticsScreen, ReviewsScreen, DisputesScreen)
- [ ] **Batch 6**: Vendor Returns + Financials + Performance (ReturnsScreen, FinancialsScreen, PerformanceScreen)
- [ ] **Batch 7**: Vendor Staff + Coupons + Advertising + Policy (StaffScreen, CouponsScreen, AdvertisingScreen, ViolationsScreen)

### Mobile App Missing Features — Remaining Batches
- [ ] **Batch 2**: Search Filters + Address Management + Stock Check (FilterModal, AddressListScreen, AddAddressScreen)
- [ ] **Batch 3**: Chat UI + Notification System (chat.store, ChatScreen, ConversationListScreen, notification.store, NotificationsScreen)
- [ ] **Batch 4**: Map Integration + Wallet Balance Check (MapViewWrapper, NavigationScreen map, OrderTracking map, wallet balance)
- [ ] **Batch 5**: Review Submission + Push Notifications (ReviewScreen, InteractiveStarRating, usePushNotifications)
- [ ] **Batch 6**: Deep Linking + Offline Mode + Camera/POD (linking config, useNetworkStatus, OfflineBanner, ProofOfDeliveryScreen)
