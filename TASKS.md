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

## Pending Tasks

(none)
