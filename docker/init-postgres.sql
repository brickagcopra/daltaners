-- =============================================================================
-- Daltaners Platform — PostgreSQL Initialization Script
-- Database: daltaners
-- Extensions: uuid-ossp, postgis, pg_trgm
-- =============================================================================

-- Install extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- Create schemas
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS vendors;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS delivery;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS zones;
CREATE SCHEMA IF NOT EXISTS promotions;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS reviews;
CREATE SCHEMA IF NOT EXISTS loyalty;
CREATE SCHEMA IF NOT EXISTS chat;
CREATE SCHEMA IF NOT EXISTS pos;

-- =============================================================================
-- Utility: updated_at trigger function
-- Automatically sets updated_at = NOW() on every row update.
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- AUTH SCHEMA
-- =============================================================================

-- auth.users
CREATE TABLE auth.users (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) UNIQUE,
    phone          VARCHAR(20)  UNIQUE,
    password_hash  VARCHAR(255),
    role           VARCHAR(20)  NOT NULL CHECK (role IN ('customer', 'vendor_owner', 'vendor_staff', 'delivery', 'admin')),
    is_verified    BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    mfa_enabled    BOOLEAN      NOT NULL DEFAULT FALSE,
    mfa_secret     VARCHAR(255),
    last_login_at  TIMESTAMPTZ,
    password_reset_token      VARCHAR(255),
    password_reset_expires_at TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON auth.users (email);
CREATE INDEX idx_users_phone ON auth.users (phone);
CREATE INDEX idx_users_role  ON auth.users (role);

CREATE TRIGGER trg_auth_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- auth.refresh_tokens
CREATE TABLE auth.refresh_tokens (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash   VARCHAR(255) UNIQUE NOT NULL,
    device_info  JSONB,
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- auth.social_accounts
CREATE TABLE auth.social_accounts (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider     VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'facebook', 'apple')),
    provider_id  VARCHAR(255) NOT NULL,
    UNIQUE (provider, provider_id)
);

-- =============================================================================
-- USERS SCHEMA
-- =============================================================================

-- users.profiles
CREATE TABLE users.profiles (
    id                   UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name           VARCHAR(100),
    last_name            VARCHAR(100),
    display_name         VARCHAR(100),
    avatar_url           VARCHAR(500),
    date_of_birth        DATE,
    gender               VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    locale               VARCHAR(10) NOT NULL DEFAULT 'en',
    timezone             VARCHAR(50) NOT NULL DEFAULT 'Asia/Manila',
    preferences          JSONB       NOT NULL DEFAULT '{}',
    dietary_preferences  TEXT[],
    allergens            TEXT[],
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_profiles_updated_at
    BEFORE UPDATE ON users.profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- users.addresses
CREATE TABLE users.addresses (
    id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID          NOT NULL REFERENCES users.profiles(id) ON DELETE CASCADE,
    label                  VARCHAR(50),
    address_line1          VARCHAR(255),
    address_line2          VARCHAR(255),
    barangay               VARCHAR(100),
    city                   VARCHAR(100),
    province               VARCHAR(100),
    region                 VARCHAR(100),
    postal_code            VARCHAR(10),
    country                VARCHAR(50)   NOT NULL DEFAULT 'PH',
    latitude               DECIMAL(10,8),
    longitude              DECIMAL(11,8),
    is_default             BOOLEAN       NOT NULL DEFAULT FALSE,
    delivery_instructions  TEXT,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON users.addresses (user_id);
CREATE INDEX idx_addresses_location_gist ON users.addresses USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- =============================================================================
-- VENDORS SCHEMA
-- =============================================================================

-- vendors.stores
CREATE TABLE vendors.stores (
    id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id                  UUID          NOT NULL REFERENCES auth.users(id),
    name                      VARCHAR(255)  NOT NULL,
    slug                      VARCHAR(255)  UNIQUE NOT NULL,
    description               TEXT,
    logo_url                  VARCHAR(500),
    banner_url                VARCHAR(500),
    category                  VARCHAR(20)   NOT NULL CHECK (category IN ('grocery', 'restaurant', 'pharmacy', 'electronics', 'fashion', 'general', 'specialty')),
    status                    VARCHAR(20)   NOT NULL CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
    commission_rate           DECIMAL(5,2),
    subscription_tier         VARCHAR(20)   CHECK (subscription_tier IN ('free', 'silver', 'gold', 'platinum')),
    contact_phone             VARCHAR(20),
    contact_email             VARCHAR(255),
    business_permit_url       VARCHAR(500),
    dti_registration          VARCHAR(100),
    bir_tin                   VARCHAR(50),
    fda_license_number        VARCHAR(100),
    fda_license_expiry        DATE,
    pharmacy_license_url      VARCHAR(500),
    preparation_time_minutes  INTEGER       NOT NULL DEFAULT 30,
    minimum_order_value       DECIMAL(10,2) NOT NULL DEFAULT 0,
    rating_average            DECIMAL(3,2)  NOT NULL DEFAULT 0,
    rating_count              INTEGER       NOT NULL DEFAULT 0,
    total_orders              INTEGER       NOT NULL DEFAULT 0,
    is_featured               BOOLEAN       NOT NULL DEFAULT FALSE,
    metadata                  JSONB         NOT NULL DEFAULT '{}',
    created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stores_owner    ON vendors.stores (owner_id);
CREATE INDEX idx_stores_category ON vendors.stores (category);
CREATE INDEX idx_stores_status   ON vendors.stores (status);

CREATE TRIGGER trg_vendors_stores_updated_at
    BEFORE UPDATE ON vendors.stores
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- vendors.store_locations
CREATE TABLE vendors.store_locations (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id            UUID          NOT NULL REFERENCES vendors.stores(id) ON DELETE CASCADE,
    branch_name         VARCHAR(255),
    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(100),
    province            VARCHAR(100),
    latitude            DECIMAL(10,8),
    longitude           DECIMAL(11,8),
    delivery_radius_km  DECIMAL(5,2)  NOT NULL DEFAULT 5.0,
    geofence            GEOMETRY(Polygon, 4326),
    is_primary          BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_store_locations_geofence_gist ON vendors.store_locations USING GIST (geofence);
CREATE INDEX idx_store_locations_point_gist ON vendors.store_locations USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- vendors.operating_hours
CREATE TABLE vendors.operating_hours (
    id                 UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    store_location_id  UUID      NOT NULL REFERENCES vendors.store_locations(id) ON DELETE CASCADE,
    day_of_week        SMALLINT  NOT NULL,  -- 0=Sunday, 6=Saturday
    open_time          TIME,
    close_time         TIME,
    is_closed          BOOLEAN   NOT NULL DEFAULT FALSE
);

-- vendors.store_staff
CREATE TABLE vendors.store_staff (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    UUID        NOT NULL REFERENCES vendors.stores(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES auth.users(id),
    role        VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'staff', 'cashier')),
    permissions JSONB,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE
);

-- vendors.performance_metrics (current rolling-window snapshot per store)
CREATE TABLE vendors.performance_metrics (
    store_id                    UUID        PRIMARY KEY REFERENCES vendors.stores(id) ON DELETE CASCADE,
    total_orders                INTEGER     NOT NULL DEFAULT 0,
    total_revenue               DECIMAL(14, 2) NOT NULL DEFAULT 0,
    fulfilled_orders            INTEGER     NOT NULL DEFAULT 0,
    cancelled_orders            INTEGER     NOT NULL DEFAULT 0,
    fulfillment_rate            DECIMAL(5, 2) NOT NULL DEFAULT 0,
    cancellation_rate           DECIMAL(5, 2) NOT NULL DEFAULT 0,
    avg_preparation_time_min    DECIMAL(8, 2) NOT NULL DEFAULT 0,
    on_time_delivery_rate       DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total_returns               INTEGER     NOT NULL DEFAULT 0,
    return_rate                 DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total_disputes              INTEGER     NOT NULL DEFAULT 0,
    dispute_rate                DECIMAL(5, 2) NOT NULL DEFAULT 0,
    escalation_rate             DECIMAL(5, 2) NOT NULL DEFAULT 0,
    avg_rating                  DECIMAL(3, 2) NOT NULL DEFAULT 0,
    review_count                INTEGER     NOT NULL DEFAULT 0,
    review_response_rate        DECIMAL(5, 2) NOT NULL DEFAULT 0,
    avg_dispute_response_hours  DECIMAL(8, 2) NOT NULL DEFAULT 0,
    performance_score           DECIMAL(5, 2) NOT NULL DEFAULT 0,
    performance_tier            VARCHAR(20) NOT NULL DEFAULT 'unrated'
                                CHECK (performance_tier IN ('excellent','good','average','poor','critical','unrated')),
    period_days                 INTEGER     NOT NULL DEFAULT 30,
    calculated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_performance_metrics_updated_at
    BEFORE UPDATE ON vendors.performance_metrics
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- vendors.performance_history (daily snapshots for trend analysis)
CREATE TABLE vendors.performance_history (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id                UUID        NOT NULL REFERENCES vendors.stores(id) ON DELETE CASCADE,
    snapshot_date           DATE        NOT NULL,
    total_orders            INTEGER     NOT NULL DEFAULT 0,
    total_revenue           DECIMAL(14, 2) NOT NULL DEFAULT 0,
    fulfilled_orders        INTEGER     NOT NULL DEFAULT 0,
    cancelled_orders        INTEGER     NOT NULL DEFAULT 0,
    fulfillment_rate        DECIMAL(5, 2) NOT NULL DEFAULT 0,
    cancellation_rate       DECIMAL(5, 2) NOT NULL DEFAULT 0,
    avg_preparation_time_min DECIMAL(8, 2) NOT NULL DEFAULT 0,
    on_time_delivery_rate   DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total_returns           INTEGER     NOT NULL DEFAULT 0,
    return_rate             DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total_disputes          INTEGER     NOT NULL DEFAULT 0,
    dispute_rate            DECIMAL(5, 2) NOT NULL DEFAULT 0,
    escalation_rate         DECIMAL(5, 2) NOT NULL DEFAULT 0,
    avg_rating              DECIMAL(3, 2) NOT NULL DEFAULT 0,
    review_count            INTEGER     NOT NULL DEFAULT 0,
    review_response_rate    DECIMAL(5, 2) NOT NULL DEFAULT 0,
    performance_score       DECIMAL(5, 2) NOT NULL DEFAULT 0,
    performance_tier        VARCHAR(20) NOT NULL DEFAULT 'unrated'
                            CHECK (performance_tier IN ('excellent','good','average','poor','critical','unrated')),
    metrics_snapshot        JSONB       NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, snapshot_date)
);

CREATE INDEX idx_perf_history_store      ON vendors.performance_history (store_id);
CREATE INDEX idx_perf_history_date       ON vendors.performance_history (snapshot_date);
CREATE INDEX idx_perf_history_store_date ON vendors.performance_history (store_id, snapshot_date DESC);
CREATE INDEX idx_perf_history_created    ON vendors.performance_history USING BRIN (created_at);

-- vendors.policy_rules (define enforceable platform policies)
CREATE TABLE vendors.policy_rules (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code              VARCHAR(50) UNIQUE NOT NULL,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    category          VARCHAR(30) NOT NULL CHECK (category IN (
                        'quality','delivery','pricing','listing','communication',
                        'fraud','compliance','safety','content','other')),
    severity          VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (severity IN (
                        'warning','minor','major','critical')),
    penalty_type      VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (penalty_type IN (
                        'warning','suspension','fine','termination')),
    penalty_value     DECIMAL(10,2) NOT NULL DEFAULT 0,
    suspension_days   INTEGER     NOT NULL DEFAULT 0,
    auto_detect       BOOLEAN     NOT NULL DEFAULT FALSE,
    max_violations    INTEGER     NOT NULL DEFAULT 3,
    is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_rules_category ON vendors.policy_rules (category);
CREATE INDEX idx_policy_rules_severity ON vendors.policy_rules (severity);
CREATE INDEX idx_policy_rules_active   ON vendors.policy_rules (is_active);

CREATE TRIGGER trg_policy_rules_updated
    BEFORE UPDATE ON vendors.policy_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- vendors.policy_violations (recorded violations against vendors)
CREATE TABLE vendors.policy_violations (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_number    VARCHAR(20) UNIQUE NOT NULL,
    store_id            UUID        NOT NULL REFERENCES vendors.stores(id) ON DELETE CASCADE,
    rule_id             UUID        REFERENCES vendors.policy_rules(id),
    category            VARCHAR(30) NOT NULL CHECK (category IN (
                          'quality','delivery','pricing','listing','communication',
                          'fraud','compliance','safety','content','other')),
    severity            VARCHAR(20) NOT NULL CHECK (severity IN (
                          'warning','minor','major','critical')),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
                          'pending','acknowledged','under_review','appealed',
                          'resolved','dismissed','penalty_applied')),
    subject             VARCHAR(500) NOT NULL,
    description         TEXT        NOT NULL,
    evidence_urls       TEXT[]      DEFAULT '{}',
    detected_by         VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (detected_by IN (
                          'system','admin','customer_report')),
    detected_by_user_id UUID,
    penalty_type        VARCHAR(20) CHECK (penalty_type IN (
                          'warning','suspension','fine','termination')),
    penalty_value       DECIMAL(10,2) DEFAULT 0,
    penalty_applied_at  TIMESTAMPTZ,
    penalty_expires_at  TIMESTAMPTZ,
    resolution_notes    TEXT,
    resolved_by         UUID,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_violations_store      ON vendors.policy_violations (store_id);
CREATE INDEX idx_violations_rule       ON vendors.policy_violations (rule_id);
CREATE INDEX idx_violations_status     ON vendors.policy_violations (status);
CREATE INDEX idx_violations_category   ON vendors.policy_violations (category);
CREATE INDEX idx_violations_severity   ON vendors.policy_violations (severity);
CREATE INDEX idx_violations_number     ON vendors.policy_violations (violation_number);
CREATE INDEX idx_violations_created    ON vendors.policy_violations USING BRIN (created_at);

CREATE TRIGGER trg_policy_violations_updated
    BEFORE UPDATE ON vendors.policy_violations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- vendors.appeals (vendor appeals against violations)
CREATE TABLE vendors.appeals (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    appeal_number     VARCHAR(20) UNIQUE NOT NULL,
    violation_id      UUID        NOT NULL REFERENCES vendors.policy_violations(id) ON DELETE CASCADE,
    store_id          UUID        NOT NULL REFERENCES vendors.stores(id) ON DELETE CASCADE,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
                        'pending','under_review','approved','denied','escalated')),
    reason            TEXT        NOT NULL,
    evidence_urls     TEXT[]      DEFAULT '{}',
    admin_notes       TEXT,
    reviewed_by       UUID,
    reviewed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appeals_violation ON vendors.appeals (violation_id);
CREATE INDEX idx_appeals_store     ON vendors.appeals (store_id);
CREATE INDEX idx_appeals_status    ON vendors.appeals (status);
CREATE INDEX idx_appeals_created   ON vendors.appeals USING BRIN (created_at);

CREATE TRIGGER trg_appeals_updated
    BEFORE UPDATE ON vendors.appeals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- CATALOG SCHEMA
-- =============================================================================

-- catalog.categories
CREATE TABLE catalog.categories (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID         REFERENCES catalog.categories(id),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL,
    icon_url    VARCHAR(500),
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    level       SMALLINT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON catalog.categories (parent_id);
CREATE INDEX idx_categories_slug   ON catalog.categories (slug);

CREATE OR REPLACE FUNCTION catalog.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON catalog.categories
    FOR EACH ROW EXECUTE FUNCTION catalog.update_updated_at_column();

-- catalog.brands
CREATE TABLE catalog.brands (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255)  NOT NULL,
    slug                VARCHAR(255)  NOT NULL UNIQUE,
    description         TEXT,
    logo_url            VARCHAR(500),
    banner_url          VARCHAR(500),
    website_url         VARCHAR(500),
    country_of_origin   VARCHAR(100),
    status              VARCHAR(20)   NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'verified', 'active', 'suspended', 'rejected')),
    verified_at         TIMESTAMPTZ,
    verified_by         UUID          REFERENCES auth.users(id),
    is_featured         BOOLEAN       NOT NULL DEFAULT FALSE,
    product_count       INTEGER       NOT NULL DEFAULT 0,
    metadata            JSONB         NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brands_slug       ON catalog.brands (slug);
CREATE INDEX idx_brands_status     ON catalog.brands (status);
CREATE INDEX idx_brands_name       ON catalog.brands (name);
CREATE INDEX idx_brands_featured   ON catalog.brands (is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_brands_created_at ON catalog.brands USING BRIN (created_at);

CREATE TRIGGER trg_catalog_brands_updated_at
    BEFORE UPDATE ON catalog.brands
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- catalog.products
CREATE TABLE catalog.products (
    id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id               UUID          NOT NULL REFERENCES vendors.stores(id),
    category_id            UUID          REFERENCES catalog.categories(id),
    brand_id               UUID          REFERENCES catalog.brands(id),
    name                   VARCHAR(500)  NOT NULL,
    slug                   VARCHAR(500)  NOT NULL,
    description            TEXT,
    short_description      VARCHAR(500),
    sku                    VARCHAR(100),
    barcode                VARCHAR(100),
    brand                  VARCHAR(255),
    unit_type              VARCHAR(20)   CHECK (unit_type IN ('piece', 'kg', 'g', 'liter', 'ml', 'pack', 'dozen', 'box', 'bundle')),
    unit_value             DECIMAL(10,3),
    base_price             DECIMAL(10,2),
    sale_price             DECIMAL(10,2),
    cost_price             DECIMAL(10,2),
    tax_rate               DECIMAL(5,2)  NOT NULL DEFAULT 12.00,
    is_taxable             BOOLEAN       NOT NULL DEFAULT TRUE,
    weight_grams           INTEGER,
    dimensions             JSONB,
    is_active              BOOLEAN       NOT NULL DEFAULT TRUE,
    is_featured            BOOLEAN       NOT NULL DEFAULT FALSE,
    requires_prescription  BOOLEAN       NOT NULL DEFAULT FALSE,
    is_perishable          BOOLEAN       NOT NULL DEFAULT FALSE,
    shelf_life_days        INTEGER,
    nutritional_info       JSONB,
    allergens              TEXT[],
    dietary_tags           TEXT[],
    rating_average         DECIMAL(3,2)  NOT NULL DEFAULT 0,
    rating_count           INTEGER       NOT NULL DEFAULT 0,
    total_sold             INTEGER       NOT NULL DEFAULT 0,
    sort_order             INTEGER       NOT NULL DEFAULT 0,
    metadata               JSONB         NOT NULL DEFAULT '{}',
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_store    ON catalog.products (store_id);
CREATE INDEX idx_products_category ON catalog.products (category_id);
CREATE INDEX idx_products_barcode  ON catalog.products (barcode);
CREATE INDEX idx_products_dietary_tags_gin ON catalog.products USING GIN (dietary_tags);
CREATE INDEX idx_products_allergens_gin    ON catalog.products USING GIN (allergens);
CREATE INDEX idx_products_brand            ON catalog.products (brand);
CREATE INDEX idx_products_brand_id         ON catalog.products (brand_id);

CREATE TRIGGER trg_catalog_products_updated_at
    BEFORE UPDATE ON catalog.products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- catalog.product_images
CREATE TABLE catalog.product_images (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id     UUID         NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    url            VARCHAR(500) NOT NULL,
    thumbnail_url  VARCHAR(500),
    alt_text       VARCHAR(255),
    sort_order     INTEGER      NOT NULL DEFAULT 0,
    is_primary     BOOLEAN      NOT NULL DEFAULT FALSE
);

-- catalog.product_variants
CREATE TABLE catalog.product_variants (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id        UUID          NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    name              VARCHAR(255)  NOT NULL,
    sku               VARCHAR(100),
    price_adjustment  DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_quantity    INTEGER       NOT NULL DEFAULT 0,
    is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
    attributes        JSONB
);

-- catalog.pricing_rules
CREATE TABLE catalog.pricing_rules (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id           UUID          NOT NULL REFERENCES vendors.stores(id),
    name               VARCHAR(255)  NOT NULL,
    description        TEXT,
    rule_type          VARCHAR(30)   NOT NULL CHECK (rule_type IN ('time_based', 'happy_hour', 'flash_sale', 'bulk_discount', 'scheduled_price')),
    discount_type      VARCHAR(20)   NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'price_override')),
    discount_value     DECIMAL(10,2) NOT NULL,
    applies_to         VARCHAR(20)   NOT NULL CHECK (applies_to IN ('all_products', 'specific_products', 'category', 'brand')),
    applies_to_ids     UUID[],
    schedule           JSONB,
    conditions         JSONB         NOT NULL DEFAULT '{}',
    start_date         TIMESTAMPTZ   NOT NULL,
    end_date           TIMESTAMPTZ,
    priority           INTEGER       NOT NULL DEFAULT 0,
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
    max_uses           INTEGER,
    current_uses       INTEGER       NOT NULL DEFAULT 0,
    status             VARCHAR(20)   NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'expired', 'cancelled')),
    created_by         UUID          REFERENCES auth.users(id),
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pricing_rules_store     ON catalog.pricing_rules (store_id);
CREATE INDEX idx_pricing_rules_status    ON catalog.pricing_rules (status);
CREATE INDEX idx_pricing_rules_type      ON catalog.pricing_rules (rule_type);
CREATE INDEX idx_pricing_rules_active    ON catalog.pricing_rules (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_pricing_rules_dates     ON catalog.pricing_rules (start_date, end_date);
CREATE INDEX idx_pricing_rules_applies   ON catalog.pricing_rules USING GIN (applies_to_ids);
CREATE INDEX idx_pricing_rules_created   ON catalog.pricing_rules USING BRIN (created_at);

CREATE TRIGGER trg_catalog_pricing_rules_updated_at
    BEFORE UPDATE ON catalog.pricing_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- catalog.price_history
CREATE TABLE catalog.price_history (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID          NOT NULL REFERENCES catalog.products(id),
    store_id        UUID          NOT NULL REFERENCES vendors.stores(id),
    old_base_price  DECIMAL(10,2),
    new_base_price  DECIMAL(10,2),
    old_sale_price  DECIMAL(10,2),
    new_sale_price  DECIMAL(10,2),
    change_type     VARCHAR(30)   NOT NULL CHECK (change_type IN ('manual', 'rule_applied', 'rule_expired', 'bulk_update', 'csv_import', 'scheduled')),
    rule_id         UUID          REFERENCES catalog.pricing_rules(id),
    changed_by      UUID          REFERENCES auth.users(id),
    metadata        JSONB         NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_history_product  ON catalog.price_history (product_id);
CREATE INDEX idx_price_history_store    ON catalog.price_history (store_id);
CREATE INDEX idx_price_history_rule     ON catalog.price_history (rule_id);
CREATE INDEX idx_price_history_type     ON catalog.price_history (change_type);
CREATE INDEX idx_price_history_created  ON catalog.price_history USING BRIN (created_at);

-- =============================================================================
-- INVENTORY SCHEMA
-- =============================================================================

-- inventory.stock
CREATE TABLE inventory.stock (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id         UUID          NOT NULL REFERENCES catalog.products(id),
    variant_id         UUID          REFERENCES catalog.product_variants(id),
    store_location_id  UUID          NOT NULL REFERENCES vendors.store_locations(id),
    quantity           INTEGER       NOT NULL DEFAULT 0,
    reserved_quantity  INTEGER       NOT NULL DEFAULT 0,
    reorder_point      INTEGER       NOT NULL DEFAULT 10,
    reorder_quantity   INTEGER       NOT NULL DEFAULT 50,
    batch_number       VARCHAR(100),
    expiry_date        DATE,
    last_restocked_at  TIMESTAMPTZ,
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_product  ON inventory.stock (product_id);
CREATE INDEX idx_stock_location ON inventory.stock (store_location_id);
CREATE INDEX idx_stock_expiry   ON inventory.stock (expiry_date);

CREATE TRIGGER trg_inventory_stock_updated_at
    BEFORE UPDATE ON inventory.stock
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- inventory.stock_movements
CREATE TABLE inventory.stock_movements (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id        UUID        NOT NULL REFERENCES inventory.stock(id),
    movement_type   VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'reservation', 'release', 'return')),
    quantity        INTEGER     NOT NULL,
    reference_type  VARCHAR(50),
    reference_id    UUID,
    notes           TEXT,
    performed_by    UUID        REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_stock   ON inventory.stock_movements (stock_id);
CREATE INDEX idx_movements_created ON inventory.stock_movements USING BRIN (created_at);

-- =============================================================================
-- ORDERS SCHEMA
-- =============================================================================

-- orders.orders
CREATE TABLE orders.orders (
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number          VARCHAR(20)   UNIQUE NOT NULL,
    customer_id           UUID          NOT NULL REFERENCES auth.users(id),
    store_id              UUID          NOT NULL REFERENCES vendors.stores(id),
    store_location_id     UUID          REFERENCES vendors.store_locations(id),
    status                VARCHAR(20)   NOT NULL CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned', 'refunded')),
    order_type            VARCHAR(20)   NOT NULL CHECK (order_type IN ('delivery', 'pickup')),
    service_type          VARCHAR(20)   NOT NULL CHECK (service_type IN ('grocery', 'food', 'pharmacy', 'parcel')),
    delivery_type         VARCHAR(20)   CHECK (delivery_type IN ('standard', 'express', 'scheduled', 'instant')),
    scheduled_at          TIMESTAMPTZ,
    subtotal              DECIMAL(12,2) NOT NULL,
    delivery_fee          DECIMAL(10,2),
    service_fee           DECIMAL(10,2),
    tax_amount            DECIMAL(10,2),
    discount_amount       DECIMAL(10,2),
    tip_amount            DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount          DECIMAL(12,2) NOT NULL,
    payment_method        VARCHAR(20)   NOT NULL CHECK (payment_method IN ('card', 'gcash', 'maya', 'grabpay', 'cod', 'wallet', 'bank_transfer')),
    payment_status        VARCHAR(20)   NOT NULL CHECK (payment_status IN ('pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded')),
    delivery_address      JSONB,
    delivery_instructions TEXT,
    substitution_policy   VARCHAR(20)   NOT NULL CHECK (substitution_policy IN ('accept_similar', 'specific_only', 'refund_only')) DEFAULT 'refund_only',
    coupon_id             UUID,
    coupon_code           VARCHAR(50),
    customer_notes        TEXT,
    cancellation_reason   TEXT,
    estimated_delivery_at TIMESTAMPTZ,
    actual_delivery_at    TIMESTAMPTZ,
    prepared_at           TIMESTAMPTZ,
    picked_up_at          TIMESTAMPTZ,
    metadata              JSONB         NOT NULL DEFAULT '{}',
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders.orders (customer_id);
CREATE INDEX idx_orders_store    ON orders.orders (store_id);
CREATE INDEX idx_orders_status   ON orders.orders (status);
CREATE INDEX idx_orders_created  ON orders.orders USING BRIN (created_at);
CREATE INDEX idx_orders_number   ON orders.orders (order_number);

CREATE TRIGGER trg_orders_orders_updated_at
    BEFORE UPDATE ON orders.orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- orders.order_items
CREATE TABLE orders.order_items (
    id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                 UUID          NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    product_id               UUID          REFERENCES catalog.products(id),
    variant_id               UUID          REFERENCES catalog.product_variants(id),
    product_name             VARCHAR(500)  NOT NULL,
    product_image_url        VARCHAR(500),
    unit_price               DECIMAL(10,2) NOT NULL,
    quantity                 INTEGER       NOT NULL,
    total_price              DECIMAL(10,2) NOT NULL,
    discount_amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
    special_instructions     TEXT,
    substitution_product_id  UUID,
    status                   VARCHAR(20)   NOT NULL CHECK (status IN ('pending', 'confirmed', 'substituted', 'unavailable', 'cancelled'))
);

-- orders.return_requests
CREATE TABLE orders.return_requests (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID          NOT NULL REFERENCES orders.orders(id),
    customer_id         UUID          NOT NULL REFERENCES auth.users(id),
    store_id            UUID          NOT NULL REFERENCES vendors.stores(id),
    request_number      VARCHAR(20)   UNIQUE NOT NULL,
    status              VARCHAR(20)   NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'received', 'refunded', 'escalated')),
    reason_category     VARCHAR(50)   NOT NULL
                        CHECK (reason_category IN ('defective', 'wrong_item', 'damaged', 'not_as_described', 'missing_item', 'expired', 'change_of_mind', 'other')),
    reason_details      TEXT,
    evidence_urls       TEXT[]        DEFAULT '{}',
    requested_resolution VARCHAR(20)  NOT NULL DEFAULT 'refund'
                        CHECK (requested_resolution IN ('refund', 'replacement', 'store_credit')),
    refund_amount       DECIMAL(12,2) DEFAULT 0,
    vendor_response     TEXT,
    vendor_responded_at TIMESTAMPTZ,
    admin_notes         TEXT,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_return_requests_order      ON orders.return_requests (order_id);
CREATE INDEX idx_return_requests_customer   ON orders.return_requests (customer_id);
CREATE INDEX idx_return_requests_store      ON orders.return_requests (store_id);
CREATE INDEX idx_return_requests_status     ON orders.return_requests (status);
CREATE INDEX idx_return_requests_created    ON orders.return_requests USING BRIN (created_at);
CREATE INDEX idx_return_requests_number     ON orders.return_requests (request_number);

CREATE TRIGGER trg_return_requests_updated_at
    BEFORE UPDATE ON orders.return_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- orders.return_items
CREATE TABLE orders.return_items (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id   UUID          NOT NULL REFERENCES orders.return_requests(id) ON DELETE CASCADE,
    order_item_id       UUID          NOT NULL REFERENCES orders.order_items(id),
    product_id          UUID          REFERENCES catalog.products(id),
    product_name        VARCHAR(500)  NOT NULL,
    quantity            INTEGER       NOT NULL CHECK (quantity > 0),
    unit_price          DECIMAL(10,2) NOT NULL,
    refund_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
    condition           VARCHAR(20)   DEFAULT 'unknown'
                        CHECK (condition IN ('unopened', 'opened', 'damaged', 'defective', 'unknown')),
    restockable         BOOLEAN       DEFAULT false,
    inventory_adjusted  BOOLEAN       DEFAULT false
);

CREATE INDEX idx_return_items_request ON orders.return_items (return_request_id);
CREATE INDEX idx_return_items_order_item ON orders.return_items (order_item_id);

-- orders.disputes
CREATE TABLE orders.disputes (
    id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_number           VARCHAR(20)   UNIQUE NOT NULL,
    order_id                 UUID          NOT NULL REFERENCES orders.orders(id),
    return_request_id        UUID          REFERENCES orders.return_requests(id),
    customer_id              UUID          NOT NULL REFERENCES auth.users(id),
    store_id                 UUID          NOT NULL REFERENCES vendors.stores(id),
    category                 VARCHAR(50)   NOT NULL
                             CHECK (category IN (
                               'order_not_received', 'item_missing', 'wrong_item',
                               'damaged_item', 'quality_issue', 'overcharged',
                               'late_delivery', 'vendor_behavior', 'delivery_behavior',
                               'unauthorized_charge', 'other'
                             )),
    status                   VARCHAR(20)   NOT NULL DEFAULT 'open'
                             CHECK (status IN (
                               'open', 'vendor_response', 'customer_reply',
                               'under_review', 'escalated', 'resolved', 'closed'
                             )),
    priority                 VARCHAR(10)   NOT NULL DEFAULT 'medium'
                             CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    subject                  VARCHAR(255)  NOT NULL,
    description              TEXT          NOT NULL,
    evidence_urls            TEXT[]        DEFAULT '{}',
    requested_resolution     VARCHAR(20)   NOT NULL DEFAULT 'refund'
                             CHECK (requested_resolution IN (
                               'refund', 'partial_refund', 'replacement',
                               'store_credit', 'apology', 'other'
                             )),
    resolution_type          VARCHAR(20)
                             CHECK (resolution_type IN (
                               'refund', 'partial_refund', 'replacement',
                               'store_credit', 'no_action', 'warning_issued'
                             )),
    resolution_amount        DECIMAL(12,2) DEFAULT 0,
    resolution_notes         TEXT,
    resolved_by              UUID          REFERENCES auth.users(id),
    resolved_at              TIMESTAMPTZ,
    escalated_at             TIMESTAMPTZ,
    escalation_reason        TEXT,
    vendor_response_deadline TIMESTAMPTZ,
    admin_assigned_to        UUID          REFERENCES auth.users(id),
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_order ON orders.disputes (order_id);
CREATE INDEX idx_disputes_return ON orders.disputes (return_request_id);
CREATE INDEX idx_disputes_customer ON orders.disputes (customer_id);
CREATE INDEX idx_disputes_store ON orders.disputes (store_id);
CREATE INDEX idx_disputes_status ON orders.disputes (status);
CREATE INDEX idx_disputes_priority ON orders.disputes (priority);
CREATE INDEX idx_disputes_number ON orders.disputes (dispute_number);
CREATE INDEX idx_disputes_created ON orders.disputes USING BRIN (created_at);
CREATE INDEX idx_disputes_deadline ON orders.disputes (vendor_response_deadline) WHERE status = 'open';

CREATE TRIGGER trg_disputes_updated_at
    BEFORE UPDATE ON orders.disputes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- orders.dispute_messages
CREATE TABLE orders.dispute_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id  UUID        NOT NULL REFERENCES orders.disputes(id) ON DELETE CASCADE,
    sender_id   UUID        NOT NULL REFERENCES auth.users(id),
    sender_role VARCHAR(20) NOT NULL
                CHECK (sender_role IN ('customer', 'vendor', 'admin', 'system')),
    message     TEXT        NOT NULL,
    attachments TEXT[]      DEFAULT '{}',
    is_internal BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispute_messages_dispute ON orders.dispute_messages (dispute_id);
CREATE INDEX idx_dispute_messages_sender ON orders.dispute_messages (sender_id);
CREATE INDEX idx_dispute_messages_created ON orders.dispute_messages (created_at);

-- orders.prescription_uploads
CREATE TABLE orders.prescription_uploads (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id          UUID          NOT NULL REFERENCES auth.users(id),
    image_url            VARCHAR(500)  NOT NULL,
    image_hash           VARCHAR(64)   NOT NULL,
    status               VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
    verified_by          UUID          REFERENCES auth.users(id),
    verification_notes   TEXT,
    doctor_name          VARCHAR(255),
    doctor_license       VARCHAR(100),
    prescription_date    DATE,
    expires_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prescription_uploads_customer ON orders.prescription_uploads (customer_id);
CREATE INDEX idx_prescription_uploads_status   ON orders.prescription_uploads (status);
CREATE INDEX idx_prescription_uploads_hash     ON orders.prescription_uploads (image_hash);

CREATE TRIGGER trg_prescription_uploads_updated_at
    BEFORE UPDATE ON orders.prescription_uploads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- DELIVERY SCHEMA
-- =============================================================================

-- delivery.delivery_personnel
CREATE TABLE delivery.delivery_personnel (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID        NOT NULL REFERENCES auth.users(id),
    vehicle_type           VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('bicycle', 'motorcycle', 'car', 'van', 'walking')),
    vehicle_plate          VARCHAR(20),
    license_number         VARCHAR(50),
    license_expiry         DATE,
    status                 VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
    is_online              BOOLEAN     NOT NULL DEFAULT FALSE,
    current_latitude       DECIMAL(10,8),
    current_longitude      DECIMAL(11,8),
    current_zone_id        UUID,
    max_concurrent_orders  SMALLINT    NOT NULL DEFAULT 2,
    current_order_count    SMALLINT    NOT NULL DEFAULT 0,
    rating_average         DECIMAL(3,2) NOT NULL DEFAULT 0,
    total_deliveries       INTEGER     NOT NULL DEFAULT 0,
    bank_account_info      JSONB,
    insurance_info         JSONB,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_personnel_location_gist ON delivery.delivery_personnel USING GIST (
    ST_SetSRID(ST_MakePoint(current_longitude, current_latitude), 4326)
);
CREATE INDEX idx_delivery_status ON delivery.delivery_personnel (status);
CREATE INDEX idx_delivery_zone   ON delivery.delivery_personnel (current_zone_id);

-- delivery.deliveries
CREATE TABLE delivery.deliveries (
    id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id               UUID          NOT NULL REFERENCES orders.orders(id),
    personnel_id           UUID          REFERENCES delivery.delivery_personnel(id),
    status                 VARCHAR(20)   NOT NULL CHECK (status IN ('assigned', 'accepted', 'at_store', 'picked_up', 'in_transit', 'arrived', 'delivered', 'failed', 'cancelled')),
    pickup_location        JSONB,
    dropoff_location       JSONB,
    estimated_pickup_at    TIMESTAMPTZ,
    actual_pickup_at       TIMESTAMPTZ,
    estimated_delivery_at  TIMESTAMPTZ,
    actual_delivery_at     TIMESTAMPTZ,
    distance_km            DECIMAL(8,2),
    delivery_fee           DECIMAL(10,2),
    tip_amount             DECIMAL(10,2),
    proof_of_delivery      JSONB,
    cod_amount             DECIMAL(10,2) NOT NULL DEFAULT 0,
    cod_collected          BOOLEAN       NOT NULL DEFAULT FALSE,
    failure_reason         TEXT,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliveries_order     ON delivery.deliveries (order_id);
CREATE INDEX idx_deliveries_personnel ON delivery.deliveries (personnel_id);
CREATE INDEX idx_deliveries_status    ON delivery.deliveries (status);

CREATE TRIGGER trg_delivery_deliveries_updated_at
    BEFORE UPDATE ON delivery.deliveries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- delivery.shipping_carriers
CREATE TABLE delivery.shipping_carriers (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255)  NOT NULL,
    code                VARCHAR(50)   NOT NULL UNIQUE,
    logo_url            VARCHAR(500),
    type                VARCHAR(20)   NOT NULL CHECK (type IN ('third_party', 'platform')),
    api_base_url        VARCHAR(500),
    api_credentials     JSONB         NOT NULL DEFAULT '{}',
    supported_service_types TEXT[]    NOT NULL DEFAULT ARRAY['grocery', 'food', 'pharmacy', 'parcel']::TEXT[],
    is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
    priority            INTEGER       NOT NULL DEFAULT 0,
    contact_phone       VARCHAR(20),
    contact_email       VARCHAR(255),
    webhook_secret      VARCHAR(255),
    tracking_url_template VARCHAR(500),
    settings            JSONB         NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipping_carriers_code    ON delivery.shipping_carriers (code);
CREATE INDEX idx_shipping_carriers_active  ON delivery.shipping_carriers (is_active);
CREATE INDEX idx_shipping_carriers_type    ON delivery.shipping_carriers (type);

CREATE TRIGGER trg_shipping_carriers_updated_at
    BEFORE UPDATE ON delivery.shipping_carriers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- delivery.carrier_services
CREATE TABLE delivery.carrier_services (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id           UUID          NOT NULL REFERENCES delivery.shipping_carriers(id) ON DELETE CASCADE,
    name                 VARCHAR(255)  NOT NULL,
    code                 VARCHAR(100)  NOT NULL,
    description          TEXT,
    estimated_days_min   INTEGER       NOT NULL DEFAULT 1,
    estimated_days_max   INTEGER       NOT NULL DEFAULT 3,
    base_price           DECIMAL(10,2) NOT NULL DEFAULT 0,
    per_kg_price         DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_weight_kg        DECIMAL(8,2)  NOT NULL DEFAULT 50,
    max_dimensions       JSONB,
    is_cod_supported     BOOLEAN       NOT NULL DEFAULT FALSE,
    is_insurance_available BOOLEAN     NOT NULL DEFAULT FALSE,
    coverage_areas       TEXT[],
    is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE(carrier_id, code)
);

CREATE INDEX idx_carrier_services_carrier  ON delivery.carrier_services (carrier_id);
CREATE INDEX idx_carrier_services_active   ON delivery.carrier_services (is_active);

-- delivery.shipments
CREATE TABLE delivery.shipments (
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_number       VARCHAR(30)   NOT NULL UNIQUE,
    order_id              UUID          NOT NULL REFERENCES orders.orders(id),
    carrier_id            UUID          NOT NULL REFERENCES delivery.shipping_carriers(id),
    carrier_service_id    UUID          REFERENCES delivery.carrier_services(id),
    store_id              UUID          NOT NULL,
    status                VARCHAR(30)   NOT NULL CHECK (status IN (
        'pending', 'booked', 'label_generated', 'picked_up',
        'in_transit', 'out_for_delivery', 'delivered',
        'failed', 'returned_to_sender', 'cancelled'
    )),
    tracking_number       VARCHAR(100),
    carrier_reference     VARCHAR(255),
    weight_kg             DECIMAL(8,2),
    dimensions            JSONB,
    package_count         INTEGER       NOT NULL DEFAULT 1,
    pickup_address        JSONB         NOT NULL,
    delivery_address      JSONB         NOT NULL,
    estimated_pickup_at   TIMESTAMPTZ,
    actual_pickup_at      TIMESTAMPTZ,
    estimated_delivery_at TIMESTAMPTZ,
    actual_delivery_at    TIMESTAMPTZ,
    shipping_fee          DECIMAL(10,2) NOT NULL DEFAULT 0,
    insurance_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
    cod_amount            DECIMAL(10,2) NOT NULL DEFAULT 0,
    carrier_status        VARCHAR(100),
    carrier_response      JSONB,
    label_url             VARCHAR(500),
    label_format          VARCHAR(10),
    notes                 TEXT,
    metadata              JSONB         NOT NULL DEFAULT '{}',
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_order     ON delivery.shipments (order_id);
CREATE INDEX idx_shipments_carrier   ON delivery.shipments (carrier_id);
CREATE INDEX idx_shipments_store     ON delivery.shipments (store_id);
CREATE INDEX idx_shipments_status    ON delivery.shipments (status);
CREATE INDEX idx_shipments_tracking  ON delivery.shipments (tracking_number);
CREATE INDEX idx_shipments_number    ON delivery.shipments (shipment_number);
CREATE INDEX idx_shipments_created   ON delivery.shipments USING BRIN (created_at);

CREATE TRIGGER trg_shipments_updated_at
    BEFORE UPDATE ON delivery.shipments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- PAYMENTS SCHEMA
-- =============================================================================

-- payments.transactions
CREATE TABLE payments.transactions (
    id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                UUID          REFERENCES orders.orders(id),
    user_id                 UUID          NOT NULL REFERENCES auth.users(id),
    type                    VARCHAR(20)   NOT NULL CHECK (type IN ('charge', 'refund', 'payout', 'top_up', 'transfer')),
    method                  VARCHAR(20)   NOT NULL CHECK (method IN ('card', 'gcash', 'maya', 'grabpay', 'cod', 'wallet', 'bank_transfer')),
    status                  VARCHAR(20)   NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed')),
    amount                  DECIMAL(12,2) NOT NULL,
    currency                VARCHAR(3)    NOT NULL DEFAULT 'PHP',
    gateway_transaction_id  VARCHAR(255),
    gateway_response        JSONB,
    idempotency_key         VARCHAR(255)  UNIQUE,
    metadata                JSONB         NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ
);

CREATE INDEX idx_transactions_order   ON payments.transactions (order_id);
CREATE INDEX idx_transactions_user    ON payments.transactions (user_id);
CREATE INDEX idx_transactions_gateway ON payments.transactions (gateway_transaction_id);
CREATE INDEX idx_transactions_created ON payments.transactions USING BRIN (created_at);

-- payments.vendor_settlements
CREATE TABLE payments.vendor_settlements (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id           UUID          NOT NULL REFERENCES vendors.stores(id),
    period_start        TIMESTAMPTZ   NOT NULL,
    period_end          TIMESTAMPTZ   NOT NULL,
    gross_amount        DECIMAL(12,2) NOT NULL,
    commission_amount   DECIMAL(12,2) NOT NULL,
    net_amount          DECIMAL(12,2) NOT NULL,
    withholding_tax     DECIMAL(10,2) NOT NULL,
    adjustment_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
    final_amount        DECIMAL(12,2) NOT NULL,
    status              VARCHAR(20)   NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    payment_reference   VARCHAR(255),
    settlement_date     TIMESTAMPTZ,
    notes               TEXT,
    approved_by         UUID,
    order_count         INTEGER       NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_settlements_vendor_id ON payments.vendor_settlements (vendor_id);
CREATE INDEX idx_vendor_settlements_status ON payments.vendor_settlements (status);
CREATE INDEX idx_vendor_settlements_period ON payments.vendor_settlements (period_start, period_end);

-- payments.settlement_items
CREATE TABLE payments.settlement_items (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id       UUID          NOT NULL REFERENCES payments.vendor_settlements(id) ON DELETE CASCADE,
    order_id            UUID          NOT NULL UNIQUE,
    order_number        VARCHAR(20),
    gross_amount        DECIMAL(12,2) NOT NULL,
    commission_amount   DECIMAL(12,2) NOT NULL,
    net_amount          DECIMAL(12,2) NOT NULL,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settlement_items_settlement_id ON payments.settlement_items (settlement_id);

-- payments.wallets
CREATE TABLE payments.wallets (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID          NOT NULL UNIQUE,
    balance       DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency      VARCHAR(3)    NOT NULL DEFAULT 'PHP',
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    daily_limit   DECIMAL(12,2) NOT NULL DEFAULT 50000,
    monthly_limit DECIMAL(12,2) NOT NULL DEFAULT 500000,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_wallets_user_id ON payments.wallets (user_id);

-- payments.wallet_transactions
CREATE TABLE payments.wallet_transactions (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id       UUID          NOT NULL REFERENCES payments.wallets(id),
    type            VARCHAR(20)   NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    balance_after   DECIMAL(12,2) NOT NULL,
    reference_type  VARCHAR(50),
    reference_id    UUID,
    description     VARCHAR(500),
    status          VARCHAR(20)   NOT NULL DEFAULT 'completed',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_txn_wallet_id ON payments.wallet_transactions (wallet_id);
CREATE INDEX idx_wallet_txn_status ON payments.wallet_transactions (status);

-- payments.tax_configurations
CREATE TABLE payments.tax_configurations (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255)  NOT NULL,
    tax_type          VARCHAR(30)   NOT NULL CHECK (tax_type IN ('vat', 'ewt', 'percentage_tax', 'excise', 'custom')),
    rate              DECIMAL(6,4)  NOT NULL,
    applies_to        VARCHAR(30)   NOT NULL CHECK (applies_to IN ('all', 'category', 'zone', 'vendor_tier')),
    applies_to_value  VARCHAR(255),
    description       TEXT,
    is_inclusive       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
    effective_from    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    effective_until   TIMESTAMPTZ,
    created_by        UUID,
    metadata          JSONB         NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tax_config_type ON payments.tax_configurations (tax_type);
CREATE INDEX idx_tax_config_applies ON payments.tax_configurations (applies_to);
CREATE INDEX idx_tax_config_active ON payments.tax_configurations (is_active) WHERE is_active = TRUE;

CREATE TRIGGER set_tax_config_updated_at
    BEFORE UPDATE ON payments.tax_configurations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- payments.tax_invoices (BIR-compliant invoices / certificates)
CREATE TABLE payments.tax_invoices (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number      VARCHAR(30)   UNIQUE NOT NULL,
    invoice_type        VARCHAR(30)   NOT NULL CHECK (invoice_type IN ('official_receipt', 'sales_invoice', 'ewt_certificate', 'credit_note')),
    vendor_id           UUID          NOT NULL,
    vendor_name         VARCHAR(255)  NOT NULL,
    vendor_tin          VARCHAR(50),
    vendor_address      TEXT,
    settlement_id       UUID          REFERENCES payments.vendor_settlements(id),
    order_id            UUID,
    period_start        TIMESTAMPTZ,
    period_end          TIMESTAMPTZ,
    gross_amount        DECIMAL(12,2) NOT NULL,
    vat_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    ewt_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_amount          DECIMAL(12,2) NOT NULL,
    vat_rate            DECIMAL(6,4)  NOT NULL DEFAULT 0.1200,
    ewt_rate            DECIMAL(6,4)  NOT NULL DEFAULT 0.0200,
    status              VARCHAR(20)   NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled', 'voided')),
    issued_at           TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    cancellation_reason TEXT,
    notes               TEXT,
    metadata            JSONB         NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_tax_invoices_number ON payments.tax_invoices (invoice_number);
CREATE INDEX idx_tax_invoices_vendor ON payments.tax_invoices (vendor_id);
CREATE INDEX idx_tax_invoices_type ON payments.tax_invoices (invoice_type);
CREATE INDEX idx_tax_invoices_status ON payments.tax_invoices (status);
CREATE INDEX idx_tax_invoices_settlement ON payments.tax_invoices (settlement_id);
CREATE INDEX idx_tax_invoices_period ON payments.tax_invoices (period_start, period_end);
CREATE INDEX idx_tax_invoices_created ON payments.tax_invoices USING BRIN (created_at);

CREATE TRIGGER set_tax_invoice_updated_at
    BEFORE UPDATE ON payments.tax_invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- payments.tax_reports (Monthly/Quarterly aggregated tax reports)
CREATE TABLE payments.tax_reports (
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number         VARCHAR(30)   UNIQUE NOT NULL,
    report_type           VARCHAR(20)   NOT NULL CHECK (report_type IN ('monthly_vat', 'quarterly_vat', 'annual_income', 'ewt_summary')),
    period_type           VARCHAR(20)   NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
    period_year           INTEGER       NOT NULL,
    period_month          INTEGER,
    period_quarter        INTEGER,
    period_start          TIMESTAMPTZ   NOT NULL,
    period_end            TIMESTAMPTZ   NOT NULL,
    total_gross_sales     DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_vat_collected   DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_ewt_withheld    DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_commissions     DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_refunds         DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_net_revenue     DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_orders          INTEGER       NOT NULL DEFAULT 0,
    total_vendors         INTEGER       NOT NULL DEFAULT 0,
    total_settlements     INTEGER       NOT NULL DEFAULT 0,
    breakdown_by_category JSONB         NOT NULL DEFAULT '{}',
    breakdown_by_zone     JSONB         NOT NULL DEFAULT '{}',
    breakdown_by_method   JSONB         NOT NULL DEFAULT '{}',
    status                VARCHAR(20)   NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'filed', 'amended')),
    generated_by          UUID,
    finalized_by          UUID,
    finalized_at          TIMESTAMPTZ,
    filed_at              TIMESTAMPTZ,
    notes                 TEXT,
    metadata              JSONB         NOT NULL DEFAULT '{}',
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_tax_reports_number ON payments.tax_reports (report_number);
CREATE INDEX idx_tax_reports_type ON payments.tax_reports (report_type);
CREATE INDEX idx_tax_reports_period ON payments.tax_reports (period_year, period_month);
CREATE INDEX idx_tax_reports_status ON payments.tax_reports (status);
CREATE INDEX idx_tax_reports_created ON payments.tax_reports USING BRIN (created_at);

CREATE TRIGGER set_tax_report_updated_at
    BEFORE UPDATE ON payments.tax_reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- ZONES SCHEMA
-- =============================================================================

-- zones.delivery_zones
CREATE TABLE zones.delivery_zones (
    id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name                   VARCHAR(255)  NOT NULL,
    city                   VARCHAR(100),
    province               VARCHAR(100),
    region                 VARCHAR(100),
    boundary               GEOMETRY(Polygon, 4326),
    base_delivery_fee      DECIMAL(10,2),
    per_km_fee             DECIMAL(10,2),
    surge_multiplier       DECIMAL(3,2)  NOT NULL DEFAULT 1.00,
    is_active              BOOLEAN       NOT NULL DEFAULT TRUE,
    max_delivery_radius_km DECIMAL(5,2)  NOT NULL DEFAULT 10.0,
    capacity_limit         INTEGER,
    current_capacity       INTEGER       NOT NULL DEFAULT 0,
    metadata               JSONB         NOT NULL DEFAULT '{}',
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_zones_boundary_gist ON zones.delivery_zones USING GIST (boundary);

-- =============================================================================
-- PROMOTIONS SCHEMA
-- =============================================================================

-- promotions.coupons
CREATE TABLE promotions.coupons (
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    code                  VARCHAR(50)   UNIQUE NOT NULL,
    name                  VARCHAR(255)  NOT NULL,
    description           TEXT,
    discount_type         VARCHAR(20)   NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_delivery')),
    discount_value        DECIMAL(10,2) NOT NULL,
    minimum_order_value   DECIMAL(10,2) NOT NULL DEFAULT 0,
    maximum_discount      DECIMAL(10,2),
    applicable_categories UUID[],
    applicable_stores     UUID[],
    usage_limit           INTEGER,
    usage_count           INTEGER       NOT NULL DEFAULT 0,
    per_user_limit        INTEGER       NOT NULL DEFAULT 1,
    is_first_order_only   BOOLEAN       NOT NULL DEFAULT FALSE,
    valid_from            TIMESTAMPTZ   NOT NULL,
    valid_until           TIMESTAMPTZ   NOT NULL,
    is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
    created_by            UUID          REFERENCES auth.users(id),
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_coupons_code ON promotions.coupons (code);
CREATE INDEX idx_coupons_active_dates ON promotions.coupons (is_active, valid_from, valid_until);
CREATE INDEX idx_coupons_applicable_stores_gin ON promotions.coupons USING GIN (applicable_stores);
CREATE INDEX idx_coupons_applicable_categories_gin ON promotions.coupons USING GIN (applicable_categories);

CREATE TRIGGER trg_promotions_coupons_updated_at
    BEFORE UPDATE ON promotions.coupons
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- promotions.coupon_usages
CREATE TABLE promotions.coupon_usages (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id       UUID          NOT NULL REFERENCES promotions.coupons(id) ON DELETE CASCADE,
    user_id         UUID          NOT NULL REFERENCES auth.users(id),
    order_id        UUID          NOT NULL REFERENCES orders.orders(id),
    discount_amount DECIMAL(10,2) NOT NULL,
    redeemed_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    released_at     TIMESTAMPTZ
);

CREATE INDEX idx_coupon_usages_coupon_id ON promotions.coupon_usages (coupon_id);
CREATE INDEX idx_coupon_usages_user_id ON promotions.coupon_usages (user_id);
CREATE INDEX idx_coupon_usages_order_id ON promotions.coupon_usages (order_id);

-- =============================================================================
-- NOTIFICATIONS SCHEMA
-- (Data primarily stored in CassandraDB — schema created for future use)
-- =============================================================================
-- notifications.preferences
CREATE TABLE notifications.preferences (
    user_id          UUID        PRIMARY KEY,
    push_enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
    email_enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
    sms_enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
    order_updates    BOOLEAN     NOT NULL DEFAULT TRUE,
    promotions       BOOLEAN     NOT NULL DEFAULT TRUE,
    delivery_updates BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- REVIEWS SCHEMA
-- =============================================================================
CREATE TABLE reviews.reviews (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID        NOT NULL,
    order_id              UUID,
    reviewable_type       VARCHAR(30) NOT NULL CHECK (reviewable_type IN ('store', 'product', 'delivery_personnel')),
    reviewable_id         UUID        NOT NULL,
    rating                SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title                 VARCHAR(255),
    body                  TEXT,
    images                TEXT[]      DEFAULT '{}',
    is_verified_purchase  BOOLEAN     NOT NULL DEFAULT FALSE,
    is_approved           BOOLEAN     NOT NULL DEFAULT TRUE,
    vendor_response       TEXT,
    vendor_response_at    TIMESTAMPTZ,
    helpful_count         INTEGER     NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_reviewable ON reviews.reviews (reviewable_type, reviewable_id);
CREATE INDEX idx_reviews_user_id ON reviews.reviews (user_id);
CREATE INDEX idx_reviews_order_id ON reviews.reviews (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_reviews_rating ON reviews.reviews (rating);
CREATE INDEX idx_reviews_is_approved ON reviews.reviews (is_approved);
CREATE INDEX idx_reviews_created_at ON reviews.reviews USING BRIN (created_at);

CREATE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON reviews.reviews
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Review helpfulness votes (one per user per review)
CREATE TABLE reviews.review_helpful (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id   UUID        NOT NULL REFERENCES reviews.reviews(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (review_id, user_id)
);

CREATE INDEX idx_review_helpful_review_id ON reviews.review_helpful (review_id);
CREATE INDEX idx_review_helpful_user_id ON reviews.review_helpful (user_id);

-- =============================================================================
-- LOYALTY SCHEMA
-- =============================================================================

-- Loyalty accounts — one per customer
CREATE TABLE loyalty.accounts (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL UNIQUE,
    account_type    VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (account_type IN ('standard', 'premium', 'vip')),
    points_balance  INTEGER     NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    lifetime_points INTEGER     NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
    tier            VARCHAR(20) NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    tier_expires_at TIMESTAMPTZ,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loyalty_accounts_user_id ON loyalty.accounts (user_id);
CREATE INDEX idx_loyalty_accounts_tier ON loyalty.accounts (tier);
CREATE INDEX idx_loyalty_accounts_account_type ON loyalty.accounts (account_type);
CREATE INDEX idx_loyalty_accounts_created_at ON loyalty.accounts USING BRIN (created_at);

CREATE TRIGGER trg_loyalty_accounts_updated_at
    BEFORE UPDATE ON loyalty.accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Loyalty transactions — points earn/redeem history
CREATE TABLE loyalty.transactions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID        NOT NULL REFERENCES loyalty.accounts(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'adjust', 'expire')),
    points          INTEGER     NOT NULL,
    balance_after   INTEGER     NOT NULL,
    reference_type  VARCHAR(50),
    reference_id    UUID,
    description     VARCHAR(500) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loyalty_txn_account_id ON loyalty.transactions (account_id);
CREATE INDEX idx_loyalty_txn_type ON loyalty.transactions (type);
CREATE INDEX idx_loyalty_txn_reference ON loyalty.transactions (reference_type, reference_id);
CREATE INDEX idx_loyalty_txn_created_at ON loyalty.transactions USING BRIN (created_at);

-- =============================================================================
-- CHAT SCHEMA
-- Conversation metadata lives in PostgreSQL; actual messages in CassandraDB
-- =============================================================================
CREATE TABLE IF NOT EXISTS chat.conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type            VARCHAR(20) NOT NULL DEFAULT 'order',  -- 'order', 'support', 'direct'
    order_id        UUID,                                   -- links to orders.orders
    title           VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active', 'closed', 'archived'
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    message_count   INTEGER NOT NULL DEFAULT 0,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat.conversation_participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat.conversations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    user_type       VARCHAR(20) NOT NULL,  -- 'customer', 'vendor', 'delivery', 'admin', 'system'
    display_name    VARCHAR(100),
    is_muted        BOOLEAN NOT NULL DEFAULT FALSE,
    unread_count    INTEGER NOT NULL DEFAULT 0,
    last_read_at    TIMESTAMPTZ,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at         TIMESTAMPTZ,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversations_order_id ON chat.conversations (order_id);
CREATE INDEX idx_conversations_status ON chat.conversations (status);
CREATE INDEX idx_conversations_last_message ON chat.conversations (last_message_at DESC);
CREATE INDEX idx_participants_user_id ON chat.conversation_participants (user_id);
CREATE INDEX idx_participants_conversation_id ON chat.conversation_participants (conversation_id);

CREATE TRIGGER set_conversations_updated_at
    BEFORE UPDATE ON chat.conversations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- POS SCHEMA
-- =============================================================================

-- pos.terminals
CREATE TABLE pos.terminals (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id         UUID        NOT NULL,
    name             VARCHAR(100) NOT NULL,
    terminal_code    VARCHAR(20) UNIQUE NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    hardware_config  JSONB,
    last_heartbeat_at TIMESTAMPTZ,
    ip_address       VARCHAR(50),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_terminals_store_id ON pos.terminals (store_id);
CREATE INDEX idx_terminals_status ON pos.terminals (status);

CREATE TRIGGER trg_pos_terminals_updated_at
    BEFORE UPDATE ON pos.terminals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- pos.shifts
CREATE TABLE pos.shifts (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_id         UUID        NOT NULL REFERENCES pos.terminals(id) ON DELETE CASCADE,
    cashier_id          UUID        NOT NULL,
    cashier_name        VARCHAR(100),
    status              VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'suspended')),
    opening_cash        DECIMAL(12,2) NOT NULL DEFAULT 0,
    closing_cash        DECIMAL(12,2),
    expected_cash       DECIMAL(12,2),
    cash_difference     DECIMAL(12,2),
    total_transactions  INTEGER     NOT NULL DEFAULT 0,
    total_sales         DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_refunds       DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_voids         DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_totals      JSONB       NOT NULL DEFAULT '{}',
    opened_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at           TIMESTAMPTZ,
    close_notes         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shifts_terminal_id ON pos.shifts (terminal_id);
CREATE INDEX idx_shifts_cashier_id ON pos.shifts (cashier_id);
CREATE INDEX idx_shifts_status ON pos.shifts (status);
CREATE INDEX idx_shifts_opened_at ON pos.shifts (opened_at);

CREATE TRIGGER trg_pos_shifts_updated_at
    BEFORE UPDATE ON pos.shifts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- pos.transactions
CREATE TABLE pos.transactions (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number      VARCHAR(30) UNIQUE NOT NULL,
    shift_id                UUID        NOT NULL REFERENCES pos.shifts(id) ON DELETE CASCADE,
    store_id                UUID        NOT NULL,
    terminal_id             UUID        NOT NULL,
    cashier_id              UUID        NOT NULL,
    customer_id             UUID,
    type                    VARCHAR(20) NOT NULL DEFAULT 'sale' CHECK (type IN ('sale', 'refund', 'exchange')),
    status                  VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'pending')),
    subtotal                DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount              DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount         DECIMAL(12,2) NOT NULL DEFAULT 0,
    total                   DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method          VARCHAR(20) NOT NULL,
    payment_details         JSONB,
    amount_tendered         DECIMAL(12,2) NOT NULL DEFAULT 0,
    change_amount           DECIMAL(12,2) NOT NULL DEFAULT 0,
    original_transaction_id UUID,
    void_reason             TEXT,
    refund_reason           TEXT,
    idempotency_key         VARCHAR(100),
    loyalty_points_earned   INTEGER,
    loyalty_points_redeemed INTEGER,
    metadata                JSONB       NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_shift_id ON pos.transactions (shift_id);
CREATE INDEX idx_transactions_store_id ON pos.transactions (store_id);
CREATE INDEX idx_transactions_type ON pos.transactions (type);
CREATE INDEX idx_transactions_status ON pos.transactions (status);
CREATE INDEX idx_transactions_created_at ON pos.transactions (created_at);
CREATE UNIQUE INDEX idx_transactions_idempotency_key ON pos.transactions (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TRIGGER trg_pos_transactions_updated_at
    BEFORE UPDATE ON pos.transactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- pos.transaction_items
CREATE TABLE pos.transaction_items (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id    UUID        NOT NULL REFERENCES pos.transactions(id) ON DELETE CASCADE,
    product_id        UUID        NOT NULL,
    product_name      VARCHAR(500) NOT NULL,
    barcode           VARCHAR(50),
    sku               VARCHAR(50),
    unit_price        DECIMAL(10,2) NOT NULL,
    quantity          INTEGER     NOT NULL,
    tax_amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
    total             DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_transaction_items_transaction_id ON pos.transaction_items (transaction_id);
CREATE INDEX idx_transaction_items_product_id ON pos.transaction_items (product_id);

-- pos.cash_movements
CREATE TABLE pos.cash_movements (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id          UUID        NOT NULL REFERENCES pos.shifts(id) ON DELETE CASCADE,
    type              VARCHAR(20) NOT NULL CHECK (type IN ('cash_in', 'cash_out', 'float', 'pickup')),
    amount            DECIMAL(12,2) NOT NULL,
    reason            TEXT,
    performed_by      UUID        NOT NULL,
    performed_by_name VARCHAR(100),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_movements_shift_id ON pos.cash_movements (shift_id);
CREATE INDEX idx_cash_movements_type ON pos.cash_movements (type);

-- pos.receipts
CREATE TABLE pos.receipts (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id    UUID        UNIQUE NOT NULL REFERENCES pos.transactions(id) ON DELETE CASCADE,
    receipt_data      JSONB       NOT NULL,
    receipt_text      TEXT        NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_receipts_transaction_id ON pos.receipts (transaction_id);

-- =============================================================================
-- ADVERTISING SCHEMA — Sponsored Listings, Banner Ads, Featured Stores
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS advertising;

-- advertising.ad_campaigns
CREATE TABLE advertising.ad_campaigns (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id             UUID        NOT NULL,
    name                 VARCHAR(255) NOT NULL,
    description          TEXT,
    campaign_type        VARCHAR(30) NOT NULL CHECK (campaign_type IN ('sponsored_listing', 'banner_ad', 'featured_store', 'product_promotion')),
    status               VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'active', 'paused', 'completed', 'rejected', 'cancelled', 'suspended')),
    budget_type          VARCHAR(10) NOT NULL DEFAULT 'total' CHECK (budget_type IN ('daily', 'total')),
    budget_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
    spent_amount         DECIMAL(12,2) NOT NULL DEFAULT 0,
    daily_budget         DECIMAL(12,2),
    daily_spent          DECIMAL(12,2) NOT NULL DEFAULT 0,
    daily_spent_date     DATE,
    bid_type             VARCHAR(10) NOT NULL DEFAULT 'cpc' CHECK (bid_type IN ('cpc', 'cpm', 'flat')),
    bid_amount           DECIMAL(10,2) NOT NULL DEFAULT 0,
    targeting            JSONB       NOT NULL DEFAULT '{}',
    placement            VARCHAR(30) NOT NULL DEFAULT 'search_results' CHECK (placement IN ('search_results', 'home_page', 'category_page', 'store_page', 'product_page')),
    banner_image_url     VARCHAR(500),
    banner_link_url      VARCHAR(500),
    start_date           TIMESTAMPTZ NOT NULL,
    end_date             TIMESTAMPTZ,
    total_impressions    BIGINT      NOT NULL DEFAULT 0,
    total_clicks         BIGINT      NOT NULL DEFAULT 0,
    total_conversions    INT         NOT NULL DEFAULT 0,
    conversion_revenue   DECIMAL(12,2) NOT NULL DEFAULT 0,
    rejection_reason     TEXT,
    suspension_reason    TEXT,
    approved_by          UUID,
    approved_at          TIMESTAMPTZ,
    created_by           UUID        NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_store_id ON advertising.ad_campaigns (store_id);
CREATE INDEX idx_campaigns_status ON advertising.ad_campaigns (status);
CREATE INDEX idx_campaigns_type ON advertising.ad_campaigns (campaign_type);
CREATE INDEX idx_campaigns_placement ON advertising.ad_campaigns (placement);
CREATE INDEX idx_campaigns_dates ON advertising.ad_campaigns (start_date, end_date);
CREATE INDEX idx_campaigns_active ON advertising.ad_campaigns (status, start_date, end_date) WHERE status = 'active';
CREATE INDEX idx_campaigns_created_at ON advertising.ad_campaigns USING BRIN (created_at);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON advertising.ad_campaigns
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- advertising.ad_campaign_products
CREATE TABLE advertising.ad_campaign_products (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id    UUID        NOT NULL REFERENCES advertising.ad_campaigns(id) ON DELETE CASCADE,
    product_id     UUID        NOT NULL,
    bid_amount     DECIMAL(10,2),
    impressions    BIGINT      NOT NULL DEFAULT 0,
    clicks         BIGINT      NOT NULL DEFAULT 0,
    conversions    INT         NOT NULL DEFAULT 0,
    spent          DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, product_id)
);

CREATE INDEX idx_campaign_products_campaign ON advertising.ad_campaign_products (campaign_id);
CREATE INDEX idx_campaign_products_product ON advertising.ad_campaign_products (product_id);

-- advertising.ad_impressions
CREATE TABLE advertising.ad_impressions (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id       UUID        NOT NULL REFERENCES advertising.ad_campaigns(id) ON DELETE CASCADE,
    campaign_product_id UUID,
    product_id        UUID,
    user_id           UUID,
    placement         VARCHAR(30) NOT NULL,
    device_type       VARCHAR(10) DEFAULT 'web',
    ip_address        VARCHAR(45),
    cost              DECIMAL(10,4) NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_impressions_campaign ON advertising.ad_impressions (campaign_id);
CREATE INDEX idx_impressions_product ON advertising.ad_impressions (product_id);
CREATE INDEX idx_impressions_user ON advertising.ad_impressions (user_id);
CREATE INDEX idx_impressions_created_at ON advertising.ad_impressions USING BRIN (created_at);

-- advertising.ad_clicks
CREATE TABLE advertising.ad_clicks (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    impression_id     UUID        REFERENCES advertising.ad_impressions(id) ON DELETE SET NULL,
    campaign_id       UUID        NOT NULL REFERENCES advertising.ad_campaigns(id) ON DELETE CASCADE,
    campaign_product_id UUID,
    product_id        UUID,
    user_id           UUID,
    cost              DECIMAL(10,4) NOT NULL DEFAULT 0,
    resulted_in_order BOOLEAN     DEFAULT false,
    order_id          UUID,
    order_amount      DECIMAL(12,2),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clicks_campaign ON advertising.ad_clicks (campaign_id);
CREATE INDEX idx_clicks_impression ON advertising.ad_clicks (impression_id);
CREATE INDEX idx_clicks_product ON advertising.ad_clicks (product_id);
CREATE INDEX idx_clicks_user ON advertising.ad_clicks (user_id);
CREATE INDEX idx_clicks_order ON advertising.ad_clicks (order_id);
CREATE INDEX idx_clicks_created_at ON advertising.ad_clicks USING BRIN (created_at);

-- =============================================================================
-- Verification: list all created schemas and tables
-- =============================================================================
DO $$
DECLARE
    _schema TEXT;
    _table  TEXT;
BEGIN
    RAISE NOTICE '=== Daltaners PostgreSQL initialization complete ===';
    RAISE NOTICE 'Schemas created: auth, users, vendors, catalog, inventory, orders, delivery, payments, zones, promotions, notifications, reviews, loyalty, chat, pos, advertising';
    RAISE NOTICE 'Extensions: uuid-ossp, postgis, pg_trgm';
    RAISE NOTICE 'Trigger function: set_updated_at()';
END;
$$;
