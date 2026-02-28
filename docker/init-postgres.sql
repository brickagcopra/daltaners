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
CREATE SCHEMA IF NOT EXISTS notifications;

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
    level       SMALLINT     NOT NULL DEFAULT 0
);

CREATE INDEX idx_categories_parent ON catalog.categories (parent_id);
CREATE INDEX idx_categories_slug   ON catalog.categories (slug);

-- catalog.products
CREATE TABLE catalog.products (
    id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id               UUID          NOT NULL REFERENCES vendors.stores(id),
    category_id            UUID          REFERENCES catalog.categories(id),
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
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

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
-- NOTIFICATIONS SCHEMA
-- (Data primarily stored in CassandraDB — schema created for future use)
-- =============================================================================
-- The notifications schema is intentionally left empty.
-- Notification data (logs, history, preferences) is stored in CassandraDB
-- for high-write throughput. This PostgreSQL schema is reserved for any
-- future relational notification configuration (templates, channels, etc.).

-- =============================================================================
-- Verification: list all created schemas and tables
-- =============================================================================
DO $$
DECLARE
    _schema TEXT;
    _table  TEXT;
BEGIN
    RAISE NOTICE '=== Daltaners PostgreSQL initialization complete ===';
    RAISE NOTICE 'Schemas created: auth, users, vendors, catalog, inventory, orders, delivery, payments, zones, notifications';
    RAISE NOTICE 'Extensions: uuid-ossp, postgis, pg_trgm';
    RAISE NOTICE 'Trigger function: set_updated_at()';
END;
$$;
