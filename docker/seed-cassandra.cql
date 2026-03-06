-- =============================================================================
-- Daltaners Platform — CassandraDB Seed Data
-- Keyspace: daltaners_tracking
-- =============================================================================
-- NOTE: Cassandra uses NOW() for TIMEUUID generation.
-- UUIDs here match the PostgreSQL seed data for cross-reference.
-- =============================================================================

-- =============================================================================
-- GPS Tracking — Delivery route for Order 1 (delivered) by Rider Mark
-- Simulates a ride from Commonwealth Ave to Katipunan Ave, QC
-- =============================================================================
INSERT INTO daltaners_tracking.gps_locations (delivery_id, personnel_id, recorded_at, latitude, longitude, speed, heading, accuracy, battery_level)
VALUES (60000001-0000-0000-0000-000000000001, 40000001-0000-0000-0000-000000000001, '2026-02-28 05:00:00+0800', 14.6573, 121.0564, 0.0, 0, 5.0, 95);
INSERT INTO daltaners_tracking.gps_locations (delivery_id, personnel_id, recorded_at, latitude, longitude, speed, heading, accuracy, battery_level)
VALUES (60000001-0000-0000-0000-000000000001, 40000001-0000-0000-0000-000000000001, '2026-02-28 05:02:00+0800', 14.6550, 121.0590, 25.5, 120, 4.0, 94);
INSERT INTO daltaners_tracking.gps_locations (delivery_id, personnel_id, recorded_at, latitude, longitude, speed, heading, accuracy, battery_level)
VALUES (60000001-0000-0000-0000-000000000001, 40000001-0000-0000-0000-000000000001, '2026-02-28 05:05:00+0800', 14.6510, 121.0630, 30.2, 115, 3.5, 93);
INSERT INTO daltaners_tracking.gps_locations (delivery_id, personnel_id, recorded_at, latitude, longitude, speed, heading, accuracy, battery_level)
VALUES (60000001-0000-0000-0000-000000000001, 40000001-0000-0000-0000-000000000001, '2026-02-28 05:08:00+0800', 14.6480, 121.0680, 22.0, 110, 4.5, 92);
INSERT INTO daltaners_tracking.gps_locations (delivery_id, personnel_id, recorded_at, latitude, longitude, speed, heading, accuracy, battery_level)
VALUES (60000001-0000-0000-0000-000000000001, 40000001-0000-0000-0000-000000000001, '2026-02-28 05:11:00+0800', 14.6440, 121.0720, 18.0, 105, 5.0, 91);
INSERT INTO daltaners_tracking.gps_locations (delivery_id, personnel_id, recorded_at, latitude, longitude, speed, heading, accuracy, battery_level)
VALUES (60000001-0000-0000-0000-000000000001, 40000001-0000-0000-0000-000000000001, '2026-02-28 05:14:00+0800', 14.6410, 121.0765, 5.0, 100, 3.0, 90);
INSERT INTO daltaners_tracking.gps_locations (delivery_id, personnel_id, recorded_at, latitude, longitude, speed, heading, accuracy, battery_level)
VALUES (60000001-0000-0000-0000-000000000001, 40000001-0000-0000-0000-000000000001, '2026-02-28 05:15:00+0800', 14.6407, 121.0770, 0.0, 0, 3.0, 90);

-- GPS Tracking — Delivery route for Order 2 (in_transit) by Rider James
INSERT INTO daltaners_tracking.gps_locations (delivery_id, personnel_id, recorded_at, latitude, longitude, speed, heading, accuracy, battery_level)
VALUES (60000001-0000-0000-0000-000000000002, 40000001-0000-0000-0000-000000000002, '2026-02-28 08:40:00+0800', 14.5547, 121.0198, 0.0, 0, 4.0, 88);
INSERT INTO daltaners_tracking.gps_locations (delivery_id, personnel_id, recorded_at, latitude, longitude, speed, heading, accuracy, battery_level)
VALUES (60000001-0000-0000-0000-000000000002, 40000001-0000-0000-0000-000000000002, '2026-02-28 08:42:00+0800', 14.5550, 121.0195, 15.0, 10, 3.5, 87);
INSERT INTO daltaners_tracking.gps_locations (delivery_id, personnel_id, recorded_at, latitude, longitude, speed, heading, accuracy, battery_level)
VALUES (60000001-0000-0000-0000-000000000002, 40000001-0000-0000-0000-000000000002, '2026-02-28 08:45:00+0800', 14.5555, 121.0198, 12.0, 15, 4.0, 86);

-- =============================================================================
-- Personnel Current Locations (zone-based lookup)
-- =============================================================================
INSERT INTO daltaners_tracking.personnel_current_location (zone_id, personnel_id, latitude, longitude, is_online, current_orders, vehicle_type, updated_at)
VALUES (c0000001-0000-0000-0000-000000000001, 40000001-0000-0000-0000-000000000001, 14.6350, 121.0750, true, 0, 'motorcycle', '2026-02-28 08:45:00+0800');
INSERT INTO daltaners_tracking.personnel_current_location (zone_id, personnel_id, latitude, longitude, is_online, current_orders, vehicle_type, updated_at)
VALUES (c0000001-0000-0000-0000-000000000003, 40000001-0000-0000-0000-000000000002, 14.5555, 121.0198, true, 1, 'motorcycle', '2026-02-28 08:45:00+0800');
INSERT INTO daltaners_tracking.personnel_current_location (zone_id, personnel_id, latitude, longitude, is_online, current_orders, vehicle_type, updated_at)
VALUES (c0000001-0000-0000-0000-000000000005, 40000001-0000-0000-0000-000000000003, 14.5870, 121.0615, false, 0, 'bicycle', '2026-02-28 07:00:00+0800');

-- =============================================================================
-- Order Events — Event sourcing for Order 1 (full lifecycle)
-- =============================================================================
INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000001, now(), 'order.placed',
  '{"order_number":"DLT-20260228-001","total":943.76,"payment_method":"gcash","items_count":6}',
  a0000001-0000-0000-0000-000000000002, 'customer', '2026-02-28 04:30:00+0800');

INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000001, now(), 'payment.authorized',
  '{"method":"gcash","amount":943.76,"transaction_id":"GCASH-TXN-20260228-001"}',
  a0000001-0000-0000-0000-000000000002, 'system', '2026-02-28 04:30:15+0800');

INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000001, now(), 'order.confirmed',
  '{"confirmed_by":"system","estimated_preparation":"20 minutes"}',
  a0000001-0000-0000-0000-000000000005, 'vendor', '2026-02-28 04:31:00+0800');

INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000001, now(), 'order.preparing',
  '{"started_by":"Lorna Cruz"}',
  a0000001-0000-0000-0000-000000000009, 'vendor', '2026-02-28 04:35:00+0800');

INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000001, now(), 'item.substituted',
  '{"original":"Pandesal (10 pcs)","substitute":"Tasty Bread Loaf","reason":"out_of_stock"}',
  a0000001-0000-0000-0000-000000000009, 'vendor', '2026-02-28 04:40:00+0800');

INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000001, now(), 'order.ready',
  '{"packed_by":"Lorna Cruz"}',
  a0000001-0000-0000-0000-000000000009, 'vendor', '2026-02-28 04:50:00+0800');

INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000001, now(), 'delivery.assigned',
  '{"rider":"Mark Bautista","vehicle":"motorcycle","plate":"ABC-1234"}',
  a0000001-0000-0000-0000-000000000011, 'system', '2026-02-28 04:52:00+0800');

INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000001, now(), 'delivery.picked_up',
  '{"rider":"Mark Bautista"}',
  40000001-0000-0000-0000-000000000001, 'delivery', '2026-02-28 05:00:00+0800');

INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000001, now(), 'order.delivered',
  '{"received_by":"Maria Santos","proof":"photo","tip":20.00}',
  40000001-0000-0000-0000-000000000001, 'delivery', '2026-02-28 05:15:00+0800');

-- Order Events for Order 2 (in transit — partial lifecycle)
INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000002, now(), 'order.placed',
  '{"order_number":"DLT-20260228-002","total":990.36,"payment_method":"maya","items_count":3}',
  a0000001-0000-0000-0000-000000000003, 'customer', '2026-02-28 08:10:00+0800');

INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000002, now(), 'order.confirmed',
  '{"estimated_preparation":"35 minutes"}',
  a0000001-0000-0000-0000-000000000006, 'vendor', '2026-02-28 08:11:00+0800');

INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000002, now(), 'item.unavailable',
  '{"item":"Halo-Halo Special","reason":"out_of_ingredient"}',
  a0000001-0000-0000-0000-000000000010, 'vendor', '2026-02-28 08:20:00+0800');

INSERT INTO daltaners_tracking.order_events (order_id, event_id, event_type, event_data, actor_id, actor_type, created_at)
VALUES (50000001-0000-0000-0000-000000000002, now(), 'delivery.picked_up',
  '{"rider":"James Garcia"}',
  40000001-0000-0000-0000-000000000002, 'delivery', '2026-02-28 08:40:00+0800');

-- =============================================================================
-- Notification Log — Sample notifications
-- =============================================================================
-- Maria's notifications
INSERT INTO daltaners_tracking.notification_log (user_id, sent_at, notification_id, channel, title, body, data, status)
VALUES (a0000001-0000-0000-0000-000000000002, '2026-02-28 04:31:00+0800', a0000001-0000-0000-0000-000000000002, 'push',
  'Order Confirmed!', 'Your order DLT-20260228-001 has been confirmed. Estimated delivery: 30 minutes.',
  '{"order_id":"50000001-0000-0000-0000-000000000001","type":"order_confirmed"}', 'delivered');

INSERT INTO daltaners_tracking.notification_log (user_id, sent_at, notification_id, channel, title, body, data, status)
VALUES (a0000001-0000-0000-0000-000000000002, '2026-02-28 05:00:00+0800', a0000001-0000-0000-0000-000000000003, 'push',
  'Rider on the way!', 'Mark is heading to you with your groceries. Track your order in real-time!',
  '{"order_id":"50000001-0000-0000-0000-000000000001","type":"rider_en_route"}', 'read');

INSERT INTO daltaners_tracking.notification_log (user_id, sent_at, notification_id, channel, title, body, data, status)
VALUES (a0000001-0000-0000-0000-000000000002, '2026-02-28 05:15:00+0800', a0000001-0000-0000-0000-000000000004, 'push',
  'Order Delivered!', 'Your groceries have been delivered. Enjoy! Rate your experience.',
  '{"order_id":"50000001-0000-0000-0000-000000000001","type":"order_delivered"}', 'read');

-- Juan's notifications
INSERT INTO daltaners_tracking.notification_log (user_id, sent_at, notification_id, channel, title, body, data, status)
VALUES (a0000001-0000-0000-0000-000000000003, '2026-02-28 08:11:00+0800', a0000001-0000-0000-0000-000000000005, 'push',
  'Order Confirmed!', 'Your order DLT-20260228-002 from Kusina de Manila is being prepared.',
  '{"order_id":"50000001-0000-0000-0000-000000000002","type":"order_confirmed"}', 'delivered');

INSERT INTO daltaners_tracking.notification_log (user_id, sent_at, notification_id, channel, title, body, data, status)
VALUES (a0000001-0000-0000-0000-000000000003, '2026-02-28 08:40:00+0800', a0000001-0000-0000-0000-000000000006, 'push',
  'Food picked up!', 'James has picked up your food from Kusina de Manila. Arriving in ~25 minutes.',
  '{"order_id":"50000001-0000-0000-0000-000000000002","type":"rider_picked_up"}', 'sent');

-- Vendor notification
INSERT INTO daltaners_tracking.notification_log (user_id, sent_at, notification_id, channel, title, body, data, status)
VALUES (a0000001-0000-0000-0000-000000000005, '2026-02-28 04:30:00+0800', a0000001-0000-0000-0000-000000000007, 'push',
  'New Order!', 'New grocery order DLT-20260228-001 received. 6 items, total P943.76. Please prepare.',
  '{"order_id":"50000001-0000-0000-0000-000000000001","type":"new_order"}', 'read');

-- =============================================================================
-- Chat Messages — Customer-Rider conversation for Order 2
-- =============================================================================
INSERT INTO daltaners_tracking.chat_messages (conversation_id, message_id, sender_id, sender_type, message_type, content, created_at)
VALUES (50000001-0000-0000-0000-000000000002, now(), a0000001-0000-0000-0000-000000000003, 'customer', 'text',
  'Hi kuya, anong ETA mo? Medyo nagmamadali ako.', '2026-02-28 08:42:00+0800');

INSERT INTO daltaners_tracking.chat_messages (conversation_id, message_id, sender_id, sender_type, message_type, content, created_at)
VALUES (50000001-0000-0000-0000-000000000002, now(), 40000001-0000-0000-0000-000000000002, 'delivery', 'text',
  'Hello po! Mga 20-25 minutes po, malapit na. Medyo traffic sa Jupiter.', '2026-02-28 08:43:00+0800');

INSERT INTO daltaners_tracking.chat_messages (conversation_id, message_id, sender_id, sender_type, message_type, content, created_at)
VALUES (50000001-0000-0000-0000-000000000002, now(), a0000001-0000-0000-0000-000000000003, 'customer', 'text',
  'Sige po, text mo lang ako pag nasa gate ka na. Salamat!', '2026-02-28 08:44:00+0800');

INSERT INTO daltaners_tracking.chat_messages (conversation_id, message_id, sender_id, sender_type, message_type, content, created_at)
VALUES (50000001-0000-0000-0000-000000000002, now(), 40000001-0000-0000-0000-000000000002, 'delivery', 'text',
  'Copy po, sir! Opo, itext ko po kayo.', '2026-02-28 08:44:30+0800');

-- =============================================================================
-- Analytics Events — Sample user behavior
-- =============================================================================
INSERT INTO daltaners_tracking.analytics_events (event_date, event_hour, event_id, user_id, event_type, event_category, properties, device_info, session_id)
VALUES ('2026-02-28', 4, now(), a0000001-0000-0000-0000-000000000002, 'app_open', 'engagement',
  '{"source":"push_notification"}',
  '{"platform":"android","version":"1.2.0","model":"Samsung Galaxy S24"}',
  b0000001-0000-0000-0000-000000000001);

INSERT INTO daltaners_tracking.analytics_events (event_date, event_hour, event_id, user_id, event_type, event_category, properties, device_info, session_id)
VALUES ('2026-02-28', 4, now(), a0000001-0000-0000-0000-000000000002, 'search', 'discovery',
  '{"query":"bigas","results_count":3}',
  '{"platform":"android","version":"1.2.0","model":"Samsung Galaxy S24"}',
  b0000001-0000-0000-0000-000000000001);

INSERT INTO daltaners_tracking.analytics_events (event_date, event_hour, event_id, user_id, event_type, event_category, properties, device_info, session_id)
VALUES ('2026-02-28', 4, now(), a0000001-0000-0000-0000-000000000002, 'add_to_cart', 'commerce',
  '{"product_id":"10000001-0000-0000-0000-000000000001","product_name":"Sinandomeng Premium Rice 5kg","price":265.00}',
  '{"platform":"android","version":"1.2.0","model":"Samsung Galaxy S24"}',
  b0000001-0000-0000-0000-000000000001);

INSERT INTO daltaners_tracking.analytics_events (event_date, event_hour, event_id, user_id, event_type, event_category, properties, device_info, session_id)
VALUES ('2026-02-28', 4, now(), a0000001-0000-0000-0000-000000000002, 'checkout_complete', 'commerce',
  '{"order_id":"50000001-0000-0000-0000-000000000001","total":943.76,"items_count":6,"payment_method":"gcash"}',
  '{"platform":"android","version":"1.2.0","model":"Samsung Galaxy S24"}',
  b0000001-0000-0000-0000-000000000001);

INSERT INTO daltaners_tracking.analytics_events (event_date, event_hour, event_id, user_id, event_type, event_category, properties, device_info, session_id)
VALUES ('2026-02-28', 8, now(), a0000001-0000-0000-0000-000000000003, 'app_open', 'engagement',
  '{"source":"organic"}',
  '{"platform":"ios","version":"1.2.0","model":"iPhone 15 Pro"}',
  b0000001-0000-0000-0000-000000000002);

INSERT INTO daltaners_tracking.analytics_events (event_date, event_hour, event_id, user_id, event_type, event_category, properties, device_info, session_id)
VALUES ('2026-02-28', 8, now(), a0000001-0000-0000-0000-000000000003, 'store_view', 'discovery',
  '{"store_id":"d0000001-0000-0000-0000-000000000002","store_name":"Kusina de Manila"}',
  '{"platform":"ios","version":"1.2.0","model":"iPhone 15 Pro"}',
  b0000001-0000-0000-0000-000000000002);

-- =============================================================================
-- Product Views — Browse history
-- =============================================================================
INSERT INTO daltaners_tracking.product_views (user_id, viewed_at, product_id, store_id, category_id, view_duration_seconds, source)
VALUES (a0000001-0000-0000-0000-000000000002, '2026-02-28 04:15:00+0800',
  10000001-0000-0000-0000-000000000001, d0000001-0000-0000-0000-000000000001, f0000001-0000-0000-0000-000000000101, 12, 'search');
INSERT INTO daltaners_tracking.product_views (user_id, viewed_at, product_id, store_id, category_id, view_duration_seconds, source)
VALUES (a0000001-0000-0000-0000-000000000002, '2026-02-28 04:16:00+0800',
  10000001-0000-0000-0000-000000000004, d0000001-0000-0000-0000-000000000001, f0000001-0000-0000-0000-000000000104, 8, 'browse');
INSERT INTO daltaners_tracking.product_views (user_id, viewed_at, product_id, store_id, category_id, view_duration_seconds, source)
VALUES (a0000001-0000-0000-0000-000000000002, '2026-02-28 04:17:00+0800',
  10000001-0000-0000-0000-000000000007, d0000001-0000-0000-0000-000000000001, f0000001-0000-0000-0000-000000000003, 15, 'recommendation');
INSERT INTO daltaners_tracking.product_views (user_id, viewed_at, product_id, store_id, category_id, view_duration_seconds, source)
VALUES (a0000001-0000-0000-0000-000000000002, '2026-02-28 04:18:00+0800',
  10000001-0000-0000-0000-000000000018, d0000001-0000-0000-0000-000000000001, f0000001-0000-0000-0000-000000000008, 20, 'browse');

INSERT INTO daltaners_tracking.product_views (user_id, viewed_at, product_id, store_id, category_id, view_duration_seconds, source)
VALUES (a0000001-0000-0000-0000-000000000003, '2026-02-28 08:05:00+0800',
  10000001-0000-0000-0000-000000000101, d0000001-0000-0000-0000-000000000002, f0000001-0000-0000-0000-000000000109, 25, 'browse');
INSERT INTO daltaners_tracking.product_views (user_id, viewed_at, product_id, store_id, category_id, view_duration_seconds, source)
VALUES (a0000001-0000-0000-0000-000000000003, '2026-02-28 08:06:00+0800',
  10000001-0000-0000-0000-000000000102, d0000001-0000-0000-0000-000000000002, f0000001-0000-0000-0000-000000000110, 18, 'browse');
INSERT INTO daltaners_tracking.product_views (user_id, viewed_at, product_id, store_id, category_id, view_duration_seconds, source)
VALUES (a0000001-0000-0000-0000-000000000003, '2026-02-28 08:07:00+0800',
  10000001-0000-0000-0000-000000000106, d0000001-0000-0000-0000-000000000002, f0000001-0000-0000-0000-000000000015, 10, 'browse');

-- =============================================================================
-- Search Log — Search analytics
-- =============================================================================
INSERT INTO daltaners_tracking.search_log (search_date, search_id, user_id, query, results_count, clicked_product_id, zone_id)
VALUES ('2026-02-28', now(), a0000001-0000-0000-0000-000000000002, 'bigas', 3, 10000001-0000-0000-0000-000000000001, c0000001-0000-0000-0000-000000000001);
INSERT INTO daltaners_tracking.search_log (search_date, search_id, user_id, query, results_count, clicked_product_id, zone_id)
VALUES ('2026-02-28', now(), a0000001-0000-0000-0000-000000000002, 'sinandomeng', 1, 10000001-0000-0000-0000-000000000001, c0000001-0000-0000-0000-000000000001);
INSERT INTO daltaners_tracking.search_log (search_date, search_id, user_id, query, results_count, clicked_product_id, zone_id)
VALUES ('2026-02-28', now(), a0000001-0000-0000-0000-000000000002, 'lucky me', 2, 10000001-0000-0000-0000-000000000007, c0000001-0000-0000-0000-000000000001);
INSERT INTO daltaners_tracking.search_log (search_date, search_id, user_id, query, results_count, clicked_product_id, zone_id)
VALUES ('2026-02-28', now(), a0000001-0000-0000-0000-000000000003, 'adobo', 1, 10000001-0000-0000-0000-000000000101, c0000001-0000-0000-0000-000000000003);
INSERT INTO daltaners_tracking.search_log (search_date, search_id, user_id, query, results_count, clicked_product_id, zone_id)
VALUES ('2026-02-28', now(), a0000001-0000-0000-0000-000000000003, 'sinigang', 2, 10000001-0000-0000-0000-000000000102, c0000001-0000-0000-0000-000000000003);
INSERT INTO daltaners_tracking.search_log (search_date, search_id, user_id, query, results_count, clicked_product_id, zone_id)
VALUES ('2026-02-28', now(), a0000001-0000-0000-0000-000000000004, 'biogesic', 1, 10000001-0000-0000-0000-000000000201, c0000001-0000-0000-0000-000000000003);
INSERT INTO daltaners_tracking.search_log (search_date, search_id, user_id, query, results_count, clicked_product_id, zone_id)
VALUES ('2026-02-28', now(), a0000001-0000-0000-0000-000000000004, 'vitamin c', 1, 10000001-0000-0000-0000-000000000204, c0000001-0000-0000-0000-000000000003);
INSERT INTO daltaners_tracking.search_log (search_date, search_id, user_id, query, results_count, clicked_product_id, zone_id)
VALUES ('2026-02-28', now(), a0000001-0000-0000-0000-000000000004, 'phone case', 1, 10000001-0000-0000-0000-000000000301, c0000001-0000-0000-0000-000000000005);
