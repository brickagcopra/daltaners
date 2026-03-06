# Daltaners Platform — Pending Tasks

## Vendor Management Features

### Phase 1: Returns & RMA (Backend + DB) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 2: Returns & RMA (Frontend) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 3: Dispute Resolution (Backend + DB) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 4: Dispute Resolution (Frontend) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 5: Vendor Performance (Backend + DB) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 6: Vendor Performance (Frontend) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 7: Payout & Settlement — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 8: Policy Enforcement (Backend — Batch A) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 8: Policy Enforcement (Frontend — Batch B) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 9A: Shipping & Carrier Integration (Backend) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 9B: Shipping & Carrier Integration (Frontend) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 10: Brand Registry — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 11A: Tax & Compliance (Backend) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 11B: Tax & Compliance (Frontend) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 12A: Dynamic Pricing (Backend + DB) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 12B: Dynamic Pricing (Frontend) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 13: Advertising (Backend) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Phase 14: Advertising (Frontend) — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

---

## Cancelled Tasks

### Phase 10d: WhatsApp Ordering Service — CANCELLED
- **Reason**: Replaced with Messenger integration (planned for future phase)

---

## Phase 2: Food Delivery, Pharmacy Delivery & Multi-City Expansion — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

---

## Admin Panel Enhancement — 10 New Features (Gap Analysis)

### Batch 1: Sidebar Grouping + Enhanced Dashboard + Admin Product Catalog — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Batch 2: Platform Settings + Admin Roles & Permissions — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Batch 3: Financial Reports + Audit Log — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Batch 4: Delivery/Rider Management + Bulk Operations — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

### Batch 5: Search Management + Customer Analytics — COMPLETED
*(Moved to COMPLETED_TASKS.md)*

---

## All Admin Panel Enhancement batches (1-5) are now COMPLETED.

---

## Customer Checkout Enhancements

### In-Store Pickup Option — COMPLETED
- Extended `Store` type with `OperatingHours` and `StoreLocation` interfaces in `useStores.ts`
- Added `order_type`, `scheduled_at`, `picked_up_at` to Order interface in `useOrders.ts`
- Added delivery/pickup toggle to `CheckoutPage.tsx` with date picker (3 days) and time slot selector (30-min intervals within store hours)
- Pickup sets delivery fee to P0.00 and hides delivery address/type sections
- Multi-store carts disable pickup option with explanation
- Updated MSW order handler to handle pickup (`delivery_fee: 0`, `delivery_address: null`, `scheduled_at`)
- `OrderDetailPage.tsx` shows "In-Store Pickup" badge, scheduled pickup time, hides rider/tracking for pickup orders
- `OrderCard.tsx` shows "Pickup" badge and scheduled pickup time

---

## Mobile App Missing Features

### Batch 1: Quick Wins — Wire Up Existing Stubs — COMPLETED
*(Moved to TASKS.md)*

### Batch 2–6: Search, Chat, Maps, Push, Deep Linking — PENDING
*(Deferred — see TASKS.md for details)*

---

## Mobile App Feature Parity (20 Screens + 1 Component)

### Batch 1: Customer Order Detail + Reviews — COMPLETED
*(Moved to TASKS.md)*

### Batch 2: Customer Disputes (3 screens) — COMPLETED
*(Moved to TASKS.md)*

### Batch 3: Customer Returns (3 screens) — COMPLETED
*(Moved to TASKS.md)*

### Batch 4: Customer Food + Pharmacy (2 screens) — COMPLETED
- [x] Added `Prescription`, `PrescriptionStatus`, `UploadPrescriptionPayload` types to `types/index.ts`
- [x] Created `FoodScreen.tsx` — cuisine filter pills, dietary toggles (halal/vegan/vegetarian/gluten-free), "Open Now" toggle, clear filters, 2-column restaurant grid with rating/prep time/min order/dietary badges, pull-to-refresh
- [x] Created `PharmacyScreen.tsx` — tabbed layout (Browse/Prescriptions), pharmacy list cards with FDA badge, prescription upload form (gallery + camera via expo-image-picker), prescription list with status badges (pending/verified/rejected/expired), form fields (doctor name, PRC license, date)
- [x] Added `Food` and `Pharmacy` routes to `CustomerNavigator.tsx` stack
- [x] Wired HomeScreen category links: `restaurant` → Food screen, `pharmacy` → Pharmacy screen
- [x] Added i18n strings for food & pharmacy sections in all 3 locales (en, fil, ceb)
- [x] Added profile menu i18n entries for food/pharmacy

### Batch 5: Vendor Analytics + Reviews + Disputes (3 screens) — COMPLETED
- [x] Added `VendorAnalytics`, `VendorReview`, `VendorDisputeStatus`, `VendorDisputePriority`, `VendorDispute` types to `types/index.ts`
- [x] Created `AnalyticsScreen.tsx` — 4 stat cards, revenue trend bar chart (14 days), orders by status breakdown, top 5 products ranked list, peak hours chart, period summary grid
- [x] Created `ReviewsScreen.tsx` — FlatList with pagination, review cards (avatar, stars, type badge, verified badge), inline vendor response display, response modal with KeyboardAvoidingView + char counter (2000 max)
- [x] Created `DisputesScreen.tsx` — horizontal status filter tabs (7 statuses), dispute cards with priority/status badges, deadline warning banner, response modal for respondable statuses (open/customer_reply/escalated)
- [x] Added `Analytics`, `Reviews`, `VendorDisputes` routes to `VendorNavigator.tsx`
- [x] Added Quick Links section to vendor `DashboardScreen.tsx` (Analytics, Reviews, Disputes navigation)
- [x] Added i18n strings for `vendorAnalytics`, `vendorReviews`, `vendorDisputes` in all 3 locales (en, fil, ceb)

### Batch 6: Vendor Returns + Financials + Performance (3 screens) — COMPLETED
- [x] Added `VendorSettlement`, `VendorSettlementSummary`, `VendorTaxSummary`, `SettlementStatus`, `VendorPerformanceMetrics`, `VendorPerformanceHistory`, `PerformanceTier` types to `types/index.ts`
- [x] Created `ReturnsScreen.tsx` — horizontal status tabs (7 statuses), return cards with reason/items/refund amount, approve/deny/received action buttons, modal with response text input, FlatList with pagination + pull-to-refresh
- [x] Created `FinancialsScreen.tsx` — 3-tab layout (Overview/Settlements/Tax), balance card with commission rate, settlement summary stats, settlement list with gross/commission/tax/adjustment breakdown, tax summary with VAT/EWT/commissions
- [x] Created `PerformanceScreen.tsx` — performance tier badge + score circle (0-100), key metrics cards (fulfillment/cancellation/prep time/on-time/rating/response rate/dispute rate), order stats grid, revenue card, returns/disputes/response time cards, score trend mini bar chart (14 days)
- [x] Added `VendorReturns`, `VendorFinancials`, `VendorPerformance` routes to `VendorNavigator.tsx`
- [x] Added 3 quick links (Returns, Financials, Performance) to vendor `DashboardScreen.tsx`
- [x] Added i18n strings for `vendorReturns`, `vendorFinancials`, `vendorPerformance` in all 3 locales (en, fil, ceb)

### Batch 7: Vendor Staff + Coupons + Advertising + Policy (4 screens) — COMPLETED
- [x] Added `StoreStaff`, `StaffRole`, `VendorCoupon`, `CouponDiscountType`, `CouponStatus`, `VendorCampaign`, `VendorCampaignStats`, `CampaignStatus`, `PolicyViolation`, `ViolationSeverity`, `ViolationStatus`, `PolicyAppeal`, `ViolationSummary` types to `types/index.ts`
- [x] Created `StaffScreen.tsx` — staff list with avatar (initials), role badges (manager/staff/cashier), add staff modal with email + role selector, remove staff confirmation
- [x] Created `CouponsScreen.tsx` — coupon list with discount type icons, active/inactive toggle, usage stats, create coupon modal (code, name, type, value, min order, usage limit, first-order-only toggle)
- [x] Created `AdvertisingScreen.tsx` — campaign list with impressions/clicks/CTR stats, budget progress bar, status-based action buttons (Submit/Pause/Resume/Cancel), horizontal stats overview
- [x] Created `ViolationsScreen.tsx` — summary bar (total/pending/acknowledged/appealed), status filter tabs, severity badges (warning/minor/major/critical), acknowledge/appeal actions, appeal modal with reason text input
- [x] Added `VendorStaff`, `VendorCoupons`, `VendorAdvertising`, `VendorViolations` routes to `VendorNavigator.tsx`
- [x] Added 4 quick links (Staff, Coupons, Advertising, Policy Violations) to vendor `DashboardScreen.tsx`
- [x] Added i18n strings for `vendorStaff`, `vendorCoupons`, `vendorAdvertising`, `vendorViolations` in all 3 locales (en, fil, ceb)
