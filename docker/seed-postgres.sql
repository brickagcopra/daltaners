-- =============================================================================
-- Daltaners Platform — PostgreSQL Seed Data
-- Comprehensive test data for all schemas
-- =============================================================================
-- Password for ALL test users: "Test@12345" (bcrypt hash below)
-- bcrypt cost factor 12: $2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.
-- =============================================================================

BEGIN;

-- =============================================================================
-- FIXED UUIDs (for referential integrity across seed data)
-- =============================================================================

-- USERS
-- Admin
-- u01: admin@daltaners.ph
-- Customers
-- u02: maria.santos@gmail.com
-- u03: juan.delacruz@gmail.com
-- u04: anna.reyes@gmail.com
-- Vendor Owners
-- u05: vendor_grocery@daltaners.ph     (Tindahan ni Aling Nena)
-- u06: vendor_restaurant@daltaners.ph  (Kusina de Manila)
-- u07: vendor_pharmacy@daltaners.ph    (Botica ng Bayan)
-- u08: vendor_electronics@daltaners.ph (TechMart PH)
-- Vendor Staff
-- u09: staff_grocery@daltaners.ph
-- u10: staff_restaurant@daltaners.ph
-- Delivery Personnel
-- u11: rider_mark@daltaners.ph
-- u12: rider_james@daltaners.ph
-- u13: rider_carlo@daltaners.ph

-- =============================================================================
-- AUTH SCHEMA — Users
-- =============================================================================
INSERT INTO auth.users (id, email, phone, password_hash, role, is_verified, is_active, last_login_at) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'admin@daltaners.ph',            '+639170000001', '$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'admin',        TRUE, TRUE, NOW() - INTERVAL '1 hour'),
  ('a0000001-0000-0000-0000-000000000002', 'maria.santos@gmail.com',        '+639170000002', '$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'customer',     TRUE, TRUE, NOW() - INTERVAL '30 minutes'),
  ('a0000001-0000-0000-0000-000000000003', 'juan.delacruz@gmail.com',       '+639170000003', '$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'customer',     TRUE, TRUE, NOW() - INTERVAL '2 hours'),
  ('a0000001-0000-0000-0000-000000000004', 'anna.reyes@gmail.com',          '+639170000004', '$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'customer',     TRUE, TRUE, NOW() - INTERVAL '1 day'),
  ('a0000001-0000-0000-0000-000000000005', 'vendor_grocery@daltaners.ph',   '+639170000005', '$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'vendor_owner', TRUE, TRUE, NOW() - INTERVAL '3 hours'),
  ('a0000001-0000-0000-0000-000000000006', 'vendor_restaurant@daltaners.ph','+639170000006', '$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'vendor_owner', TRUE, TRUE, NOW() - INTERVAL '4 hours'),
  ('a0000001-0000-0000-0000-000000000007', 'vendor_pharmacy@daltaners.ph',  '+639170000007', '$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'vendor_owner', TRUE, TRUE, NOW() - INTERVAL '5 hours'),
  ('a0000001-0000-0000-0000-000000000008', 'vendor_electronics@daltaners.ph','+639170000008','$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'vendor_owner', TRUE, TRUE, NOW() - INTERVAL '6 hours'),
  ('a0000001-0000-0000-0000-000000000009', 'staff_grocery@daltaners.ph',    '+639170000009', '$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'vendor_staff', TRUE, TRUE, NOW() - INTERVAL '2 hours'),
  ('a0000001-0000-0000-0000-000000000010', 'staff_restaurant@daltaners.ph', '+639170000010', '$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'vendor_staff', TRUE, TRUE, NOW() - INTERVAL '3 hours'),
  ('a0000001-0000-0000-0000-000000000011', 'rider_mark@daltaners.ph',       '+639170000011', '$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'delivery',     TRUE, TRUE, NOW() - INTERVAL '30 minutes'),
  ('a0000001-0000-0000-0000-000000000012', 'rider_james@daltaners.ph',      '+639170000012', '$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'delivery',     TRUE, TRUE, NOW() - INTERVAL '1 hour'),
  ('a0000001-0000-0000-0000-000000000013', 'rider_carlo@daltaners.ph',      '+639170000013', '$2b$12$fULlDOguDNULzdZaKRI30.9jLQTA48ZnorhxZ0sBQqRR8z07i4Er.', 'delivery',     TRUE, TRUE, NOW() - INTERVAL '2 hours');

-- =============================================================================
-- USERS SCHEMA — Profiles
-- =============================================================================
INSERT INTO users.profiles (id, first_name, last_name, display_name, gender, locale, date_of_birth, dietary_preferences, allergens) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'System',  'Admin',      'Admin',           'prefer_not_to_say', 'en', '1990-01-01', NULL, NULL),
  ('a0000001-0000-0000-0000-000000000002', 'Maria',   'Santos',     'Maria S.',        'female', 'tl', '1995-06-15', ARRAY['vegetarian'], ARRAY['peanuts']),
  ('a0000001-0000-0000-0000-000000000003', 'Juan',    'Dela Cruz',  'Juan DC',         'male',   'tl', '1992-03-22', NULL, NULL),
  ('a0000001-0000-0000-0000-000000000004', 'Anna',    'Reyes',      'Anna R.',         'female', 'en', '1998-11-08', ARRAY['keto'], NULL),
  ('a0000001-0000-0000-0000-000000000005', 'Elena',   'Gomez',      'Aling Nena',      'female', 'tl', '1975-04-10', NULL, NULL),
  ('a0000001-0000-0000-0000-000000000006', 'Roberto', 'Villanueva', 'Chef Bobby',      'male',   'tl', '1980-09-03', NULL, NULL),
  ('a0000001-0000-0000-0000-000000000007', 'Dra. Fe', 'Aquino',     'Dra. Fe',         'female', 'en', '1978-12-20', NULL, NULL),
  ('a0000001-0000-0000-0000-000000000008', 'Kevin',   'Tan',        'Kevin T.',        'male',   'en', '1988-07-14', NULL, NULL),
  ('a0000001-0000-0000-0000-000000000009', 'Lorna',   'Cruz',       'Lorna C.',        'female', 'tl', '1993-02-28', NULL, NULL),
  ('a0000001-0000-0000-0000-000000000010', 'Miguel',  'Ramos',      'Miguel R.',       'male',   'tl', '1991-08-05', NULL, NULL),
  ('a0000001-0000-0000-0000-000000000011', 'Mark',    'Bautista',   'Rider Mark',      'male',   'tl', '1997-01-12', NULL, NULL),
  ('a0000001-0000-0000-0000-000000000012', 'James',   'Garcia',     'Rider James',     'male',   'tl', '1996-05-30', NULL, NULL),
  ('a0000001-0000-0000-0000-000000000013', 'Carlo',   'Mendoza',    'Rider Carlo',     'male',   'tl', '1994-10-18', NULL, NULL);

-- =============================================================================
-- USERS SCHEMA — Addresses
-- =============================================================================
INSERT INTO users.addresses (id, user_id, label, address_line1, address_line2, barangay, city, province, region, postal_code, latitude, longitude, is_default, delivery_instructions) VALUES
  -- Maria Santos — QC
  ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'Home',   '123 Katipunan Ave', 'Unit 5B', 'Loyola Heights', 'Quezon City', 'Metro Manila', 'NCR', '1108', 14.6407, 121.0770, TRUE, 'Gate code: 1234. Leave with guard if not home.'),
  ('b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 'Office', '45 Eastwood Ave', '15th Floor', 'Bagumbayan', 'Quezon City', 'Metro Manila', 'NCR', '1110', 14.6177, 121.0809, FALSE, 'Go to the reception desk.'),
  -- Juan Dela Cruz — Makati
  ('b0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000003', 'Home',   '78 Jupiter St', NULL, 'Bel-Air', 'Makati', 'Metro Manila', 'NCR', '1209', 14.5563, 121.0198, TRUE, 'Call upon arrival.'),
  ('b0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000003', 'Condo',  '1 Ayala Ave', 'Tower 2 Unit 22A', 'San Lorenzo', 'Makati', 'Metro Manila', 'NCR', '1223', 14.5547, 121.0244, FALSE, NULL),
  -- Anna Reyes — BGC
  ('b0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000004', 'Home',   '25th St cor 5th Ave', 'BGC Highstreet', 'Fort Bonifacio', 'Taguig', 'Metro Manila', 'NCR', '1634', 14.5509, 121.0500, TRUE, 'Meet at lobby.');

-- =============================================================================
-- ZONES SCHEMA — Delivery Zones (Metro Manila)
-- =============================================================================
INSERT INTO zones.delivery_zones (id, name, city, province, region, base_delivery_fee, per_km_fee, surge_multiplier, is_active, max_delivery_radius_km) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Quezon City North',   'Quezon City',  'Metro Manila', 'NCR', 49.00, 10.00, 1.00, TRUE, 10.0),
  ('c0000001-0000-0000-0000-000000000002', 'Quezon City South',   'Quezon City',  'Metro Manila', 'NCR', 49.00, 10.00, 1.00, TRUE, 10.0),
  ('c0000001-0000-0000-0000-000000000003', 'Makati / BGC',        'Makati',       'Metro Manila', 'NCR', 39.00, 12.00, 1.00, TRUE, 8.0),
  ('c0000001-0000-0000-0000-000000000004', 'Manila Proper',       'Manila',       'Metro Manila', 'NCR', 49.00, 10.00, 1.00, TRUE, 10.0),
  ('c0000001-0000-0000-0000-000000000005', 'Pasig / Mandaluyong', 'Pasig',        'Metro Manila', 'NCR', 49.00, 10.00, 1.00, TRUE, 10.0),
  ('c0000001-0000-0000-0000-000000000006', 'Paranaque / Las Pinas','Paranaque',   'Metro Manila', 'NCR', 59.00, 12.00, 1.00, TRUE, 12.0),
  -- Cebu zones
  ('c0000002-0000-0000-0000-000000000001', 'Cebu City Center',     'Cebu City',    'Cebu',         'Central Visayas', 39.00, 8.00,  1.00, TRUE, 8.0),
  ('c0000002-0000-0000-0000-000000000002', 'Mandaue',              'Mandaue',      'Cebu',         'Central Visayas', 45.00, 9.00,  1.00, TRUE, 10.0),
  ('c0000002-0000-0000-0000-000000000003', 'Lapu-Lapu',            'Lapu-Lapu',    'Cebu',         'Central Visayas', 49.00, 10.00, 1.00, TRUE, 10.0),
  ('c0000002-0000-0000-0000-000000000004', 'Talisay',              'Talisay',      'Cebu',         'Central Visayas', 49.00, 10.00, 1.00, TRUE, 10.0),
  -- Davao zones
  ('c0000003-0000-0000-0000-000000000001', 'Davao City Center',    'Davao City',   'Davao del Sur', 'Davao Region', 35.00, 7.00,  1.00, TRUE, 8.0),
  ('c0000003-0000-0000-0000-000000000002', 'Talomo',               'Davao City',   'Davao del Sur', 'Davao Region', 45.00, 9.00,  1.00, TRUE, 10.0),
  ('c0000003-0000-0000-0000-000000000003', 'Buhangin',             'Davao City',   'Davao del Sur', 'Davao Region', 45.00, 9.00,  1.00, TRUE, 10.0),
  ('c0000003-0000-0000-0000-000000000004', 'Toril',                'Davao City',   'Davao del Sur', 'Davao Region', 55.00, 11.00, 1.00, TRUE, 12.0);

-- =============================================================================
-- VENDORS SCHEMA — Stores (Cebu + Davao)
-- =============================================================================
-- Cebu stores (reusing existing vendor owner UUIDs — in production these would be separate users)
INSERT INTO vendors.stores (id, owner_id, name, slug, description, category, status, commission_rate, subscription_tier, contact_phone, contact_email, preparation_time_minutes, minimum_order_value, rating_average, rating_count, total_orders, is_featured) VALUES
  -- Cebu Grocery
  ('d0000002-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000005',
   'Cebu Fresh Market', 'cebu-fresh-market',
   'Fresh produce and groceries from Cebu''s finest farms and fisheries.',
   'grocery', 'active', 12.00, 'silver', '+639170000020', 'cebu_grocery@daltaners.ph',
   25, 200.00, 4.50, 180, 650, TRUE),
  -- Cebu Restaurant
  ('d0000002-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000006',
   'Sugbo Eats', 'sugbo-eats',
   'Authentic Cebuano cuisine — lechon, puso, and more!',
   'restaurant', 'active', 15.00, 'gold', '+639170000021', 'sugbo_eats@daltaners.ph',
   15, 150.00, 4.80, 420, 1800, TRUE),
  -- Cebu Pharmacy
  ('d0000002-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000007',
   'Visayas Drug', 'visayas-drug',
   'Trusted pharmacy serving Cebu — OTC and prescription medicines.',
   'pharmacy', 'active', 8.00, 'silver', '+639170000022', 'visayas_drug@daltaners.ph',
   30, 0.00, 4.60, 95, 320, FALSE),
  -- Davao Grocery
  ('d0000003-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000005',
   'Davao Harvest', 'davao-harvest',
   'Farm-fresh fruits, vegetables, and local delicacies from Davao.',
   'grocery', 'active', 12.00, 'silver', '+639170000030', 'davao_harvest@daltaners.ph',
   25, 200.00, 4.40, 150, 500, TRUE),
  -- Davao Restaurant
  ('d0000003-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000006',
   'Durian Kitchen', 'durian-kitchen',
   'Davaoeño comfort food and specialties — durian desserts, tuna kinilaw, and more.',
   'restaurant', 'active', 15.00, 'gold', '+639170000031', 'durian_kitchen@daltaners.ph',
   15, 150.00, 4.70, 310, 1200, TRUE),
  -- Davao Pharmacy
  ('d0000003-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000007',
   'Mindanao Pharma', 'mindanao-pharma',
   'Your trusted Davao pharmacy — medicines, supplements, and health products.',
   'pharmacy', 'active', 8.00, 'free', '+639170000032', 'mindanao_pharma@daltaners.ph',
   30, 0.00, 4.30, 60, 180, FALSE);

-- =============================================================================
-- VENDORS SCHEMA — Stores (Metro Manila original)
-- =============================================================================
INSERT INTO vendors.stores (id, owner_id, name, slug, description, category, status, commission_rate, subscription_tier, contact_phone, contact_email, preparation_time_minutes, minimum_order_value, rating_average, rating_count, total_orders, is_featured) VALUES
  -- Grocery store
  ('d0000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000005',
   'Tindahan ni Aling Nena', 'tindahan-ni-aling-nena',
   'Your neighborhood sari-sari store gone digital! Fresh produce, canned goods, and everyday Filipino grocery essentials delivered to your door.',
   'grocery', 'active', 12.00, 'gold', '+639170000005', 'vendor_grocery@daltaners.ph',
   20, 200.00, 4.70, 342, 1250, TRUE),

  -- Restaurant
  ('d0000001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000006',
   'Kusina de Manila', 'kusina-de-manila',
   'Authentic Filipino home cooking — from our kaldero to your table. Adobo, sinigang, kare-kare, and more!',
   'restaurant', 'active', 22.00, 'silver', '+639170000006', 'vendor_restaurant@daltaners.ph',
   35, 150.00, 4.85, 567, 2100, TRUE),

  -- Pharmacy
  ('d0000001-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000007',
   'Botica ng Bayan', 'botica-ng-bayan',
   'Trusted community pharmacy. OTC medicines, vitamins, and personal care products at affordable prices.',
   'pharmacy', 'active', 15.00, 'silver', '+639170000007', 'vendor_pharmacy@daltaners.ph',
   15, 0.00, 4.50, 189, 780, FALSE),

  -- Electronics
  ('d0000001-0000-0000-0000-000000000004',
   'a0000001-0000-0000-0000-000000000008',
   'TechMart PH', 'techmart-ph',
   'Gadgets, accessories, and electronics at competitive prices. Official dealer for top brands.',
   'electronics', 'active', 10.00, 'free', '+639170000008', 'vendor_electronics@daltaners.ph',
   10, 500.00, 4.30, 95, 320, FALSE);

-- =============================================================================
-- VENDORS SCHEMA — Store Locations
-- =============================================================================
INSERT INTO vendors.store_locations (id, store_id, branch_name, address_line1, city, province, latitude, longitude, delivery_radius_km, is_primary) VALUES
  -- Grocery — QC
  ('e0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'Main Branch',      '456 Commonwealth Ave', 'Quezon City', 'Metro Manila', 14.6573, 121.0564, 7.0, TRUE),
  ('e0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000001', 'Eastwood Branch',   '22 Eastwood City Walk', 'Quezon City', 'Metro Manila', 14.6177, 121.0809, 5.0, FALSE),
  -- Restaurant — Makati
  ('e0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000002', 'Makati Branch',     '99 Pasong Tamo Ext', 'Makati', 'Metro Manila', 14.5547, 121.0198, 6.0, TRUE),
  -- Pharmacy — QC
  ('e0000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000003', 'Main Branch',       '12 Visayas Ave', 'Quezon City', 'Metro Manila', 14.6605, 121.0461, 8.0, TRUE),
  -- Electronics — Pasig
  ('e0000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000004', 'Ortigas Branch',    '55 Julia Vargas Ave', 'Pasig', 'Metro Manila', 14.5870, 121.0615, 10.0, TRUE);

-- =============================================================================
-- VENDORS SCHEMA — Operating Hours (Mon-Sun for each location)
-- =============================================================================
-- Grocery main branch: 6am-10pm daily
INSERT INTO vendors.operating_hours (store_location_id, day_of_week, open_time, close_time, is_closed) VALUES
  ('e0000001-0000-0000-0000-000000000001', 0, '06:00', '22:00', FALSE),
  ('e0000001-0000-0000-0000-000000000001', 1, '06:00', '22:00', FALSE),
  ('e0000001-0000-0000-0000-000000000001', 2, '06:00', '22:00', FALSE),
  ('e0000001-0000-0000-0000-000000000001', 3, '06:00', '22:00', FALSE),
  ('e0000001-0000-0000-0000-000000000001', 4, '06:00', '22:00', FALSE),
  ('e0000001-0000-0000-0000-000000000001', 5, '06:00', '23:00', FALSE),
  ('e0000001-0000-0000-0000-000000000001', 6, '07:00', '21:00', FALSE);
-- Restaurant Makati: 10am-11pm, closed Monday
INSERT INTO vendors.operating_hours (store_location_id, day_of_week, open_time, close_time, is_closed) VALUES
  ('e0000001-0000-0000-0000-000000000003', 0, '10:00', '22:00', FALSE),
  ('e0000001-0000-0000-0000-000000000003', 1, NULL,    NULL,    TRUE),
  ('e0000001-0000-0000-0000-000000000003', 2, '10:00', '23:00', FALSE),
  ('e0000001-0000-0000-0000-000000000003', 3, '10:00', '23:00', FALSE),
  ('e0000001-0000-0000-0000-000000000003', 4, '10:00', '23:00', FALSE),
  ('e0000001-0000-0000-0000-000000000003', 5, '10:00', '00:00', FALSE),
  ('e0000001-0000-0000-0000-000000000003', 6, '09:00', '22:00', FALSE);
-- Pharmacy: 8am-8pm daily, closed Sunday
INSERT INTO vendors.operating_hours (store_location_id, day_of_week, open_time, close_time, is_closed) VALUES
  ('e0000001-0000-0000-0000-000000000004', 0, NULL,    NULL,    TRUE),
  ('e0000001-0000-0000-0000-000000000004', 1, '08:00', '20:00', FALSE),
  ('e0000001-0000-0000-0000-000000000004', 2, '08:00', '20:00', FALSE),
  ('e0000001-0000-0000-0000-000000000004', 3, '08:00', '20:00', FALSE),
  ('e0000001-0000-0000-0000-000000000004', 4, '08:00', '20:00', FALSE),
  ('e0000001-0000-0000-0000-000000000004', 5, '08:00', '20:00', FALSE),
  ('e0000001-0000-0000-0000-000000000004', 6, '08:00', '17:00', FALSE);
-- Electronics: 10am-9pm daily
INSERT INTO vendors.operating_hours (store_location_id, day_of_week, open_time, close_time, is_closed) VALUES
  ('e0000001-0000-0000-0000-000000000005', 0, '10:00', '21:00', FALSE),
  ('e0000001-0000-0000-0000-000000000005', 1, '10:00', '21:00', FALSE),
  ('e0000001-0000-0000-0000-000000000005', 2, '10:00', '21:00', FALSE),
  ('e0000001-0000-0000-0000-000000000005', 3, '10:00', '21:00', FALSE),
  ('e0000001-0000-0000-0000-000000000005', 4, '10:00', '21:00', FALSE),
  ('e0000001-0000-0000-0000-000000000005', 5, '10:00', '21:00', FALSE),
  ('e0000001-0000-0000-0000-000000000005', 6, '10:00', '21:00', FALSE);

-- =============================================================================
-- VENDORS SCHEMA — Store Staff
-- =============================================================================
INSERT INTO vendors.store_staff (store_id, user_id, role, is_active, permissions) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000009', 'manager', TRUE, '{"inventory": true, "orders": true, "products": true}'),
  ('d0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000010', 'staff',   TRUE, '{"orders": true, "products": false}');

-- =============================================================================
-- CATALOG SCHEMA — Categories (hierarchical)
-- =============================================================================
-- Level 0: Top-level categories
INSERT INTO catalog.categories (id, parent_id, name, slug, sort_order, is_active, level) VALUES
  ('f0000001-0000-0000-0000-000000000001', NULL, 'Bigas & Butil (Rice & Grains)',   'rice-grains',     1, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000002', NULL, 'De Lata (Canned Goods)',          'canned-goods',    2, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000003', NULL, 'Instant Noodles & Mami',          'instant-noodles', 3, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000004', NULL, 'Kape & Inumin (Coffee & Drinks)', 'coffee-drinks',   4, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000005', NULL, 'Sawsawan & Pampalasa (Condiments)','condiments',     5, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000006', NULL, 'Snacks & Chichirya',              'snacks',          6, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000007', NULL, 'Gulay (Vegetables)',              'vegetables',      7, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000008', NULL, 'Prutas (Fruits)',                 'fruits',          8, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000009', NULL, 'Karne & Isda (Meat & Seafood)',   'meat-seafood',    9, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000010', NULL, 'Tinapay & Bakery (Bread)',        'bread-bakery',   10, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000011', NULL, 'Gamot (Medicines - OTC)',         'medicines-otc',  11, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000012', NULL, 'Vitamins & Supplements',          'vitamins',       12, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000013', NULL, 'Personal Care',                   'personal-care',  13, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000014', NULL, 'Ulam (Viands / Cooked Food)',     'viands',         14, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000015', NULL, 'Merienda & Street Food',          'merienda',       15, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000016', NULL, 'Electronics & Gadgets',           'electronics',    16, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000017', NULL, 'Mantika & Cooking Oil',           'cooking-oil',    17, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000018', NULL, 'Asukal & Pampatamis (Sugar)',     'sugar',          18, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000019', NULL, 'Dairy & Gatas (Milk)',            'dairy-milk',     19, TRUE, 0),
  ('f0000001-0000-0000-0000-000000000020', NULL, 'Tuyong Isda (Dried Fish)',        'dried-fish',     20, TRUE, 0);

-- Level 1: Sub-categories
INSERT INTO catalog.categories (id, parent_id, name, slug, sort_order, is_active, level) VALUES
  ('f0000001-0000-0000-0000-000000000101', 'f0000001-0000-0000-0000-000000000001', 'White Rice',      'white-rice',       1, TRUE, 1),
  ('f0000001-0000-0000-0000-000000000102', 'f0000001-0000-0000-0000-000000000001', 'Brown Rice',      'brown-rice',       2, TRUE, 1),
  ('f0000001-0000-0000-0000-000000000103', 'f0000001-0000-0000-0000-000000000001', 'Malagkit (Sticky)','sticky-rice',     3, TRUE, 1),
  ('f0000001-0000-0000-0000-000000000104', 'f0000001-0000-0000-0000-000000000002', 'Sardinas & Tuna', 'canned-fish',      1, TRUE, 1),
  ('f0000001-0000-0000-0000-000000000105', 'f0000001-0000-0000-0000-000000000002', 'Corned Beef & Meat','canned-meat',    2, TRUE, 1),
  ('f0000001-0000-0000-0000-000000000106', 'f0000001-0000-0000-0000-000000000009', 'Baboy (Pork)',    'pork',             1, TRUE, 1),
  ('f0000001-0000-0000-0000-000000000107', 'f0000001-0000-0000-0000-000000000009', 'Manok (Chicken)', 'chicken',          2, TRUE, 1),
  ('f0000001-0000-0000-0000-000000000108', 'f0000001-0000-0000-0000-000000000009', 'Isda (Fish)',     'fish',             3, TRUE, 1),
  ('f0000001-0000-0000-0000-000000000109', 'f0000001-0000-0000-0000-000000000014', 'Filipino Classics','filipino-classics',1, TRUE, 1),
  ('f0000001-0000-0000-0000-000000000110', 'f0000001-0000-0000-0000-000000000014', 'Soup & Sabaw',    'soup-sabaw',       2, TRUE, 1),
  ('f0000001-0000-0000-0000-000000000111', 'f0000001-0000-0000-0000-000000000016', 'Phone Accessories','phone-accessories',1, TRUE, 1),
  ('f0000001-0000-0000-0000-000000000112', 'f0000001-0000-0000-0000-000000000016', 'Chargers & Cables','chargers-cables', 2, TRUE, 1);

-- =============================================================================
-- CATALOG SCHEMA — Products
-- =============================================================================
-- ── Grocery Products (Tindahan ni Aling Nena) ──
INSERT INTO catalog.products (id, store_id, category_id, name, slug, description, short_description, sku, barcode, brand, unit_type, unit_value, base_price, sale_price, cost_price, is_active, is_featured, is_perishable, shelf_life_days, dietary_tags, rating_average, rating_count, total_sold) VALUES
  -- Rice
  ('10000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000101',
   'Sinandomeng Premium Rice 5kg', 'sinandomeng-premium-rice-5kg',
   'Premium quality Sinandomeng rice from Nueva Ecija. Long grain, fluffy, and perfect for everyday Filipino meals.',
   'Premium Sinandomeng rice 5kg pack', 'GR-RICE-001', '4800000000001', 'Harvester''s Best',
   'kg', 5.000, 285.00, 265.00, 210.00, TRUE, TRUE, FALSE, 365, NULL, 4.80, 156, 890),

  ('10000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000101',
   'Dinorado Rice 5kg', 'dinorado-rice-5kg',
   'Authentic Dinorado rice — the favorite Filipino premium rice with a naturally sweet aroma.',
   'Aromatic Dinorado rice 5kg pack', 'GR-RICE-002', '4800000000002', 'Golden Grain',
   'kg', 5.000, 350.00, NULL, 260.00, TRUE, FALSE, FALSE, 365, NULL, 4.70, 89, 450),

  ('10000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000102',
   'Organic Brown Rice 2kg', 'organic-brown-rice-2kg',
   'Heart-healthy organic brown rice. Rich in fiber and nutrients. Sourced from Cordillera farms.',
   'Organic brown rice 2kg', 'GR-RICE-003', '4800000000003', 'Benguet Harvest',
   'kg', 2.000, 180.00, NULL, 130.00, TRUE, FALSE, FALSE, 180, ARRAY['organic','gluten-free'], 4.50, 42, 180),

  -- Canned Goods
  ('10000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000104',
   'Century Tuna Flakes in Oil 155g', 'century-tuna-flakes-oil-155g',
   'Century Tuna — the #1 tuna brand in the Philippines. Ready to eat, high in protein.',
   'Century Tuna flakes in oil', 'GR-CAN-001', '4800000000004', 'Century Pacific',
   'piece', 1.000, 42.00, 38.50, 30.00, TRUE, TRUE, FALSE, 730, NULL, 4.60, 234, 1520),

  ('10000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000104',
   'Ligo Sardines in Tomato Sauce 155g', 'ligo-sardines-tomato-155g',
   'Classic Ligo sardines in tomato sauce. A Filipino pantry staple since 1954.',
   'Ligo sardines red can', 'GR-CAN-002', '4800000000005', 'Ligo',
   'piece', 1.000, 22.00, NULL, 15.00, TRUE, FALSE, FALSE, 730, NULL, 4.40, 178, 2300),

  ('10000001-0000-0000-0000-000000000006', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000105',
   'CDO Karne Norte Corned Beef 150g', 'cdo-karne-norte-150g',
   'CDO Karne Norte — real beefy flavor, perfect with sinangag and itlog. The Pinoy breakfast essential.',
   'CDO corned beef 150g can', 'GR-CAN-003', '4800000000006', 'CDO Foodsphere',
   'piece', 1.000, 48.00, 44.00, 35.00, TRUE, FALSE, FALSE, 730, NULL, 4.30, 120, 980),

  -- Instant Noodles
  ('10000001-0000-0000-0000-000000000007', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000003',
   'Lucky Me! Pancit Canton Original 80g (6-pack)', 'lucky-me-pancit-canton-6pk',
   'Lucky Me! Pancit Canton — the undisputed champion of instant pancit. Original chilimansi flavor.',
   'Lucky Me Pancit Canton 6-pack', 'GR-NOD-001', '4800000000007', 'Monde Nissin',
   'pack', 6.000, 78.00, NULL, 55.00, TRUE, TRUE, FALSE, 365, NULL, 4.90, 312, 3200),

  ('10000001-0000-0000-0000-000000000008', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000003',
   'Nissin Cup Noodles Seafood 60g', 'nissin-cup-noodles-seafood-60g',
   'Nissin Cup Noodles Seafood flavor. Quick and delicious — just add hot water.',
   'Nissin Cup Noodles Seafood', 'GR-NOD-002', '4800000000008', 'Nissin',
   'piece', 1.000, 28.00, 25.00, 18.00, TRUE, FALSE, FALSE, 365, NULL, 4.50, 88, 650),

  -- Coffee & Beverages
  ('10000001-0000-0000-0000-000000000009', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000004',
   'Kopiko Brown Coffee 3-in-1 (10 sachets)', 'kopiko-brown-3in1-10s',
   'Kopiko Brown — real coffee na real talaga. The bold 3-in-1 coffee mix that Filipinos love.',
   'Kopiko Brown 3-in-1 10s', 'GR-BEV-001', '4800000000009', 'Kopiko',
   'pack', 10.000, 95.00, NULL, 68.00, TRUE, FALSE, FALSE, 365, NULL, 4.70, 145, 1100),

  ('10000001-0000-0000-0000-000000000010', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000004',
   'C2 Green Tea Apple 500ml', 'c2-green-tea-apple-500ml',
   'Refreshing C2 Green Tea with natural apple flavor. Low calorie, great taste.',
   'C2 Green Tea Apple 500ml', 'GR-BEV-002', '4800000000010', 'Universal Robina',
   'piece', 1.000, 25.00, NULL, 16.00, TRUE, FALSE, FALSE, 180, ARRAY['vegetarian'], 4.40, 67, 520),

  -- Condiments
  ('10000001-0000-0000-0000-000000000011', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000005',
   'Datu Puti Soy Sauce 1L', 'datu-puti-soy-sauce-1l',
   'Datu Puti Toyo — the classic Filipino soy sauce. No kitchen is complete without it.',
   'Datu Puti soy sauce 1 liter', 'GR-CON-001', '4800000000011', 'NutriAsia',
   'liter', 1.000, 55.00, NULL, 38.00, TRUE, FALSE, FALSE, 730, ARRAY['vegan'], 4.80, 200, 1800),

  ('10000001-0000-0000-0000-000000000012', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000005',
   'Silver Swan Patis (Fish Sauce) 350ml', 'silver-swan-patis-350ml',
   'Silver Swan Fish Sauce — gives that umami punch to sinigang, pinakbet, and kare-kare.',
   'Silver Swan patis 350ml', 'GR-CON-002', '4800000000012', 'NutriAsia',
   'ml', 350.000, 32.00, NULL, 22.00, TRUE, FALSE, FALSE, 730, NULL, 4.60, 134, 1200),

  ('10000001-0000-0000-0000-000000000013', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000005',
   'Mama Sita''s Sinigang Mix Sampaloc 50g', 'mama-sitas-sinigang-sampaloc-50g',
   'Mama Sita''s Sinigang sa Sampaloc — instant sour soup mix. Just add pork, shrimp, or fish!',
   'Mama Sita sinigang mix', 'GR-CON-003', '4800000000013', 'Mama Sita''s',
   'piece', 1.000, 28.00, 25.00, 18.00, TRUE, TRUE, FALSE, 730, NULL, 4.90, 280, 2500),

  -- Snacks
  ('10000001-0000-0000-0000-000000000014', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000006',
   'Chippy Barbecue Corn Chips 110g', 'chippy-bbq-corn-chips-110g',
   'Chippy — the crunchy corn chip that''s masarap isawsaw sa suka. BBQ flavored!',
   'Chippy BBQ flavor 110g', 'GR-SNK-001', '4800000000014', 'Jack ''n Jill',
   'piece', 1.000, 28.00, NULL, 18.00, TRUE, FALSE, FALSE, 180, NULL, 4.50, 98, 780),

  ('10000001-0000-0000-0000-000000000015', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000006',
   'Boy Bawang Cornick Garlic 100g', 'boy-bawang-garlic-100g',
   'Boy Bawang — super crunchy garlic-flavored cornick. The ultimate Pinoy pulutan snack.',
   'Boy Bawang garlic cornick 100g', 'GR-SNK-002', '4800000000015', 'KSK Food Products',
   'piece', 1.000, 22.00, NULL, 14.00, TRUE, FALSE, FALSE, 180, ARRAY['vegan'], 4.70, 156, 1100),

  -- Cooking Oil
  ('10000001-0000-0000-0000-000000000016', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000017',
   'Minola Premium Coconut Oil 1L', 'minola-coconut-oil-1l',
   'Minola Premium Coconut Oil — the healthier cooking oil choice. 100% pure coconut oil.',
   'Minola coconut oil 1L', 'GR-OIL-001', '4800000000016', 'Minola',
   'liter', 1.000, 145.00, 135.00, 100.00, TRUE, FALSE, FALSE, 365, ARRAY['vegan','keto'], 4.60, 88, 650),

  -- Fresh Produce
  ('10000001-0000-0000-0000-000000000017', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000007',
   'Kangkong (Water Spinach) 250g', 'kangkong-250g',
   'Fresh kangkong — perfect for adobong kangkong, sinigang, or pinakbet.',
   'Fresh kangkong bundle', 'GR-VEG-001', NULL, NULL,
   'bundle', 1.000, 15.00, NULL, 8.00, TRUE, FALSE, TRUE, 3, ARRAY['vegan','organic'], 4.30, 34, 290),

  ('10000001-0000-0000-0000-000000000018', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000008',
   'Carabao Mango (per kg)', 'carabao-mango-per-kg',
   'Sweet, ripe Carabao mangoes from Guimaras — the sweetest mangoes in the world!',
   'Ripe Carabao mangoes', 'GR-FRT-001', NULL, NULL,
   'kg', 1.000, 180.00, 160.00, 110.00, TRUE, TRUE, TRUE, 5, ARRAY['vegan'], 4.90, 210, 1500),

  -- Meat
  ('10000001-0000-0000-0000-000000000019', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000106',
   'Pork Liempo (Belly) per kg', 'pork-liempo-per-kg',
   'Fresh pork liempo — ideal for inihaw, sinigang, or lechon kawali. Cut to your preference.',
   'Fresh pork belly per kg', 'GR-MEAT-001', NULL, NULL,
   'kg', 1.000, 380.00, NULL, 280.00, TRUE, FALSE, TRUE, 2, NULL, 4.50, 78, 420),

  ('10000001-0000-0000-0000-000000000020', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000108',
   'Bangus (Milkfish) Boneless per kg', 'bangus-boneless-per-kg',
   'Fresh boneless bangus — ready to fry, grill, or make into sinigang. Filipino breakfast classic.',
   'Boneless bangus per kg', 'GR-MEAT-002', NULL, NULL,
   'kg', 1.000, 320.00, 299.00, 230.00, TRUE, TRUE, TRUE, 2, NULL, 4.70, 92, 560),

  -- Bread
  ('10000001-0000-0000-0000-000000000021', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000010',
   'Pandesal (10 pcs)', 'pandesal-10pcs',
   'Freshly baked pandesal — warm, soft, and perfect with kape. A Filipino morning tradition.',
   'Fresh pandesal 10 pieces', 'GR-BRD-001', NULL, NULL,
   'pack', 10.000, 50.00, NULL, 30.00, TRUE, FALSE, TRUE, 1, ARRAY['vegetarian'], 4.80, 167, 2800),

  -- Dried Fish
  ('10000001-0000-0000-0000-000000000022', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000020',
   'Tuyo (Dried Herring) 200g', 'tuyo-dried-herring-200g',
   'Classic tuyo — crispy fried tuyo with sinangag and itlog is the ultimate TuSiLog!',
   'Dried tuyo 200g pack', 'GR-DRY-001', '4800000000022', NULL,
   'pack', 1.000, 65.00, NULL, 40.00, TRUE, FALSE, FALSE, 90, NULL, 4.40, 56, 380),

  -- Dairy
  ('10000001-0000-0000-0000-000000000023', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000019',
   'Alaska Evaporada 370ml', 'alaska-evaporada-370ml',
   'Alaska Evaporated Milk — creamy and rich. For leche flan, coffee, and baking.',
   'Alaska evaporated milk 370ml', 'GR-DAI-001', '4800000000023', 'Alaska Milk',
   'piece', 1.000, 48.00, NULL, 34.00, TRUE, FALSE, FALSE, 365, NULL, 4.50, 72, 490),

  -- Sugar
  ('10000001-0000-0000-0000-000000000024', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000018',
   'Washed Sugar 1kg', 'washed-sugar-1kg',
   'All-purpose washed sugar for cooking, baking, and your daily kape.',
   'Washed sugar 1kg', 'GR-SUG-001', '4800000000024', NULL,
   'kg', 1.000, 68.00, NULL, 50.00, TRUE, FALSE, FALSE, 730, ARRAY['vegan'], 4.20, 45, 380);

-- ── Restaurant Products (Kusina de Manila) ──
INSERT INTO catalog.products (id, store_id, category_id, name, slug, description, short_description, sku, brand, unit_type, unit_value, base_price, sale_price, cost_price, is_active, is_featured, is_perishable, dietary_tags, rating_average, rating_count, total_sold) VALUES
  ('10000001-0000-0000-0000-000000000101', 'd0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000109',
   'Chicken Adobo (Solo)', 'chicken-adobo-solo',
   'Classic Filipino chicken adobo braised in soy sauce, vinegar, garlic, and bay leaves. Served with steaming rice.',
   'Classic chicken adobo with rice', 'KDM-ULM-001', 'Kusina de Manila',
   'piece', 1.000, 149.00, NULL, 65.00, TRUE, TRUE, TRUE, NULL, 4.90, 289, 1800),

  ('10000001-0000-0000-0000-000000000102', 'd0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000110',
   'Sinigang na Baboy (Family)', 'sinigang-na-baboy-family',
   'Hearty pork sinigang with tamarind broth, kangkong, radish, sitaw, and siling haba. Serves 3-4.',
   'Pork sinigang family size', 'KDM-ULM-002', 'Kusina de Manila',
   'piece', 1.000, 450.00, NULL, 180.00, TRUE, TRUE, TRUE, ARRAY['gluten-free'], 4.95, 198, 950),

  ('10000001-0000-0000-0000-000000000103', 'd0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000109',
   'Kare-Kare (Family)', 'kare-kare-family',
   'Rich oxtail kare-kare in peanut sauce with banana heart, eggplant, and string beans. With bagoong.',
   'Oxtail kare-kare family size', 'KDM-ULM-003', 'Kusina de Manila',
   'piece', 1.000, 550.00, 499.00, 220.00, TRUE, FALSE, TRUE, NULL, 4.80, 134, 670),

  ('10000001-0000-0000-0000-000000000104', 'd0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000109',
   'Lechon Kawali (Solo)', 'lechon-kawali-solo',
   'Crispy deep-fried pork belly. Golden outside, tender inside. Served with lechon sauce and rice.',
   'Crispy lechon kawali with rice', 'KDM-ULM-004', 'Kusina de Manila',
   'piece', 1.000, 179.00, NULL, 80.00, TRUE, TRUE, TRUE, ARRAY['keto'], 4.85, 245, 1400),

  ('10000001-0000-0000-0000-000000000105', 'd0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000109',
   'Bistek Tagalog (Solo)', 'bistek-tagalog-solo',
   'Tender beef slices marinated in soy sauce and calamansi, topped with caramelized onion rings. With rice.',
   'Bistek Tagalog with rice', 'KDM-ULM-005', 'Kusina de Manila',
   'piece', 1.000, 189.00, NULL, 90.00, TRUE, FALSE, TRUE, NULL, 4.75, 156, 890),

  ('10000001-0000-0000-0000-000000000106', 'd0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000015',
   'Halo-Halo Special', 'halo-halo-special',
   'The ultimate Filipino summer dessert — shaved ice with ube ice cream, leche flan, nata de coco, beans, sago, and more!',
   'Halo-halo with all the toppings', 'KDM-MRD-001', 'Kusina de Manila',
   'piece', 1.000, 120.00, NULL, 45.00, TRUE, TRUE, TRUE, ARRAY['vegetarian'], 4.90, 310, 2200),

  ('10000001-0000-0000-0000-000000000107', 'd0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000015',
   'Palabok Fiesta (Solo)', 'palabok-fiesta-solo',
   'Rice noodles in rich shrimp-based orange sauce with pork, shrimp, tinapa flakes, chicharon, and hard-boiled egg.',
   'Palabok with all toppings', 'KDM-MRD-002', 'Kusina de Manila',
   'piece', 1.000, 135.00, NULL, 55.00, TRUE, FALSE, TRUE, NULL, 4.70, 178, 1100);

-- ── Pharmacy Products (Botica ng Bayan) ──
INSERT INTO catalog.products (id, store_id, category_id, name, slug, description, short_description, sku, brand, unit_type, unit_value, base_price, cost_price, is_active, requires_prescription, dietary_tags, rating_average, rating_count, total_sold) VALUES
  ('10000001-0000-0000-0000-000000000201', 'd0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000011',
   'Biogesic Paracetamol 500mg (10 tablets)', 'biogesic-paracetamol-500mg-10s',
   'Biogesic Paracetamol — for headache, fever, and body pain. Gentle on the stomach.',
   'Biogesic 500mg 10 tablets', 'PH-MED-001', 'Biogesic',
   'pack', 10.000, 12.50, 8.00, TRUE, FALSE, NULL, 4.70, 340, 5200),

  ('10000001-0000-0000-0000-000000000202', 'd0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000011',
   'Neozep Forte (10 tablets)', 'neozep-forte-10s',
   'Neozep Forte — for colds, flu, runny nose, and sneezing. Multi-symptom relief.',
   'Neozep Forte cold medicine 10s', 'PH-MED-002', 'Neozep',
   'pack', 10.000, 65.00, 42.00, TRUE, FALSE, NULL, 4.50, 189, 2800),

  ('10000001-0000-0000-0000-000000000203', 'd0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000011',
   'Kremil-S Antacid (10 tablets)', 'kremil-s-antacid-10s',
   'Kremil-S — fast relief from hyperacidity, heartburn, and gas pains. Chewable tablets.',
   'Kremil-S antacid 10 tablets', 'PH-MED-003', 'Kremil-S',
   'pack', 10.000, 55.00, 35.00, TRUE, FALSE, NULL, 4.60, 145, 1900),

  ('10000001-0000-0000-0000-000000000204', 'd0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000012',
   'Poten-Cee Vitamin C 500mg (100 capsules)', 'poten-cee-vitamin-c-500mg-100s',
   'Poten-Cee non-acidic Vitamin C — boost your immune system without stomach irritation.',
   'Poten-Cee Vitamin C 100 capsules', 'PH-VIT-001', 'Poten-Cee',
   'box', 1.000, 350.00, 240.00, TRUE, FALSE, NULL, 4.70, 210, 3100),

  ('10000001-0000-0000-0000-000000000205', 'd0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000013',
   'Safeguard Pure White Soap 135g', 'safeguard-pure-white-135g',
   'Safeguard antibacterial soap — 24-hour germ protection for the whole family.',
   'Safeguard soap bar 135g', 'PH-PC-001', 'Safeguard',
   'piece', 1.000, 48.00, 32.00, TRUE, FALSE, NULL, 4.40, 88, 1500),

  ('10000001-0000-0000-0000-000000000206', 'd0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000011',
   'Alaxan FR Ibuprofen+Paracetamol (10 capsules)', 'alaxan-fr-10s',
   'Alaxan FR — for headache, toothache, muscle and joint pain. Fast relief.',
   'Alaxan FR pain reliever 10s', 'PH-MED-004', 'Alaxan',
   'pack', 10.000, 70.00, 45.00, TRUE, FALSE, NULL, 4.60, 156, 2200);

-- ── Electronics Products (TechMart PH) ──
INSERT INTO catalog.products (id, store_id, category_id, name, slug, description, short_description, sku, brand, unit_type, unit_value, base_price, sale_price, cost_price, is_active, is_featured, dietary_tags, rating_average, rating_count, total_sold) VALUES
  ('10000001-0000-0000-0000-000000000301', 'd0000001-0000-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000111',
   'Universal Phone Case (iPhone/Samsung)', 'universal-phone-case',
   'Premium shockproof phone case. Available for iPhone 15/16 and Samsung Galaxy S24/S25.',
   'Shockproof phone case', 'EL-ACC-001', 'TechMart',
   'piece', 1.000, 299.00, 249.00, 120.00, TRUE, TRUE, NULL, 4.30, 67, 340),

  ('10000001-0000-0000-0000-000000000302', 'd0000001-0000-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000112',
   'USB-C Fast Charger 65W', 'usb-c-fast-charger-65w',
   'GaN USB-C fast charger — charges phone in 30 minutes. Compatible with all USB-C devices.',
   '65W USB-C GaN fast charger', 'EL-CHG-001', 'TechMart',
   'piece', 1.000, 899.00, 799.00, 450.00, TRUE, TRUE, NULL, 4.50, 45, 220),

  ('10000001-0000-0000-0000-000000000303', 'd0000001-0000-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000112',
   'USB-C to Lightning Cable 1m', 'usb-c-lightning-cable-1m',
   'MFi certified USB-C to Lightning cable. Fast charging for iPhone. Braided nylon, durable.',
   'USB-C to Lightning 1m cable', 'EL-CBL-001', 'TechMart',
   'piece', 1.000, 499.00, NULL, 180.00, TRUE, FALSE, NULL, 4.40, 38, 180);

-- =============================================================================
-- CATALOG SCHEMA — Product Images
-- =============================================================================
INSERT INTO catalog.product_images (product_id, url, thumbnail_url, alt_text, sort_order, is_primary) VALUES
  ('10000001-0000-0000-0000-000000000001', '/images/products/sinandomeng-5kg.jpg',     '/images/products/thumb/sinandomeng-5kg.jpg',     'Sinandomeng Rice 5kg',  0, TRUE),
  ('10000001-0000-0000-0000-000000000004', '/images/products/century-tuna-155g.jpg',    '/images/products/thumb/century-tuna-155g.jpg',    'Century Tuna 155g',     0, TRUE),
  ('10000001-0000-0000-0000-000000000007', '/images/products/lucky-me-6pk.jpg',         '/images/products/thumb/lucky-me-6pk.jpg',         'Lucky Me Pancit Canton', 0, TRUE),
  ('10000001-0000-0000-0000-000000000013', '/images/products/mama-sitas-sinigang.jpg',  '/images/products/thumb/mama-sitas-sinigang.jpg',  'Mama Sita Sinigang Mix',0, TRUE),
  ('10000001-0000-0000-0000-000000000018', '/images/products/carabao-mango.jpg',        '/images/products/thumb/carabao-mango.jpg',        'Carabao Mango',         0, TRUE),
  ('10000001-0000-0000-0000-000000000020', '/images/products/bangus-boneless.jpg',      '/images/products/thumb/bangus-boneless.jpg',      'Boneless Bangus',       0, TRUE),
  ('10000001-0000-0000-0000-000000000101', '/images/products/chicken-adobo.jpg',        '/images/products/thumb/chicken-adobo.jpg',        'Chicken Adobo',         0, TRUE),
  ('10000001-0000-0000-0000-000000000102', '/images/products/sinigang-baboy.jpg',       '/images/products/thumb/sinigang-baboy.jpg',       'Pork Sinigang',         0, TRUE),
  ('10000001-0000-0000-0000-000000000104', '/images/products/lechon-kawali.jpg',        '/images/products/thumb/lechon-kawali.jpg',        'Lechon Kawali',         0, TRUE),
  ('10000001-0000-0000-0000-000000000106', '/images/products/halo-halo.jpg',            '/images/products/thumb/halo-halo.jpg',            'Halo-Halo Special',     0, TRUE),
  ('10000001-0000-0000-0000-000000000201', '/images/products/biogesic-10s.jpg',         '/images/products/thumb/biogesic-10s.jpg',         'Biogesic 10s',          0, TRUE),
  ('10000001-0000-0000-0000-000000000301', '/images/products/phone-case.jpg',           '/images/products/thumb/phone-case.jpg',           'Phone Case',            0, TRUE),
  ('10000001-0000-0000-0000-000000000302', '/images/products/usbc-charger-65w.jpg',     '/images/products/thumb/usbc-charger-65w.jpg',     'USB-C Charger 65W',     0, TRUE);

-- =============================================================================
-- CATALOG SCHEMA — Product Variants
-- =============================================================================
INSERT INTO catalog.product_variants (id, product_id, name, sku, price_adjustment, stock_quantity, is_active, attributes) VALUES
  -- Phone case variants
  ('20000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000301', 'iPhone 15',      'EL-ACC-001-IP15',  0.00,   50, TRUE, '{"model": "iPhone 15", "color": "black"}'),
  ('20000001-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000301', 'iPhone 16',      'EL-ACC-001-IP16',  50.00,  35, TRUE, '{"model": "iPhone 16", "color": "black"}'),
  ('20000001-0000-0000-0000-000000000003', '10000001-0000-0000-0000-000000000301', 'Samsung S24',    'EL-ACC-001-SS24',  0.00,   40, TRUE, '{"model": "Samsung S24", "color": "black"}'),
  ('20000001-0000-0000-0000-000000000004', '10000001-0000-0000-0000-000000000301', 'Samsung S25',    'EL-ACC-001-SS25',  50.00,  30, TRUE, '{"model": "Samsung S25", "color": "black"}'),
  -- Chicken adobo variants
  ('20000001-0000-0000-0000-000000000005', '10000001-0000-0000-0000-000000000101', 'Extra Rice',     'KDM-ULM-001-XR',   20.00, 999, TRUE, '{"extra": "rice"}'),
  ('20000001-0000-0000-0000-000000000006', '10000001-0000-0000-0000-000000000101', 'With Egg',       'KDM-ULM-001-EGG',  25.00, 999, TRUE, '{"extra": "egg"}');

-- =============================================================================
-- INVENTORY SCHEMA — Stock
-- =============================================================================
INSERT INTO inventory.stock (id, product_id, store_location_id, quantity, reserved_quantity, reorder_point, reorder_quantity, last_restocked_at) VALUES
  -- Grocery stock at main branch
  ('30000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 120, 5, 20, 50, NOW() - INTERVAL '2 days'),
  ('30000001-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000001', 80,  2, 15, 40, NOW() - INTERVAL '3 days'),
  ('30000001-0000-0000-0000-000000000003', '10000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000001', 45,  0, 10, 30, NOW() - INTERVAL '5 days'),
  ('30000001-0000-0000-0000-000000000004', '10000001-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000001', 200, 8, 30, 100, NOW() - INTERVAL '1 day'),
  ('30000001-0000-0000-0000-000000000005', '10000001-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000001', 350, 10, 50, 200, NOW() - INTERVAL '1 day'),
  ('30000001-0000-0000-0000-000000000006', '10000001-0000-0000-0000-000000000006', 'e0000001-0000-0000-0000-000000000001', 180, 3, 30, 100, NOW() - INTERVAL '2 days'),
  ('30000001-0000-0000-0000-000000000007', '10000001-0000-0000-0000-000000000007', 'e0000001-0000-0000-0000-000000000001', 500, 15, 50, 200, NOW() - INTERVAL '1 day'),
  ('30000001-0000-0000-0000-000000000008', '10000001-0000-0000-0000-000000000008', 'e0000001-0000-0000-0000-000000000001', 150, 0, 20, 80, NOW() - INTERVAL '4 days'),
  ('30000001-0000-0000-0000-000000000009', '10000001-0000-0000-0000-000000000009', 'e0000001-0000-0000-0000-000000000001', 90,  0, 15, 60, NOW() - INTERVAL '3 days'),
  ('30000001-0000-0000-0000-000000000010', '10000001-0000-0000-0000-000000000010', 'e0000001-0000-0000-0000-000000000001', 240, 0, 30, 120, NOW() - INTERVAL '2 days'),
  ('30000001-0000-0000-0000-000000000011', '10000001-0000-0000-0000-000000000011', 'e0000001-0000-0000-0000-000000000001', 60,  0, 10, 30, NOW() - INTERVAL '5 days'),
  ('30000001-0000-0000-0000-000000000012', '10000001-0000-0000-0000-000000000012', 'e0000001-0000-0000-0000-000000000001', 75,  0, 15, 40, NOW() - INTERVAL '4 days'),
  ('30000001-0000-0000-0000-000000000013', '10000001-0000-0000-0000-000000000013', 'e0000001-0000-0000-0000-000000000001', 300, 12, 40, 150, NOW() - INTERVAL '1 day'),
  ('30000001-0000-0000-0000-000000000014', '10000001-0000-0000-0000-000000000014', 'e0000001-0000-0000-0000-000000000001', 180, 0, 25, 100, NOW() - INTERVAL '3 days'),
  ('30000001-0000-0000-0000-000000000015', '10000001-0000-0000-0000-000000000015', 'e0000001-0000-0000-0000-000000000001', 220, 0, 30, 100, NOW() - INTERVAL '2 days'),
  ('30000001-0000-0000-0000-000000000016', '10000001-0000-0000-0000-000000000016', 'e0000001-0000-0000-0000-000000000001', 40,  0, 10, 25, NOW() - INTERVAL '7 days'),
  ('30000001-0000-0000-0000-000000000017', '10000001-0000-0000-0000-000000000017', 'e0000001-0000-0000-0000-000000000001', 30,  0, 10, 20, NOW() - INTERVAL '1 day'),
  ('30000001-0000-0000-0000-000000000018', '10000001-0000-0000-0000-000000000018', 'e0000001-0000-0000-0000-000000000001', 25,  3, 8,  15, NOW() - INTERVAL '1 day'),
  ('30000001-0000-0000-0000-000000000019', '10000001-0000-0000-0000-000000000019', 'e0000001-0000-0000-0000-000000000001', 15,  2, 5,  10, NOW() - INTERVAL '1 day'),
  ('30000001-0000-0000-0000-000000000020', '10000001-0000-0000-0000-000000000020', 'e0000001-0000-0000-0000-000000000001', 20,  3, 5,  10, NOW() - INTERVAL '1 day'),
  ('30000001-0000-0000-0000-000000000021', '10000001-0000-0000-0000-000000000021', 'e0000001-0000-0000-0000-000000000001', 50,  5, 15, 30, NOW() - INTERVAL '6 hours'),
  ('30000001-0000-0000-0000-000000000022', '10000001-0000-0000-0000-000000000022', 'e0000001-0000-0000-0000-000000000001', 35,  0, 10, 20, NOW() - INTERVAL '5 days'),
  ('30000001-0000-0000-0000-000000000023', '10000001-0000-0000-0000-000000000023', 'e0000001-0000-0000-0000-000000000001', 80,  0, 15, 40, NOW() - INTERVAL '4 days'),
  ('30000001-0000-0000-0000-000000000024', '10000001-0000-0000-0000-000000000024', 'e0000001-0000-0000-0000-000000000001', 60,  0, 10, 30, NOW() - INTERVAL '6 days'),
  -- Restaurant stock (high numbers — made to order)
  ('30000001-0000-0000-0000-000000000101', '10000001-0000-0000-0000-000000000101', 'e0000001-0000-0000-0000-000000000003', 999, 0, 10, 999, NOW()),
  ('30000001-0000-0000-0000-000000000102', '10000001-0000-0000-0000-000000000102', 'e0000001-0000-0000-0000-000000000003', 999, 0, 10, 999, NOW()),
  ('30000001-0000-0000-0000-000000000103', '10000001-0000-0000-0000-000000000103', 'e0000001-0000-0000-0000-000000000003', 999, 0, 10, 999, NOW()),
  ('30000001-0000-0000-0000-000000000104', '10000001-0000-0000-0000-000000000104', 'e0000001-0000-0000-0000-000000000003', 999, 0, 10, 999, NOW()),
  ('30000001-0000-0000-0000-000000000105', '10000001-0000-0000-0000-000000000105', 'e0000001-0000-0000-0000-000000000003', 999, 0, 10, 999, NOW()),
  ('30000001-0000-0000-0000-000000000106', '10000001-0000-0000-0000-000000000106', 'e0000001-0000-0000-0000-000000000003', 999, 0, 10, 999, NOW()),
  ('30000001-0000-0000-0000-000000000107', '10000001-0000-0000-0000-000000000107', 'e0000001-0000-0000-0000-000000000003', 999, 0, 10, 999, NOW()),
  -- Pharmacy stock
  ('30000001-0000-0000-0000-000000000201', '10000001-0000-0000-0000-000000000201', 'e0000001-0000-0000-0000-000000000004', 500, 0, 50, 200, NOW() - INTERVAL '3 days'),
  ('30000001-0000-0000-0000-000000000202', '10000001-0000-0000-0000-000000000202', 'e0000001-0000-0000-0000-000000000004', 300, 0, 30, 150, NOW() - INTERVAL '5 days'),
  ('30000001-0000-0000-0000-000000000203', '10000001-0000-0000-0000-000000000203', 'e0000001-0000-0000-0000-000000000004', 250, 0, 30, 100, NOW() - INTERVAL '4 days'),
  ('30000001-0000-0000-0000-000000000204', '10000001-0000-0000-0000-000000000204', 'e0000001-0000-0000-0000-000000000004', 120, 0, 20, 50, NOW() - INTERVAL '7 days'),
  ('30000001-0000-0000-0000-000000000205', '10000001-0000-0000-0000-000000000205', 'e0000001-0000-0000-0000-000000000004', 200, 0, 25, 100, NOW() - INTERVAL '6 days'),
  ('30000001-0000-0000-0000-000000000206', '10000001-0000-0000-0000-000000000206', 'e0000001-0000-0000-0000-000000000004', 180, 0, 20, 80, NOW() - INTERVAL '4 days'),
  -- Electronics stock
  ('30000001-0000-0000-0000-000000000301', '10000001-0000-0000-0000-000000000301', 'e0000001-0000-0000-0000-000000000005', 155, 0, 20, 50, NOW() - INTERVAL '10 days'),
  ('30000001-0000-0000-0000-000000000302', '10000001-0000-0000-0000-000000000302', 'e0000001-0000-0000-0000-000000000005', 80,  0, 10, 30, NOW() - INTERVAL '14 days'),
  ('30000001-0000-0000-0000-000000000303', '10000001-0000-0000-0000-000000000303', 'e0000001-0000-0000-0000-000000000005', 60,  0, 10, 25, NOW() - INTERVAL '14 days');

-- =============================================================================
-- DELIVERY SCHEMA — Delivery Personnel
-- =============================================================================
INSERT INTO delivery.delivery_personnel (id, user_id, vehicle_type, vehicle_plate, license_number, license_expiry, status, is_online, current_latitude, current_longitude, current_zone_id, rating_average, total_deliveries) VALUES
  ('40000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000011', 'motorcycle', 'ABC-1234', 'N01-23-456789', '2027-06-15', 'active', TRUE,  14.6350, 121.0750, 'c0000001-0000-0000-0000-000000000001', 4.85, 856),
  ('40000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000012', 'motorcycle', 'DEF-5678', 'N02-34-567890', '2027-09-20', 'active', TRUE,  14.5540, 121.0200, 'c0000001-0000-0000-0000-000000000003', 4.70, 623),
  ('40000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000013', 'bicycle',    NULL,       NULL,             NULL,          'active', FALSE, 14.5870, 121.0615, 'c0000001-0000-0000-0000-000000000005', 4.60, 312);

-- =============================================================================
-- ORDERS SCHEMA — Orders (multiple statuses to test all flows)
-- =============================================================================

-- Order 1: DELIVERED grocery order (Maria → Aling Nena)
INSERT INTO orders.orders (id, order_number, customer_id, store_id, store_location_id, status, order_type, service_type, delivery_type, subtotal, delivery_fee, service_fee, tax_amount, discount_amount, total_amount, payment_method, payment_status, delivery_address, substitution_policy, estimated_delivery_at, actual_delivery_at, prepared_at, picked_up_at) VALUES
  ('50000001-0000-0000-0000-000000000001', 'DLT-20260228-001',
   'a0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001',
   'delivered', 'delivery', 'grocery', 'standard',
   785.50, 49.00, 15.00, 94.26, 0.00, 943.76,
   'gcash', 'captured',
   '{"address_line1": "123 Katipunan Ave", "barangay": "Loyola Heights", "city": "Quezon City", "latitude": 14.6407, "longitude": 121.0770}',
   'accept_similar',
   NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 30 minutes',
   NOW() - INTERVAL '3 hours 20 minutes', NOW() - INTERVAL '3 hours');

INSERT INTO orders.order_items (order_id, product_id, product_name, product_image_url, unit_price, quantity, total_price, status) VALUES
  ('50000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', 'Sinandomeng Premium Rice 5kg', '/images/products/thumb/sinandomeng-5kg.jpg', 265.00, 1, 265.00, 'confirmed'),
  ('50000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000004', 'Century Tuna Flakes in Oil 155g', '/images/products/thumb/century-tuna-155g.jpg', 38.50, 3, 115.50, 'confirmed'),
  ('50000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000007', 'Lucky Me! Pancit Canton Original 80g (6-pack)', '/images/products/thumb/lucky-me-6pk.jpg', 78.00, 2, 156.00, 'confirmed'),
  ('50000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000018', 'Carabao Mango (per kg)', '/images/products/thumb/carabao-mango.jpg', 160.00, 1, 160.00, 'confirmed'),
  ('50000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000011', 'Datu Puti Soy Sauce 1L', NULL, 55.00, 1, 55.00, 'confirmed'),
  ('50000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000021', 'Pandesal (10 pcs)', NULL, 50.00, 2, 100.00, 'substituted');

-- Order 2: IN_TRANSIT restaurant order (Juan → Kusina de Manila)
INSERT INTO orders.orders (id, order_number, customer_id, store_id, store_location_id, status, order_type, service_type, delivery_type, subtotal, delivery_fee, service_fee, tax_amount, discount_amount, total_amount, payment_method, payment_status, delivery_address, substitution_policy, estimated_delivery_at, prepared_at, picked_up_at) VALUES
  ('50000001-0000-0000-0000-000000000002', 'DLT-20260228-002',
   'a0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000003',
   'in_transit', 'delivery', 'food', 'express',
   778.00, 99.00, 20.00, 93.36, 0.00, 990.36,
   'maya', 'authorized',
   '{"address_line1": "78 Jupiter St", "barangay": "Bel-Air", "city": "Makati", "latitude": 14.5563, "longitude": 121.0198}',
   'refund_only',
   NOW() + INTERVAL '25 minutes',
   NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '5 minutes');

INSERT INTO orders.order_items (order_id, product_id, product_name, product_image_url, unit_price, quantity, total_price, status) VALUES
  ('50000001-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000101', 'Chicken Adobo (Solo)', '/images/products/thumb/chicken-adobo.jpg', 149.00, 2, 298.00, 'confirmed'),
  ('50000001-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000102', 'Sinigang na Baboy (Family)', '/images/products/thumb/sinigang-baboy.jpg', 450.00, 1, 450.00, 'confirmed'),
  ('50000001-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000106', 'Halo-Halo Special', '/images/products/thumb/halo-halo.jpg', 120.00, 1, 120.00, 'unavailable');

-- Order 3: PENDING pharmacy order (Anna → Botica ng Bayan)
INSERT INTO orders.orders (id, order_number, customer_id, store_id, store_location_id, status, order_type, service_type, delivery_type, subtotal, delivery_fee, service_fee, tax_amount, discount_amount, total_amount, payment_method, payment_status, delivery_address, substitution_policy) VALUES
  ('50000001-0000-0000-0000-000000000003', 'DLT-20260228-003',
   'a0000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000004',
   'pending', 'delivery', 'pharmacy', 'standard',
   427.50, 49.00, 10.00, 51.30, 0.00, 537.80,
   'cod', 'pending',
   '{"address_line1": "25th St cor 5th Ave", "barangay": "Fort Bonifacio", "city": "Taguig", "latitude": 14.5509, "longitude": 121.0500}',
   'specific_only');

INSERT INTO orders.order_items (order_id, product_id, product_name, product_image_url, unit_price, quantity, total_price, status) VALUES
  ('50000001-0000-0000-0000-000000000003', '10000001-0000-0000-0000-000000000201', 'Biogesic Paracetamol 500mg (10 tablets)', '/images/products/thumb/biogesic-10s.jpg', 12.50, 2, 25.00, 'pending'),
  ('50000001-0000-0000-0000-000000000003', '10000001-0000-0000-0000-000000000204', 'Poten-Cee Vitamin C 500mg (100 capsules)', NULL, 350.00, 1, 350.00, 'pending'),
  ('50000001-0000-0000-0000-000000000003', '10000001-0000-0000-0000-000000000205', 'Safeguard Pure White Soap 135g', NULL, 48.00, 1, 48.00, 'pending');

-- Order 4: CANCELLED grocery order (Juan → Aling Nena)
INSERT INTO orders.orders (id, order_number, customer_id, store_id, store_location_id, status, order_type, service_type, delivery_type, subtotal, delivery_fee, service_fee, tax_amount, discount_amount, total_amount, payment_method, payment_status, delivery_address, substitution_policy, cancellation_reason) VALUES
  ('50000001-0000-0000-0000-000000000004', 'DLT-20260227-001',
   'a0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001',
   'cancelled', 'delivery', 'grocery', 'standard',
   380.00, 49.00, 15.00, 45.60, 0.00, 489.60,
   'gcash', 'refunded',
   '{"address_line1": "78 Jupiter St", "barangay": "Bel-Air", "city": "Makati", "latitude": 14.5563, "longitude": 121.0198}',
   'refund_only',
   'Changed my mind — will buy in person instead');

INSERT INTO orders.order_items (order_id, product_id, product_name, unit_price, quantity, total_price, status) VALUES
  ('50000001-0000-0000-0000-000000000004', '10000001-0000-0000-0000-000000000019', 'Pork Liempo (Belly) per kg', 380.00, 1, 380.00, 'cancelled');

-- Order 5: PREPARING pickup order (Maria → Kusina de Manila)
INSERT INTO orders.orders (id, order_number, customer_id, store_id, store_location_id, status, order_type, service_type, subtotal, delivery_fee, service_fee, tax_amount, discount_amount, total_amount, payment_method, payment_status, substitution_policy, estimated_delivery_at) VALUES
  ('50000001-0000-0000-0000-000000000005', 'DLT-20260228-004',
   'a0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000003',
   'preparing', 'pickup', 'food',
   463.00, 0.00, 10.00, 55.56, 0.00, 528.56,
   'wallet', 'captured',
   'refund_only',
   NOW() + INTERVAL '20 minutes');

INSERT INTO orders.order_items (order_id, product_id, product_name, unit_price, quantity, total_price, status) VALUES
  ('50000001-0000-0000-0000-000000000005', '10000001-0000-0000-0000-000000000104', 'Lechon Kawali (Solo)', 179.00, 1, 179.00, 'confirmed'),
  ('50000001-0000-0000-0000-000000000005', '10000001-0000-0000-0000-000000000105', 'Bistek Tagalog (Solo)', 189.00, 1, 189.00, 'confirmed'),
  ('50000001-0000-0000-0000-000000000005', '10000001-0000-0000-0000-000000000107', 'Palabok Fiesta (Solo)', 135.00, 1, 135.00, 'pending');

-- Order 6: CONFIRMED electronics order (Anna → TechMart PH)
INSERT INTO orders.orders (id, order_number, customer_id, store_id, store_location_id, status, order_type, service_type, delivery_type, subtotal, delivery_fee, service_fee, tax_amount, discount_amount, total_amount, payment_method, payment_status, delivery_address, substitution_policy) VALUES
  ('50000001-0000-0000-0000-000000000006', 'DLT-20260228-005',
   'a0000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000005',
   'confirmed', 'delivery', 'parcel', 'standard',
   1048.00, 49.00, 20.00, 125.76, 0.00, 1242.76,
   'card', 'authorized',
   '{"address_line1": "25th St cor 5th Ave", "barangay": "Fort Bonifacio", "city": "Taguig", "latitude": 14.5509, "longitude": 121.0500}',
   'refund_only');

INSERT INTO orders.order_items (order_id, product_id, variant_id, product_name, unit_price, quantity, total_price, status) VALUES
  ('50000001-0000-0000-0000-000000000006', '10000001-0000-0000-0000-000000000301', '20000001-0000-0000-0000-000000000002', 'Universal Phone Case - iPhone 16', 349.00, 1, 349.00, 'confirmed'),
  ('50000001-0000-0000-0000-000000000006', '10000001-0000-0000-0000-000000000302', NULL, 'USB-C Fast Charger 65W', 799.00, 1, 799.00, 'confirmed');

-- =============================================================================
-- DELIVERY SCHEMA — Deliveries
-- =============================================================================
INSERT INTO delivery.deliveries (id, order_id, personnel_id, status, pickup_location, dropoff_location, estimated_pickup_at, actual_pickup_at, estimated_delivery_at, actual_delivery_at, distance_km, delivery_fee, tip_amount, proof_of_delivery) VALUES
  -- Delivery for Order 1 (DELIVERED)
  ('60000001-0000-0000-0000-000000000001', '50000001-0000-0000-0000-000000000001', '40000001-0000-0000-0000-000000000001',
   'delivered',
   '{"address": "456 Commonwealth Ave, QC", "latitude": 14.6573, "longitude": 121.0564}',
   '{"address": "123 Katipunan Ave, QC", "latitude": 14.6407, "longitude": 121.0770}',
   NOW() - INTERVAL '3 hours 30 minutes', NOW() - INTERVAL '3 hours',
   NOW() - INTERVAL '2 hours 30 minutes', NOW() - INTERVAL '2 hours 30 minutes',
   3.20, 49.00, 20.00,
   '{"photo_url": "/proofs/delivery-001.jpg", "signature": true, "received_by": "Maria Santos"}'),

  -- Delivery for Order 2 (IN_TRANSIT)
  ('60000001-0000-0000-0000-000000000002', '50000001-0000-0000-0000-000000000002', '40000001-0000-0000-0000-000000000002',
   'in_transit',
   '{"address": "99 Pasong Tamo Ext, Makati", "latitude": 14.5547, "longitude": 121.0198}',
   '{"address": "78 Jupiter St, Makati", "latitude": 14.5563, "longitude": 121.0198}',
   NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '5 minutes',
   NOW() + INTERVAL '25 minutes', NULL,
   1.80, 99.00, 0.00, NULL);

-- =============================================================================
-- PAYMENTS SCHEMA — Transactions
-- =============================================================================
INSERT INTO payments.transactions (id, order_id, user_id, type, method, status, amount, currency, gateway_transaction_id, idempotency_key, completed_at) VALUES
  -- Order 1 — GCash charge (completed)
  ('70000001-0000-0000-0000-000000000001', '50000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002',
   'charge', 'gcash', 'completed', 943.76, 'PHP', 'GCASH-TXN-20260228-001', 'idem-order-001-charge', NOW() - INTERVAL '4 hours'),

  -- Order 2 — Maya charge (processing)
  ('70000001-0000-0000-0000-000000000002', '50000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000003',
   'charge', 'maya', 'processing', 990.36, 'PHP', 'MAYA-TXN-20260228-001', 'idem-order-002-charge', NULL),

  -- Order 3 — COD (pending)
  ('70000001-0000-0000-0000-000000000003', '50000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000004',
   'charge', 'cod', 'pending', 537.80, 'PHP', NULL, 'idem-order-003-charge', NULL),

  -- Order 4 — GCash refund (completed)
  ('70000001-0000-0000-0000-000000000004', '50000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000003',
   'charge', 'gcash', 'reversed', 489.60, 'PHP', 'GCASH-TXN-20260227-001', 'idem-order-004-charge', NOW() - INTERVAL '1 day'),
  ('70000001-0000-0000-0000-000000000005', '50000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000003',
   'refund', 'gcash', 'completed', 489.60, 'PHP', 'GCASH-TXN-20260227-002', 'idem-order-004-refund', NOW() - INTERVAL '23 hours'),

  -- Order 5 — Wallet charge (completed)
  ('70000001-0000-0000-0000-000000000006', '50000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000002',
   'charge', 'wallet', 'completed', 528.56, 'PHP', NULL, 'idem-order-005-charge', NOW() - INTERVAL '30 minutes'),

  -- Order 6 — Card charge (processing)
  ('70000001-0000-0000-0000-000000000007', '50000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000004',
   'charge', 'card', 'processing', 1242.76, 'PHP', 'STRIPE-PI-20260228-001', 'idem-order-006-charge', NULL);

-- =============================================================================
-- INVENTORY SCHEMA — Stock Movements (sample history)
-- =============================================================================
INSERT INTO inventory.stock_movements (stock_id, movement_type, quantity, reference_type, reference_id, notes, performed_by) VALUES
  -- Restocking events
  ('30000001-0000-0000-0000-000000000001', 'in', 50, 'purchase_order', gen_random_uuid(), 'Weekly restock from supplier', 'a0000001-0000-0000-0000-000000000009'),
  ('30000001-0000-0000-0000-000000000004', 'in', 100, 'purchase_order', gen_random_uuid(), 'Bulk order from Century Pacific', 'a0000001-0000-0000-0000-000000000009'),
  ('30000001-0000-0000-0000-000000000007', 'in', 200, 'purchase_order', gen_random_uuid(), 'Lucky Me! promo stock', 'a0000001-0000-0000-0000-000000000009'),
  -- Order reservation events
  ('30000001-0000-0000-0000-000000000001', 'reservation', 1, 'order', '50000001-0000-0000-0000-000000000001', 'Reserved for order DLT-20260228-001', NULL),
  ('30000001-0000-0000-0000-000000000004', 'reservation', 3, 'order', '50000001-0000-0000-0000-000000000001', 'Reserved for order DLT-20260228-001', NULL),
  ('30000001-0000-0000-0000-000000000007', 'reservation', 2, 'order', '50000001-0000-0000-0000-000000000001', 'Reserved for order DLT-20260228-001', NULL),
  -- Order fulfillment (stock out)
  ('30000001-0000-0000-0000-000000000001', 'out', 1, 'order', '50000001-0000-0000-0000-000000000001', 'Fulfilled order DLT-20260228-001', NULL),
  ('30000001-0000-0000-0000-000000000004', 'out', 3, 'order', '50000001-0000-0000-0000-000000000001', 'Fulfilled order DLT-20260228-001', NULL),
  -- Return from cancelled order
  ('30000001-0000-0000-0000-000000000019', 'return', 1, 'order', '50000001-0000-0000-0000-000000000004', 'Returned: cancelled order DLT-20260227-001', NULL);

-- =============================================================================
-- PAYMENTS SCHEMA — Vendor Settlement (sample)
-- =============================================================================
INSERT INTO payments.vendor_settlements (vendor_id, period_start, period_end, gross_amount, commission_amount, net_amount, withholding_tax, final_amount, status, settlement_date) VALUES
  ('d0000001-0000-0000-0000-000000000001',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days',
   25800.00, 3096.00, 22704.00, 454.08, 22249.92,
   'completed', NOW() - INTERVAL '5 days'),
  ('d0000001-0000-0000-0000-000000000002',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days',
   42500.00, 9350.00, 33150.00, 663.00, 32487.00,
   'completed', NOW() - INTERVAL '5 days');

-- =============================================================================
-- PROMOTIONS SCHEMA — Coupons
-- =============================================================================
INSERT INTO promotions.coupons (id, code, name, description, discount_type, discount_value, minimum_order_value, maximum_discount, applicable_categories, applicable_stores, usage_limit, usage_count, per_user_limit, is_first_order_only, valid_from, valid_until, is_active, created_by) VALUES
  ('c0000001-0000-0000-0000-000000000001',
   'WELCOME50', 'Welcome 50% Off', 'Get 50% off your first order! Maximum discount of PHP 500.',
   'percentage', 50.00, 200.00, 500.00,
   NULL, NULL, NULL, 0, 1, TRUE,
   NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE,
   'a0000001-0000-0000-0000-000000000001'),
  ('c0000001-0000-0000-0000-000000000002',
   'SAVE100', 'Save PHP 100', 'Get PHP 100 off on orders above PHP 500.',
   'fixed_amount', 100.00, 500.00, NULL,
   NULL, NULL, 1000, 0, 3, FALSE,
   NOW() - INTERVAL '7 days', NOW() + INTERVAL '90 days', TRUE,
   'a0000001-0000-0000-0000-000000000001'),
  ('c0000001-0000-0000-0000-000000000003',
   'FREEDEL', 'Free Delivery', 'Free delivery on any order above PHP 300.',
   'free_delivery', 0.00, 300.00, NULL,
   NULL, NULL, 500, 0, 5, FALSE,
   NOW() - INTERVAL '3 days', NOW() + INTERVAL '60 days', TRUE,
   'a0000001-0000-0000-0000-000000000001');

-- =============================================================================
-- REVIEWS SCHEMA — Reviews
-- =============================================================================
-- Review 1: Maria reviews Tindahan ni Aling Nena (store) — from delivered Order 1
INSERT INTO reviews.reviews (id, user_id, order_id, reviewable_type, reviewable_id, rating, title, body, images, is_verified_purchase, is_approved, helpful_count) VALUES
  ('70000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000002', '50000001-0000-0000-0000-000000000001',
   'store', 'd0000001-0000-0000-0000-000000000001',
   5, 'Sobrang galing!', 'Ang bilis ng delivery at kumpleto lahat ng order ko. Fresh pa yung mga gulay at prutas. Highly recommended si Aling Nena!',
   ARRAY['/images/reviews/aling-nena-haul-1.jpg'], TRUE, TRUE, 12);

-- Review 2: Maria reviews Sinandomeng Rice (product) — from delivered Order 1
INSERT INTO reviews.reviews (id, user_id, order_id, reviewable_type, reviewable_id, rating, title, body, is_verified_purchase, is_approved, helpful_count) VALUES
  ('70000001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000002', '50000001-0000-0000-0000-000000000001',
   'product', '10000001-0000-0000-0000-000000000001',
   5, 'Best rice!', 'Masarap talaga ang Sinandomeng. Malagkit at mabango. Sulit sa presyo.',
   TRUE, TRUE, 8);

-- Review 3: Maria reviews Century Tuna (product) — from delivered Order 1
INSERT INTO reviews.reviews (id, user_id, order_id, reviewable_type, reviewable_id, rating, title, body, is_verified_purchase, is_approved, helpful_count) VALUES
  ('70000001-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000002', '50000001-0000-0000-0000-000000000001',
   'product', '10000001-0000-0000-0000-000000000004',
   4, 'Good value', 'Classic Century Tuna. Laging reliable. Medyo maliit lang yung lata pero okay naman sa presyo.',
   TRUE, TRUE, 3);

-- Review 4: Maria reviews Rider Mark (delivery_personnel) — from delivered Order 1
INSERT INTO reviews.reviews (id, user_id, order_id, reviewable_type, reviewable_id, rating, title, body, is_verified_purchase, is_approved, helpful_count) VALUES
  ('70000001-0000-0000-0000-000000000004',
   'a0000001-0000-0000-0000-000000000002', '50000001-0000-0000-0000-000000000001',
   'delivery_personnel', '40000001-0000-0000-0000-000000000001',
   5, 'Very polite rider', 'Si Kuya Mark sobrang bait! Nag-text pa bago dumating. Maingat sa pagdala ng groceries.',
   TRUE, TRUE, 5);

-- Review 5: Juan reviews Kusina de Manila (store) — hypothetical completed order
INSERT INTO reviews.reviews (id, user_id, order_id, reviewable_type, reviewable_id, rating, title, body, images, is_verified_purchase, is_approved, vendor_response, vendor_response_at, helpful_count) VALUES
  ('70000001-0000-0000-0000-000000000005',
   'a0000001-0000-0000-0000-000000000003', NULL,
   'store', 'd0000001-0000-0000-0000-000000000002',
   4, 'Masarap pero medyo matagal', 'Yung adobo nila sobrang sarap, parang home-cooked talaga. Kaya lang medyo natagalan ang preparation time. Overall worth it!',
   ARRAY['/images/reviews/kusina-adobo.jpg', '/images/reviews/kusina-sinigang.jpg'], FALSE, TRUE,
   'Salamat po sa feedback, Juan! We are working on speeding up our kitchen. Hope to serve you again soon! 🙏',
   NOW() - INTERVAL '1 day', 7);

-- Review 6: Anna reviews Chicken Adobo product
INSERT INTO reviews.reviews (id, user_id, reviewable_type, reviewable_id, rating, title, body, is_verified_purchase, is_approved, helpful_count) VALUES
  ('70000001-0000-0000-0000-000000000006',
   'a0000001-0000-0000-0000-000000000004',
   'product', '10000001-0000-0000-0000-000000000101',
   5, 'Parang luto ng nanay ko!', 'Authentic na authentic. Yung sauce niya tamang-tama ang lasa. Sana may extra rice option next time.',
   FALSE, TRUE, 15);

-- Review 7: Juan reviews Biogesic Paracetamol (low rating)
INSERT INTO reviews.reviews (id, user_id, reviewable_type, reviewable_id, rating, title, body, is_verified_purchase, is_approved, helpful_count) VALUES
  ('70000001-0000-0000-0000-000000000007',
   'a0000001-0000-0000-0000-000000000003',
   'product', '10000001-0000-0000-0000-000000000201',
   3, 'Okay naman', 'Standard Biogesic. Medyo mura dito kumpara sa ibang store. Packaging okay naman.',
   FALSE, TRUE, 1);

-- Review 8: Anna reviews Tindahan ni Aling Nena (different perspective)
INSERT INTO reviews.reviews (id, user_id, reviewable_type, reviewable_id, rating, title, body, is_verified_purchase, is_approved, helpful_count) VALUES
  ('70000001-0000-0000-0000-000000000008',
   'a0000001-0000-0000-0000-000000000004',
   'store', 'd0000001-0000-0000-0000-000000000001',
   4, 'Maganda selection', 'Maraming choices si Aling Nena. Yung fresh produce niya mura. Sana magdagdag pa ng organic options.',
   FALSE, TRUE, 4);

-- Review 9: Pending moderation review
INSERT INTO reviews.reviews (id, user_id, reviewable_type, reviewable_id, rating, title, body, is_verified_purchase, is_approved, helpful_count) VALUES
  ('70000001-0000-0000-0000-000000000009',
   'a0000001-0000-0000-0000-000000000003',
   'store', 'd0000001-0000-0000-0000-000000000003',
   2, 'Hindi ko nagustuhan', 'Matagal ang delivery at may kulang sa order. Need improvement.',
   FALSE, FALSE, 0);

-- Review 10: Maria reviews Carabao Mango
INSERT INTO reviews.reviews (id, user_id, order_id, reviewable_type, reviewable_id, rating, title, body, images, is_verified_purchase, is_approved, helpful_count) VALUES
  ('70000001-0000-0000-0000-000000000010',
   'a0000001-0000-0000-0000-000000000002', '50000001-0000-0000-0000-000000000001',
   'product', '10000001-0000-0000-0000-000000000018',
   5, 'Matamis na matamis!', 'Best Carabao mango I ever ordered online. Hinog na hinog at matamis. Will definitely order again!',
   ARRAY['/images/reviews/mango-review.jpg'], TRUE, TRUE, 9);

-- =============================================================================
-- REVIEWS SCHEMA — Helpful votes
-- =============================================================================
INSERT INTO reviews.review_helpful (id, review_id, user_id) VALUES
  ('71000001-0000-0000-0000-000000000001', '70000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003'),
  ('71000001-0000-0000-0000-000000000002', '70000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004'),
  ('71000001-0000-0000-0000-000000000003', '70000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000002'),
  ('71000001-0000-0000-0000-000000000004', '70000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000002'),
  ('71000001-0000-0000-0000-000000000005', '70000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000003'),
  ('71000001-0000-0000-0000-000000000006', '70000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000003'),
  ('71000001-0000-0000-0000-000000000007', '70000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000004');

-- =============================================================================
-- LOYALTY SCHEMA — Accounts
-- =============================================================================

-- Juan (customer) — Gold tier, active loyalty member
INSERT INTO loyalty.accounts (id, user_id, account_type, points_balance, lifetime_points, tier, tier_expires_at, is_active) VALUES
  ('80000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'standard', 5250, 8750, 'gold',
   NOW() + INTERVAL '10 months', TRUE);

-- Maria (customer) — Silver tier
INSERT INTO loyalty.accounts (id, user_id, account_type, points_balance, lifetime_points, tier, tier_expires_at, is_active) VALUES
  ('80000001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000002',
   'standard', 1200, 2800, 'silver',
   NOW() + INTERVAL '8 months', TRUE);

-- Pedro (customer) — Bronze tier
INSERT INTO loyalty.accounts (id, user_id, account_type, points_balance, lifetime_points, tier, tier_expires_at, is_active) VALUES
  ('80000001-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000003',
   'standard', 350, 650, 'bronze',
   NULL, TRUE);

-- =============================================================================
-- LOYALTY SCHEMA — Transactions
-- =============================================================================

-- Juan's transactions
INSERT INTO loyalty.transactions (id, account_id, type, points, balance_after, reference_type, reference_id, description, created_at) VALUES
  ('81000001-0000-0000-0000-000000000001',
   '80000001-0000-0000-0000-000000000001',
   'earn', 2500, 2500, 'order', '50000001-0000-0000-0000-000000000001',
   'Points earned from order #ORD-20250210-0001', NOW() - INTERVAL '45 days'),
  ('81000001-0000-0000-0000-000000000002',
   '80000001-0000-0000-0000-000000000001',
   'earn', 3200, 5700, 'order', '50000001-0000-0000-0000-000000000002',
   'Points earned from order #ORD-20250210-0002', NOW() - INTERVAL '30 days'),
  ('81000001-0000-0000-0000-000000000003',
   '80000001-0000-0000-0000-000000000001',
   'bonus', 500, 6200, NULL, NULL,
   'Welcome bonus — Gold tier reached!', NOW() - INTERVAL '30 days'),
  ('81000001-0000-0000-0000-000000000004',
   '80000001-0000-0000-0000-000000000001',
   'redeem', -950, 5250, 'order', '50000001-0000-0000-0000-000000000003',
   'Points redeemed for P475 discount', NOW() - INTERVAL '10 days');

-- Maria's transactions
INSERT INTO loyalty.transactions (id, account_id, type, points, balance_after, reference_type, reference_id, description, created_at) VALUES
  ('81000001-0000-0000-0000-000000000005',
   '80000001-0000-0000-0000-000000000002',
   'earn', 1800, 1800, 'order', '50000001-0000-0000-0000-000000000004',
   'Points earned from order #ORD-20250211-0001', NOW() - INTERVAL '25 days'),
  ('81000001-0000-0000-0000-000000000006',
   '80000001-0000-0000-0000-000000000002',
   'earn', 1000, 2800, 'order', '50000001-0000-0000-0000-000000000005',
   'Points earned from order #ORD-20250211-0002', NOW() - INTERVAL '15 days'),
  ('81000001-0000-0000-0000-000000000007',
   '80000001-0000-0000-0000-000000000002',
   'redeem', -600, 1200, 'order', '50000001-0000-0000-0000-000000000006',
   'Points redeemed for P300 discount', NOW() - INTERVAL '5 days');

-- Pedro's transaction
INSERT INTO loyalty.transactions (id, account_id, type, points, balance_after, reference_type, reference_id, description, created_at) VALUES
  ('81000001-0000-0000-0000-000000000008',
   '80000001-0000-0000-0000-000000000003',
   'earn', 650, 650, 'order', '50000001-0000-0000-0000-000000000003',
   'Points earned from order', NOW() - INTERVAL '20 days');

-- =============================================================================
-- CHAT SEED DATA
-- =============================================================================

-- Conversation for Order #1 (Maria's delivered order)
INSERT INTO chat.conversations (id, type, order_id, title, status, last_message_at, last_message_preview, message_count, created_at) VALUES
  ('90000001-0000-0000-0000-000000000001',
   'order', '50000001-0000-0000-0000-000000000001',
   NULL, 'closed',
   NOW() - INTERVAL '2 days', 'Salamat po, natanggap ko na!', 4,
   NOW() - INTERVAL '3 days');

-- Conversation for Order #2 (Juan's in-transit order)
INSERT INTO chat.conversations (id, type, order_id, title, status, last_message_at, last_message_preview, message_count, created_at) VALUES
  ('90000001-0000-0000-0000-000000000002',
   'order', '50000001-0000-0000-0000-000000000002',
   NULL, 'active',
   NOW() - INTERVAL '30 minutes', 'On my way po, mga 10 minutes na lang!', 3,
   NOW() - INTERVAL '1 hour');

-- Support conversation
INSERT INTO chat.conversations (id, type, order_id, title, status, last_message_at, last_message_preview, message_count, created_at) VALUES
  ('90000001-0000-0000-0000-000000000003',
   'support', NULL,
   'Refund inquiry', 'active',
   NOW() - INTERVAL '1 hour', 'We are processing your refund. Please allow 3-5 business days.', 2,
   NOW() - INTERVAL '2 hours');

-- Participants for conversation 1 (Maria <-> Rider Mike)
INSERT INTO chat.conversation_participants (id, conversation_id, user_id, user_type, display_name, unread_count, joined_at) VALUES
  ('91000001-0000-0000-0000-000000000001',
   '90000001-0000-0000-0000-000000000001',
   '10000001-0000-0000-0000-000000000001', 'customer', 'Maria Santos', 0,
   NOW() - INTERVAL '3 days'),
  ('91000001-0000-0000-0000-000000000002',
   '90000001-0000-0000-0000-000000000001',
   '10000001-0000-0000-0000-000000000011', 'delivery', 'Kuya Mike', 0,
   NOW() - INTERVAL '3 days');

-- Participants for conversation 2 (Juan <-> Rider Joy)
INSERT INTO chat.conversation_participants (id, conversation_id, user_id, user_type, display_name, unread_count, joined_at) VALUES
  ('91000001-0000-0000-0000-000000000003',
   '90000001-0000-0000-0000-000000000002',
   '10000001-0000-0000-0000-000000000002', 'customer', 'Juan dela Cruz', 1,
   NOW() - INTERVAL '1 hour'),
  ('91000001-0000-0000-0000-000000000004',
   '90000001-0000-0000-0000-000000000002',
   '10000001-0000-0000-0000-000000000012', 'delivery', 'Ate Joy', 0,
   NOW() - INTERVAL '1 hour');

-- Participants for support conversation (Ana <-> Admin)
INSERT INTO chat.conversation_participants (id, conversation_id, user_id, user_type, display_name, unread_count, joined_at) VALUES
  ('91000001-0000-0000-0000-000000000005',
   '90000001-0000-0000-0000-000000000003',
   '10000001-0000-0000-0000-000000000003', 'customer', 'Ana Reyes', 0,
   NOW() - INTERVAL '2 hours'),
  ('91000001-0000-0000-0000-000000000006',
   '90000001-0000-0000-0000-000000000003',
   '10000001-0000-0000-0000-000000000010', 'admin', 'Daltaners Support', 0,
   NOW() - INTERVAL '2 hours');

COMMIT;
