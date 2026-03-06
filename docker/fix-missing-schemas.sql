-- Fix missing schemas: promotions, reviews, chat, pos
-- Loyalty schema was already created manually.

-- Create schemas if missing
CREATE SCHEMA IF NOT EXISTS promotions;
CREATE SCHEMA IF NOT EXISTS reviews;
CREATE SCHEMA IF NOT EXISTS chat;
CREATE SCHEMA IF NOT EXISTS pos;

-- =============================================================================
-- PROMOTIONS SCHEMA
-- =============================================================================
CREATE TABLE IF NOT EXISTS promotions.coupons (
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
    created_by            UUID,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON promotions.coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active_dates ON promotions.coupons (is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_coupons_applicable_stores_gin ON promotions.coupons USING GIN (applicable_stores);
CREATE INDEX IF NOT EXISTS idx_coupons_applicable_categories_gin ON promotions.coupons USING GIN (applicable_categories);

DROP TRIGGER IF EXISTS trg_promotions_coupons_updated_at ON promotions.coupons;
CREATE TRIGGER trg_promotions_coupons_updated_at
    BEFORE UPDATE ON promotions.coupons
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS promotions.coupon_usages (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id       UUID          NOT NULL REFERENCES promotions.coupons(id) ON DELETE CASCADE,
    user_id         UUID          NOT NULL,
    order_id        UUID          NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    redeemed_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    released_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON promotions.coupon_usages (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON promotions.coupon_usages (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_order_id ON promotions.coupon_usages (order_id);

-- =============================================================================
-- REVIEWS SCHEMA
-- =============================================================================
CREATE TABLE IF NOT EXISTS reviews.reviews (
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

CREATE INDEX IF NOT EXISTS idx_reviews_reviewable ON reviews.reviews (reviewable_type, reviewable_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews.reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews.reviews (rating);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews.reviews (is_approved);

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON reviews.reviews;
CREATE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON reviews.reviews
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS reviews.review_helpful (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id   UUID        NOT NULL REFERENCES reviews.reviews(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_helpful_review_id ON reviews.review_helpful (review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_user_id ON reviews.review_helpful (user_id);

-- =============================================================================
-- CHAT SCHEMA
-- =============================================================================
CREATE TABLE IF NOT EXISTS chat.conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type            VARCHAR(20) NOT NULL DEFAULT 'order',
    order_id        UUID,
    title           VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
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
    user_type       VARCHAR(20) NOT NULL,
    display_name    VARCHAR(100),
    is_muted        BOOLEAN NOT NULL DEFAULT FALSE,
    unread_count    INTEGER NOT NULL DEFAULT 0,
    last_read_at    TIMESTAMPTZ,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at         TIMESTAMPTZ,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_order_id ON chat.conversations (order_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON chat.conversations (status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON chat.conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON chat.conversation_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON chat.conversation_participants (conversation_id);

DROP TRIGGER IF EXISTS set_conversations_updated_at ON chat.conversations;
CREATE TRIGGER set_conversations_updated_at
    BEFORE UPDATE ON chat.conversations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- POS SCHEMA
-- =============================================================================
CREATE TABLE IF NOT EXISTS pos.terminals (
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

CREATE INDEX IF NOT EXISTS idx_terminals_store_id ON pos.terminals (store_id);
CREATE INDEX IF NOT EXISTS idx_terminals_status ON pos.terminals (status);

DROP TRIGGER IF EXISTS trg_pos_terminals_updated_at ON pos.terminals;
CREATE TRIGGER trg_pos_terminals_updated_at
    BEFORE UPDATE ON pos.terminals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS pos.shifts (
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

CREATE INDEX IF NOT EXISTS idx_shifts_terminal_id ON pos.shifts (terminal_id);
CREATE INDEX IF NOT EXISTS idx_shifts_cashier_id ON pos.shifts (cashier_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON pos.shifts (status);
CREATE INDEX IF NOT EXISTS idx_shifts_opened_at ON pos.shifts (opened_at);

DROP TRIGGER IF EXISTS trg_pos_shifts_updated_at ON pos.shifts;
CREATE TRIGGER trg_pos_shifts_updated_at
    BEFORE UPDATE ON pos.shifts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS pos.transactions (
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

CREATE INDEX IF NOT EXISTS idx_pos_transactions_shift_id ON pos.transactions (shift_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_store_id ON pos.transactions (store_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_type ON pos.transactions (type);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_status ON pos.transactions (status);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_created_at ON pos.transactions (created_at);

DROP TRIGGER IF EXISTS trg_pos_transactions_updated_at ON pos.transactions;
CREATE TRIGGER trg_pos_transactions_updated_at
    BEFORE UPDATE ON pos.transactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS pos.transaction_items (
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

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON pos.transaction_items (transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product_id ON pos.transaction_items (product_id);

CREATE TABLE IF NOT EXISTS pos.cash_movements (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id          UUID        NOT NULL REFERENCES pos.shifts(id) ON DELETE CASCADE,
    type              VARCHAR(20) NOT NULL CHECK (type IN ('cash_in', 'cash_out', 'float', 'pickup')),
    amount            DECIMAL(12,2) NOT NULL,
    reason            TEXT,
    performed_by      UUID        NOT NULL,
    performed_by_name VARCHAR(100),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_shift_id ON pos.cash_movements (shift_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON pos.cash_movements (type);

CREATE TABLE IF NOT EXISTS pos.receipts (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id    UUID        UNIQUE NOT NULL REFERENCES pos.transactions(id) ON DELETE CASCADE,
    receipt_data      JSONB       NOT NULL,
    receipt_text      TEXT        NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON pos.receipts (transaction_id);

-- Done
DO $$
BEGIN
    RAISE NOTICE 'Missing schemas created: promotions, reviews, chat, pos';
END;
$$;
