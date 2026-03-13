-- HABIO MVP Seed Data — Housekeeping Job Cards Catalog
-- Run AFTER schema.sql
--
-- WARNING: This script clears ALL catalog and plan/cart data before re-inserting.
-- Customer profiles are preserved. If you want to keep existing plan/cart data,
-- do NOT run this script on a production database with live data.
--
-- Deletion order respects FK constraints (leaf tables first).
-- =====================
-- CLEAR EXISTING CATALOG & PLAN DATA
-- =====================
DELETE FROM payments;
DELETE FROM plan_request_events;
DELETE FROM plan_request_items;
DELETE FROM plan_requests;
DELETE FROM cart_items;
DELETE FROM carts;
DELETE FROM job_pricing;
DELETE FROM job_expectations;
DELETE FROM service_jobs;
DELETE FROM service_categories;

-- =====================
-- SERVICE CATEGORIES
-- code = short prefix used in job codes
-- =====================
INSERT INTO service_categories (id, slug, name, code, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'housekeeping',       'Housekeeping',       'HKP', 1),
  ('00000000-0000-0000-0000-000000000002', 'kitchen-services',   'Kitchen Services',   'KCH', 2),
  ('00000000-0000-0000-0000-000000000003', 'garden-care',        'Garden Care',        'GRD', 3),
  ('00000000-0000-0000-0000-000000000004', 'car-care',           'Car Care',           'CAR', 4),
  ('00000000-0000-0000-0000-000000000005', 'on-demand',          'On-demand Services', 'OND', 5);

-- =====================
-- SERVICE JOBS — Housekeeping  (rows 2–7, 15–17 from the catalog sheet)
--
-- formula_type:
--   standard      => base_price = input * base_rate_per_unit * instances_per_month
--   time_multiple => base_price = input * time_multiple * base_rate_per_unit * instances_per_month
--   compound_head => base_price = input * ((TM_head*rate_head*inst_head) + (TM_child*rate_child*inst_child))
--   compound_child => priced via compound_head row; never shown to user as standalone
-- =====================

-- Row 2: HKP-001 | Dusting, Brooming & Mopping | standard | Daily | 26 instances
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'aa000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'hkp-001', 'Dusting, Brooming & Mopping',
  'HKP-001', 'HKP1', 'Core - Routine', 'Housekeeping Plan', 'Sweep & Clean',
  'Daily', 'min', 15, 30, 90, 45,
  NULL, 0.6500, 26, 0.2000,
  false, 'standard', NULL, 1
);

-- Row 3: HKP-002 | Dishwashing | standard | Daily | 26 instances
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'aa000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'hkp-002', 'Dishwashing',
  'HKP-002', 'HKP1', 'Core - Routine', 'Housekeeping Plan', 'Kitchen Support',
  'Daily', 'min', 15, 30, 90, 45,
  NULL, 0.6000, 26, 0.2000,
  false, 'standard', NULL, 2
);

-- Row 4: HKP-003 | Kitchen Slab & Stove Cleaning | standard | Daily | 26 instances
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'aa000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'hkp-003', 'Kitchen Slab & Stove Cleaning',
  'HKP-003', 'HKP1', 'Core - Routine', 'Housekeeping Plan', 'Kitchen Support',
  'Daily', 'min', 15, 15, 60, 15,
  NULL, 0.6000, 26, 0.2000,
  false, 'standard', NULL, 3
);

-- Row 5: HKP-004 | Washroom Cleaning | time_multiple | 3x/week | 12 instances
-- input = number of washrooms; each washroom takes time_multiple=45 min
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'aa000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'hkp-004', 'Washroom Cleaning',
  'HKP-004', 'HKP1', 'Core - Routine', 'Housekeeping Plan', 'Washroom Care',
  '3x / week', 'count_washrooms', 1, 1, 5, 1,
  45, 0.6500, 12, 0.2000,
  false, 'time_multiple', NULL, 4
);

-- Row 6: HKP-005 | Bed Making & Linen Arrangement | standard | Daily | 26 instances
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'aa000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'hkp-005', 'Bed Making & Linen Arrangement',
  'HKP-005', 'HKP1', 'Core - Routine', 'Housekeeping Plan', 'Bedroom Care',
  'Daily', 'min', 15, 15, 45, 15,
  NULL, 0.5500, 26, 0.2000,
  false, 'standard', NULL, 5
);

-- Row 7: HKP-006 | Balcony & Common Area Cleaning | time_multiple | 2x/week | 8 instances
-- input = number of balconies; each balcony takes time_multiple=20 min
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'aa000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'hkp-006', 'Balcony & Common Area Cleaning',
  'HKP-006', 'HKP1', 'Add on - Routine', 'Housekeeping Plan', 'Balcony Care',
  '2x / week', 'count_balconies', 1, 1, 3, 1,
  20, 0.5500, 8, 0.2000,
  false, 'time_multiple', NULL, 6
);

-- Row 15: HKP-007H | Weekly Deep Home Clean | compound_head | Weekly | 4 instances
-- base_price = input * ((TM_head * rate_head * inst_head) + (TM_child * rate_child * inst_child))
--            = input * ((2.0 * 0.65 * 4) + (1.0 * 0.65 * 4))
--            = input * 7.8
-- At default 90 min: 90 * 7.8 = 702 base, 562 effective
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'aa000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'hkp-007h', 'Weekly Deep Home Clean',
  'HKP-007H', 'HKP1', 'Add on - Routine', 'Housekeeping Plan', 'Deep Clean',
  'Weekly', 'min', 30, 60, 180, 90,
  2.0, 0.6500, 4, 0.2000,
  false, 'compound_head', 'HKP-007C', 7
);

-- Row 16: HKP-007C | Deep Clean - Bathroom Tiles Component | compound_child (hidden from user)
-- discount_pct matches parent (0.2000) for consistency; the compound_head formula applies
-- the discount once to the combined base price, so this value is informational only.
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'aa000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  'hkp-007c', 'Deep Clean - Bathroom Tiles Component',
  'HKP-007C', 'HKP1', NULL, 'Housekeeping Plan', 'Deep Clean',
  'Weekly', 'min', 30, 60, 180, 90,
  1.0, 0.6500, 4, 0.2000,
  false, 'compound_child', NULL, 8
);

-- Row 17: HKP-008 | Add-on Buffer Time (General Purpose) | time_multiple | Daily | 26 instances
-- This is the "buffer" time for tasks that may run over (time_multiple=1 makes it same as standard)
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'aa000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  'hkp-008', 'Add-on Buffer Time (General Purpose)',
  'HKP-008', 'HKP1', 'Add on - Routine', 'Housekeeping Plan', 'General Buffer',
  'Daily', 'min', 15, 15, 60, 15,
  1.0, 0.6500, 26, 0.2000,
  false, 'time_multiple', NULL, 9
);

-- =====================
-- SERVICE JOBS — Kitchen Services  (rows 8–11, 18)
-- =====================

-- Row 8: KCH-001 | Breakfast Preparation | standard | Daily | 26 instances
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'bb000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'kch-001', 'Breakfast Preparation',
  'KCH-001', 'KCH', 'Core - Routine', 'Kitchen Plan', 'Breakfast',
  'Daily', 'min', 15, 30, 90, 30,
  NULL, 0.8000, 26, 0.2000,
  false, 'standard', NULL, 1
);

-- Row 9: KCH-002 | Lunch Preparation | standard | Daily | 26 instances
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'bb000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'kch-002', 'Lunch Preparation',
  'KCH-002', 'KCH', 'Core - Routine', 'Kitchen Plan', 'Lunch',
  'Daily', 'min', 15, 45, 120, 60,
  NULL, 0.8000, 26, 0.2000,
  false, 'standard', NULL, 2
);

-- Row 10: KCH-003 | Dinner Preparation | standard | Daily | 26 instances
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'bb000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'kch-003', 'Dinner Preparation',
  'KCH-003', 'KCH', 'Core - Routine', 'Kitchen Plan', 'Dinner',
  'Daily', 'min', 15, 45, 120, 60,
  NULL, 0.8000, 26, 0.2000,
  false, 'standard', NULL, 3
);

-- Row 11: KCH-004 | Tiffin Packing | standard | Daily | 26 instances
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'bb000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  'kch-004', 'Tiffin Packing',
  'KCH-004', 'KCH', 'Add on - Routine', 'Kitchen Plan', 'Tiffin',
  'Daily', 'min', 15, 15, 60, 20,
  NULL, 0.7500, 26, 0.2000,
  false, 'standard', NULL, 4
);

-- Row 18: KCH-005 | Add-on Extra Kitchen Time | time_multiple | Daily | 26 instances
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'bb000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000002',
  'kch-005', 'Add-on Extra Kitchen Time',
  'KCH-005', 'KCH', 'Add on - Routine', 'Kitchen Plan', 'Extra Time',
  'Daily', 'min', 15, 15, 60, 15,
  1.0, 0.8000, 26, 0.2000,
  false, 'time_multiple', NULL, 5
);

-- =====================
-- SERVICE JOBS — Car Care  (rows 12–13)
-- =====================

-- Row 12: CAR-001 | Car Exterior Wash | standard | Daily | 26 instances
-- input = number of cars; rate is cost per car per instance (not per-minute)
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'cc000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000004',
  'car-001', 'Car Exterior Wash',
  'CAR-001', 'CAR', 'Core - Routine', 'Car Care Plan', 'Car Wash',
  'Daily', 'count_cars', 1, 1, 4, 1,
  NULL, 18.00, 26, 0.2000,
  false, 'standard', NULL, 1
);

-- Row 13: CAR-002 | Car Interior Cleaning | standard | 2x/week | 8 instances
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'cc000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000004',
  'car-002', 'Car Interior Cleaning',
  'CAR-002', 'CAR', 'Add on - Routine', 'Car Care Plan', 'Interior',
  '2x / week', 'count_cars', 1, 1, 4, 1,
  NULL, 50.00, 8, 0.2000,
  false, 'standard', NULL, 2
);

-- =====================
-- SERVICE JOBS — Garden Care  (rows 14, 19–20)
-- =====================

-- Row 14: GRD-001 | Plant Watering & Care | standard | Daily | 26 instances
-- input = number of plants; rate is cost per plant per instance
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'dd000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'grd-001', 'Plant Watering & Care',
  'GRD-001', 'GRD', 'Core - Routine', 'Garden Care Plan', 'Watering',
  'Daily', 'count_plants', 5, 5, 50, 10,
  NULL, 1.5000, 26, 0.2000,
  false, 'standard', NULL, 1
);

-- Row 19: GRD-002H | Weekly Gardening & Pruning | compound_head | Weekly | 4 instances
-- base_price = input * ((TM_head * rate_head * inst_head) + (TM_child * rate_child * inst_child))
--            = input * ((10.0 * 0.55 * 4) + (5.0 * 0.55 * 4))
--            = input * (22 + 11) = input * 33
-- At default 10 plants: 10 * 33 = 330 base, 264 effective
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'dd000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  'grd-002h', 'Weekly Gardening & Pruning',
  'GRD-002H', 'GRD', 'Add on - Routine', 'Garden Care Plan', 'Gardening',
  'Weekly', 'count_plants', 5, 5, 50, 10,
  10.0, 0.5500, 4, 0.2000,
  false, 'compound_head', 'GRD-002C', 2
);

-- Row 20: GRD-002C | Gardening - Pruning Component | compound_child (hidden from user)
INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES (
  'dd000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000003',
  'grd-002c', 'Gardening - Pruning Component',
  'GRD-002C', 'GRD', NULL, 'Garden Care Plan', 'Gardening',
  'Weekly', 'count_plants', 5, 5, 50, 10,
  5.0, 0.5500, 4, 0.2000,
  false, 'compound_child', NULL, 3
);

-- =====================
-- SERVICE JOBS — On-demand Services
-- On-demand jobs are only selectable after a base plan is active.
-- They are NOT included in plan base-price totals.
-- =====================

INSERT INTO service_jobs (id, category_id, slug, name, code, class, service_type, primary_card, sub_card,
  frequency_label, unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code, sort_order)
VALUES
  (
    'ee000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000005',
    'ond-001', 'Grocery Run',
    'OND-001', 'OND', 'On Demand', 'On-demand Services', 'Errands',
    'On demand', 'count_visits', 1, 1, 3, 1,
    NULL, 200.00, 4, 0.1000,
    true, 'standard', NULL, 1
  ),
  (
    'ee000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000005',
    'ond-002', 'Laundry Pickup & Delivery',
    'OND-002', 'OND', 'On Demand', 'On-demand Services', 'Laundry',
    'On demand', 'count_visits', 1, 1, 4, 1,
    NULL, 150.00, 4, 0.1000,
    true, 'standard', NULL, 2
  ),
  (
    'ee000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000005',
    'ond-003', 'Home Errand Support',
    'OND-003', 'OND', 'On Demand', 'On-demand Services', 'Errands',
    'On demand', 'count_visits', 1, 1, 3, 1,
    NULL, 150.00, 4, 0.1000,
    true, 'standard', NULL, 3
  );

-- =====================
-- JOB EXPECTATIONS
-- What the customer can expect from each job (non-compound-child rows only)
-- =====================

-- HKP-001 Dusting, Brooming & Mopping
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('aa000000-0000-0000-0000-000000000001', 1, 'Sweep all rooms, living areas, and corridors'),
  ('aa000000-0000-0000-0000-000000000001', 2, 'Mop floors with disinfectant solution'),
  ('aa000000-0000-0000-0000-000000000001', 3, 'Dust visible surfaces, corners, and ledges'),
  ('aa000000-0000-0000-0000-000000000001', 4, 'Dispose of dry waste in the designated bin');

-- HKP-002 Dishwashing
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('aa000000-0000-0000-0000-000000000002', 1, 'Wash all used utensils and vessels'),
  ('aa000000-0000-0000-0000-000000000002', 2, 'Clean and dry the sink'),
  ('aa000000-0000-0000-0000-000000000002', 3, 'Stack dishes neatly in rack or cabinet');

-- HKP-003 Kitchen Slab & Stove
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('aa000000-0000-0000-0000-000000000003', 1, 'Wipe kitchen counter/slab with wet cloth'),
  ('aa000000-0000-0000-0000-000000000003', 2, 'Clean stove top and burner grates'),
  ('aa000000-0000-0000-0000-000000000003', 3, 'Remove grease and food residue from cooking area');

-- HKP-004 Washroom Cleaning
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('aa000000-0000-0000-0000-000000000004', 1, 'Scrub toilet bowl and flush area with disinfectant'),
  ('aa000000-0000-0000-0000-000000000004', 2, 'Clean sink and wipe mirror'),
  ('aa000000-0000-0000-0000-000000000004', 3, 'Mop bathroom floor with disinfectant'),
  ('aa000000-0000-0000-0000-000000000004', 4, 'Remove waste bin contents');

-- HKP-005 Bed Making
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('aa000000-0000-0000-0000-000000000005', 1, 'Make beds and straighten pillows'),
  ('aa000000-0000-0000-0000-000000000005', 2, 'Fold or arrange bed linens neatly'),
  ('aa000000-0000-0000-0000-000000000005', 3, 'Tidy bedroom surfaces quickly');

-- HKP-006 Balcony Cleaning
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('aa000000-0000-0000-0000-000000000006', 1, 'Sweep balcony floor and remove debris'),
  ('aa000000-0000-0000-0000-000000000006', 2, 'Wipe balcony railing and furniture'),
  ('aa000000-0000-0000-0000-000000000006', 3, 'Clear common area around the flat door');

-- HKP-007H Weekly Deep Home Clean
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('aa000000-0000-0000-0000-000000000007', 1, 'Full room deep clean including behind furniture'),
  ('aa000000-0000-0000-0000-000000000007', 2, 'Kitchen slab and stove top thorough scrub'),
  ('aa000000-0000-0000-0000-000000000007', 3, 'Bathroom tiles and grout deep clean'),
  ('aa000000-0000-0000-0000-000000000007', 4, 'Window glass cleaning (inside)'),
  ('aa000000-0000-0000-0000-000000000007', 5, 'Balcony deep sweep, mop, and wipe');

-- HKP-008 Add-on Buffer Time
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('aa000000-0000-0000-0000-000000000009', 1, 'Extra buffer time for tasks that may run over schedule'),
  ('aa000000-0000-0000-0000-000000000009', 2, 'Staff uses this time for unforeseen delays (e.g. power cut, extra requests)'),
  ('aa000000-0000-0000-0000-000000000009', 3, 'Unused buffer time is not billed separately');

-- KCH-001 Breakfast Preparation
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('bb000000-0000-0000-0000-000000000001', 1, 'Prepare fresh breakfast as per preferences'),
  ('bb000000-0000-0000-0000-000000000001', 2, 'Set the table or tray ready'),
  ('bb000000-0000-0000-0000-000000000001', 3, 'Clean kitchen counter after cooking');

-- KCH-002 Lunch Preparation
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('bb000000-0000-0000-0000-000000000002', 1, 'Prepare dal/sabzi and roti or rice for stated count'),
  ('bb000000-0000-0000-0000-000000000002', 2, 'Store leftovers properly'),
  ('bb000000-0000-0000-0000-000000000002', 3, 'Clean used vessels after cooking');

-- KCH-003 Dinner Preparation
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('bb000000-0000-0000-0000-000000000003', 1, 'Prepare a complete dinner for stated count'),
  ('bb000000-0000-0000-0000-000000000003', 2, 'Cover and label leftovers'),
  ('bb000000-0000-0000-0000-000000000003', 3, 'Wipe down stove and counter after cooking');

-- KCH-004 Tiffin Packing
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('bb000000-0000-0000-0000-000000000004', 1, 'Pack freshly cooked food in tiffin boxes'),
  ('bb000000-0000-0000-0000-000000000004', 2, 'Label tiffins if multiple meals prepared'),
  ('bb000000-0000-0000-0000-000000000004', 3, 'Keep tiffin ready before the stated departure time');

-- KCH-005 Extra Kitchen Time
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('bb000000-0000-0000-0000-000000000005', 1, 'Additional time allocated for complex recipes or larger meal counts'),
  ('bb000000-0000-0000-0000-000000000005', 2, 'May include extra chopping, grinding, or cleaning time');

-- CAR-001 Car Exterior Wash
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('cc000000-0000-0000-0000-000000000001', 1, 'Wash car exterior with water and soap'),
  ('cc000000-0000-0000-0000-000000000001', 2, 'Wipe down doors, bonnet, and boot'),
  ('cc000000-0000-0000-0000-000000000001', 3, 'Clean tyres and wheel covers');

-- CAR-002 Car Interior Cleaning
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('cc000000-0000-0000-0000-000000000002', 1, 'Vacuum car seats and floor mats'),
  ('cc000000-0000-0000-0000-000000000002', 2, 'Wipe dashboard, console, and door panels'),
  ('cc000000-0000-0000-0000-000000000002', 3, 'Clean inside windows and mirrors');

-- GRD-001 Plant Watering
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('dd000000-0000-0000-0000-000000000001', 1, 'Water all plants as per schedule'),
  ('dd000000-0000-0000-0000-000000000001', 2, 'Remove dead leaves and debris from pots'),
  ('dd000000-0000-0000-0000-000000000001', 3, 'Check soil moisture before watering');

-- GRD-002H Weekly Gardening & Pruning
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('dd000000-0000-0000-0000-000000000002', 1, 'Prune and trim overgrown branches and leaves'),
  ('dd000000-0000-0000-0000-000000000002', 2, 'Remove dead or diseased plant parts'),
  ('dd000000-0000-0000-0000-000000000002', 3, 'Clean and tidy the garden area'),
  ('dd000000-0000-0000-0000-000000000002', 4, 'Water and fertilise as needed');

-- OND-001 Grocery Run
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('ee000000-0000-0000-0000-000000000001', 1, 'Purchase groceries from the provided list'),
  ('ee000000-0000-0000-0000-000000000001', 2, 'Return with itemised receipt'),
  ('ee000000-0000-0000-0000-000000000001', 3, 'Arrange groceries in the kitchen');

-- OND-002 Laundry Pickup & Delivery
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('ee000000-0000-0000-0000-000000000002', 1, 'Collect laundry from the flat'),
  ('ee000000-0000-0000-0000-000000000002', 2, 'Deliver to and collect from laundry service'),
  ('ee000000-0000-0000-0000-000000000002', 3, 'Return washed and folded clothes');

-- OND-003 Home Errand Support
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('ee000000-0000-0000-0000-000000000003', 1, 'Assist with general household errands as requested'),
  ('ee000000-0000-0000-0000-000000000003', 2, 'Examples: bill payments, courier drops, small purchases');


-- =====================
-- SERVICE JOBS — Housekeeping
-- =====================
INSERT INTO service_jobs (id, category_id, slug, name, frequency_label, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'sweep-mop',      'Sweep & Mop',       'Daily',      1),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'dusting',        'Dusting',           'Daily',      2),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'dishwashing',    'Dishwashing',       'Daily',      3),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'bathroom-clean', 'Bathroom Cleaning', '3x / week',  4),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'deep-clean',     'Deep Cleaning',     'Weekly',     5)
ON CONFLICT (slug) DO NOTHING;

-- SERVICE JOBS — Kitchen Services
INSERT INTO service_jobs (id, category_id, slug, name, frequency_label, sort_order) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'breakfast-prep', 'Breakfast Prep',     'Daily',  1),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'lunch-prep',     'Lunch Preparation',  'Daily',  2),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'dinner-prep',    'Dinner Preparation', 'Daily',  3),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'tiffin-pack',    'Tiffin Packing',     'Daily',  4)
ON CONFLICT (slug) DO NOTHING;

-- SERVICE JOBS — Garden Care
INSERT INTO service_jobs (id, category_id, slug, name, frequency_label, sort_order) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'watering',       'Plant Watering',     'Daily',    1),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'pruning',        'Pruning & Trimming', 'Weekly',   2)
ON CONFLICT (slug) DO NOTHING;

-- SERVICE JOBS — Car Care
INSERT INTO service_jobs (id, category_id, slug, name, frequency_label, sort_order) VALUES
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'car-wash',       'Car Exterior Wash',  'Daily',    1),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'interior-clean', 'Interior Cleaning',  'Weekly',   2)
ON CONFLICT (slug) DO NOTHING;

-- SERVICE JOBS — On-demand
INSERT INTO service_jobs (id, category_id, slug, name, frequency_label, sort_order) VALUES
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'grocery-run',    'Grocery Run',        'On demand', 1),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'laundry',        'Laundry',            'On demand', 2)
ON CONFLICT (slug) DO NOTHING;

-- =====================
-- JOB PRICING
-- =====================

-- Housekeeping
INSERT INTO job_pricing (job_id, mrp_monthly, price_monthly, default_minutes, min_minutes, max_minutes, step_minutes) VALUES
  ('10000000-0000-0000-0000-000000000001',  899,  699, 45, 30,  90, 15),
  ('10000000-0000-0000-0000-000000000002',  699,  549, 30, 15,  60, 15),
  ('10000000-0000-0000-0000-000000000003',  799,  649, 45, 30,  90, 15),
  ('10000000-0000-0000-0000-000000000004', 1299,  999, 60, 45, 120, 15),
  ('10000000-0000-0000-0000-000000000005', 1999, 1499, 90, 60, 180, 30)
ON CONFLICT (job_id) DO NOTHING;

-- Kitchen services
INSERT INTO job_pricing (job_id, mrp_monthly, price_monthly, default_minutes, min_minutes, max_minutes, step_minutes) VALUES
  ('20000000-0000-0000-0000-000000000001',  999,  799, 30, 20,  60, 10),
  ('20000000-0000-0000-0000-000000000002', 1499, 1199, 45, 30,  90, 15),
  ('20000000-0000-0000-0000-000000000003', 1499, 1199, 45, 30,  90, 15),
  ('20000000-0000-0000-0000-000000000004',  699,  549, 20, 15,  45, 15)
ON CONFLICT (job_id) DO NOTHING;

-- Garden care
INSERT INTO job_pricing (job_id, mrp_monthly, price_monthly, default_minutes, min_minutes, max_minutes, step_minutes) VALUES
  ('30000000-0000-0000-0000-000000000001',  599,  449, 20, 15,  45, 15),
  ('30000000-0000-0000-0000-000000000002',  799,  649, 30, 20,  60, 10)
ON CONFLICT (job_id) DO NOTHING;

-- Car care
INSERT INTO job_pricing (job_id, mrp_monthly, price_monthly, default_minutes, min_minutes, max_minutes, step_minutes) VALUES
  ('40000000-0000-0000-0000-000000000001',  899,  699, 20, 15,  45, 15),
  ('40000000-0000-0000-0000-000000000002',  599,  499, 30, 20,  60, 10)
ON CONFLICT (job_id) DO NOTHING;

-- On-demand
INSERT INTO job_pricing (job_id, mrp_monthly, price_monthly, default_minutes, min_minutes, max_minutes, step_minutes) VALUES
  ('50000000-0000-0000-0000-000000000001',  699,  599, 45, 30,  90, 15),
  ('50000000-0000-0000-0000-000000000002',  799,  649, 60, 30, 120, 30)
ON CONFLICT (job_id) DO NOTHING;

-- =====================
-- JOB EXPECTATIONS
-- =====================

-- Sweep & Mop
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('10000000-0000-0000-0000-000000000001', 1, 'Sweep all rooms and living areas'),
  ('10000000-0000-0000-0000-000000000001', 2, 'Mop floors with disinfectant solution'),
  ('10000000-0000-0000-0000-000000000001', 3, 'Clear visible dust from corners'),
  ('10000000-0000-0000-0000-000000000001', 4, 'Dispose of dry waste in bin')
ON CONFLICT DO NOTHING;

-- Dusting
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('10000000-0000-0000-0000-000000000002', 1, 'Dust all surfaces including shelves and tables'),
  ('10000000-0000-0000-0000-000000000002', 2, 'Wipe electronic surfaces gently'),
  ('10000000-0000-0000-0000-000000000002', 3, 'Clean ceiling fan blades'),
  ('10000000-0000-0000-0000-000000000002', 4, 'Clean window sills and ledges')
ON CONFLICT DO NOTHING;

-- Dishwashing
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('10000000-0000-0000-0000-000000000003', 1, 'Wash all used utensils and vessels'),
  ('10000000-0000-0000-0000-000000000003', 2, 'Clean and dry the sink'),
  ('10000000-0000-0000-0000-000000000003', 3, 'Stack dishes neatly')
ON CONFLICT DO NOTHING;

-- Bathroom Cleaning
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('10000000-0000-0000-0000-000000000004', 1, 'Scrub toilet bowl and flush area'),
  ('10000000-0000-0000-0000-000000000004', 2, 'Clean sink and mirror'),
  ('10000000-0000-0000-0000-000000000004', 3, 'Mop bathroom floor with disinfectant'),
  ('10000000-0000-0000-0000-000000000004', 4, 'Remove waste bin contents')
ON CONFLICT DO NOTHING;

-- Deep Cleaning
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('10000000-0000-0000-0000-000000000005', 1, 'Full room deep clean including behind furniture'),
  ('10000000-0000-0000-0000-000000000005', 2, 'Kitchen slab and stove top scrub'),
  ('10000000-0000-0000-0000-000000000005', 3, 'Bathroom tiles and grout cleaning'),
  ('10000000-0000-0000-0000-000000000005', 4, 'Window glass cleaning inside'),
  ('10000000-0000-0000-0000-000000000005', 5, 'Balcony sweep and mop')
ON CONFLICT DO NOTHING;

-- Breakfast Prep
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('20000000-0000-0000-0000-000000000001', 1, 'Prepare fresh breakfast as per preferences'),
  ('20000000-0000-0000-0000-000000000001', 2, 'Set the table / tray ready'),
  ('20000000-0000-0000-0000-000000000001', 3, 'Clean kitchen counter after cooking')
ON CONFLICT DO NOTHING;

-- Lunch Preparation
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('20000000-0000-0000-0000-000000000002', 1, 'Prepare dal/sabzi + roti or rice for stated count'),
  ('20000000-0000-0000-0000-000000000002', 2, 'Store leftovers properly'),
  ('20000000-0000-0000-0000-000000000002', 3, 'Clean used vessels after cooking')
ON CONFLICT DO NOTHING;

-- Dinner Preparation
INSERT INTO job_expectations (job_id, sort_order, text) VALUES
  ('20000000-0000-0000-0000-000000000003', 1, 'Prepare a complete dinner for stated count'),
  ('20000000-0000-0000-0000-000000000003', 2, 'Cover and label leftovers'),
  ('20000000-0000-0000-0000-000000000003', 3, 'Wipe down stove and counter')
ON CONFLICT DO NOTHING;
