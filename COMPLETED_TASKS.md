# Daltaners Platform — Completed Tasks

## Previous Work (from TASKS.md)

### Batch 1: Customer Web — Core Pages
- [x] LoginPage, RegisterPage, SearchPage, StorePage, ProductPage
- [x] CartPage, routing integration, placeholder stubs

### Batch 2: Customer Web — Shopping Flow
- [x] CheckoutPage, OrderCard, OrdersPage, OrderDetailPage, ProfilePage

### Batch 3: Backend — Payment + Delivery + Auth
- [x] Password reset flow, wallet payment, Maya webhook, rider assignment, delivery management

### Batch 4: Backend — Notification + Real-time
- [x] SendGrid email, Firebase push, WebSocket gateways, Kafka event consumers

### Batch 5: Admin Panel + Vendor Dashboard
- [x] Admin: Dashboard, Users, Vendors, Orders, Zones, Categories, Notifications pages
- [x] Vendor: Login, Dashboard, Orders, OrderDetail, Products, ProductForm, Inventory, StoreSettings, Staff pages

### Batch 6: Unit Tests
- [x] Auth, Order, Payment, Delivery, Inventory, Vendor, User, Notification, Zone service tests
- [x] Cross-service Kafka topic fixes

### Batch 7: Customer Web — Enhanced Features
- [x] Real-time order tracking, wallet, rewards, reviews, recommendations, search, i18n

### Batch 8: Admin Panel — Extended Pages
- [x] Accounting, Coupons, Inventory, Loyalty, Reviews pages

### Batch 9: Vendor Dashboard — Extended Features
- [x] Analytics, Financials, Promotions, Reviews, CSV Import

### Batch 10: Mobile App
- [x] Expo SDK 51 app with customer/vendor/delivery roles

### Batch 11: POS Service + App
- [x] POS backend service + React POS app

### Batch 12: Catalog Search + Reviews Backend
- [x] Elasticsearch, recommendations, reviews backend

---

## Vendor Management Features (Phase 1-14)

### Phase 1: Returns & RMA (Backend + DB) — COMPLETED
- [x] DB migration: `orders.return_requests` + `orders.return_items` tables added to init-postgres.sql
- [x] Entities: `ReturnRequestEntity`, `ReturnItemEntity` with proper relations/indexes
- [x] DTOs: `CreateReturnRequestDto`, `ReturnRequestQueryDto`, `AdminReturnQueryDto`, `VendorApproveReturnDto`, `VendorDenyReturnDto`, `VendorMarkReceivedDto`, `AdminReturnActionDto`
- [x] `ReturnRepository` with CRUD, pagination, stats queries
- [x] `ReturnService` with full business logic (create, approve, deny, cancel, escalate, override, stats)
- [x] `ReturnController` (customer: POST create, GET list/detail, PATCH cancel)
- [x] `VendorReturnController` (vendor: GET list/detail, PATCH approve/deny/received)
- [x] `AdminReturnController` (admin: GET list/detail/stats, PATCH escalate/override-approve/override-deny)
- [x] Updated `OrderModule` with new entities, controllers, services
- [x] Added `daltaners.returns.events` Kafka topic to init-kafka-topics.sh
- [x] Unit tests: 32 tests passing (return.service.spec.ts)
- [x] TypeScript compilation: clean (0 errors)

### Phase 2: Returns & RMA (Frontend) — COMPLETED
- [x] MSW mock data: `packages/mock-data/src/data/returns.ts` (8 mock return requests, all statuses)
- [x] MSW handlers: `packages/mock-data/src/handlers/returns.handlers.ts` (customer, vendor, admin endpoints)
- [x] Updated mock-data index exports
- [x] Customer Web hooks: `useMyReturns`, `useReturn`, `useCreateReturn`, `useCancelReturn`
- [x] Customer Web pages: ReturnsPage (list + filters), ReturnDetailPage (detail + cancel), CreateReturnPage (3-step form)
- [x] Customer Web routes: `/orders/:orderId/return`, `/returns`, `/returns/:id`
- [x] Vendor Dashboard hooks: `useVendorReturns`, `useVendorReturn`, `useApproveReturn`, `useDenyReturn`, `useMarkReturnReceived`
- [x] Vendor Dashboard pages: ReturnsPage (table + approve/deny/receive modals), ReturnDetailPage (detail + action modal)
- [x] Vendor Dashboard routes + nav: `/returns`, `/returns/:id`, sidebar nav item added
- [x] Admin Panel hooks: `useAllReturns`, `useReturnDetail`, `useReturnStats`, `useEscalateReturn`, `useOverrideApproveReturn`, `useOverrideDenyReturn`
- [x] Admin Panel pages: ReturnsPage (DataTable + filters + stats + escalate/override modals), ReturnDetailPage (detail + admin actions + timeline)
- [x] Admin Panel ReturnStatsWidget on DashboardPage
- [x] Admin Panel routes + nav: `/returns`, `/returns/:id`, sidebar nav item added
- [x] TypeScript compilation: all 3 apps + mock-data clean (0 errors)

### Phase 3: Dispute Resolution (Backend + DB) — COMPLETED
- [x] DB migration: `orders.disputes` + `orders.dispute_messages` tables added to init-postgres.sql
  - disputes: dispute_number, order_id, return_request_id (nullable), customer_id, store_id, category (11 types), status (7 states), priority (4 levels), subject, description, evidence_urls, requested_resolution, resolution_type/amount/notes, resolved_by/at, escalated_at/reason, vendor_response_deadline, admin_assigned_to
  - dispute_messages: sender_id, sender_role, message, attachments, is_internal (admin-only notes)
  - Indexes: order, return, customer, store, status, priority, number, BRIN on created_at, partial on deadline
- [x] Entities: `DisputeEntity`, `DisputeMessageEntity` with relations/indexes
- [x] DTOs: `CreateDisputeDto`, `CreateDisputeMessageDto`, `DisputeQueryDto`, `AdminDisputeQueryDto`, `VendorRespondDisputeDto`, `EscalateDisputeDto`, `AdminAssignDisputeDto`, `ResolveDisputeDto`, `AdminDisputeMessageDto`
- [x] `DisputeRepository` with CRUD, pagination, stats, overdue finder, message management
- [x] `DisputeService` with full business logic:
  - Customer: create dispute, list my disputes, get detail, add message, escalate
  - Vendor: list store disputes, respond to dispute
  - Admin: list all, stats, assign, add message (with internal notes), escalate, resolve, close
  - Auto-escalation: `autoEscalateOverdueDisputes()` — finds disputes where vendor missed 48h response deadline
  - Priority auto-assignment by category (e.g., unauthorized_charge → urgent)
  - Status machine: open → vendor_response ↔ customer_reply → under_review → escalated → resolved/closed
  - Redis caching (5 min TTL) with invalidation
  - Kafka events: created, escalated, auto_escalated, vendor_responded, resolved
- [x] `DisputeController` (customer: POST create, GET list/detail/messages, POST message, PATCH escalate)
- [x] `VendorDisputeController` (vendor: GET list/detail/messages, POST respond)
- [x] `AdminDisputeController` (admin: GET list/detail/stats/messages, POST message, PATCH assign/escalate/resolve/close, POST auto-escalate)
- [x] Updated `OrderModule` with new entities, controllers, services
- [x] Added `daltaners.disputes.events` Kafka topic to init-kafka-topics.sh
- [x] Unit tests: 39 tests passing (dispute.service.spec.ts)
- [x] TypeScript compilation: clean (0 errors)
- [x] Existing return tests: 32 tests still passing (no regressions)

### Phase 4: Dispute Resolution (Frontend) — COMPLETED
- [x] MSW mock data: `packages/mock-data/src/data/disputes.ts` (8 mock disputes, all 7 statuses)
- [x] MSW handlers: `packages/mock-data/src/handlers/disputes.handlers.ts` (customer, vendor, admin endpoints)
  - Customer: POST create, GET list/detail/messages, POST message, PATCH escalate
  - Vendor: GET list/detail/messages, POST respond
  - Admin: GET list/detail/stats/messages, POST message, PATCH assign/escalate/resolve/close, POST auto-escalate
  - Dual path registration (frontend + backend conventions)
- [x] Updated mock-data index exports (data + handlers)
- [x] Customer Web hooks: `useMyDisputes`, `useDispute`, `useDisputeMessages`, `useCreateDispute`, `useAddDisputeMessage`, `useEscalateDispute`
- [x] Customer Web pages: DisputesPage (card list + status tabs), DisputeDetailPage (chat-style conversation + escalate), CreateDisputePage (category grid + form)
- [x] Customer Web routes: `/orders/:orderId/dispute`, `/disputes`, `/disputes/:id`
- [x] Vendor Dashboard hooks: `useVendorDisputes`, `useVendorDispute`, `useVendorDisputeMessages`, `useRespondToDispute`
- [x] Vendor Dashboard pages: DisputesPage (table + status tabs + respond modal), DisputeDetailPage (3-col layout + inline respond + timeline)
- [x] Vendor Dashboard routes + nav: `/disputes`, `/disputes/:id`, sidebar nav item added
- [x] Admin Panel hooks: `useAllDisputes`, `useDisputeDetail`, `useDisputeStats`, `useDisputeMessages`, `useAssignDispute`, `useEscalateDispute`, `useResolveDispute`, `useCloseDispute`, `useAddDisputeMessage`, `useAutoEscalateDisputes`
- [x] Admin Panel pages: DisputesPage (DataTable + filters + 6-stat summary + escalate/resolve/close modals + auto-escalate button), DisputeDetailPage (full detail + conversation with internal notes + assign/escalate/resolve/close actions + timeline + resolution card)
- [x] Admin Panel routes + nav: `/disputes`, `/disputes/:id`, sidebar nav item added

### Phase 5: Vendor Performance (Backend + DB) — COMPLETED
- [x] DB migration: `vendors.performance_metrics` + `vendors.performance_history` tables added to init-postgres.sql
  - performance_metrics: store_id (PK, FK), total_orders, total_revenue, fulfilled/cancelled orders, fulfillment/cancellation/on_time_delivery rates, return/dispute/escalation rates, avg_rating, review_count, review_response_rate, avg_dispute_response_hours, performance_score (0-100), performance_tier (excellent/good/average/poor/critical/unrated), period_days, calculated_at
  - performance_history: daily snapshots with same metrics + metrics_snapshot JSONB, UNIQUE(store_id, snapshot_date)
  - Indexes: store_id, snapshot_date, store+date DESC, BRIN on created_at
  - Trigger: set_updated_at on performance_metrics
- [x] Entities: `PerformanceMetricsEntity` (PK = store_id, OneToOne with Store), `PerformanceHistoryEntity` (ManyToOne Store, unique store+date)
- [x] DTOs: `PerformanceHistoryQueryDto` (date_from, date_to, days), `AdminPerformanceQueryDto` (search, tier, category, sort_by, sort_order, min/max_score + pagination)
- [x] `PerformanceRepository` with:
  - Metrics: findByStoreId, upsertMetrics, findAllMetricsAdmin (join store for name/category), getTopPerformers, getBottomPerformers
  - Benchmarks: getPlatformBenchmarks (avg rates, tier distribution)
  - History: createHistorySnapshot (upsert by date), findHistoryByStoreId (date range or days)
  - Cross-schema raw SQL: getOrderMetricsForStore, getReturnMetricsForStore, getDisputeMetricsForStore, getReviewMetricsForStore
- [x] `PerformanceService` with:
  - Score calculation: weighted algorithm (fulfillment 25%, rating 20%, on-time 15%, return 15%, dispute 10%, cancellation 10%, response 5%)
  - Tier assignment: excellent ≥85, good ≥70, average ≥50, poor ≥30, critical <30, unrated <5 orders
  - Full recalculation: aggregates from orders, returns, disputes, reviews schemas
  - Incremental updates via Kafka event handlers (order, return, dispute, review events)
  - Daily scheduled recalculation (@Cron 2AM) with history snapshots
  - Redis caching (5min TTL) with invalidation
  - Admin trigger recalculation endpoint
- [x] `PerformanceController` (vendor: GET me, GET me/history, GET me/benchmarks)
- [x] `AdminPerformanceController` (admin: GET list, GET benchmarks, GET top/bottom, GET store/:id, GET store/:id/history, POST recalculate, POST store/:id/recalculate)
- [x] `PerformanceSubscriber` — Kafka consumer for daltaners.orders.events, daltaners.returns.events, daltaners.disputes.events, daltaners.reviews.events
- [x] Updated `VendorModule` with new entities, controllers, services, ScheduleModule
- [x] Added `@nestjs/schedule` dependency to package.json
- [x] Unit tests: 28 tests passing (performance.service.spec.ts)
- [x] TypeScript compilation: clean (0 errors)
- [x] Existing vendor tests: 38 tests still passing (no regressions)
- [x] Total tests: 66 passing across both test suites

### Phase 6: Vendor Performance (Frontend) — COMPLETED
- [x] MSW mock data: `packages/mock-data/src/data/performance.ts` (6 mock stores across all tiers)
  - `performanceMetrics` array with stores for excellent, good, average, poor, unrated tiers
  - `generatePerformanceHistory()` function for 30-day trend data with variance
  - `performanceBenchmarks` object with platform averages and tier distribution
- [x] MSW handlers: `packages/mock-data/src/handlers/performance.handlers.ts`
  - Vendor: GET me, me/history, me/benchmarks
  - Admin: GET list (filter/sort/paginate), benchmarks, top, bottom, stores/:id, stores/:id/history
  - Admin: POST recalculate, stores/:id/recalculate
  - Dual path registration for both backend and frontend routing conventions
- [x] Updated mock-data index exports (data + handlers)
- [x] Vendor Dashboard hooks: `useMyPerformance`, `useMyPerformanceHistory`, `usePerformanceBenchmarks`
- [x] Vendor Dashboard PerformancePage with:
  - Circular score gauge with tier thresholds and improvement tips
  - 8 metric cards (score, orders, fulfillment, cancellation, on-time, rating, returns, disputes)
  - Performance score trend chart (7/14/30 day selector)
  - Fulfillment & cancellation rate trend chart
  - Radar chart comparing vendor vs platform averages
  - Rating trend and daily revenue charts
  - Platform benchmarks comparison table
- [x] Vendor Dashboard route: `/performance`, sidebar nav item added
- [x] Admin Panel hooks: `useAdminPerformanceList`, `useAdminPerformanceBenchmarks`, `useAdminTopPerformers`, `useAdminBottomPerformers`, `useAdminStorePerformance`, `useAdminStorePerformanceHistory`, `useRecalculateAllPerformance`, `useRecalculateStorePerformance`
- [x] Admin Panel VendorPerformancePage with:
  - Platform summary cards (stores rated, avg score, avg fulfillment, avg rating)
  - Tier distribution pie chart
  - Top 5 and bottom 5 performers panels with click-to-view history
  - Selected store performance history chart with recalculate action
  - Sortable/filterable data table (search, tier, category filters; sortable columns)
  - Score bars with color-coded progress indicators
  - Platform metrics summary bar chart
  - Pagination
  - Recalculate All button
- [x] Admin Panel route: `/performance`, sidebar nav item added
- [x] TypeScript compilation: all apps + mock-data clean (0 new errors)

### Phase 7: Payout & Settlement (Backend — Batch A) — COMPLETED
- [x] Added `@nestjs/schedule` dependency to payment-service package.json
- [x] DB migration: `payments.settlement_items` table + 3 new columns (`notes`, `approved_by`, `order_count`) on `payments.vendor_settlements` + indexes
- [x] Added `daltaners.settlements.events` Kafka topic to init-kafka-topics.sh
- [x] Entity: `SettlementItemEntity` with ManyToOne relation to VendorSettlementEntity
- [x] Updated `VendorSettlementEntity` with `notes`, `approved_by`, `order_count` columns
- [x] DTOs: `GenerateSettlementDto`, `ApproveSettlementDto`, `ProcessSettlementDto`, `RejectSettlementDto`, `AdjustSettlementDto`, `BatchProcessDto`
- [x] `PaymentRepository` — 6 new methods: `getVendorsWithSettleableOrders`, `getUnsettledOrdersForVendor`, `findExistingSettlement`, `createSettlementWithItems`, `findSettlementById`/`findSettlementItems`, `deleteSettlementItems`
- [x] `SettlementService` with full business logic:
  - Generation: batch generate for all/one vendor with commission/tax calculation
  - Business rules: gross=SUM(subtotals), commission=gross*rate%, tax=2% BIR, final=net-tax+adj
  - Order eligibility: status=delivered + payment captured/completed + not in any settlement
  - Idempotency: skip duplicate vendor+period settlements
  - Approve (pending→processing), Process (processing→completed + Kafka event), Reject (pending→failed + free orders), Adjust (recalculate final amount)
  - Batch process multiple settlements with reference prefix
  - Settlement detail with paginated order breakdown
- [x] `SettlementScheduler` — weekly cron (Monday 3AM Manila) for auto-generation
- [x] `AdminPaymentController` — 7 new endpoints: POST generate, GET detail, PATCH approve/process/reject/adjust, POST batch-process
- [x] `PaymentController` — 1 new endpoint: GET settlements/:id (vendor detail with auth check)
- [x] `PaymentModule` — registered ScheduleModule, SettlementItemEntity, SettlementService, SettlementScheduler
- [x] Unit tests: 26 tests passing (settlement.service.spec.ts)
- [x] TypeScript compilation: clean (0 errors)
- [x] Existing payment tests: 34 tests still passing (no regressions)
- [x] Total tests: 60 passing across both payment test suites

### Phase 7: Payout & Settlement (Frontend — Batch B) — COMPLETED
- [x] MSW mock data: `settlementItems` record in `packages/mock-data/src/data/dashboard.ts` with order-level breakdown for each settlement
- [x] MSW mock data: `MockSettlement` and `MockSettlementItem` TypeScript interfaces exported from data index
- [x] MSW handlers (admin): 7 new handlers in `admin.handlers.ts`
  - POST generate settlements, GET settlement detail with items
  - PATCH approve, process, reject, adjust settlements
  - POST batch-process settlements
  - All handlers validate status transitions (pending→processing→completed)
- [x] MSW handlers (vendor): GET settlement detail in `vendor.handlers.ts` with fallback item generation
- [x] Admin hooks (`useAccounting.ts`): `useSettlementDetail`, `useGenerateSettlements`, `useApproveSettlement`, `useProcessSettlement`, `useRejectSettlement`, `useAdjustSettlement`, `useBatchProcessSettlements`
- [x] Admin AccountingPage: `SettlementDetailModal` with summary grid, meta info, order breakdown table, and action sub-modal (approve/reject/adjust/process)
- [x] Admin AccountingPage: Enhanced `SettlementsTab` with Generate button/modal, View action per row, vendor name and order count columns
- [x] Vendor hooks (`useFinancials.ts`): `useSettlementDetail` with `SettlementItem` and `SettlementDetail` interfaces
- [x] Vendor FinancialsPage: Clickable settlement rows, `SettlementDetailModal` with summary grid (gross/commission/tax/final), meta info, and order breakdown table
- [x] Updated mock-data data/index.ts exports for `settlementItems`, `MockSettlement`, `MockSettlementItem`

### Phase 8: Policy Enforcement (Backend — Batch A) — COMPLETED
- [x] DB migration: `vendors.policy_rules`, `vendors.policy_violations`, `vendors.appeals` tables added to init-postgres.sql
  - policy_rules: code (unique), name, description, category (10 types), severity (4 levels), penalty_type (warning/suspension/fine/termination), penalty_value, suspension_days, auto_detect, max_violations, is_active
  - policy_violations: violation_number (unique), store_id FK, rule_id FK (nullable), category, severity, status (7 states: pending→acknowledged→under_review→appealed→resolved/dismissed/penalty_applied), subject, description, evidence_urls, detected_by (system/admin/customer_report), penalty fields, resolution fields
  - appeals: appeal_number (unique), violation_id FK, store_id FK, status (5 states: pending→under_review→approved/denied/escalated), reason, evidence_urls, admin_notes, reviewed_by/at
  - Indexes: category, severity, status, store_id, rule_id, violation_number, appeal_number, BRIN on created_at
  - Triggers: set_updated_at on all 3 tables
- [x] Entities: `PolicyRule`, `PolicyViolation`, `Appeal` with enums and relations
- [x] DTOs:
  - Policy rules: `CreatePolicyRuleDto`, `UpdatePolicyRuleDto`, `PolicyRuleQueryDto`
  - Violations: `CreateViolationDto`, `ViolationQueryDto`, `AdminViolationQueryDto`, `ApplyPenaltyDto`, `ResolveViolationDto`, `DismissViolationDto`
  - Appeals: `CreateAppealDto`, `AppealQueryDto`, `AdminAppealQueryDto`, `ReviewAppealDto`, `DenyAppealDto`
- [x] `PolicyRepository` with CRUD for rules, violations, appeals; pagination, filtering, stats aggregation, active appeal finder
- [x] `PolicyService` with full business logic:
  - Rules: CRUD, active rules listing
  - Violations: create (with rule inheritance), acknowledge, mark under review, apply penalty (warning/suspension/fine/termination), resolve, dismiss
  - Penalty enforcement: auto-suspend store on suspension penalty, auto-close on termination
  - Appeals: create (with duplicate check), review, approve (dismisses violation + reactivates suspended store), deny (reverts to under_review), escalate
  - Stats: violation and appeal statistics with Redis caching (5min TTL)
  - Kafka events: violation_created, penalty_applied, violation_resolved, violation_dismissed, appeal_created/approved/denied/escalated
- [x] `VendorPolicyController` (vendor: GET violations/summary/appeals/rules, PATCH acknowledge, POST appeal)
- [x] `AdminPolicyController` (admin: CRUD rules, POST violations, GET violations/stats, PATCH review/penalty/resolve/dismiss, GET appeals/stats, PATCH review/approve/deny/escalate, GET store violations/summary)
- [x] Updated `VendorModule` with PolicyRule, PolicyViolation, Appeal entities + PolicyService, PolicyRepository + controllers
- [x] Added `daltaners.policy.events` Kafka topic to init-kafka-topics.sh
- [x] Added `POLICY_EVENTS` constants to vendor.events.ts
- [x] Unit tests: 43 tests passing (policy.service.spec.ts)
- [x] TypeScript compilation: clean (0 errors)
- [x] Existing tests: 64 tests still passing (vendor 38 + performance 28 — no regressions)
- [x] Total tests: 107 passing across all 3 vendor-service test suites

### Phase 8: Policy Enforcement (Frontend — Batch B) — COMPLETED
- [x] MSW mock data: `packages/mock-data/src/data/policy.ts` (10 policy rules, 8 violations, 5 appeals)
  - Type exports: PolicyCategory, PolicySeverity, PenaltyType, ViolationStatus, DetectedBy, AppealStatus
  - Interfaces: MockPolicyRule, MockPolicyViolation, MockAppeal, MockViolationStats, MockAppealStats
  - `computeViolationStats()` and `computeAppealStats()` functions
- [x] MSW handlers: `packages/mock-data/src/handlers/policy.handlers.ts`
  - Vendor: GET rules, GET/PATCH violations (list, detail, acknowledge), GET summary, POST appeal, GET appeals
  - Admin: CRUD rules, POST/GET violations (create, list, stats, detail), PATCH review/penalty/resolve/dismiss
  - Admin: GET/PATCH appeals (list, stats, detail, review, approve, deny, escalate)
  - Dual path registration (frontend + backend conventions)
- [x] Updated mock-data index exports (data + handlers)
- [x] Vendor Dashboard hooks (`usePolicy.ts`): `usePolicyRules`, `useMyViolations`, `useMyViolation`, `useMyViolationSummary`, `useMyAppeals`, `useMyAppeal`, `useAcknowledgeViolation`, `useSubmitAppeal`
  - CamelCase transforms from snake_case API responses
  - Label/color constants for all statuses
- [x] Vendor Dashboard pages:
  - ViolationsPage: summary cards + status tabs + table + acknowledge/appeal modals + pagination
  - ViolationDetailPage: breadcrumb + header badges + 3-column layout + appeal form modal
  - PolicyRulesPage: category tabs + card-based rule listing (read-only)
- [x] Admin Panel hooks (`usePolicy.ts`): `useAdminPolicyRules`, `useAdminPolicyRule`, `useAdminViolations`, `useAdminViolation`, `useViolationStats`, `useAdminAppeals`, `useAdminAppeal`, `useAppealStats`, `useCreatePolicyRule`, `useUpdatePolicyRule`, `useCreateViolation`, `useReviewViolation`, `useApplyPenalty`, `useResolveViolation`, `useDismissViolation`, `useReviewAppeal`, `useApproveAppeal`, `useDenyAppeal`, `useEscalateAppeal`
  - Snake_case convention throughout (admin panel standard)
  - Color/label constants for violations, appeals, severity, penalties
- [x] Admin Panel pages:
  - PolicyViolationsPage: 5-stat summary + search + status tabs + table + action modals (review, penalty, resolve, dismiss)
  - PolicyAppealsPage: 4-stat summary + search + status tabs + table + action modals (review, approve, deny, escalate)
  - PolicyRulesPage: search + category tabs + CRUD table + create/edit form modal with toggle active
- [x] Vendor Dashboard routes + nav: `/violations`, `/violations/:id`, `/policy/rules`, sidebar nav items added
- [x] Admin Panel routes + nav: `/policy/violations`, `/policy/appeals`, `/policy/rules`, sidebar nav items added

### Phase 9A: Shipping & Carrier Integration (Backend) — COMPLETED
- [x] DB migration: `delivery.shipping_carriers`, `delivery.carrier_services`, `delivery.shipments` tables added to init-postgres.sql
  - shipping_carriers: name, code (unique), type (third_party/platform), api_base_url, api_key, api_credentials (JSONB), supported_service_types (TEXT[]), is_active, priority, contact/settings/webhook fields
  - carrier_services: carrier_id FK, name, code, estimated_days_min/max, base_price/price_per_kg, max_weight_kg, supports_cod/insurance, coverage_areas (JSONB), UNIQUE(carrier_id, code)
  - shipments: shipment_number (unique), order_id, store_id, carrier_id FK, carrier_service_id FK, status (10 states), tracking_number, carrier_reference, addresses (JSONB), weight/dimensions, fees, label info, timestamps
  - Indexes: code, active, type, carrier, store, status, tracking, number, BRIN on created_at
  - Triggers: set_updated_at on carriers and shipments
- [x] Entities: `ShippingCarrierEntity`, `CarrierServiceEntity`, `ShipmentEntity` with proper relations and indexes
- [x] DTOs: `CreateCarrierDto`, `UpdateCarrierDto`, `CarrierQueryDto`, `CreateCarrierServiceDto`, `UpdateCarrierServiceDto`, `CreateShipmentDto`, `ShipmentQueryDto`, `AdminShipmentQueryDto`, `UpdateShipmentStatusDto`, `ShippingRateRequestDto`
- [x] `ShippingRepository` with CRUD for carriers, carrier services, shipments; pagination, filtering, stats, shipment number generation
- [x] `ShippingService` with full business logic:
  - Carrier adapter pattern (`CarrierAdapter` interface + `GenericCarrierAdapter` default)
  - Carrier CRUD with Redis caching (5min TTL) and invalidation
  - Carrier service CRUD
  - Multi-carrier rate comparison (getShippingRates)
  - Shipment lifecycle: create → book → generateLabel → status updates → cancel
  - Status state machine with valid transitions (pending → booked → label_generated → picked_up → in_transit → out_for_delivery → delivered, with failed/cancelled branches)
  - Tracking via carrier adapter
  - Carrier webhook handling
  - Kafka CloudEvents for all shipping events
- [x] `ShippingController` (vendor/staff: GET carriers, carrier services, POST rates, CRUD shipments, POST book/label/cancel, PATCH status, GET track/stats)
- [x] `AdminShippingController` (admin: CRUD carriers, CRUD carrier services, list/manage shipments, stats, force status update, webhook handler)
- [x] Updated `DeliveryModule` with new entities, controllers, services, repository
- [x] Added `daltaners.shipping.events` Kafka topic (3 partitions) to init-kafka-topics.sh
- [x] Added `SHIPPING_EVENTS` constants to events/shipping.events.ts
- [x] Unit tests: 47 tests passing (shipping.service.spec.ts)
- [x] TypeScript compilation: clean (0 errors)
- [x] Existing delivery tests: 53 tests still passing (no regressions)
- [x] Total tests: 100 passing across both delivery-service test suites

### Phase 9B: Shipping & Carrier Integration (Frontend) — COMPLETED
- [x] MSW mock data: `packages/mock-data/src/data/shipping.ts` (5 carriers, 7 services, 10 shipments)
  - Filipino carriers: J&T Express, LBC Express, Ninja Van, Flash Express, Daltaners Riders (platform)
  - All 10 shipment statuses represented in mock data
  - `computeShipmentStats()` helper function for aggregation
  - TypeScript interfaces: `MockShippingCarrier`, `MockCarrierService`, `MockShipment`, `MockShipmentStats`
- [x] MSW handlers: `packages/mock-data/src/handlers/shipping.handlers.ts`
  - Vendor/shared: list carriers, get carrier, get carrier services, get rates, CRUD shipments, book, label, cancel, track, stats
  - Admin: CRUD carriers, CRUD carrier services, list/manage shipments, stats, force status update, webhook
  - Dual path registration (frontend `/shipping/*` + backend `/delivery/shipping/*`)
- [x] Updated mock-data index exports (data + types + handlers)
- [x] Vendor Dashboard hooks (`useShipping.ts`): `useShippingCarriers`, `useCarrierServices`, `useShipments`, `useShipment`, `useShipmentTracking`, `useShipmentStats`, `useGetShippingRates`, `useCreateShipment`, `useBookShipment`, `useGenerateLabel`, `useUpdateShipmentStatus`, `useCancelShipment`
  - CamelCase transforms from snake_case API responses
  - Label/color constants for all shipment statuses
- [x] Vendor Dashboard ShippingPage: stats cards, status tab filters, carrier filter, shipments table, book/label/download/track/cancel action buttons, create shipment modal, book/label/cancel confirmation modals, tracking timeline modal
- [x] Vendor Dashboard route `/shipping` + sidebar nav item (truck icon)
- [x] Admin Panel hooks (`useShipping.ts`): `useAdminCarriers`, `useAdminCarrier`, `useAdminCarrierServices`, `useAdminShipments`, `useAdminShipment`, `useAdminShipmentStats`, `useCreateCarrier`, `useUpdateCarrier`, `useDeleteCarrier`, `useCreateCarrierService`, `useUpdateCarrierService`, `useDeleteCarrierService`, `useAdminUpdateShipmentStatus`
  - Snake_case convention throughout (admin panel standard)
- [x] Admin Panel ShippingPage: two-tab layout (Shipments + Carriers & Services)
  - ShipmentsTab: 7 stat cards, search + status filter, DataTable, update status modal
  - CarriersTab: search + add carrier, DataTable, expandable services panel per carrier, CRUD modals for carriers and services, delete confirmation modal
- [x] Admin Panel route `/shipping` + sidebar nav item (truck icon)
- [x] TypeScript compilation: all 3 packages clean (0 new errors from shipping)

### Phase 10: Brand Registry — COMPLETED
- [x] DB migration: `catalog.brands` table added to init-postgres.sql
  - brands: name, slug (unique), description, logo_url, banner_url, website_url, country_of_origin, status (pending/verified/active/suspended/rejected), verified_at, verified_by, is_featured, product_count, metadata (JSONB)
  - Indexes: slug, status, name, featured (partial), BRIN on created_at
  - Added `brand_id UUID REFERENCES catalog.brands(id)` to products table + index
- [x] Entity: `BrandEntity` with enum `BrandStatus` (pending/verified/active/suspended/rejected)
- [x] Updated `ProductEntity` with `brand_id` FK column and `@ManyToOne` relation to BrandEntity
- [x] Updated entities/index.ts with BrandEntity export
- [x] DTOs: `CreateBrandDto`, `UpdateBrandDto`, `BrandQueryDto` with class-validator decorators
- [x] Updated `CreateProductDto` and `ProductQueryDto` with optional `brand_id` filter
- [x] `BrandRepository` with CRUD, findActiveBrands, findFeaturedBrands, pagination, increment/decrementProductCount, recalculateProductCount, getBrandStats
- [x] `BrandService` with full business logic:
  - Public: getActiveBrands (Redis cached 5min), getFeaturedBrands, getBrandByIdOrSlug
  - Admin: createBrand (slug generation + uniqueness), updateBrand, verifyBrand, activateBrand, rejectBrand, suspendBrand, deleteBrand (blocks if products linked)
  - Status state machine: pending→verified, verified/suspended→active, pending→rejected, active/verified→suspended
  - Kafka CloudEvents for all brand lifecycle changes
  - Redis cache invalidation on mutations
- [x] `BrandController` (public: GET active brands, GET featured, GET by id/slug)
- [x] `AdminBrandController` (admin: GET list/stats/detail, POST create, PATCH update/verify/activate/reject/suspend, DELETE, POST recalculate-product-count)
- [x] Updated `CatalogModule` with BrandEntity, BrandController, AdminBrandController, BrandService, BrandRepository
- [x] Updated `CatalogRepository` with brand_id filter in findProducts
- [x] MSW mock data: `packages/mock-data/src/data/brands.ts` (12 Filipino brands — Mega Sardines, Jollibee, Lucky Me!, Nestle PH, San Miguel, Splash Corp, Century Pacific, Oishi, Generic Health, Del Monte, Alaska Milk, CDO Foodsphere)
  - All 5 statuses represented, `computeBrandStats()` function
  - TypeScript interfaces: `MockBrand`, `MockBrandStats`, `BrandStatus`
- [x] MSW handlers: `packages/mock-data/src/handlers/brands.handlers.ts`
  - Public: GET active brands, GET featured, GET by id/slug
  - Admin: GET list (search/status/sort/paginate), GET stats, GET detail, POST create, PATCH update/verify/activate/reject/suspend, DELETE
  - Dual path registration (frontend `/brands/*` + backend `/catalog/brands/*`)
- [x] Updated mock-data index exports (data + types + handlers)
- [x] Admin Panel hooks (`useBrands.ts`): `useAdminBrands`, `useAdminBrandStats`, `useAdminBrand`, `useCreateBrand`, `useUpdateBrand`, `useVerifyBrand`, `useActivateBrand`, `useRejectBrand`, `useSuspendBrand`, `useDeleteBrand`
  - Brand/BrandStats interfaces, BRAND_STATUS_LABELS/COLORS constants
- [x] Admin Panel BrandsPage with:
  - 6 stats cards (total, pending, verified, active, suspended, rejected)
  - Search + status filter
  - DataTable with brand logo, name, status badge, country, product count, featured star, actions
  - Context-sensitive action buttons per status (verify/reject for pending, activate/suspend for verified, etc.)
  - Create/Edit modal with form fields
  - Action confirmation modal + Delete confirmation modal (only for 0-product brands)
  - Pagination
- [x] Admin Panel route `/brands` + sidebar nav item (tag icon after Categories)
- [x] TypeScript compilation: admin-panel clean (0 new errors from brands)
- [x] Existing catalog service tests: 130 tests passing (no regressions)

### Phase 11A: Tax & Compliance (Backend) — COMPLETED
- [x] DB migration: `payments.tax_configurations`, `payments.tax_invoices`, `payments.tax_reports` tables added to init-postgres.sql
  - tax_configurations: name, tax_type (vat/ewt/percentage_tax/excise/custom), rate (DECIMAL 6,4), applies_to (all/category/zone/vendor_tier), applies_to_value, description, is_inclusive, is_active, effective_from/until, created_by, metadata (JSONB)
  - tax_invoices: invoice_number (unique), invoice_type (official_receipt/sales_invoice/ewt_certificate/credit_note), vendor_id/name/tin/address, settlement_id FK, order_id, period dates, gross/vat/ewt/net amounts, vat/ewt rates, status (draft/issued/cancelled/voided), issued/cancelled dates, cancellation_reason, notes, metadata
  - tax_reports: report_number (unique), report_type (monthly_vat/quarterly_vat/annual_income/ewt_summary), period_type/year/month/quarter, period dates, aggregated totals (gross_sales, vat, ewt, commissions, refunds, net_revenue, orders, vendors, settlements), breakdown JSONB fields (by_category, by_zone, by_method), status (draft/finalized/filed/amended), generated/finalized/filed_by/at, notes, metadata
  - Indexes: type, active, effective dates, vendor, settlement, status, number, period, BRIN on created_at
  - Triggers: set_updated_at on all 3 tables
- [x] Entities: `TaxConfigurationEntity`, `TaxInvoiceEntity`, `TaxReportEntity` with enums and TypeORM decorators
- [x] DTOs: `CreateTaxConfigDto`, `UpdateTaxConfigDto`, `TaxConfigQueryDto`, `TaxInvoiceQueryDto`, `AdminTaxInvoiceQueryDto`, `CancelInvoiceDto`, `GenerateTaxReportDto`, `TaxReportQueryDto`, `FinalizeTaxReportDto`, `FileTaxReportDto`
- [x] `TaxRepository` with CRUD for configs, invoices, reports; pagination, filtering, stats aggregation
  - Config: create, findById, update, delete, findAll (filtered/paginated), findActive
  - Invoice: create, findById, findByNumber, update, findByVendor, findAllAdmin (search), getStats, getNextNumber, findBySettlement
  - Report: create, findById, update, findExisting, findAll (filtered/paginated), getNextNumber, getStats
  - Aggregation: getOrderAggregatesForPeriod, getSettlementAggregatesForPeriod, getVendorTaxSummary (raw SQL cross-schema)
- [x] `TaxService` with full business logic:
  - Philippine tax compliance: VAT (12%), EWT (2%), BIR forms
  - Config management: CRUD with Redis caching (5min TTL) for active configs
  - Invoice generation: idempotent per settlement, auto EWT certificate (Form 2307 equivalent), sequential numbering (EWT-YYYYMM-000001)
  - Invoice lifecycle: draft → issued → cancelled/voided
  - Report generation: monthly/quarterly/annual with cross-schema aggregation
  - Report lifecycle: draft → finalized → filed (with BIR filing reference)
  - Report idempotency: ConflictException for finalized, regeneration for draft
  - Kafka CloudEvents for tax report filed events
  - Redis caching for vendor tax summary
- [x] `AdminTaxController` (admin: CRUD configs, GET active configs, list/cancel/void invoices, invoice stats, generate/finalize/file reports, report stats)
  - Route: `payments/admin/tax`, 16 endpoints
- [x] `PaymentController` — 3 new vendor tax endpoints: GET tax/invoices, GET tax/invoices/:id, GET tax/summary (with vendor_id authorization)
- [x] Updated `PaymentModule` with TaxService, TaxRepository, AdminTaxController, TaxConfigurationEntity, TaxInvoiceEntity, TaxReportEntity
- [x] Added `daltaners.tax.events` Kafka topic (3 partitions) to init-kafka-topics.sh
- [x] Unit tests: tax.service.spec.ts covering configs, invoices, reports, vendor summary (with Redis cache tests)
- [x] TypeScript compilation: clean (0 errors)

### Phase 11B: Tax & Compliance (Frontend) — COMPLETED
- [x] MSW mock data (`packages/mock-data/src/data/tax.ts`):
  - Types: MockTaxConfig, MockTaxInvoice, MockTaxReport, TaxInvoiceStats, TaxReportStats, VendorTaxSummary
  - 6 tax configs (VAT, EWT, category-specific, tier-specific, zone-specific, percentage tax)
  - 12 tax invoices (10 EWT certificates across 5 vendors/2 months + 1 cancelled + 1 credit note)
  - 4 tax reports (2 monthly VAT, 1 quarterly VAT, 1 EWT summary) in various statuses
  - Helper functions: computeInvoiceStats, computeReportStats, computeVendorTaxSummary
- [x] MSW handlers (`packages/mock-data/src/handlers/tax.handlers.ts`):
  - Admin config endpoints: list, list active, get, create, update, delete
  - Admin invoice endpoints: list (paginated), stats, get, cancel, void
  - Admin report endpoints: list (paginated), stats, get, generate, finalize, file
  - Vendor endpoints: tax summary, list invoices (paginated), get invoice
  - All with proper filtering, pagination, status validation, and error handling
- [x] Registered in barrel exports (data/index.ts and handlers/index.ts)
- [x] Vendor Dashboard hook (`apps/vendor-dashboard/src/hooks/useTax.ts`):
  - useTaxSummary, useMyTaxInvoices (with filters), useTaxInvoiceDetail
- [x] Vendor Dashboard page (`apps/vendor-dashboard/src/pages/TaxPage.tsx`):
  - Summary cards: total gross, VAT collected, EWT withheld, total invoices
  - Invoice table with status filters, pagination
  - Invoice detail modal with amounts breakdown and meta info
- [x] Admin Panel hook (`apps/admin-panel/src/hooks/useTax.ts`):
  - Config queries: useTaxConfigs, useCreateTaxConfig, useUpdateTaxConfig, useDeleteTaxConfig
  - Invoice queries: useTaxInvoices, useInvoiceStats, useCancelInvoice, useVoidInvoice
  - Report queries: useTaxReports, useReportStats, useGenerateTaxReport, useFinalizeTaxReport, useFileTaxReport
- [x] Admin Panel page (`apps/admin-panel/src/pages/TaxPage.tsx`):
  - 3-tab interface: Configurations | Invoices | Reports
  - Configurations tab: CRUD table with type/scope filters, create/edit form modal
  - Invoices tab: stats cards, paginated table with filters, cancel/void confirmation modals
  - Reports tab: stats cards, paginated table with type/status filters, generate report modal, report detail modal with category/zone/method breakdowns, finalize + file actions
- [x] Routes registered in both App.tsx files (/tax)
- [x] Sidebar nav links added to both DashboardLayout.tsx files

### Phase 12A: Dynamic Pricing (Backend + DB) — COMPLETED
- [x] DB migration: `catalog.pricing_rules` + `catalog.price_history` tables added to init-postgres.sql
  - pricing_rules: store_id FK, name, description, rule_type (time_based/happy_hour/flash_sale/bulk_discount/scheduled_price), discount_type (percentage/fixed_amount/price_override), discount_value, applies_to (all_products/specific_products/category/brand), applies_to_ids UUID[], schedule JSONB (days_of_week, start_time, end_time), conditions JSONB (min/max quantity, min_order_value), start_date/end_date, priority, is_active, max_uses/current_uses, status (draft/scheduled/active/paused/expired/cancelled), created_by
  - price_history: product_id FK, store_id FK, old/new base_price/sale_price, change_type (manual/rule_applied/rule_expired/bulk_update/csv_import/scheduled), rule_id FK (nullable), changed_by, metadata JSONB
  - Indexes: store, status, type, active partial, dates, GIN on applies_to_ids, BRIN on created_at, product, rule, change_type
  - Triggers: set_updated_at on pricing_rules
- [x] Entities: `PricingRuleEntity` (with enums: PricingRuleType, PricingDiscountType, PricingAppliesTo, PricingRuleStatus, interfaces: PricingSchedule, PricingConditions), `PriceHistoryEntity` (with PriceChangeType enum)
- [x] Updated entities/index.ts with new entity exports
- [x] DTOs: `CreatePricingRuleDto` (with nested PricingScheduleDto, PricingConditionsDto), `UpdatePricingRuleDto`, `PricingRuleQueryDto`/`AdminPricingRuleQueryDto`, `PriceHistoryQueryDto`/`AdminPriceHistoryQueryDto`
- [x] `PricingRepository` with rule CRUD, store/admin queries, active rule lookups (for product with category/brand matching), scheduler queries (findScheduledRulesToActivate, findActiveRulesToExpire, findActiveRulesWithMaxUsesReached), incrementRuleUses, getRuleStats, price history CRUD with pagination
- [x] `PricingService` with full business logic:
  - Vendor ops: createRule (auto-sets status based on start_date), updateRule, deleteRule (blocks active), activateRule (from draft/scheduled/paused), pauseRule (active only), cancelRule
  - getEffectivePrice: matches product to highest-priority active rule, considers time-of-day schedule (days_of_week + start_time/end_time)
  - applyRulesToProducts / revertRuleFromProducts: batch update sale_price with history tracking
  - Admin: forceExpireRule, forceCancelRule, getAllRuleStats (Redis cached 5min)
  - Scheduler: `@Cron(EVERY_5_MINUTES)` processScheduledRules — activates scheduled, expires past end_date, expires max_uses reached
  - Helpers: validateDiscountValue, calculateDiscountedPrice, isRuleActiveNow, getProductsForRule, serializeRule
- [x] `PricingController` at `api/v1/catalog/pricing-rules` (vendor: CRUD + activate/pause/cancel/apply/revert)
- [x] `ProductPricingController` at `api/v1/catalog/pricing` (public: effective-price; vendor: product history, store history)
- [x] `AdminPricingController` at `api/v1/admin/pricing` (admin: list rules, stats, detail, force-expire, force-cancel, price history)
- [x] Updated `CatalogModule` with ScheduleModule, PriceHistoryEntity, PricingRuleEntity, PricingController, ProductPricingController, AdminPricingController, PricingService, PricingRepository
- [x] Added `@nestjs/schedule ^4.0.0` to catalog-service package.json
- [x] Added `PRICING_EVENTS` constants (9 event types) to catalog.events.ts
- [x] Added `daltaners.pricing.events` Kafka topic (3 partitions) to init-kafka-topics.sh
- [x] Unit tests: 46 tests passing (pricing.service.spec.ts)
  - createRule (5), updateRule (5), deleteRule (3), activateRule (4), pauseRule (2), cancelRule (3), getEffectivePrice (7), applyRulesToProducts (3), revertRuleFromProducts (1), admin ops (4), scheduler (3), getRulesByStore (1), getRuleById (3), getRuleStats (2)
- [x] TypeScript compilation: clean (0 errors)

### Phase 12B: Dynamic Pricing (Frontend) — COMPLETED
- [x] MSW mock data: `packages/mock-data/src/data/pricing.ts`
  - Types: PricingRuleType, PricingDiscountType, PricingAppliesTo, PricingRuleStatus, PriceChangeType
  - Interfaces: PricingSchedule, PricingConditions, MockPricingRule, MockPriceHistory, MockPricingStats
  - 10 mock pricing rules across 3 stores, all 6 statuses represented
  - 10 price history entries covering various change types
  - `computePricingStats()` helper function
- [x] MSW handlers: `packages/mock-data/src/handlers/pricing.handlers.ts`
  - Vendor: list, get, create, update, delete, activate/pause/cancel, apply/revert, stats
  - Product pricing: effective-price, product history, store history
  - Admin: list rules, stats, get rule, force-expire, force-cancel, history
  - Dual path registration (frontend + backend conventions)
- [x] Updated mock-data index exports (data + handlers)
- [x] Vendor Dashboard hooks (`apps/vendor-dashboard/src/hooks/usePricing.ts`):
  - Types: PricingRule, PriceHistoryEntry, PricingStats, EffectivePrice, CreatePricingRuleData
  - Label/color constants: RULE_TYPE_LABELS, RULE_STATUS_LABELS/COLORS, RULE_TYPE_COLORS, DISCOUNT_TYPE_LABELS, APPLIES_TO_LABELS, CHANGE_TYPE_LABELS
  - Query hooks: usePricingRules, usePricingRule, usePricingStats, useStorePriceHistory
  - Mutation hooks: useCreatePricingRule, useUpdatePricingRule, useDeletePricingRule, useActivatePricingRule, usePausePricingRule, useCancelPricingRule, useApplyPricingRule, useRevertPricingRule
- [x] Vendor Dashboard page (`apps/vendor-dashboard/src/pages/PricingPage.tsx`):
  - Two tabs: Pricing Rules + Price History
  - 6 stats cards (total, active, scheduled, paused, draft, expired)
  - Rules table with search, status filter tabs, context-sensitive action buttons per rule status
  - Create/Edit modal with full form (name, description, type, discount, applies_to, dates, priority, max_uses, schedule toggle with day picker and time inputs, conditions)
  - Detail modal, action confirm modal, delete confirm modal
  - History tab with change type filter and paginated table
- [x] Vendor Dashboard route `/pricing` + sidebar nav item (dollar icon after Promotions)
- [x] Admin Panel hooks (`apps/admin-panel/src/hooks/usePricing.ts`):
  - Types: PricingRule, PricingStats, PriceHistoryEntry, AdminPricingFilters, AdminHistoryFilters
  - Label/color constants for all enums
  - Query hooks: useAdminPricingRules, useAdminPricingStats, useAdminPricingRule, useAdminPriceHistory
  - Mutation hooks: useForceExpirePricingRule, useForceCancelPricingRule
- [x] Admin Panel page (`apps/admin-panel/src/pages/PricingPage.tsx`):
  - Two tabs: All Rules + Price History
  - 7 stats cards (total, draft, scheduled, active, paused, expired, cancelled)
  - Rules table with search, status/type dropdown filters, store ID column
  - Admin actions: view detail, force expire, force cancel
  - Detail modal with admin action buttons
  - History tab with change type filter and paginated table
- [x] Admin Panel route `/pricing` + sidebar nav item (after Tax, before Zones)
- [x] TypeScript compilation: all 3 packages clean (0 new pricing errors)

### Phase 13: Advertising (Backend) — COMPLETED
- [x] New `services/advertising-service/` — complete NestJS microservice (port 3019)
  - package.json, tsconfig.json, Dockerfile, jest.config.ts
  - src/main.ts — Kafka consumer, Swagger, Helmet, ValidationPipe, global prefix /api/v1
  - src/app.module.ts — TypeORM (advertising schema), ThrottlerModule, AdvertisingModule, HealthModule
  - src/common/ — guards (JwtAuth, Roles, ThrottlerBehindProxy), filters (AllExceptions), interceptors (Transform, Logging), decorators (CurrentUser, Roles, Public)
  - src/health/ — HealthModule + HealthController (live, ready, startup probes)
  - src/modules/advertising/ — RedisService, KafkaProducerService, JwtStrategy
- [x] DB migration: `advertising` schema added to init-postgres.sql
  - `advertising.ad_campaigns`: store_id, name, description, campaign_type (4 types), status (9 states: draft→pending_review→approved→active↔paused→completed/cancelled/rejected/suspended), budget_type (daily/total), budget_amount/spent_amount/daily_budget/daily_spent, bid_type (cpc/cpm/flat), bid_amount, targeting (JSONB), placement (5 types), banner_image_url/banner_link_url, dates, impression/click/conversion counters, rejection/suspension reasons, approval fields
  - `advertising.ad_campaign_products`: campaign_id FK, product_id, bid_amount, impression/click/conversion counters, spent, is_active, UNIQUE(campaign_id, product_id)
  - `advertising.ad_impressions`: campaign_id FK, campaign_product_id, product_id, user_id, placement, device_type, ip_address, cost
  - `advertising.ad_clicks`: campaign_id FK, impression_id FK, campaign_product_id, product_id, user_id, cost, resulted_in_order, order_id, order_amount
  - Indexes: store_id, status, type, placement, dates, active partial, campaign, product, user, impression, order, BRIN on created_at
  - Trigger: set_updated_at on ad_campaigns
- [x] Entities: `CampaignEntity` (with enums: CampaignType, CampaignStatus, BudgetType, BidType, Placement; interface: CampaignTargeting), `CampaignProductEntity`, `AdImpressionEntity`, `AdClickEntity`
- [x] Updated entities/index.ts with all entity exports
- [x] DTOs: `CreateCampaignDto` (with TargetingDto), `UpdateCampaignDto`, `CampaignQueryDto`, `AdminCampaignQueryDto` (sort_by, sort_order, store_id), `RecordImpressionDto`, `RecordClickDto`, `RecordConversionDto`, `AdminCampaignActionDto`, `AddCampaignProductDto`
- [x] `AdvertisingRepository` with:
  - Campaign CRUD, store/admin queries (search, status, type, placement filters, sorting, pagination)
  - Stats aggregation (by status, platform-wide)
  - Active campaign queries (by placement, sponsored products)
  - Scheduler queries (approved to activate, active to complete, budget exhausted)
  - Campaign product CRUD
  - Impression/click creation with campaign/product counter increments
  - Spend tracking (campaign, daily, product)
  - Conversion tracking
  - Performance queries (daily impressions/clicks/cost aggregation)
  - Platform ad stats (total campaigns, spend, impressions, clicks, conversions, revenue)
- [x] `AdvertisingService` with full business logic:
  - Vendor: createCampaign (draft + optional products), updateCampaign (draft/paused/rejected only, rejected→draft reset), deleteCampaign (draft/rejected/cancelled only), submitForReview (draft→pending_review, validates budget>0), pauseCampaign (active→paused), resumeCampaign (paused→active, budget check), cancelCampaign (multiple states→cancelled)
  - Vendor products: addProduct, removeProduct, getCampaignProducts
  - Performance: getCampaignPerformance (CTR, conversion rate, avg CPC, ROAS, daily breakdown)
  - Admin: approveCampaign (pending_review→approved or direct active if start_date past), rejectCampaign (with reason), suspendCampaign (active→suspended with reason), getPlatformStats
  - Public: getSponsoredProducts (by placement), getActiveBanners (by placement)
  - Tracking: recordImpression (CPM cost calculation), recordClick (CPC cost calculation), recordConversion (click→order attribution)
  - Budget tracking: real-time spend tracking with auto-pause on budget exhaustion
  - Scheduler: `@Cron(EVERY_5_MINUTES)` processScheduledCampaigns — activate approved, complete expired, pause exhausted
  - Redis caching (5min TTL) with invalidation for stats
  - Kafka CloudEvents for all campaign lifecycle + budget exhaustion + conversion events
- [x] `VendorCampaignController` at `api/v1/advertising/campaigns` (CRUD, submit, pause, resume, cancel, performance, products CRUD)
- [x] `AdminAdvertisingController` at `api/v1/admin/advertising` (list all, stats, detail, performance, approve, reject, suspend)
- [x] `PublicAdController` at `api/v1/ads` (sponsored-products, banners, record impression/click/conversion)
- [x] `AdvertisingModule` with ScheduleModule, TypeORM entities, all controllers/services/providers
- [x] `ADVERTISING_EVENTS` constants (15 event types) in events/advertising.events.ts
- [x] Added `daltaners.advertising.events` Kafka topic (3 partitions) to init-kafka-topics.sh
- [x] Added advertising-service to docker-compose.services.yml (port 3019)
- [x] Unit tests: 44 tests passing (advertising.service.spec.ts)
  - createCampaign (3), updateCampaign (4), deleteCampaign (3), submitForReview (3), pauseCampaign (2), resumeCampaign (3), cancelCampaign (3), approveCampaign (3), rejectCampaign (2), suspendCampaign (2), recordImpression (3), recordClick (2), recordConversion (2), processScheduledCampaigns (3), getCampaignStats (2), getCampaignPerformance (1), addProduct (2), removeProduct (1)
- [x] TypeScript compilation: clean (0 errors)

### Phase 14: Advertising (Frontend) — COMPLETED
- [x] MSW mock data: `packages/mock-data/src/data/advertising.ts` (11 mock campaigns across 3 stores, all 9 statuses)
  - Types: CampaignType, CampaignStatus, BudgetType, BidType, AdPlacement, CampaignTargeting
  - Interfaces: MockCampaign, MockCampaignProduct, MockCampaignPerformance, MockCampaignStats, MockPlatformAdStats
  - 7 campaign product entries with performance metrics
  - Helper functions: computeCampaignStats(), computePlatformAdStats(), generateCampaignPerformance()
- [x] MSW handlers: `packages/mock-data/src/handlers/advertising.handlers.ts`
  - Vendor: 14 endpoints (CRUD campaigns, submit/pause/resume/cancel, performance, products CRUD)
  - Admin: 8 endpoints (list all, campaign stats, platform stats, get campaign, performance, approve, reject, suspend)
  - Public: 5 endpoints (sponsored-products, banners, record impression/click/conversion)
  - Dual path registration (frontend + backend conventions)
- [x] Updated mock-data barrel exports (data/index.ts + handlers/index.ts)
- [x] Vendor Dashboard hooks (`apps/vendor-dashboard/src/hooks/useAdvertising.ts`):
  - Types: Campaign, CampaignProduct, CampaignPerformance, CampaignStats, CampaignFilters, CreateCampaignData
  - Label/color constants: CAMPAIGN_TYPE_LABELS, CAMPAIGN_STATUS_LABELS/COLORS, BID_TYPE_LABELS, PLACEMENT_LABELS, BUDGET_TYPE_LABELS
  - Transform functions: transformCampaign, transformProduct, transformPerformance, transformStats
  - Query hooks: useCampaigns, useCampaign, useCampaignStats, useCampaignPerformance, useCampaignProducts
  - Mutation hooks: useCreateCampaign, useUpdateCampaign, useDeleteCampaign, useSubmitCampaign, usePauseCampaign, useResumeCampaign, useCancelCampaign, useAddCampaignProduct, useRemoveCampaignProduct
- [x] Vendor Dashboard page (`apps/vendor-dashboard/src/pages/AdvertisingPage.tsx`):
  - Stats cards (total, active, pending, paused, draft)
  - Search + status filter tabs
  - Campaigns table with name, type, status, budget, spent, impressions, clicks, dates, actions
  - Context-sensitive action buttons per campaign status
  - CampaignFormModal for create/edit with all fields
  - CampaignDetailModal with performance metrics, targeting, products table, banner preview
  - ConfirmModal for action/delete confirmations
  - Pagination support
- [x] Vendor Dashboard route `/advertising` + sidebar nav item (megaphone icon)
- [x] Admin Panel hooks (`apps/admin-panel/src/hooks/useAdvertising.ts`):
  - Types: Campaign, CampaignStats, PlatformAdStats, CampaignPerformance, AdminCampaignFilters
  - Label/color constants for all enums
  - Query hooks: useAdminCampaigns, useAdminCampaignStats, useAdminPlatformStats, useAdminCampaign, useAdminCampaignPerformance
  - Mutation hooks: useApproveCampaign, useRejectCampaign, useSuspendCampaign
- [x] Admin Panel page (`apps/admin-panel/src/pages/AdvertisingPage.tsx`):
  - Platform stats: 7 cards (total campaigns, active, total spend, impressions, clicks, conversions, avg CPC)
  - Status distribution bar
  - Search + status filter tabs (prioritizing pending_review)
  - Campaigns table with store name, type, status, budget, spent, impressions, clicks, CTR, actions
  - Admin actions: View, Approve, Reject, Suspend with optional reason
  - CampaignDetailModal with full info, performance metrics, targeting, banner preview
  - Pagination support
- [x] Admin Panel route `/advertising` + sidebar nav item (megaphone icon)
- [x] Customer Web hooks (`apps/customer-web/src/hooks/useSponsored.ts`):
  - useSponsoredProducts (by placement), useSponsoredBanners (by placement)
  - useTrackImpression, useTrackClick mutation hooks
- [x] Customer Web component: `SponsoredProductCard` with "Sponsored" badge, impression tracking on mount, click tracking
- [x] Customer Web HomePage: Sponsored products section ("Promoted Products") between Nearby Stores and Featured Products
- [x] Customer Web SearchPage: Sponsored products grid above search results

---

## Admin Panel Enhancement — 10 New Features (Gap Analysis)

### Batch 3: Financial Reports + Audit Log — COMPLETED
- [x] Mock data: `packages/mock-data/src/data/reports.ts`
  - Financial report types: RevenueSummary, RevenueByPeriod, RevenueByCategory, RevenueByZone, RevenueByPaymentMethod, SettlementSummary, FeeSummary, RefundSummary
  - Audit log types: AuditActionType (35+ actions), AuditResourceType (17 types), AuditChange, MockAuditLogEntry, AuditLogStats
  - `financialReport` object with 14 daily periods, 4 categories, 8 zones, 6 payment methods, settlement/fee/refund summaries
  - `auditLogEntries` array with 20 diverse entries (vendor approvals, order refunds, settlements, user suspensions, campaigns, zones, coupons, policy rules)
  - `computeAuditLogStats()` helper function
- [x] MSW handlers: `packages/mock-data/src/handlers/reports.handlers.ts`
  - Financial: GET revenue-summary, revenue-by-period (paginated), revenue-by-category, revenue-by-zone, revenue-by-payment-method, settlement-summary, fee-summary, refund-summary, full report, POST export
  - Audit: GET list (filtered/paginated with search, action_type, resource_type, admin_user_id, date_from, date_to), GET stats, GET detail by id, POST export
- [x] Admin hooks: `apps/admin-panel/src/hooks/useReports.ts`
  - Query hooks: useRevenueSummary, useRevenueByPeriod, useRevenueByCategory, useRevenueByZone, useRevenueByPaymentMethod, useSettlementSummary, useFeeSummary, useRefundSummary
  - Mutation hooks: useExportReport
  - Constants: REFUND_REASON_LABELS, PAYMENT_METHOD_LABELS, CATEGORY_LABELS, CATEGORY_COLORS
- [x] Admin hooks: `apps/admin-panel/src/hooks/useAuditLog.ts`
  - Query hooks: useAuditLog (paginated with filters), useAuditLogStats, useAuditLogEntry
  - Mutation hooks: useExportAuditLog
  - Constants: ACTION_TYPE_LABELS (35+), ACTION_TYPE_COLORS, RESOURCE_TYPE_LABELS, RESOURCE_TYPE_COLORS
- [x] Admin page: `apps/admin-panel/src/pages/FinancialReportsPage.tsx`
  - 4-tab layout: Revenue, Settlements, Platform Fees, Refunds
  - RevenueTab: Summary cards, daily revenue BarChart, category PieChart, payment method PieChart, zone table
  - SettlementsTab: Summary cards, settlement metrics, status PieChart
  - FeesTab: Summary cards, commission by category BarChart, fee breakdown
  - RefundsTab: Summary cards, refunds by reason BarChart, by method breakdown
  - Export CSV/PDF buttons
- [x] Admin page: `apps/admin-panel/src/pages/AuditLogPage.tsx`
  - Stats cards (total actions, today, active admins, most active)
  - Filters: search, action type dropdown, resource type dropdown
  - Audit log table with timestamp, admin, action badge, resource badge, description, changes, view button
  - Pagination
  - AuditDetailModal: info grid, changes diff table (old/new values), metadata JSON
  - Export CSV button
- [x] Routes: `/reports` and `/audit-log` added to `App.tsx`
- [x] Sidebar nav: Reports item added to Finance group, Audit Log item added to Platform group
- [x] Barrel exports: reports data + handlers registered in mock-data index files

### Batch 2: Platform Settings + Admin Roles & Permissions — COMPLETED
- [x] Mock data: `packages/mock-data/src/data/settings.ts` — Platform settings (General, Commerce, Payments, Security, Notifications) + 12 feature flags
  - Filipino-specific: PHP currency, Asia/Manila timezone, en/fil/ceb locales, GCash/Maya/GrabPay payment methods
- [x] Mock data: `packages/mock-data/src/data/roles.ts` — 9 permission groups (37 permissions), 7 admin roles, 19 admin users
  - Roles: super_admin, admin, support, finance, marketing, content_manager, operations
  - Filipino names for mock admin users
- [x] MSW handlers: `packages/mock-data/src/handlers/settings.handlers.ts`
  - GET all settings, GET by category, PATCH by category
  - GET/POST/PATCH/DELETE feature flags
- [x] MSW handlers: `packages/mock-data/src/handlers/roles.handlers.ts`
  - Roles: GET list, GET detail, POST create, PATCH update, DELETE (system role protection, in-use protection)
  - Admin users: GET list (paginated + filtered), POST create, PATCH update, DELETE
  - GET permission groups
- [x] Admin hooks: `apps/admin-panel/src/hooks/useSettings.ts`
  - useAllSettings, useSettingsCategory<T>, useFeatureFlags, useUpdateSettings, useToggleFeatureFlag, useCreateFeatureFlag, useDeleteFeatureFlag
- [x] Admin hooks: `apps/admin-panel/src/hooks/useRoles.ts`
  - useAdminRoles, useAdminRole, usePermissionGroups, useCreateRole, useUpdateRole, useDeleteRole
  - useAdminUsers, useCreateAdminUser, useUpdateAdminUser, useDeleteAdminUser
- [x] Admin page: `apps/admin-panel/src/pages/SettingsPage.tsx`
  - 6-tab interface: General, Commerce, Payments, Security, Notifications, Feature Flags
  - Each tab: editable form with save functionality
  - Feature Flags tab: category filter pills, toggle switches, create/delete flags
- [x] Admin page: `apps/admin-panel/src/pages/RolesPage.tsx`
  - 2-tab interface: Roles & Permissions | Admin Users
  - Roles tab: search, role cards, create/edit/delete, full permission matrix modal with group-level select-all
  - System role protection (view-only)
  - Admin Users tab: search + role/status filters, data table, pagination, create/edit/deactivate/delete
- [x] Routes: `/settings` and `/roles` added to `App.tsx`
- [x] Sidebar nav: Settings and Roles & Permissions items added to Platform group in `DashboardLayout.tsx`
- [x] Barrel exports: settings and roles data + handlers registered in mock-data index files

### Batch 1: Sidebar Grouping + Enhanced Dashboard + Admin Product Catalog — COMPLETED
- [x] **Feature 0 — Sidebar Navigation Grouping**: Refactored `DashboardLayout.tsx`
  - Converted 23 flat nav items into 9 collapsible groups (Main, Catalog, Orders, Vendors, Finance, Marketing, Users, Platform, Delivery)
  - Groups auto-expand based on current route
  - Single-item groups render as direct links (no collapsible header)
  - Collapsed sidebar shows flat icon-only view with tooltips
  - Group headers show active color when any child route is active
- [x] **Feature 5 — Enhanced Dashboard**: 3 new components + updated `DashboardPage.tsx`
  - `PlatformKPICards.tsx` — GMV, registered users, vendor activation rate, monthly growth
  - `PendingActionsWidget.tsx` — Actionable pending items (vendors, disputes, returns, products) with links
  - `GrowthMetricsChart.tsx` — Revenue trend bar chart with month-over-month growth line (Recharts ComposedChart)
  - Dashboard now uses 5 hooks: useOrderStats, useVendorStats, useReturnStats, useDisputeStats, useAdminProductStats
  - Normalized mock data differences (ordersByStatus object→array, topStores field name mapping)
- [x] **Feature 1 — Admin Product Catalog**: Full product management page
  - `admin-products.handlers.ts` — 8 MSW endpoints (list, stats, detail, approve, reject, feature, delete, bulk-action)
  - Extended MockProduct with admin fields (status, stock_quantity, category_name, store_name)
  - `useProducts.ts` — 7 hooks + types (list, detail, stats, approve, reject, feature, delete, bulk-action)
  - `ProductsPage.tsx` — Stats cards (6), search + status filter, product table with images, bulk select, approve/reject/feature actions, pagination
  - Route `/products` registered in `App.tsx`
  - Products nav item added to Catalog group in sidebar
  - Handlers registered in `mock-data/handlers/index.ts`
- [x] **TypeScript**: 0 new errors in all new/modified files

---

## Phase 2: Food Delivery, Pharmacy Delivery & Multi-City Expansion

### Batch 1: Service-Type Business Rules Engine (Backend) — COMPLETED
- [x] Created `services/order-service/src/modules/order/service-type-rules.ts` — Strategy pattern with per-type rules
  - grocery: min ₱200, all delivery types, 20min prep
  - food: min ₱150, standard/express/instant (no scheduled), 15min prep
  - pharmacy: min ₱0, standard/express only, 30min prep, requires Rx check
  - parcel: min ₱100, standard/scheduled only, 15min prep
- [x] Updated `create-order.dto.ts` — Added `prescription_upload_id`, `destination_lat`, `destination_lng`, `has_rx_items` fields
- [x] Updated `order.service.ts` — Service-type validation in `createOrder()`, estimated delivery calculation
- [x] Unit tests: 27 tests passing (service-type-rules.spec.ts)

### Batch 2: Prescription Workflow (Backend + DB) — COMPLETED
- [x] DB migration: `orders.prescription_uploads` table added to init-postgres.sql
- [x] Added FDA fields to `vendors.stores` table (fda_license_number, fda_license_expiry, pharmacy_license_url)
- [x] Created entity, DTOs, repository, service, controllers (customer + vendor)
- [x] Updated `order.module.ts` with all new providers
- [x] Added `daltaners.prescriptions.events` Kafka topic
- [x] Unit tests: 24 tests passing (prescription.service.spec.ts)

### Batch 3: Zone-Based Delivery Fees + Multi-City Seed Data (Backend) — COMPLETED
- [x] Added `GET /zones/cities` and `GET /zones/by-city/:city` endpoints to zone service
- [x] Created `zone-client.service.ts` in order-service with circuit breaker pattern (fallback to static fees)
- [x] Replaced static `DELIVERY_FEE_MAP` with zone-based delivery fee calculation
- [x] Added Cebu (4 zones) + Davao (4 zones) seed data to seed-postgres.sql
- [x] Added 6 new stores (2 per city: grocery, restaurant, pharmacy) for Cebu and Davao
- [x] Unit tests: 10 tests passing (zone-client.service.spec.ts)

### Batch 4: Food Delivery Frontend (Customer Web) — COMPLETED
- [x] Created food components: DietaryBadge, AllergenWarning, RestaurantCard, PrepTracker
- [x] Created `useFoodStores` hook and FoodPage
- [x] Updated cart store with `special_instructions`, `dietary_tags`, `allergens` fields
- [x] Added `/food` route and Food nav link
- [x] Added food translations to en.json, fil.json, ceb.json (16 keys each)

### Batch 5: Pharmacy Delivery Frontend (Customer Web + Mock Data) — COMPLETED
- [x] Created pharmacy components: PrescriptionStatusBadge, PrescriptionUpload, PrescriptionList
- [x] Created `usePrescriptions` hook and PharmacyPage
- [x] Created mock prescriptions data + MSW handlers
- [x] Added `/pharmacy` route and Pharmacy nav link
- [x] Added pharmacy translations to all 3 i18n files (18 keys each)

### Batch 6: Multi-City Frontend + City Selection — COMPLETED
- [x] Created `city.store.ts` — Zustand persisted store (Metro Manila, Cebu, Davao with coords)
- [x] Created `CitySelector.tsx` — Dropdown component in header
- [x] Created `useCities.ts` hook for fetching available cities
- [x] Created zone MSW handlers (zones.handlers.ts — cities, by-city, list, delivery-fee)
- [x] Added 8 Cebu/Davao zones to mock zones data
- [x] Added 6 Cebu/Davao stores to mock stores data (grocery, restaurant, pharmacy per city)
- [x] Updated HomePage to use city store coords instead of hardcoded values
- [x] Added CitySelector to MainLayout header
- [x] Added zones proxy to vite.config.ts (`/api/v1/zones` → localhost:3014)
- [x] Added city translations to all 3 i18n files
- [x] Updated admin ZonesPage with city filter tabs (All/Manila/Cebu/Davao)
- [x] Updated admin useZones hook with city parameter

### Batch 7: Vendor Dashboard Updates + Integration Tests + Cleanup — COMPLETED
- [x] Updated vendor OrdersPage with service_type filter tabs (All/Grocery/Food/Pharmacy)
- [x] Updated vendor useOrders hook with `service_type` filter parameter
- [x] Updated vendor DashboardPage with service-type breakdown widget
- [x] Created food-order-flow.spec.ts — 16 tests (rules, min order, delivery type, prescription, estimated delivery, full flow)
- [x] Created pharmacy-order-flow.spec.ts — 18 tests (rules, min order, delivery type, prescription, estimated delivery, full flow)
- [x] Created zone-delivery-fee.spec.ts — 13 tests (static fallback, circuit breaker, multi-city, edge cases)
- [x] All 227 tests passing across 10 order-service test suites
- [x] Updated COMPLETED_TASKS.md and PENDING_TASKS.md

---

## Admin Panel Enhancement — Gap Analysis (continued)

### Batch 4: Delivery/Rider Management + Bulk Operations — COMPLETED
- [x] Mock data: `packages/mock-data/src/data/riders.ts` (16 mock riders across Metro Manila, Cebu, Davao)
  - Types: `MockRider`, `MockRiderStats`, `RiderStatus`, `VehicleType`
  - All 4 statuses (pending, active, suspended, inactive), 5 vehicle types (motorcycle, bicycle, car, van, walking)
  - `computeRiderStats()` helper function
  - Realistic Filipino names, zone assignments, performance metrics
- [x] MSW handlers: `packages/mock-data/src/handlers/riders.handlers.ts`
  - GET list (paginated, filterable by status/vehicle_type/is_online/zone, sortable by rating/deliveries/earnings/name)
  - GET stats (total, active, pending, suspended, inactive, online/offline, by vehicle type, today's metrics)
  - GET detail by ID
  - PATCH update status (with valid transition enforcement: pending→active, active→suspended/inactive, etc.)
  - GET earnings summary (last 7 days daily breakdown)
  - POST approve (pending→active)
  - Dual path registration (frontend `/admin/riders` + backend `/delivery/admin/riders`)
- [x] Registered in mock-data barrel exports (data/index.ts + handlers/index.ts)
- [x] Admin hooks: `apps/admin-panel/src/hooks/useRiders.ts`
  - Types: `Rider`, `RiderStats`, `RiderEarnings`, `RiderStatus`, `VehicleType`
  - Constants: `RIDER_STATUS_LABELS/COLORS`, `VEHICLE_TYPE_LABELS/ICONS`
  - Query hooks: `useRiders` (with filters), `useRider`, `useRiderStats`, `useRiderEarnings`
  - Mutation hooks: `useUpdateRiderStatus`, `useApproveRider`
- [x] Admin page: `apps/admin-panel/src/pages/RidersPage.tsx`
  - 6 stats cards (total, active, online, pending, today's deliveries, today's earnings)
  - Vehicle type breakdown badges
  - Filters: search, status, vehicle type, online/offline
  - Data table: rider name/phone, vehicle, status badge, online indicator, zone, rating, deliveries, current orders, actions
  - Context-sensitive action buttons per status (approve for pending, suspend/deactivate for active, etc.)
  - Detail modal: 9 info cards (vehicle, rating, deliveries, earnings, rates, zone, orders), license info, bank info, 7-day earnings bar chart
  - Action confirmation modal with optional reason
  - Pagination
  - Export CSV button
- [x] CSV Export Utility: `apps/admin-panel/src/lib/csv-export.ts`
  - Generic `exportToCSV<T>()` function with column definitions
  - CSV escaping (commas, quotes, newlines), BOM for Excel compatibility
  - Browser download trigger
- [x] Export CSV buttons added to existing pages:
  - UsersPage: exports ID, email, phone, role, verified, active, last login, created
  - OrdersPage: exports order #, status, service type, payment, totals, created
  - VendorsPage: exports ID, name, category, status, commission, rating, orders, contact, created
  - RidersPage: exports all key rider fields
- [x] Route `/riders` registered in `App.tsx`
- [x] Sidebar nav: Riders item added to Delivery group in `DashboardLayout.tsx`
- [x] Vite proxy: `/api/v1/admin/riders` → delivery service (port 3007)
- [x] TypeScript compilation: 0 new errors in all new/modified files

---

### Admin Panel Batch 5: Search Management + Customer Analytics — COMPLETED

**Date completed**: 2026-03-04

#### Mock Data Created
- [x] `packages/mock-data/src/data/search-admin.ts`
  - SearchSynonym (12 entries) — Filipino product terms (bigas, gatas, sabon, kape, etc.)
  - BoostRule (6 entries) — pin, boost, bury, filter types
  - SearchAnalytics — KPIs, top queries (15), zero-result queries (10), 30-day daily chart
  - IndexHealth (5 indexes) — products, stores, categories, brands, suggestions
- [x] `packages/mock-data/src/data/customer-analytics.ts`
  - CustomerOverview — 8 KPI metrics with change percentages
  - Demographics — age groups, gender, top Filipino cities, device types, payment methods (GCash, COD, etc.)
  - AcquisitionChannels (7) — organic, Facebook Ads, referral, TikTok, Google Ads, Instagram, app stores
  - RetentionCohorts (6 months) — M1-M6 percentage retention matrix
  - CustomerSegments (7) — Champions, Loyal, Potential Loyalists, New, At Risk, Hibernating, Occasional
  - CustomerGrowth — 30-day daily new/returning/churned

#### MSW Handlers Created
- [x] `packages/mock-data/src/handlers/search-admin.handlers.ts`
  - Dual-path registration (admin + catalog prefixes)
  - CRUD for synonyms and boost rules (GET list/POST/PATCH/DELETE)
  - GET search analytics, GET index health, POST trigger re-index
- [x] `packages/mock-data/src/handlers/customer-analytics.handlers.ts`
  - Dual-path registration (admin + users prefixes)
  - GET overview, demographics, acquisition, retention, segments, growth

#### Admin Hooks Created
- [x] `apps/admin-panel/src/hooks/useSearchAdmin.ts`
  - Query hooks: useSynonyms, useBoostRules, useSearchAnalytics, useIndexHealth
  - Mutation hooks: useCreateSynonym, useUpdateSynonym, useDeleteSynonym
  - Mutation hooks: useCreateBoostRule, useUpdateBoostRule, useDeleteBoostRule, useReindex
  - Constants: BOOST_TYPE_LABELS/COLORS, INDEX_STATUS_COLORS, SUGGESTED_ACTION_LABELS
- [x] `apps/admin-panel/src/hooks/useCustomerAnalytics.ts`
  - Query hooks: useCustomerOverview, useDemographics, useAcquisitionChannels, useRetentionCohorts, useCustomerSegments, useCustomerGrowth
  - Constants: CHURN_RISK_COLORS

#### Pages Created
- [x] `apps/admin-panel/src/pages/SearchManagementPage.tsx`
  - 4 tabs: Search Analytics, Synonyms, Boost Rules, Index Health
  - Analytics tab: KPI cards (searches, CTR, zero-result rate, response time), daily volume bar chart, top queries table, zero-result queries table
  - Synonyms tab: search/filter toolbar, CRUD table, add/edit modal
  - Boost Rules tab: search/type/status filters, CRUD table with type badges, add/edit modal
  - Index Health tab: card grid per index with status, docs, size, shards, sync lag, re-index button
- [x] `apps/admin-panel/src/pages/CustomerAnalyticsPage.tsx`
  - 5 tabs: Overview, Demographics, Acquisition, Retention, Segments
  - Overview: 8 KPI cards, 30-day customer growth bar chart
  - Demographics: age/gender bar charts, cities table, device types, payment method cards
  - Acquisition: channel cards with CPA/conversion/retention bars, comparison table
  - Retention: cohort heatmap table with color-coded retention %, insight cards
  - Segments: visual distribution bar, segment cards with metrics and churn risk

#### Routes & Navigation
- [x] Routes `/search-management` and `/customer-analytics` registered in `App.tsx`
- [x] Sidebar: "Search" item added to Catalog group in `DashboardLayout.tsx`
- [x] Sidebar: "Customer Analytics" item added to Users group in `DashboardLayout.tsx`

#### Barrel Exports Updated
- [x] `packages/mock-data/src/data/index.ts` — search-admin + customer-analytics exports
- [x] `packages/mock-data/src/handlers/index.ts` — searchAdminHandlers + customerAnalyticsHandlers

#### Verification
- [x] TypeScript compilation: 0 new errors in all new/modified files

---

### Vendor Dashboard — Image Upload for Store Settings — COMPLETED

**Date completed**: 2026-03-04

#### New Component
- [x] `apps/vendor-dashboard/src/components/ui/ImageUploadField.tsx`
  - Reusable image upload with drag-and-drop, click-to-select, preview, change/remove buttons
  - Props: label, value, onChange, aspectHint, accept
  - Uses `URL.createObjectURL()` for instant preview (no backend needed)
  - Revokes blob URLs on remove to prevent memory leaks

#### Modified Files
- [x] `apps/vendor-dashboard/src/hooks/useStore.ts` — added `logo_url` and `banner_url` to `UpdateStoreData` interface
- [x] `apps/vendor-dashboard/src/pages/StoreSettingsPage.tsx`
  - Added "Store Images" card above Basic Information with logo + banner upload fields
  - State populated from mock data (`logo_url`/`banner_url` snake_case fields)
  - Both fields included in update mutation payload

#### Verification
- [x] TypeScript compilation: 0 new errors in modified files

---

### Barcode Scanner Functionality (POS + Vendor Dashboard)

#### Summary
Added barcode scanning support to POS app for fast in-store checkout, plus barcode format guidance on vendor product form.

#### Changes
1. **Mock barcode data** — Added 30 realistic EAN-13 barcodes (prefix `480` for Philippines) across mock products
2. **`useBarcodeScanner` hook** — Detects rapid sequential key input (<50ms between keystrokes) from USB/Bluetooth HID barcode scanners; triggers callback on Enter
3. **ProductGrid enhancement** — Added `forwardRef` with `focusSearch()` handle, Enter key auto-adds matching product to cart, scan feedback toast display
4. **POSPage wiring** — Integrated barcode scanner hook for background scanning, wired Ctrl+B shortcut to focus search input, product lookup by exact barcode match
5. **Vendor ProductForm** — Added `hint="EAN-13, UPC-A, or any barcode format"` to barcode input field

#### Modified Files
- [x] `packages/mock-data/src/data/products.ts` — Added barcodes to 30 products
- [x] `apps/pos/src/hooks/useBarcodeScanner.ts` (NEW) — Barcode scanner detection hook
- [x] `apps/pos/src/components/pos/ProductGrid.tsx` — forwardRef, Enter handling, feedback UI
- [x] `apps/pos/src/pages/POSPage.tsx` — Scanner hook integration, Ctrl+B shortcut
- [x] `apps/vendor-dashboard/src/components/products/ProductForm.tsx` — Barcode hint text
