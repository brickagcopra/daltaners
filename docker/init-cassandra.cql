-- =============================================================================
-- Daltaners Platform — CassandraDB Initialization Script
-- Keyspace: daltaners_tracking (SimpleStrategy RF=1 for development)
-- =============================================================================

CREATE KEYSPACE IF NOT EXISTS daltaners_tracking
  WITH replication = {
    'class': 'SimpleStrategy',
    'replication_factor': 1
  }
  AND durable_writes = true;

-- =============================================================================
-- GPS Tracking — High-frequency writes from delivery personnel
-- Partition key: delivery_id — one partition per active delivery
-- =============================================================================
CREATE TABLE IF NOT EXISTS daltaners_tracking.gps_locations (
    delivery_id    UUID,
    personnel_id   UUID,
    recorded_at    TIMESTAMP,
    latitude       DECIMAL,
    longitude      DECIMAL,
    speed          DECIMAL,
    heading        DECIMAL,
    accuracy       DECIMAL,
    battery_level  SMALLINT,
    PRIMARY KEY ((delivery_id), recorded_at)
) WITH CLUSTERING ORDER BY (recorded_at DESC)
  AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_size': 1,
    'compaction_window_unit': 'HOURS'
  }
  AND default_time_to_live = 2592000;  -- 30 days TTL

-- =============================================================================
-- Delivery Personnel Current Location — fast lookup by zone
-- Partition key: zone_id — all riders in the same zone in one partition
-- =============================================================================
CREATE TABLE IF NOT EXISTS daltaners_tracking.personnel_current_location (
    zone_id         UUID,
    personnel_id    UUID,
    latitude        DECIMAL,
    longitude       DECIMAL,
    is_online       BOOLEAN,
    current_orders  SMALLINT,
    vehicle_type    TEXT,
    updated_at      TIMESTAMP,
    PRIMARY KEY ((zone_id), personnel_id)
);

-- =============================================================================
-- Order Events — Event sourcing for order lifecycle
-- Partition key: order_id — all events for one order in a single partition
-- =============================================================================
CREATE TABLE IF NOT EXISTS daltaners_tracking.order_events (
    order_id     UUID,
    event_id     TIMEUUID,
    event_type   TEXT,
    event_data   TEXT,      -- JSON payload
    actor_id     UUID,
    actor_type   TEXT,      -- 'customer', 'vendor', 'system', 'delivery'
    created_at   TIMESTAMP,
    PRIMARY KEY ((order_id), event_id)
) WITH CLUSTERING ORDER BY (event_id ASC)
  AND default_time_to_live = 31536000;  -- 1 year TTL

-- =============================================================================
-- Notification Log — High-volume notification history per user
-- Partition key: user_id — all notifications for one user in a single partition
-- =============================================================================
CREATE TABLE IF NOT EXISTS daltaners_tracking.notification_log (
    user_id          UUID,
    sent_at          TIMESTAMP,
    notification_id  UUID,
    channel          TEXT,    -- 'push', 'sms', 'email', 'whatsapp'
    title            TEXT,
    body             TEXT,
    data             TEXT,    -- JSON payload
    status           TEXT,    -- 'sent', 'delivered', 'read', 'failed'
    PRIMARY KEY ((user_id), sent_at, notification_id)
) WITH CLUSTERING ORDER BY (sent_at DESC)
  AND default_time_to_live = 7776000;  -- 90 days TTL

-- =============================================================================
-- Chat Messages — High-volume messaging
-- Partition key: conversation_id — all messages in one conversation together
-- =============================================================================
CREATE TABLE IF NOT EXISTS daltaners_tracking.chat_messages (
    conversation_id  UUID,
    message_id       TIMEUUID,
    sender_id        UUID,
    sender_type      TEXT,    -- 'customer', 'vendor', 'delivery', 'system'
    message_type     TEXT,    -- 'text', 'image', 'location', 'system'
    content          TEXT,
    media_url        TEXT,
    read_at          TIMESTAMP,
    created_at       TIMESTAMP,
    PRIMARY KEY ((conversation_id), message_id)
) WITH CLUSTERING ORDER BY (message_id ASC)
  AND default_time_to_live = 31536000;  -- 1 year TTL

-- =============================================================================
-- Analytics Events — High-volume user behavior tracking
-- Partition key: (event_date, event_hour) — time-bucketed for even distribution
-- =============================================================================
CREATE TABLE IF NOT EXISTS daltaners_tracking.analytics_events (
    event_date      DATE,
    event_hour      SMALLINT,
    event_id        TIMEUUID,
    user_id         UUID,
    event_type      TEXT,
    event_category  TEXT,
    properties      TEXT,    -- JSON payload
    device_info     TEXT,    -- JSON payload
    session_id      UUID,
    PRIMARY KEY ((event_date, event_hour), event_id)
) WITH CLUSTERING ORDER BY (event_id DESC)
  AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_size': 1,
    'compaction_window_unit': 'DAYS'
  }
  AND default_time_to_live = 7776000;  -- 90 days TTL

-- =============================================================================
-- Product Views — Recommendations input / user browse history
-- Partition key: user_id — all views for one user in a single partition
-- =============================================================================
CREATE TABLE IF NOT EXISTS daltaners_tracking.product_views (
    user_id                UUID,
    viewed_at              TIMESTAMP,
    product_id             UUID,
    store_id               UUID,
    category_id            UUID,
    view_duration_seconds  INT,
    source                 TEXT,    -- 'search', 'browse', 'recommendation', 'ad'
    PRIMARY KEY ((user_id), viewed_at)
) WITH CLUSTERING ORDER BY (viewed_at DESC)
  AND default_time_to_live = 5184000;  -- 60 days TTL

-- =============================================================================
-- Search Log — Search analytics and trending queries
-- Partition key: search_date — one partition per day
-- =============================================================================
CREATE TABLE IF NOT EXISTS daltaners_tracking.search_log (
    search_date         DATE,
    search_id           TIMEUUID,
    user_id             UUID,
    query               TEXT,
    results_count       INT,
    clicked_product_id  UUID,
    zone_id             UUID,
    PRIMARY KEY ((search_date), search_id)
) WITH CLUSTERING ORDER BY (search_id DESC)
  AND default_time_to_live = 7776000;  -- 90 days TTL
