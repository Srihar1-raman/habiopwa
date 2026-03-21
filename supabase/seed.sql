-- ============================================================
-- HABIO Seed Data — clean rewrite (single coherent story)
-- Run AFTER schema.sql on a fresh Supabase project.
-- Today's date context: 2026-03-21 (Saturday)
-- ============================================================

-- ── 1. Nuke order (leaf tables first, respect FK constraints) ─────────────

DELETE FROM issue_comments;
DELETE FROM issue_tickets;
DELETE FROM on_demand_requests;
DELETE FROM pause_requests;
DELETE FROM job_allocations;
DELETE FROM provider_leave_requests;
DELETE FROM provider_week_offs;
DELETE FROM tech_services_allowance;
DELETE FROM payments;
DELETE FROM plan_request_events;
DELETE FROM plan_request_items;
DELETE FROM plan_requests;
DELETE FROM cart_items;
DELETE FROM carts;
DELETE FROM customer_sessions;
DELETE FROM customer_profiles;
DELETE FROM customers;
DELETE FROM provider_sessions;
DELETE FROM provider_team_assignments;
DELETE FROM service_providers;
DELETE FROM job_expectations;
DELETE FROM service_jobs;
DELETE FROM service_categories;
DELETE FROM staff_sessions;
DELETE FROM staff_accounts;
DELETE FROM locations;


-- ── 2. Service Categories ──────────────────────────────────────────────────

INSERT INTO service_categories (id, slug, name, code, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'housekeeping',        'Housekeeping',        'HKP', 1),
  ('00000000-0000-0000-0000-000000000002', 'kitchen-services',    'Kitchen Services',    'KCH', 2),
  ('00000000-0000-0000-0000-000000000003', 'car-care',            'Car Care',            'CCR', 3),
  ('00000000-0000-0000-0000-000000000004', 'garden-care',         'Garden Care',         'GCR', 4),
  ('00000000-0000-0000-0000-000000000005', 'technician-services', 'Technician Services', 'HMT', 5);

--   55…  Technician Services (HMT / SMT)
-- ──────────────────────────────────────────────────────────────

INSERT INTO service_jobs (
  id, category_id,
  slug, name, code,
  class, service_type, primary_card, sub_card,
  frequency_label,
  unit_type, unit_interval, min_unit, max_unit, default_unit,
  time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
  is_on_demand, formula_type, compound_child_code,
  active, sort_order
) VALUES

-- ══════════════════════════════════════════════════════════════
-- HOUSEKEEPING — Daily Core  (class HKP1, service_type Core - Routine)
-- ══════════════════════════════════════════════════════════════

-- ── HKP1-CR-D-1A: Dusting, Brooming, Mopping ─────────────────
-- unit=min, interval=15, min=30, rate=3.3, instances=30, discount=30%
-- formula: standard  →  input × 3.3 × 30
-- S1(30 min)=2970  S2(45 min)=4455  effective S1=2079  S2=3119
(
  '11000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'hkp1-cr-d-1a', 'Dusting, Brooming, Mopping', 'HKP1-CR-D-1A',
  'HKP1', 'Core - Routine', 'Dusting, Brooming, Mopping', 'Dusting, Brooming, Mopping',
  'Daily', 'min', 15, 30, 120, 30,
  NULL, 3.3000, 30, 0.3000,
  false, 'standard', NULL,
  true, 1
),

-- ── HKP1-CR-D-2A: Dish Washing ───────────────────────────────
-- unit=min, interval=5, min=15, rate=3.3, instances=30, discount=30%
-- formula: standard  →  input × 3.3 × 30
-- S1(15 min)=1485  S2(15 min)=1485  effective=1040
(
  '11000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'hkp1-cr-d-2a', 'Dish Washing', 'HKP1-CR-D-2A',
  'HKP1', 'Core - Routine', 'Dish Washing', 'Dish Washing',
  'Daily', 'min', 5, 15, 60, 15,
  NULL, 3.3000, 30, 0.3000,
  false, 'standard', NULL,
  true, 2
),

-- ══════════════════════════════════════════════════════════════
-- HOUSEKEEPING — Daily Add-on  (class HKP1, service_type Add on - Routine)
-- ══════════════════════════════════════════════════════════════

-- ── HKP1-AR-D-3A: Laundry - Machine, Hang & Fold ─────────────
-- unit=min, interval=5, min=15, rate=3.3, instances=30, discount=30%
-- formula: standard  →  input × 3.3 × 30
-- S1(15 min)=1485  S2(15 min)=1485
(
  '11000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'hkp1-ar-d-3a', 'Laundry - Machine, Hang & Fold', 'HKP1-AR-D-3A',
  'HKP1', 'Add on - Routine', 'Laundry - Machine, Hang & Fold', 'Laundry - Machine, Hang & Fold',
  'Daily', 'min', 5, 15, 60, 15,
  NULL, 3.3000, 30, 0.3000,
  false, 'standard', NULL,
  true, 3
),

-- ── HKP1-AR-D-4A: Washroom Floor Mopping ─────────────────────
-- unit=count_washrooms, interval=1, min=1, TM=5 min/washroom, rate=3.3, instances=30, discount=30%
-- formula: time_multiple  →  input × 5 × 3.3 × 30
-- S1(2 wc)=990  S2(3 wc)=1485  effective S1=693  S2=1040
(
  '11000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'hkp1-ar-d-4a', 'Washroom Floor Mopping', 'HKP1-AR-D-4A',
  'HKP1', 'Add on - Routine', 'Washroom Floor Mopping', 'Washroom Floor Mopping',
  'Daily', 'count_washrooms', 1, 1, 6, 1,
  5.00, 3.3000, 30, 0.3000,
  false, 'time_multiple', NULL,
  true, 4
),

-- ── HKP1-AR-D-5A: Add-on Time - General Purpose ──────────────
-- unit=min, interval=15, min=15, rate=3.3, instances=30, discount=30%
-- formula: standard  →  input × 3.3 × 30
-- Scenario inputs=0 (optional buffer; user adjusts as needed)
(
  '11000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'hkp1-ar-d-5a', 'Add-on Time - General Purpose', 'HKP1-AR-D-5A',
  'HKP1', 'Add on - Routine', 'Add-on Time - General Purpose', 'Add-on Time - General Purpose',
  'Daily', 'min', 15, 15, 120, 15,
  NULL, 3.3000, 30, 0.3000,
  false, 'standard', NULL,
  true, 5
),

-- ══════════════════════════════════════════════════════════════
-- HOUSEKEEPING — Weekly Core  (class HKP2, service_type Add on - Routine)
-- ══════════════════════════════════════════════════════════════

-- ── HKP2-CR-W-6A: Washroom / Toilet Deep Clean ───────────────
-- unit=count_washrooms, interval=1, min=1, TM=30 min/washroom, rate=5, instances=4, discount=30%
-- formula: time_multiple  →  input × 30 × 5 × 4
-- S1(2 wc)=1200  S2(3 wc)=1800  effective S1=840  S2=1260
(
  '11000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'hkp2-cr-w-6a', 'Washroom / Toilet Deep Clean', 'HKP2-CR-W-6A',
  'HKP2', 'Add on - Routine', 'Washroom / Toilet Deep Clean', 'Washroom / Toilet Deep Clean',
  'Weekly', 'count_washrooms', 1, 1, 6, 1,
  30.00, 5.0000, 4, 0.3000,
  false, 'time_multiple', NULL,
  true, 6
),

-- ══════════════════════════════════════════════════════════════
-- HOUSEKEEPING — Weekly Add-on  (class HKP1 / HKP3, service_type Add on - Routine)
-- ══════════════════════════════════════════════════════════════

-- ── HKP1-AR-W-7A: Window / Glass Panel Cleaning ──────────────
-- unit=min, interval=5, min=15, rate=3.3, instances=4, discount=30%
-- formula: standard  →  input × 3.3 × 4
-- S1(15 min)=198  S2(30 min)=396  effective S1=139  S2=277
(
  '11000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'hkp1-ar-w-7a', 'Window / Glass Panel Cleaning', 'HKP1-AR-W-7A',
  'HKP1', 'Add on - Routine', 'Window / Glass Panel Cleaning', 'Window / Glass Panel Cleaning',
  'Weekly', 'min', 5, 15, 90, 15,
  NULL, 3.3000, 4, 0.3000,
  false, 'standard', NULL,
  true, 7
),

-- ── HKP1-AR-W-8A: Balcony Deep Clean ─────────────────────────
-- unit=min, interval=10, min=10, rate=3.3, instances=4, discount=30%
-- formula: standard  →  input × 3.3 × 4
-- S1(20 min)=264  S2(30 min)=396  effective S1=185  S2=277
(
  '11000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  'hkp1-ar-w-8a', 'Balcony Deep Clean', 'HKP1-AR-W-8A',
  'HKP1', 'Add on - Routine', 'Balcony Deep Clean', 'Balcony Deep Clean',
  'Weekly', 'min', 10, 10, 90, 20,
  NULL, 3.3000, 4, 0.3000,
  false, 'standard', NULL,
  true, 8
),

-- ── HKP3-AR-W-9A: Laundry - Ironing ─────────────────────────
-- unit=min, interval=30, min=60, rate=3.3, instances=4, discount=30%
-- formula: standard  →  input × 3.3 × 4
-- S1(60 min)=792  S2(120 min)=1584  effective S1=554  S2=1109
(
  '11000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  'hkp3-ar-w-9a', 'Laundry - Ironing', 'HKP3-AR-W-9A',
  'HKP3', 'Add on - Routine', 'Laundry - Ironing', 'Laundry - Ironing',
  'Weekly', 'min', 30, 60, 240, 60,
  NULL, 3.3000, 4, 0.3000,
  false, 'standard', NULL,
  true, 9
),

-- ── HKP1-AR-W-10A: Fridge, Microwave, Chimney & Stove Clean ──
-- unit=min, interval=15, min=30, rate=3.3, instances=4, discount=30%
-- formula: standard  →  input × 3.3 × 4
-- S1(30 min)=396  S2(45 min)=594  effective S1=277  S2=416
(
  '11000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'hkp1-ar-w-10a', 'Fridge, Microwave, Chimney & Stove Clean', 'HKP1-AR-W-10A',
  'HKP1', 'Add on - Routine', 'Fridge, Microwave, Chimney & Stove Clean', 'Fridge, Microwave, Chimney & Stove Clean',
  'Weekly', 'min', 15, 30, 120, 30,
  NULL, 3.3000, 4, 0.3000,
  false, 'standard', NULL,
  true, 10
),

-- ── HKP1-AR-W-11A: Kitchen / Pantry Cabinet Cleaning ─────────
-- unit=min, interval=10, min=20, rate=3.3, instances=4, discount=30%
-- formula: standard  →  input × 3.3 × 4
-- S1(20 min)=264  S2(30 min)=396  effective S1=185  S2=277
(
  '11000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'hkp1-ar-w-11a', 'Kitchen / Pantry Cabinet Cleaning', 'HKP1-AR-W-11A',
  'HKP1', 'Add on - Routine', 'Kitchen / Pantry Cabinet Cleaning', 'Kitchen / Pantry Cabinet Cleaning',
  'Weekly', 'min', 10, 20, 90, 20,
  NULL, 3.3000, 4, 0.3000,
  false, 'standard', NULL,
  true, 11
),

-- ══════════════════════════════════════════════════════════════
-- HOUSEKEEPING — On Demand  (class HKP1, service_type On Demand)
-- ══════════════════════════════════════════════════════════════

-- ── HKP1-OD-OD-12A: On Demand Time - General Purpose ─────────
-- unit=min, interval=15, min=15, rate=3.3, instances=1 (per-use), discount=30%
-- formula: standard  →  input × 3.3 × 1  (per-use price shown in UI)
-- Requires an active base housekeeping plan (is_on_demand=true)
(
  '11000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'hkp1-od-od-12a', 'On Demand Time - General Purpose', 'HKP1-OD-OD-12A',
  'HKP1', 'On Demand', 'On Demand Time - General Purpose', 'On Demand Time - General Purpose',
  'Daily', 'min', 15, 15, 120, 15,
  NULL, 3.3000, 1, 0.3000,
  true, 'standard', NULL,
  true, 12
),

-- ══════════════════════════════════════════════════════════════
-- KITCHEN SERVICES  (class KCH, Daily)
-- ══════════════════════════════════════════════════════════════

-- ── KCH-CR-D-1A: Daily Cooking - Morning Shift ───────────────
-- unit=min, interval=15, min=45, rate=4, instances=30, discount=30%
-- formula: standard  →  input × 4 × 30
-- S1(60 min)=7200  S2(60 min)=7200  effective=5040
(
  '22000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'kch-cr-d-1a', 'Daily Cooking - Morning Shift', 'KCH-CR-D-1A',
  'KCH', 'Core - Routine', 'Daily Cooking', 'Daily Cooking - Morning Shift',
  'Daily', 'min', 15, 45, 180, 60,
  NULL, 4.0000, 30, 0.3000,
  false, 'standard', NULL,
  true, 1
),

-- ── KCH-CR-D-2A: Daily Cooking - Evening Shift ───────────────
-- unit=min, interval=15, min=45, rate=4, instances=30, discount=30%
-- formula: standard  →  input × 4 × 30
-- S1(0 min)=0  S2(60 min)=7200  (optional; user selects if needed)
(
  '22000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'kch-cr-d-2a', 'Daily Cooking - Evening Shift', 'KCH-CR-D-2A',
  'KCH', 'Core - Routine', 'Daily Cooking', 'Daily Cooking - Evening Shift',
  'Daily', 'min', 15, 45, 180, 45,
  NULL, 4.0000, 30, 0.3000,
  false, 'standard', NULL,
  true, 2
),

-- ── KCH-OD-OD-2A: Add on Cooking Time (On Demand) ────────────
-- unit=min, interval=30, min=60, rate=4, instances=1 (per-use), discount=30%
-- formula: standard  →  input × 4 × 1  (per-use price)
-- Requires active base kitchen plan
(
  '22000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'kch-od-od-2a', 'Add on Cooking Time', 'KCH-OD-OD-2A',
  'KCH', 'On Demand', 'Add on Cooking Time', 'Add on Cooking Time',
  'On demand', 'min', 30, 60, 240, 60,
  NULL, 4.0000, 1, 0.3000,
  true, 'standard', NULL,
  true, 3
),

-- ══════════════════════════════════════════════════════════════
-- CAR CARE  (class CCR)
-- ══════════════════════════════════════════════════════════════

-- ── CCR-CR-D-1A: Basic Car Care Routine — compound_head ───────
-- unit=count_cars, interval=1, min=1, TM=15 min/car, rate=3.3, instances=30, discount=30%
-- compound_child = CCR-CR-D-1B (Cabin Weekly; instances=4)
-- formula: compound_head  →  input × (15×3.3×30 + 15×3.3×4)
--          per car         = (1485 + 198) = 1683  effective=1178
(
  '33000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'ccr-cr-d-1a', 'Basic Car Care Routine', 'CCR-CR-D-1A',
  'CCR', 'Core - Routine', 'Basic Car Care Routine', 'Daily Outer Cleaning',
  'Daily', 'count_cars', 1, 1, 4, 1,
  15.00, 3.3000, 30, 0.3000,
  false, 'compound_head', 'CCR-CR-D-1B',
  true, 1
),

-- ── CCR-CR-D-1B: Cabin Weekly — compound_child (hidden in UI) ─
-- unit=count_cars, interval=1, min=1, TM=15 min/car, rate=3.3, instances=4, discount=30%
-- Priced via compound_head row CCR-CR-D-1A; never shown as standalone.
(
  '33000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  'ccr-cr-d-1b', 'Cabin Weekly', 'CCR-CR-D-1B',
  'CCR', 'Core - Routine', 'Basic Car Care Routine', 'Cabin Weekly',
  'Weekly', 'count_cars', 1, 1, 4, 1,
  15.00, 3.3000, 4, 0.3000,
  false, 'compound_child', NULL,
  true, 2
),

-- ── CCR-AR-D-2A: Weekly Car Shampoo Wash ─────────────────────
-- unit=count_cars, interval=1, min=1, TM=15 min/car, rate=3.3, instances=4, discount=30%
-- formula: time_multiple  →  input × 15 × 3.3 × 4
-- S1(1 car)=198  S2(1 car)=198  effective=139
(
  '33000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000003',
  'ccr-ar-d-2a', 'Weekly Car Shampoo Wash', 'CCR-AR-D-2A',
  'CCR', 'Add on - Routine', 'Weekly Car Shampoo Wash', 'Car Shampoo Wash',
  'Weekly', 'count_cars', 1, 1, 4, 1,
  15.00, 3.3000, 4, 0.3000,
  false, 'time_multiple', NULL,
  true, 3
),

-- ── CCR-AR-D-3A: Weekly Car Waxing ───────────────────────────
-- unit=count_cars, interval=1, min=1, TM=15 min/car, rate=5, instances=4, discount=30%
-- formula: time_multiple  →  input × 15 × 5 × 4
-- S1(1 car)=300  S2(1 car)=300  effective=210
-- Note: masterdata col-4 Frequency='Daily'; instances=4 and job name 'Weekly Car Waxing'
-- confirm weekly cadence — frequency_label set to 'Weekly' accordingly.
(
  '33000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000003',
  'ccr-ar-d-3a', 'Weekly Car Waxing', 'CCR-AR-D-3A',
  'CCR', 'Add on - Routine', 'Weekly Car Waxing', 'Car Waxing',
  'Weekly', 'count_cars', 1, 1, 4, 1,
  15.00, 5.0000, 4, 0.3000,
  false, 'time_multiple', NULL,
  true, 4
),

-- ══════════════════════════════════════════════════════════════
-- GARDEN CARE  (class GCR)
-- ══════════════════════════════════════════════════════════════

-- ── GCR-CR-D-1A: Basic Garden Care Routine — compound_head ────
-- unit=count_plants, interval=5, min=10, TM=0.5 min/plant, rate=3.3, instances=30, discount=30%
-- compound_child = GCR-CR-D-1B (Plant Dusting, Soil Pricking & Pruning; instances=4, TM=3)
-- formula: compound_head  →  input × (0.5×3.3×30 + 3×3.3×4)
--          = input × (49.5 + 39.6) = input × 89.1
-- S1(15 plants)=1337  S2(20 plants)=1782  effective S1=936  S2=1247
(
  '44000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000004',
  'gcr-cr-d-1a', 'Basic Garden Care Routine', 'GCR-CR-D-1A',
  'GCR', 'Core - Routine', 'Basic Garden Care Routine', 'Daily Watering',
  'Daily', 'count_plants', 5, 10, 50, 10,
  0.50, 3.3000, 30, 0.3000,
  false, 'compound_head', 'GCR-CR-D-1B',
  true, 1
),

-- ── GCR-CR-D-1B: Plant Dusting, Soil Pricking & Pruning — compound_child (hidden) ─
-- unit=count_plants, interval=5, min=10, TM=3 min/plant, rate=3.3, instances=4, discount=30%
-- Priced via compound_head row GCR-CR-D-1A; never shown as standalone.
(
  '44000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000004',
  'gcr-cr-d-1b', 'Plant Dusting, Soil Pricking & Pruning', 'GCR-CR-D-1B',
  'GCR', 'Core - Routine', 'Basic Garden Care Routine', 'Plant Dusting, Soil Pricking & Pruning',
  'Weekly', 'count_plants', 5, 10, 50, 10,
  3.00, 3.3000, 4, 0.3000,
  false, 'compound_child', NULL,
  true, 2
),

-- ══════════════════════════════════════════════════════════════
-- TECHNICIAN SERVICES — On Demand  (class HMT / SMT)
-- All jobs require an active base plan (is_on_demand=true).
-- instances_per_month=1 so UI shows per-visit / per-unit price.
-- ══════════════════════════════════════════════════════════════

-- ── HMT-OD-OD-1A: Visitation - Electrician ───────────────────
-- unit=count_visits, interval=1, min=1, TM=30 min/visit, rate=4, instances=1, discount=30%
-- formula: time_multiple  →  input × 30 × 4 × 1  =  ₹120/visit
(
  '55000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000005',
  'hmt-od-od-1a', 'Visitation - Electrician', 'HMT-OD-OD-1A',
  'HMT', 'On Demand', 'Visitation - Electrician', 'Visitation - Electrician',
  'On demand', 'count_visits', 1, 1, 4, 1,
  30.00, 4.0000, 1, 0.3000,
  true, 'time_multiple', NULL,
  true, 1
),

-- ── HMT-OD-OD-2A: Visitation - Plumber ──────────────────────
-- unit=count_visits, interval=1, min=1, TM=30 min/visit, rate=4, instances=1, discount=30%
-- formula: time_multiple  →  input × 30 × 4 × 1  =  ₹120/visit
(
  '55000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000005',
  'hmt-od-od-2a', 'Visitation - Plumber', 'HMT-OD-OD-2A',
  'HMT', 'On Demand', 'Visitation - Plumber', 'Visitation - Plumber',
  'On demand', 'count_visits', 1, 1, 4, 1,
  30.00, 4.0000, 1, 0.3000,
  true, 'time_multiple', NULL,
  true, 2
),

-- ── HMT-OD-OD-3A: Visitation - Carpenter ────────────────────
-- unit=count_visits, interval=1, min=1, TM=30 min/visit, rate=4, instances=1, discount=30%
-- formula: time_multiple  →  input × 30 × 4 × 1  =  ₹120/visit
(
  '55000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000005',
  'hmt-od-od-3a', 'Visitation - Carpenter', 'HMT-OD-OD-3A',
  'HMT', 'On Demand', 'Visitation - Carpenter', 'Visitation - Carpenter',
  'On demand', 'count_visits', 1, 1, 4, 1,
  30.00, 4.0000, 1, 0.3000,
  true, 'time_multiple', NULL,
  true, 3
),

-- ── HMT-OD-OD-4A: RO Service ─────────────────────────────────
-- unit=count_visits, interval=1, min=1, TM=60 min/visit, rate=5, instances=1, discount=30%
-- formula: time_multiple  →  input × 60 × 5 × 1  =  ₹300/visit
(
  '55000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  'hmt-od-od-4a', 'RO Service', 'HMT-OD-OD-4A',
  'SMT', 'On Demand', 'RO Service', 'RO Service',
  'On demand', 'count_visits', 1, 1, 4, 1,
  60.00, 5.0000, 1, 0.3000,
  true, 'time_multiple', NULL,
  true, 4
),

-- ── HMT-OD-OD-5A: AC Service ─────────────────────────────────
-- unit=count_acs, interval=1, min=1, TM=60 min/AC, rate=5, instances=1, discount=30%
-- formula: time_multiple  →  input × 60 × 5 × 1  =  ₹300/AC
(
  '55000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000005',
  'hmt-od-od-5a', 'AC Service', 'HMT-OD-OD-5A',
  'SMT', 'On Demand', 'AC Service', 'AC Service',
  'On demand', 'count_acs', 1, 1, 5, 1,
  60.00, 5.0000, 1, 0.3000,
  true, 'time_multiple', NULL,
  true, 5
);

-- ── 4. Job Expectations ────────────────────────────────────────
-- Three bullet points per job (sourced from job name and service description).
-- compound_child rows (CCR-CR-D-1B, GCR-CR-D-1B) have no standalone expectations
-- since they are hidden from users and their actions are described in the compound_head.
-- ──────────────────────────────────────────────────────────────

INSERT INTO job_expectations (job_id, sort_order, text) VALUES

-- HKP1-CR-D-1A: Dusting, Brooming, Mopping
('11000000-0000-0000-0000-000000000001', 1, 'Sweep all rooms with broom or dry mop'),
('11000000-0000-0000-0000-000000000001', 2, 'Wet mop hard floors with a dilute cleaning solution'),
('11000000-0000-0000-0000-000000000001', 3, 'Dust accessible surfaces, shelves, and furniture tops'),

-- HKP1-CR-D-2A: Dish Washing
('11000000-0000-0000-0000-000000000002', 1, 'Wash all used utensils, pots, and vessels'),
('11000000-0000-0000-0000-000000000002', 2, 'Clean and wipe the kitchen sink'),
('11000000-0000-0000-0000-000000000002', 3, 'Stack dishes neatly in the drying rack or cabinet'),

-- HKP1-AR-D-3A: Laundry - Machine, Hang & Fold
('11000000-0000-0000-0000-000000000003', 1, 'Load clothes into washing machine and run appropriate cycle'),
('11000000-0000-0000-0000-000000000003', 2, 'Hang washed clothes to dry or transfer to dryer'),
('11000000-0000-0000-0000-000000000003', 3, 'Fold and arrange dried clothes neatly'),

-- HKP1-AR-D-4A: Washroom Floor Mopping
('11000000-0000-0000-0000-000000000004', 1, 'Mop washroom floor with disinfectant solution'),
('11000000-0000-0000-0000-000000000004', 2, 'Clean around the toilet base and near the drain'),
('11000000-0000-0000-0000-000000000004', 3, 'Wipe down wet surfaces to prevent slipping'),

-- HKP1-AR-D-5A: Add-on Time - General Purpose
('11000000-0000-0000-0000-000000000005', 1, 'Extra time allocated for any household task requested'),
('11000000-0000-0000-0000-000000000005', 2, 'Examples: organising shelves, cleaning inside cabinets, extra sweeping'),
('11000000-0000-0000-0000-000000000005', 3, 'Duration adjustable in 15-min steps; billed only for time actually used'),

-- HKP2-CR-W-6A: Washroom / Toilet Deep Clean
('11000000-0000-0000-0000-000000000006', 1, 'Scrub toilet bowl, seat, lid, and tank with disinfectant'),
('11000000-0000-0000-0000-000000000006', 2, 'Clean sink, taps, and mirror'),
('11000000-0000-0000-0000-000000000006', 3, 'Scrub tiles, grout lines, and mop floor thoroughly'),

-- HKP1-AR-W-7A: Window / Glass Panel Cleaning
('11000000-0000-0000-0000-000000000007', 1, 'Wipe glass panels and window panes inside with glass cleaner'),
('11000000-0000-0000-0000-000000000007', 2, 'Clean window frames and tracks'),
('11000000-0000-0000-0000-000000000007', 3, 'Remove fingerprints and smudges from all glass surfaces'),

-- HKP1-AR-W-8A: Balcony Deep Clean
('11000000-0000-0000-0000-000000000008', 1, 'Sweep and mop balcony floor'),
('11000000-0000-0000-0000-000000000008', 2, 'Wipe down railings, grills, and outdoor furniture'),
('11000000-0000-0000-0000-000000000008', 3, 'Remove dirt and debris from drain openings'),

-- HKP3-AR-W-9A: Laundry - Ironing
('11000000-0000-0000-0000-000000000009', 1, 'Iron clothes as per fabric care instructions'),
('11000000-0000-0000-0000-000000000009', 2, 'Hang or fold ironed items neatly'),
('11000000-0000-0000-0000-000000000009', 3, 'Separate delicates and special-care garments before ironing'),

-- HKP1-AR-W-10A: Fridge, Microwave, Chimney & Stove Clean
('11000000-0000-0000-0000-000000000010', 1, 'Wipe inside and outside of microwave'),
('11000000-0000-0000-0000-000000000010', 2, 'Clean stove top, burners, and grates'),
('11000000-0000-0000-0000-000000000010', 3, 'Degrease chimney filters and outer surface; wipe fridge exterior'),

-- HKP1-AR-W-11A: Kitchen / Pantry Cabinet Cleaning
('11000000-0000-0000-0000-000000000011', 1, 'Wipe down all cabinet fronts and handles'),
('11000000-0000-0000-0000-000000000011', 2, 'Clear and wipe inside pantry shelves'),
('11000000-0000-0000-0000-000000000011', 3, 'Remove expired items and restock neatly'),

-- HKP1-OD-OD-12A: On Demand Time - General Purpose
('11000000-0000-0000-0000-000000000012', 1, 'Flexible on-demand time for any household support task'),
('11000000-0000-0000-0000-000000000012', 2, 'Examples: deep-organising, post-event cleaning, guest preparation'),
('11000000-0000-0000-0000-000000000012', 3, 'Available only when a base housekeeping plan is active'),

-- KCH-CR-D-1A: Daily Cooking - Morning Shift
('22000000-0000-0000-0000-000000000001', 1, 'Prepare breakfast and/or lunch as per customer''s preferences'),
('22000000-0000-0000-0000-000000000001', 2, 'Cook using ingredients provided or sourced by the customer'),
('22000000-0000-0000-0000-000000000001', 3, 'Clean used vessels and wipe kitchen counter after cooking'),

-- KCH-CR-D-2A: Daily Cooking - Evening Shift
('22000000-0000-0000-0000-000000000002', 1, 'Prepare dinner as per customer''s preferences'),
('22000000-0000-0000-0000-000000000002', 2, 'Cover and store leftover food properly'),
('22000000-0000-0000-0000-000000000002', 3, 'Clean used vessels and leave kitchen tidy after cooking'),

-- KCH-OD-OD-2A: Add on Cooking Time
('22000000-0000-0000-0000-000000000003', 1, 'Extra cooking time beyond the regular shift'),
('22000000-0000-0000-0000-000000000003', 2, 'Useful for special meals, batch cooking, or festive occasions'),
('22000000-0000-0000-0000-000000000003', 3, 'Available only when a base kitchen plan is active'),

-- CCR-CR-D-1A: Basic Car Care Routine (compound_head; includes Cabin Weekly)
('33000000-0000-0000-0000-000000000001', 1, 'Wash car exterior with water and soap daily'),
('33000000-0000-0000-0000-000000000001', 2, 'Wipe tyres, wheel covers, and door sills'),
('33000000-0000-0000-0000-000000000001', 3, 'Once a week: vacuum cabin, wipe dashboard, clean interior glass'),

-- CCR-AR-D-2A: Weekly Car Shampoo Wash
('33000000-0000-0000-0000-000000000003', 1, 'Full exterior shampoo wash with scrub and rinse'),
('33000000-0000-0000-0000-000000000003', 2, 'Wipe down and dry exterior panels'),
('33000000-0000-0000-0000-000000000003', 3, 'Clean wheel wells and tyres thoroughly'),

-- CCR-AR-D-3A: Weekly Car Waxing
('33000000-0000-0000-0000-000000000004', 1, 'Apply car wax to exterior panels evenly'),
('33000000-0000-0000-0000-000000000004', 2, 'Buff to a shine and wipe off excess wax'),
('33000000-0000-0000-0000-000000000004', 3, 'Protects paint and enhances gloss finish'),

-- GCR-CR-D-1A: Basic Garden Care Routine (compound_head; includes weekly pruning)
('44000000-0000-0000-0000-000000000001', 1, 'Water all plants as per their moisture needs daily'),
('44000000-0000-0000-0000-000000000001', 2, 'Remove dead leaves and spent flowers'),
('44000000-0000-0000-0000-000000000001', 3, 'Once a week: dust leaves, prick soil, and prune overgrown branches'),

-- HMT-OD-OD-1A: Visitation - Electrician
('55000000-0000-0000-0000-000000000001', 1, 'Electrician visit for repairs, installations, or inspections'),
('55000000-0000-0000-0000-000000000001', 2, 'Diagnosis and minor fix included in the visit fee'),
('55000000-0000-0000-0000-000000000001', 3, 'Parts or materials cost billed separately if required'),

-- HMT-OD-OD-2A: Visitation - Plumber
('55000000-0000-0000-0000-000000000002', 1, 'Plumber visit for leaks, blockages, or fixture repairs'),
('55000000-0000-0000-0000-000000000002', 2, 'Diagnosis and minor fix included in the visit fee'),
('55000000-0000-0000-0000-000000000002', 3, 'Parts cost billed separately if required'),

-- HMT-OD-OD-3A: Visitation - Carpenter
('55000000-0000-0000-0000-000000000003', 1, 'Carpenter visit for repairs, furniture assembly, or installations'),
('55000000-0000-0000-0000-000000000003', 2, 'Diagnosis and minor work included in the visit fee'),
('55000000-0000-0000-0000-000000000003', 3, 'Parts or materials cost billed separately if required'),

-- HMT-OD-OD-4A: RO Service
('55000000-0000-0000-0000-000000000004', 1, 'Full RO water purifier service and maintenance'),
('55000000-0000-0000-0000-000000000004', 2, 'Filter check and replacement guidance'),
('55000000-0000-0000-0000-000000000004', 3, 'Water quality test and system flush'),

-- HMT-OD-OD-5A: AC Service
('55000000-0000-0000-0000-000000000005', 1, 'AC filter cleaning and general service'),
('55000000-0000-0000-0000-000000000005', 2, 'Refrigerant check and leak inspection'),
('55000000-0000-0000-0000-000000000005', 3, 'Performance test and maintenance recommendations');



-- ── 3. Locations ──────────────────────────────────────────────────────────

INSERT INTO locations (id, name, city, sector, state, pincode, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Sector 45, Gurugram', 'Gurugram', '45', 'Haryana', '122003', true),
  ('e0000000-0000-0000-0000-000000000002', 'Sector 50, Gurugram', 'Gurugram', '50', 'Haryana', '122018', true),
  ('e0000000-0000-0000-0000-000000000003', 'Sector 57, Gurugram', 'Gurugram', '57', 'Haryana', '122011', true);


-- ── 4. Staff Accounts ─────────────────────────────────────────────────────
-- All passwords: bcrypt hash of "admin123"
-- $2a$10$rQEY0tJh3z5OV5GXxVJXae7GMJDPaWBHT7G5./2bHqJh8X7hKqVi6

INSERT INTO staff_accounts (id, phone, name, email, password_hash, role, status, reports_to, location_id) VALUES
  -- Admin accounts (no reports_to, no location_id)
  ('f0000000-0000-0000-0000-000000000001',
   '9000000001', 'Srihari Raman', 'srihari@habio.in',
   '$2a$10$rQEY0tJh3z5OV5GXxVJXae7GMJDPaWBHT7G5./2bHqJh8X7hKqVi6',
   'admin', 'active', NULL, NULL),
  ('f0000000-0000-0000-0000-000000000002',
   '9000000002', 'Founder One', 'founder1@habio.in',
   '$2a$10$rQEY0tJh3z5OV5GXxVJXae7GMJDPaWBHT7G5./2bHqJh8X7hKqVi6',
   'admin', 'active', NULL, NULL),
  ('f0000000-0000-0000-0000-000000000003',
   '9000000003', 'Founder Two', 'founder2@habio.in',
   '$2a$10$rQEY0tJh3z5OV5GXxVJXae7GMJDPaWBHT7G5./2bHqJh8X7hKqVi6',
   'admin', 'active', NULL, NULL),
  -- Ops Lead (reports_to Srihari)
  ('f0000000-0000-0000-0000-000000000004',
   '9000000004', 'Kiran Mehta', 'kiran@habio.in',
   '$2a$10$rQEY0tJh3z5OV5GXxVJXae7GMJDPaWBHT7G5./2bHqJh8X7hKqVi6',
   'ops_lead', 'active', 'f0000000-0000-0000-0000-000000000001', NULL),
  -- Managers (reports_to Kiran)
  ('f0000000-0000-0000-0000-000000000005',
   '9000000005', 'Rahul Joshi', 'rahul@habio.in',
   '$2a$10$rQEY0tJh3z5OV5GXxVJXae7GMJDPaWBHT7G5./2bHqJh8X7hKqVi6',
   'manager', 'active', 'f0000000-0000-0000-0000-000000000004', NULL),
  ('f0000000-0000-0000-0000-000000000006',
   '9000000006', 'Preethi Menon', 'preethi@habio.in',
   '$2a$10$rQEY0tJh3z5OV5GXxVJXae7GMJDPaWBHT7G5./2bHqJh8X7hKqVi6',
   'manager', 'active', 'f0000000-0000-0000-0000-000000000004', NULL),
  -- Supervisors (reports_to their manager, have location_id)
  ('f0000000-0000-0000-0000-000000000007',
   '9100000001', 'Amit Bhatnagar', 'amit@habio.in',
   '$2a$10$rQEY0tJh3z5OV5GXxVJXae7GMJDPaWBHT7G5./2bHqJh8X7hKqVi6',
   'supervisor', 'active', 'f0000000-0000-0000-0000-000000000005',
   'e0000000-0000-0000-0000-000000000001'),  -- Sector 45
  ('f0000000-0000-0000-0000-000000000008',
   '9100000002', 'Sneha Kapoor', 'sneha@habio.in',
   '$2a$10$rQEY0tJh3z5OV5GXxVJXae7GMJDPaWBHT7G5./2bHqJh8X7hKqVi6',
   'supervisor', 'active', 'f0000000-0000-0000-0000-000000000005',
   'e0000000-0000-0000-0000-000000000002'),  -- Sector 50
  ('f0000000-0000-0000-0000-000000000009',
   '9100000003', 'Vijay Rao', 'vijay@habio.in',
   '$2a$10$rQEY0tJh3z5OV5GXxVJXae7GMJDPaWBHT7G5./2bHqJh8X7hKqVi6',
   'supervisor', 'active', 'f0000000-0000-0000-0000-000000000006',
   'e0000000-0000-0000-0000-000000000003'); -- Sector 57


-- ── 5. Staff Sessions ─────────────────────────────────────────────────────
-- Token: sess-staff-{UUID-last-segment}, expires 2026-04-20

INSERT INTO staff_sessions (id, staff_id, session_token, expires_at) VALUES
  ('fb000000-0000-0000-0000-000000000001',
   'f0000000-0000-0000-0000-000000000001',
   'sess-staff-000000000001', '2026-04-20 23:59:59+05:30'),
  ('fb000000-0000-0000-0000-000000000002',
   'f0000000-0000-0000-0000-000000000002',
   'sess-staff-000000000002', '2026-04-20 23:59:59+05:30'),
  ('fb000000-0000-0000-0000-000000000003',
   'f0000000-0000-0000-0000-000000000003',
   'sess-staff-000000000003', '2026-04-20 23:59:59+05:30'),
  ('fb000000-0000-0000-0000-000000000004',
   'f0000000-0000-0000-0000-000000000004',
   'sess-staff-000000000004', '2026-04-20 23:59:59+05:30'),
  ('fb000000-0000-0000-0000-000000000005',
   'f0000000-0000-0000-0000-000000000005',
   'sess-staff-000000000005', '2026-04-20 23:59:59+05:30'),
  ('fb000000-0000-0000-0000-000000000006',
   'f0000000-0000-0000-0000-000000000006',
   'sess-staff-000000000006', '2026-04-20 23:59:59+05:30'),
  ('fb000000-0000-0000-0000-000000000007',
   'f0000000-0000-0000-0000-000000000007',
   'sess-staff-000000000007', '2026-04-20 23:59:59+05:30'),
  ('fb000000-0000-0000-0000-000000000008',
   'f0000000-0000-0000-0000-000000000008',
   'sess-staff-000000000008', '2026-04-20 23:59:59+05:30'),
  ('fb000000-0000-0000-0000-000000000009',
   'f0000000-0000-0000-0000-000000000009',
   'sess-staff-000000000009', '2026-04-20 23:59:59+05:30');


-- ── 6. Service Providers ──────────────────────────────────────────────────
-- UUID: a0000000-0000-0000-0000-0000000000NN

INSERT INTO service_providers (id, phone, name, provider_type, status, aadhaar, address, permanent_address, location_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', '+919900000001', 'Ravi Kumar',
   'housekeeping', 'available',
   '1234-5678-0001', 'House 12, Sector 45, Gurugram', 'Village Ravi, UP',
   'e0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', '+919900000002', 'Sunita Devi',
   'kitchen', 'available',
   '1234-5678-0002', 'Flat 3B, Sector 45, Gurugram', 'Village Sunita, Bihar',
   'e0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', '+919900000003', 'Priya Nair',
   'housekeeping', 'available',
   '1234-5678-0003', 'Room 5, Sector 50, Gurugram', 'Village Priya, Kerala',
   'e0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000004', '+919900000004', 'Deepa Kumari',
   'car_care', 'available',
   '1234-5678-0004', 'Flat 9C, Sector 45, Gurugram', 'Village Deepa, Bihar',
   'e0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000005', '+919900000005', 'Ajay Yadav',
   'housekeeping', 'available',
   '1234-5678-0005', 'Room 11, Sector 57, Gurugram', 'Village Ajay, Haryana',
   'e0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000006', '+919900000006', 'Rekha Bai',
   'kitchen', 'available',
   '1234-5678-0006', 'House 3, Sector 57, Gurugram', 'Village Rekha, MP',
   'e0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000007', '+919900000007', 'Satish Verma',
   'garden_care', 'available',
   '1234-5678-0007', 'Room 7, Sector 50, Gurugram', 'Village Satish, Rajasthan',
   'e0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000008', '+919900000008', 'Ramesh Gupta',
   'housekeeping', 'available',
   '1234-5678-0008', 'House 22, Sector 50, Gurugram', 'Village Ramesh, UP',
   'e0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000009', '+919900000009', 'Arjun Sharma',
   'technician_electrical', 'available',
   '1234-5678-0009', 'Room 15, Sector 50, Gurugram', 'Village Arjun, Rajasthan',
   'e0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000010', '+919900000010', 'Mohan Singh',
   'technician_plumber', 'available',
   '1234-5678-0010', 'Room 8, Sector 57, Gurugram', 'Village Mohan, MP',
   'e0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000011', '+919900000011', 'Lalit Tiwari',
   'technician_carpenter', 'available',
   '1234-5678-0011', 'House 5, Sector 45, Gurugram', 'Village Lalit, UP',
   'e0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000012', '+919900000012', 'Dinesh Kumar',
   'technician_ac', 'available',
   '1234-5678-0012', 'Room 2, Sector 57, Gurugram', 'Village Dinesh, Bihar',
   'e0000000-0000-0000-0000-000000000003');


-- ── 7. Provider Week Offs ─────────────────────────────────────────────────
-- effective_from: 2026-01-01, effective_to: NULL (permanent)

INSERT INTO provider_week_offs (service_provider_id, day_of_week, effective_from, effective_to) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'sunday',    '2026-01-01', NULL),  -- Ravi
  ('a0000000-0000-0000-0000-000000000002', 'sunday',    '2026-01-01', NULL),  -- Sunita
  ('a0000000-0000-0000-0000-000000000003', 'wednesday', '2026-01-01', NULL),  -- Priya
  ('a0000000-0000-0000-0000-000000000004', 'sunday',    '2026-01-01', NULL),  -- Deepa
  ('a0000000-0000-0000-0000-000000000005', 'thursday',  '2026-01-01', NULL),  -- Ajay
  ('a0000000-0000-0000-0000-000000000006', 'thursday',  '2026-01-01', NULL),  -- Rekha
  ('a0000000-0000-0000-0000-000000000007', 'monday',    '2026-01-01', NULL),  -- Satish
  ('a0000000-0000-0000-0000-000000000008', 'wednesday', '2026-01-01', NULL),  -- Ramesh
  ('a0000000-0000-0000-0000-000000000009', 'sunday',    '2026-01-01', NULL),  -- Arjun
  ('a0000000-0000-0000-0000-000000000010', 'sunday',    '2026-01-01', NULL),  -- Mohan
  ('a0000000-0000-0000-0000-000000000011', 'tuesday',   '2026-01-01', NULL),  -- Lalit
  ('a0000000-0000-0000-0000-000000000012', 'friday',    '2026-01-01', NULL);  -- Dinesh


-- ── 8. Provider Sessions (providers 01–08) ────────────────────────────────

INSERT INTO provider_sessions (id, service_provider_id, session_token, expires_at) VALUES
  ('d0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'prov-sess-01', '2026-04-20 23:59:59+05:30'),
  ('d0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002', 'prov-sess-02', '2026-04-20 23:59:59+05:30'),
  ('d0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000003', 'prov-sess-03', '2026-04-20 23:59:59+05:30'),
  ('d0000000-0000-0000-0000-000000000004',
   'a0000000-0000-0000-0000-000000000004', 'prov-sess-04', '2026-04-20 23:59:59+05:30'),
  ('d0000000-0000-0000-0000-000000000005',
   'a0000000-0000-0000-0000-000000000005', 'prov-sess-05', '2026-04-20 23:59:59+05:30'),
  ('d0000000-0000-0000-0000-000000000006',
   'a0000000-0000-0000-0000-000000000006', 'prov-sess-06', '2026-04-20 23:59:59+05:30'),
  ('d0000000-0000-0000-0000-000000000007',
   'a0000000-0000-0000-0000-000000000007', 'prov-sess-07', '2026-04-20 23:59:59+05:30'),
  ('d0000000-0000-0000-0000-000000000008',
   'a0000000-0000-0000-0000-000000000008', 'prov-sess-08', '2026-04-20 23:59:59+05:30');


-- ── 9. Provider Team Assignments ──────────────────────────────────────────
-- Amit (f0…007) → Sector 45: Ravi, Sunita, Deepa, Lalit
-- Sneha (f0…008) → Sector 50: Priya, Satish, Ramesh, Arjun
-- Vijay (f0…009) → Sector 57: Ajay, Rekha, Mohan, Dinesh

INSERT INTO provider_team_assignments (service_provider_id, supervisor_id) VALUES
  -- Amit's team (Sector 45)
  ('a0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000007'), -- Ravi
  ('a0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000007'), -- Sunita
  ('a0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000007'), -- Deepa
  ('a0000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000007'), -- Lalit
  -- Sneha's team (Sector 50)
  ('a0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000008'), -- Priya
  ('a0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000008'), -- Satish
  ('a0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000008'), -- Ramesh
  ('a0000000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-000000000008'), -- Arjun
  -- Vijay's team (Sector 57)
  ('a0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000009'), -- Ajay
  ('a0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000009'), -- Rekha
  ('a0000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000009'), -- Mohan
  ('a0000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000009'); -- Dinesh


-- ── 10. Customers ────────────────────────────────────────────────────────
-- UUID: c0000000-0000-0000-0000-0000000000NN

INSERT INTO customers (id, phone, name) VALUES
  ('c0000000-0000-0000-0000-000000000001', '+919800000001', 'Ananya Sharma'),
  ('c0000000-0000-0000-0000-000000000002', '+919800000002', 'Vikram Patel'),
  ('c0000000-0000-0000-0000-000000000003', '+919800000003', 'Meera Nambiar'),
  ('c0000000-0000-0000-0000-000000000004', '+919800000004', 'Sanjay Gupta'),
  ('c0000000-0000-0000-0000-000000000005', '+919800000005', 'Pallavi Singh'),
  ('c0000000-0000-0000-0000-000000000006', '+919800000006', 'Rohit Khanna'),
  ('c0000000-0000-0000-0000-000000000007', '+919800000007', 'Kavitha Iyer'),
  ('c0000000-0000-0000-0000-000000000008', '+919800000008', 'Nitin Agarwal');


-- ── 11. Customer Profiles ─────────────────────────────────────────────────

INSERT INTO customer_profiles (
  customer_id, flat_no, building, society, sector, city, pincode,
  home_type, bhk, bathrooms, balconies, cars, plants,
  diet_pref, people_count, cook_window_morning, cook_window_evening
) VALUES
  -- C1: Ananya Sharma, Sector 45, 2BHK
  ('c0000000-0000-0000-0000-000000000001',
   '304', 'Tower B', 'Green Valley Residency', 'Sector 45', 'Gurugram', '122003',
   'apartment', 2, 2, 1, 1, 0, 'veg', 3, true, false),
  -- C2: Vikram Patel, Sector 45, 3BHK
  ('c0000000-0000-0000-0000-000000000002',
   '102', 'Sunrise Block', 'Palm Grove Society', 'Sector 45', 'Gurugram', '122003',
   'apartment', 3, 2, 2, 2, 0, 'non-veg', 4, false, false),
  -- C3: Meera Nambiar, Sector 50, 2BHK
  ('c0000000-0000-0000-0000-000000000003',
   '205', 'Orchid Block', 'DLF Magnolias', 'Sector 50', 'Gurugram', '122018',
   'apartment', 2, 2, 1, 1, 20, 'veg', 2, false, false),
  -- C4: Sanjay Gupta, Sector 50, 3BHK
  ('c0000000-0000-0000-0000-000000000004',
   'B-301', 'Oak Tower', 'Suncity Township', 'Sector 50', 'Gurugram', '122018',
   'apartment', 3, 3, 2, 1, 0, 'non-veg', 5, false, false),
  -- C5: Pallavi Singh, Sector 57, 2BHK
  ('c0000000-0000-0000-0000-000000000005',
   'A-201', 'Rose Block', 'Ardee City', 'Sector 57', 'Gurugram', '122011',
   'apartment', 2, 2, 1, 0, 0, 'veg', 2, false, false),
  -- C6: Rohit Khanna, Sector 57, 4BHK
  ('c0000000-0000-0000-0000-000000000006',
   'F-501', 'Pearl Tower', 'Hamilton Court', 'Sector 57', 'Gurugram', '122011',
   'apartment', 4, 3, 3, 2, 0, 'non-veg', 6, false, false),
  -- C7: Kavitha Iyer, Sector 45, 2BHK
  ('c0000000-0000-0000-0000-000000000007',
   '503', 'Jasmine Block', 'Nirvana Country', 'Sector 45', 'Gurugram', '122003',
   'apartment', 2, 1, 1, 0, 0, 'veg', 2, false, false),
  -- C8: Nitin Agarwal, Sector 50, 3BHK
  ('c0000000-0000-0000-0000-000000000008',
   'C-105', 'Cedar Block', 'Pioneer Park', 'Sector 50', 'Gurugram', '122018',
   'apartment', 3, 2, 2, 1, 0, 'non-veg', 3, false, false);


-- ── 12. Customer Sessions (C1–C6 active customers) ────────────────────────

INSERT INTO customer_sessions (id, customer_id, session_token, expires_at) VALUES
  ('dc000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', 'cust-sess-01', '2026-04-20 23:59:59+05:30'),
  ('dc000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000002', 'cust-sess-02', '2026-04-20 23:59:59+05:30'),
  ('dc000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000003', 'cust-sess-03', '2026-04-20 23:59:59+05:30'),
  ('dc000000-0000-0000-0000-000000000004',
   'c0000000-0000-0000-0000-000000000004', 'cust-sess-04', '2026-04-20 23:59:59+05:30'),
  ('dc000000-0000-0000-0000-000000000005',
   'c0000000-0000-0000-0000-000000000005', 'cust-sess-05', '2026-04-20 23:59:59+05:30'),
  ('dc000000-0000-0000-0000-000000000006',
   'c0000000-0000-0000-0000-000000000006', 'cust-sess-06', '2026-04-20 23:59:59+05:30');


-- ── 13. Plan Requests ─────────────────────────────────────────────────────
-- UUID: b0000000-0000-0000-0000-0000000000NN

INSERT INTO plan_requests (
  id, request_code, customer_id, status,
  total_price_monthly, plan_start_date, plan_active_start_date, is_recurring,
  assigned_supervisor_id, created_at, updated_at
) VALUES
  -- P1: Ananya | active | HKP 45min + KCH 60min | supervisor Amit
  ('b0000000-0000-0000-0000-000000000001',
   'HABIO-2026-0001',
   'c0000000-0000-0000-0000-000000000001',
   'active',
   8158.50, '2026-02-26', '2026-02-26', true,
   'f0000000-0000-0000-0000-000000000007',
   '2026-02-20 10:00:00+05:30', '2026-02-26 09:00:00+05:30'),
  -- P2: Vikram | active | HKP 30min + CCR 2 cars | supervisor Amit
  ('b0000000-0000-0000-0000-000000000002',
   'HABIO-2026-0002',
   'c0000000-0000-0000-0000-000000000002',
   'active',
   4435.20, '2026-03-02', '2026-03-02', true,
   'f0000000-0000-0000-0000-000000000007',
   '2026-02-25 11:00:00+05:30', '2026-03-02 09:00:00+05:30'),
  -- P3: Meera | active | HKP 45min + GCR 20 plants | supervisor Sneha
  ('b0000000-0000-0000-0000-000000000003',
   'HABIO-2026-0003',
   'c0000000-0000-0000-0000-000000000003',
   'active',
   4365.90, '2026-03-05', '2026-03-05', true,
   'f0000000-0000-0000-0000-000000000008',
   '2026-02-28 14:00:00+05:30', '2026-03-05 09:00:00+05:30'),
  -- P4: Sanjay | paused | HKP 45min + HKP2-CR-W-6A 3 bathrooms | supervisor Sneha
  ('b0000000-0000-0000-0000-000000000004',
   'HABIO-2026-0004',
   'c0000000-0000-0000-0000-000000000004',
   'paused',
   4378.50, '2026-02-15', '2026-02-15', true,
   'f0000000-0000-0000-0000-000000000008',
   '2026-02-10 09:00:00+05:30', '2026-03-18 08:00:00+05:30'),
  -- P5: Pallavi | payment_pending | HKP 30min | supervisor Vijay
  ('b0000000-0000-0000-0000-000000000005',
   'HABIO-2026-0005',
   'c0000000-0000-0000-0000-000000000005',
   'payment_pending',
   2079.00, NULL, NULL, true,
   'f0000000-0000-0000-0000-000000000009',
   '2026-03-15 16:00:00+05:30', '2026-03-17 10:00:00+05:30'),
  -- P6: Rohit | captain_review_pending | HKP 45min + CCR 2 cars | supervisor Vijay
  ('b0000000-0000-0000-0000-000000000006',
   'HABIO-2026-0006',
   'c0000000-0000-0000-0000-000000000006',
   'captain_review_pending',
   5474.70, NULL, NULL, true,
   'f0000000-0000-0000-0000-000000000009',
   '2026-03-18 11:00:00+05:30', '2026-03-19 09:00:00+05:30'),
  -- P7: Kavitha | submitted | HKP 30min | no supervisor yet
  ('b0000000-0000-0000-0000-000000000007',
   'HABIO-2026-0007',
   'c0000000-0000-0000-0000-000000000007',
   'submitted',
   2079.00, NULL, NULL, true,
   NULL,
   '2026-03-20 14:00:00+05:30', '2026-03-20 14:00:00+05:30'),
  -- P8: Nitin | cart_in_progress | (not submitted yet)
  ('b0000000-0000-0000-0000-000000000008',
   'HABIO-2026-0008',
   'c0000000-0000-0000-0000-000000000008',
   'cart_in_progress',
   0.00, NULL, NULL, true,
   NULL,
   '2026-03-21 08:30:00+05:30', '2026-03-21 08:30:00+05:30');


-- ── 14. Plan Request Items (P1–P7; P8 is cart_in_progress, no items) ──────
-- UUID scheme: e[plan]000000-0000-0000-[item]-000000000001

INSERT INTO plan_request_items (
  id, plan_request_id, category_id, job_id, job_code,
  title, frequency_label, unit_type, unit_value, minutes,
  base_rate_per_unit, instances_per_month, discount_pct,
  time_multiple, formula_type, base_price_monthly,
  price_monthly, mrp_monthly, is_addon, updated_at
) VALUES
  -- P1-1: Ananya HKP 45min daily
  ('e1000000-0000-0000-0001-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '11000000-0000-0000-0000-000000000001',
   'HKP1-CR-D-1A', 'Dusting, Brooming, Mopping',
   'Daily', 'min', 45, 45,
   3.3000, 30, 0.3000, NULL, 'standard', 4455.00,
   3118.50, 4455.00, false, '2026-02-26 09:00:00+05:30'),
  -- P1-2: Ananya KCH 60min daily morning
  ('e1000000-0000-0000-0002-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '22000000-0000-0000-0000-000000000001',
   'KCH-CR-D-1A', 'Daily Cooking - Morning Shift',
   'Daily', 'min', 60, 60,
   4.0000, 30, 0.3000, NULL, 'standard', 7200.00,
   5040.00, 7200.00, false, '2026-02-26 09:00:00+05:30'),
  -- P2-1: Vikram HKP 30min daily
  ('e2000000-0000-0000-0001-000000000001',
   'b0000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   '11000000-0000-0000-0000-000000000001',
   'HKP1-CR-D-1A', 'Dusting, Brooming, Mopping',
   'Daily', 'min', 30, 30,
   3.3000, 30, 0.3000, NULL, 'standard', 2970.00,
   2079.00, 2970.00, false, '2026-03-02 09:00:00+05:30'),
  -- P2-2: Vikram CCR 2 cars daily
  ('e2000000-0000-0000-0002-000000000001',
   'b0000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   '33000000-0000-0000-0000-000000000001',
   'CCR-CR-D-1A', 'Basic Car Care Routine',
   'Daily', 'count_cars', 2, 30,
   3.3000, 30, 0.3000, 15.00, 'compound_head', 3366.00,
   2356.20, 3366.00, false, '2026-03-02 09:00:00+05:30'),
  -- P3-1: Meera HKP 45min daily
  ('e3000000-0000-0000-0001-000000000001',
   'b0000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   '11000000-0000-0000-0000-000000000001',
   'HKP1-CR-D-1A', 'Dusting, Brooming, Mopping',
   'Daily', 'min', 45, 45,
   3.3000, 30, 0.3000, NULL, 'standard', 4455.00,
   3118.50, 4455.00, false, '2026-03-05 09:00:00+05:30'),
  -- P3-2: Meera GCR 20 plants daily
  ('e3000000-0000-0000-0002-000000000001',
   'b0000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000004',
   '44000000-0000-0000-0000-000000000001',
   'GCR-CR-D-1A', 'Basic Garden Care Routine',
   'Daily', 'count_plants', 20, 10,
   3.3000, 30, 0.3000, 0.50, 'compound_head', 1782.00,
   1247.40, 1782.00, false, '2026-03-05 09:00:00+05:30'),
  -- P4-1: Sanjay HKP 45min daily
  ('e4000000-0000-0000-0001-000000000001',
   'b0000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   '11000000-0000-0000-0000-000000000001',
   'HKP1-CR-D-1A', 'Dusting, Brooming, Mopping',
   'Daily', 'min', 45, 45,
   3.3000, 30, 0.3000, NULL, 'standard', 4455.00,
   3118.50, 4455.00, false, '2026-02-15 09:00:00+05:30'),
  -- P4-2: Sanjay HKP2-CR-W-6A 3 bathrooms weekly deep clean
  ('e4000000-0000-0000-0002-000000000001',
   'b0000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   '11000000-0000-0000-0000-000000000006',
   'HKP2-CR-W-6A', 'Washroom / Toilet Deep Clean',
   'Weekly', 'count_washrooms', 3, 90,
   5.0000, 4, 0.3000, 30.00, 'time_multiple', 1800.00,
   1260.00, 1800.00, false, '2026-02-15 09:00:00+05:30'),
  -- P5-1: Pallavi HKP 30min daily
  ('e5000000-0000-0000-0001-000000000001',
   'b0000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000001',
   '11000000-0000-0000-0000-000000000001',
   'HKP1-CR-D-1A', 'Dusting, Brooming, Mopping',
   'Daily', 'min', 30, 30,
   3.3000, 30, 0.3000, NULL, 'standard', 2970.00,
   2079.00, 2970.00, false, '2026-03-17 10:00:00+05:30'),
  -- P6-1: Rohit HKP 45min daily
  ('e6000000-0000-0000-0001-000000000001',
   'b0000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000001',
   '11000000-0000-0000-0000-000000000001',
   'HKP1-CR-D-1A', 'Dusting, Brooming, Mopping',
   'Daily', 'min', 45, 45,
   3.3000, 30, 0.3000, NULL, 'standard', 4455.00,
   3118.50, 4455.00, false, '2026-03-19 09:00:00+05:30'),
  -- P6-2: Rohit CCR 2 cars daily
  ('e6000000-0000-0000-0002-000000000001',
   'b0000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000003',
   '33000000-0000-0000-0000-000000000001',
   'CCR-CR-D-1A', 'Basic Car Care Routine',
   'Daily', 'count_cars', 2, 30,
   3.3000, 30, 0.3000, 15.00, 'compound_head', 3366.00,
   2356.20, 3366.00, false, '2026-03-19 09:00:00+05:30'),
  -- P7-1: Kavitha HKP 30min daily
  ('e7000000-0000-0000-0001-000000000001',
   'b0000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000001',
   '11000000-0000-0000-0000-000000000001',
   'HKP1-CR-D-1A', 'Dusting, Brooming, Mopping',
   'Daily', 'min', 30, 30,
   3.3000, 30, 0.3000, NULL, 'standard', 2970.00,
   2079.00, 2970.00, false, '2026-03-20 14:00:00+05:30');


-- ── 15. Plan Request Events (full lifecycle audit trail) ──────────────────
-- event_type values use the new plan_request_status names

INSERT INTO plan_request_events (plan_request_id, event_type, note, created_at) VALUES
  -- P1 Ananya: full lifecycle → active
  ('b0000000-0000-0000-0000-000000000001', 'cart_in_progress',
   'Customer started building their plan.', '2026-02-20 10:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000001', 'submitted',
   'Customer submitted plan: Housekeeping 45min + Morning Cooking 60min.', '2026-02-20 10:30:00+05:30'),
  ('b0000000-0000-0000-0000-000000000001', 'captain_allocation_pending',
   'Plan queued for supervisor assignment in Sector 45.', '2026-02-20 11:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000001', 'captain_review_pending',
   'Assigned to Amit Bhatnagar for on-site review.', '2026-02-21 09:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000001', 'payment_pending',
   'Captain review complete. Ravi Kumar (HKP 07:00-07:45) + Sunita Devi (KCH 08:30-09:30). Payment link sent.', '2026-02-23 14:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000001', 'active',
   'Payment confirmed. Plan activated from 26 Feb 2026.', '2026-02-26 09:00:00+05:30'),
  -- P2 Vikram: full lifecycle → active
  ('b0000000-0000-0000-0000-000000000002', 'cart_in_progress',
   'Customer started building their plan.', '2026-02-25 11:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000002', 'submitted',
   'Customer submitted plan: Housekeeping 30min + Car Care 2 cars.', '2026-02-25 11:30:00+05:30'),
  ('b0000000-0000-0000-0000-000000000002', 'captain_allocation_pending',
   'Plan queued for supervisor assignment in Sector 45.', '2026-02-25 12:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000002', 'captain_review_pending',
   'Assigned to Amit Bhatnagar.', '2026-02-26 09:30:00+05:30'),
  ('b0000000-0000-0000-0000-000000000002', 'payment_pending',
   'Review done. Ravi Kumar (HKP 07:45-08:15) + Deepa Kumari (CCR 07:00-07:30). Payment link sent.', '2026-02-27 15:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000002', 'active',
   'Payment confirmed. Plan activated from 2 Mar 2026.', '2026-03-02 09:00:00+05:30'),
  -- P3 Meera: full lifecycle → active
  ('b0000000-0000-0000-0000-000000000003', 'cart_in_progress',
   'Customer started building their plan.', '2026-02-28 14:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000003', 'submitted',
   'Customer submitted plan: Housekeeping 45min + Garden Care 20 plants.', '2026-02-28 14:30:00+05:30'),
  ('b0000000-0000-0000-0000-000000000003', 'captain_allocation_pending',
   'Plan queued for supervisor in Sector 50.', '2026-02-28 15:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000003', 'captain_review_pending',
   'Assigned to Sneha Kapoor.', '2026-03-01 10:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000003', 'payment_pending',
   'Review done. Priya Nair (HKP 07:00-07:45) + Satish Verma (GCR 07:45-08:25). Payment link sent.', '2026-03-02 16:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000003', 'active',
   'Payment confirmed. Plan activated from 5 Mar 2026.', '2026-03-05 09:00:00+05:30'),
  -- P4 Sanjay: full lifecycle → active → paused
  ('b0000000-0000-0000-0000-000000000004', 'cart_in_progress',
   'Customer started building their plan.', '2026-02-10 09:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000004', 'submitted',
   'Customer submitted plan: Housekeeping 45min + Washroom Deep Clean 3 bathrooms.', '2026-02-10 09:30:00+05:30'),
  ('b0000000-0000-0000-0000-000000000004', 'captain_allocation_pending',
   'Plan queued for supervisor in Sector 50.', '2026-02-10 10:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000004', 'captain_review_pending',
   'Assigned to Sneha Kapoor.', '2026-02-11 09:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000004', 'payment_pending',
   'Review done. Ramesh Gupta (HKP+Deep Clean 08:30-09:15). Payment link sent.', '2026-02-12 14:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000004', 'active',
   'Payment confirmed. Plan activated from 15 Feb 2026.', '2026-02-15 09:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000004', 'paused',
   'Customer requested vacation pause 18 Mar – 28 Mar. Approved by Sneha Kapoor.', '2026-03-18 08:00:00+05:30'),
  -- P5 Pallavi: lifecycle → payment_pending
  ('b0000000-0000-0000-0000-000000000005', 'cart_in_progress',
   'Customer started building their plan.', '2026-03-15 16:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000005', 'submitted',
   'Customer submitted plan: Housekeeping 30min.', '2026-03-15 16:30:00+05:30'),
  ('b0000000-0000-0000-0000-000000000005', 'captain_allocation_pending',
   'Plan queued for supervisor in Sector 57.', '2026-03-15 17:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000005', 'captain_review_pending',
   'Assigned to Vijay Rao for review.', '2026-03-16 09:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000005', 'payment_pending',
   'Review done. Ajay Yadav assigned (HKP 08:00-08:30). Payment link sent.', '2026-03-17 10:00:00+05:30'),
  -- P6 Rohit: lifecycle → captain_review_pending
  ('b0000000-0000-0000-0000-000000000006', 'cart_in_progress',
   'Customer started building their plan.', '2026-03-18 11:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000006', 'submitted',
   'Customer submitted plan: Housekeeping 45min + Car Care 2 cars.', '2026-03-18 11:30:00+05:30'),
  ('b0000000-0000-0000-0000-000000000006', 'captain_allocation_pending',
   'Plan queued for supervisor in Sector 57.', '2026-03-18 12:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000006', 'captain_review_pending',
   'Assigned to Vijay Rao for on-site review.', '2026-03-19 09:00:00+05:30'),
  -- P7 Kavitha: cart_in_progress → submitted
  ('b0000000-0000-0000-0000-000000000007', 'cart_in_progress',
   'Customer started building their plan.', '2026-03-20 14:00:00+05:30'),
  ('b0000000-0000-0000-0000-000000000007', 'submitted',
   'Customer submitted plan: Housekeeping 30min.', '2026-03-20 14:15:00+05:30'),
  -- P8 Nitin: cart_in_progress only
  ('b0000000-0000-0000-0000-000000000008', 'cart_in_progress',
   'Customer is browsing and adding services to their plan.', '2026-03-21 08:30:00+05:30');


-- ── 16. Payments ─────────────────────────────────────────────────────────

INSERT INTO payments (id, plan_request_id, amount, status, provider, provider_ref, payment_link, payment_link_expires_at, paid_at, created_at) VALUES
  -- P1: succeeded
  ('ba000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   8158.50, 'succeeded', 'razorpay', 'pay_seed_p1_001',
   NULL, NULL, '2026-02-26 09:00:00+05:30',
   '2026-02-23 14:00:00+05:30'),
  -- P2: succeeded
  ('ba000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000002',
   4435.20, 'succeeded', 'razorpay', 'pay_seed_p2_001',
   NULL, NULL, '2026-03-02 09:00:00+05:30',
   '2026-02-27 15:00:00+05:30'),
  -- P3: succeeded
  ('ba000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000003',
   4365.90, 'succeeded', 'razorpay', 'pay_seed_p3_001',
   NULL, NULL, '2026-03-05 09:00:00+05:30',
   '2026-03-02 16:00:00+05:30'),
  -- P4: succeeded
  ('ba000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000004',
   4378.50, 'succeeded', 'razorpay', 'pay_seed_p4_001',
   NULL, NULL, '2026-02-15 09:00:00+05:30',
   '2026-02-12 14:00:00+05:30'),
  -- P5: pending — link generated, awaiting payment
  ('ba000000-0000-0000-0000-000000000005',
   'b0000000-0000-0000-0000-000000000005',
   2079.00, 'pending', 'razorpay', NULL,
   'https://pay.habio.in/link/P5-MOCK-001',
   '2026-03-23 23:59:59+05:30', NULL,
   '2026-03-17 10:00:00+05:30');


-- ── 17. Job Allocations ───────────────────────────────────────────────────
-- Date range: 2026-03-03 (Tue) to 2026-03-28 (Sat). Today = 2026-03-21 (Sat).
-- March 2026 calendar:
--   Mon=2,9,16,23 | Tue=3,10,17,24 | Wed=4,11,18,25 | Thu=5,12,19,26
--   Fri=6,13,20,27 | Sat=7,14,21,28 | Sun=1,8,15,22
--
-- Provider week-offs:
--   Ravi(a01)=sunday, Sunita(a02)=sunday, Deepa(a04)=sunday
--   Priya(a03)=wednesday, Ramesh(a08)=wednesday
--   Satish(a07)=monday
--
-- Plans:
--   P1: Ananya | HKP Ravi 07:00-07:45, KCH Sunita 08:30-09:30 | sup Amit(f07)
--   P2: Vikram | HKP Ravi 07:45-08:15, CCR Deepa 07:00-07:30  | sup Amit(f07)
--   P3: Meera  | HKP Priya 07:00-07:45, GCR Satish 07:45-08:25| sup Sneha(f08)
--   P4: Sanjay | HKP Ramesh 08:30-09:15 (paused from Mar 18)   | sup Sneha(f08)
--
-- Status strategy (past = before Mar 21):
--   Most days: completed | A few: completed_delayed, incomplete, cancelled_by_customer, status_not_marked
--   Mar 21 (today): mix of in_progress, scheduled, scheduled_delayed, in_progress_delayed
--   Mar 22+: scheduled
--   P4 from Mar 19+: service_on_pause (Mar 18 = Wed = Ramesh's off day)
--
-- actual_start_time / actual_end_time are now TIMESTAMPTZ


-- ─── P1: Ananya — HKP (Ravi) + KCH (Sunita) ─────────────────────────────
-- Ravi off sunday: skip Mar 8,15,22 | Sunita off sunday: skip Mar 8,15,22
-- (Ravi also serves P2 07:45-08:15, no time conflict with P1 07:00-07:45)

INSERT INTO job_allocations (
  id, plan_request_id, plan_request_item_id, service_provider_id, customer_id, supervisor_id,
  scheduled_date, scheduled_start_time, scheduled_end_time,
  actual_start_time, actual_end_time,
  status, is_locked, supervisor_notes
) VALUES
-- === P1-HKP (Ravi, 07:00-07:45) ===
('fa110000-0000-0000-0000-202603030000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-03','07:00','07:45','2026-03-03 07:01:00+05:30','2026-03-03 07:46:00+05:30',
 'completed',true,NULL),
('fa110000-0000-0000-0000-202603040000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-04','07:00','07:45','2026-03-04 07:02:00+05:30','2026-03-04 07:47:00+05:30',
 'completed',true,NULL),
('fa110000-0000-0000-0000-202603050000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-05','07:00','07:45','2026-03-05 07:00:00+05:30','2026-03-05 07:44:00+05:30',
 'completed',true,NULL),
('fa110000-0000-0000-0000-202603060000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-06','07:00','07:45','2026-03-06 07:03:00+05:30','2026-03-06 07:48:00+05:30',
 'completed',true,NULL),
('fa110000-0000-0000-0000-202603070000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-07','07:00','07:45','2026-03-07 07:01:00+05:30','2026-03-07 07:45:00+05:30',
 'completed',true,NULL),
-- Mar 8 = Sun, Ravi off — no allocation
('fa110000-0000-0000-0000-202603090000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-09','07:00','07:45','2026-03-09 07:02:00+05:30','2026-03-09 07:46:00+05:30',
 'completed',true,NULL),
('fa110000-0000-0000-0000-202603100000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-10','07:00','07:45','2026-03-10 07:01:00+05:30','2026-03-10 07:45:00+05:30',
 'completed',true,NULL),
-- Mar 11 — completed_delayed (arrived 15 min late)
('fa110000-0000-0000-0000-202603110000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-11','07:00','07:45','2026-03-11 07:16:00+05:30','2026-03-11 08:01:00+05:30',
 'completed_delayed',true,'Provider arrived 16 min late due to traffic. Completed full service.'),
('fa110000-0000-0000-0000-202603120000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-12','07:00','07:45','2026-03-12 07:02:00+05:30','2026-03-12 07:47:00+05:30',
 'completed',true,NULL),
('fa110000-0000-0000-0000-202603130000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-13','07:00','07:45','2026-03-13 07:00:00+05:30','2026-03-13 07:44:00+05:30',
 'completed',true,NULL),
-- Mar 14 — cancelled (admin/supervisor cancelled)
('fa110000-0000-0000-0000-202603140000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-14','07:00','07:45',NULL,NULL,
 'cancelled',true,'Provider reported illness; service cancelled for the day.'),
-- Mar 15 = Sun, Ravi off — no allocation
('fa110000-0000-0000-0000-202603160000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-16','07:00','07:45','2026-03-16 07:03:00+05:30','2026-03-16 07:48:00+05:30',
 'completed',true,NULL),
('fa110000-0000-0000-0000-202603170000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-17','07:00','07:45','2026-03-17 07:01:00+05:30','2026-03-17 07:46:00+05:30',
 'completed',true,NULL),
('fa110000-0000-0000-0000-202603180000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-18','07:00','07:45','2026-03-18 07:02:00+05:30','2026-03-18 07:47:00+05:30',
 'completed',true,NULL),
('fa110000-0000-0000-0000-202603190000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-19','07:00','07:45','2026-03-19 07:00:00+05:30','2026-03-19 07:45:00+05:30',
 'completed',true,NULL),
('fa110000-0000-0000-0000-202603200000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-20','07:00','07:45','2026-03-20 07:01:00+05:30','2026-03-20 07:46:00+05:30',
 'completed',true,NULL),
-- Mar 21 (TODAY) — P1-HKP in_progress (Ravi started)
('fa110000-0000-0000-0000-202603210000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-21','07:00','07:45','2026-03-21 07:03:00+05:30',NULL,
 'in_progress',false,NULL),
-- Mar 22 = Sun, Ravi off — no allocation
-- Mar 23–28 scheduled
('fa110000-0000-0000-0000-202603230000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-23','07:00','07:45',NULL,NULL,'scheduled',false,NULL),
('fa110000-0000-0000-0000-202603240000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-24','07:00','07:45',NULL,NULL,'scheduled',false,NULL),
-- Mar 24 pause request is pending (PR2) - HKP still scheduled
('fa110000-0000-0000-0000-202603260000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-26','07:00','07:45',NULL,NULL,'scheduled',false,NULL),
('fa110000-0000-0000-0000-202603270000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-27','07:00','07:45',NULL,NULL,'scheduled',false,NULL),
('fa110000-0000-0000-0000-202603280000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-28','07:00','07:45',NULL,NULL,'scheduled',false,NULL),

-- === P1-KCH (Sunita, 08:30-09:30) ===
('fa120000-0000-0000-0000-202603030000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-03','08:30','09:30','2026-03-03 08:31:00+05:30','2026-03-03 09:32:00+05:30',
 'completed',true,NULL),
('fa120000-0000-0000-0000-202603040000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-04','08:30','09:30','2026-03-04 08:33:00+05:30','2026-03-04 09:35:00+05:30',
 'completed',true,NULL),
('fa120000-0000-0000-0000-202603050000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-05','08:30','09:30','2026-03-05 08:30:00+05:30','2026-03-05 09:30:00+05:30',
 'completed',true,NULL),
-- Mar 6 — status_not_marked (cook never submitted status; auto-flagged)
('fa120000-0000-0000-0000-202603060000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-06','08:30','09:30',NULL,NULL,
 'status_not_marked',true,'Auto-flagged after 24h. Customer confirmed service was done.'),
('fa120000-0000-0000-0000-202603070000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-07','08:30','09:30','2026-03-07 08:32:00+05:30','2026-03-07 09:33:00+05:30',
 'completed',true,NULL),
-- Mar 8 = Sun, Sunita off
('fa120000-0000-0000-0000-202603090000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-09','08:30','09:30','2026-03-09 08:30:00+05:30','2026-03-09 09:29:00+05:30',
 'completed',true,NULL),
('fa120000-0000-0000-0000-202603100000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-10','08:30','09:30','2026-03-10 08:31:00+05:30','2026-03-10 09:31:00+05:30',
 'completed',true,NULL),
('fa120000-0000-0000-0000-202603110000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-11','08:30','09:30','2026-03-11 08:32:00+05:30','2026-03-11 09:33:00+05:30',
 'completed',true,NULL),
('fa120000-0000-0000-0000-202603120000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-12','08:30','09:30','2026-03-12 08:30:00+05:30','2026-03-12 09:31:00+05:30',
 'completed',true,NULL),
('fa120000-0000-0000-0000-202603130000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-13','08:30','09:30','2026-03-13 08:33:00+05:30','2026-03-13 09:34:00+05:30',
 'completed',true,NULL),
('fa120000-0000-0000-0000-202603140000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-14','08:30','09:30','2026-03-14 08:31:00+05:30','2026-03-14 09:32:00+05:30',
 'completed',true,NULL),
-- Mar 15 = Sun, Sunita off
-- Mar 16 — incomplete (cook had to leave early)
('fa120000-0000-0000-0000-202603160000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-16','08:30','09:30','2026-03-16 08:33:00+05:30','2026-03-16 09:05:00+05:30',
 'incomplete',true,'Cook had a personal emergency and left early; only breakfast prepared, lunch skipped.'),
('fa120000-0000-0000-0000-202603170000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-17','08:30','09:30','2026-03-17 08:31:00+05:30','2026-03-17 09:30:00+05:30',
 'completed',true,NULL),
('fa120000-0000-0000-0000-202603180000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-18','08:30','09:30','2026-03-18 08:30:00+05:30','2026-03-18 09:30:00+05:30',
 'completed',true,NULL),
('fa120000-0000-0000-0000-202603190000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-19','08:30','09:30','2026-03-19 08:32:00+05:30','2026-03-19 09:33:00+05:30',
 'completed',true,NULL),
('fa120000-0000-0000-0000-202603200000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-20','08:30','09:30','2026-03-20 08:30:00+05:30','2026-03-20 09:30:00+05:30',
 'completed',true,NULL),
-- Mar 21 (TODAY) — P1-KCH scheduled (Sunita not yet arrived)
('fa120000-0000-0000-0000-202603210000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-21','08:30','09:30',NULL,NULL,'scheduled',false,NULL),
-- Mar 22 = Sun, Sunita off
-- Mar 23–28 scheduled
('fa120000-0000-0000-0000-202603230000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-23','08:30','09:30',NULL,NULL,'scheduled',false,NULL),
('fa120000-0000-0000-0000-202603240000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-24','08:30','09:30',NULL,NULL,'scheduled',false,NULL),
('fa120000-0000-0000-0000-202603260000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-26','08:30','09:30',NULL,NULL,'scheduled',false,NULL),
('fa120000-0000-0000-0000-202603270000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-27','08:30','09:30',NULL,NULL,'scheduled',false,NULL),
('fa120000-0000-0000-0000-202603280000',
 'b0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-28','08:30','09:30',NULL,NULL,'scheduled',false,NULL);


-- ─── P2: Vikram — HKP (Ravi, 07:45-08:15) + CCR (Deepa, 07:00-07:30) ────
-- Ravi off sunday: skip 8,15,22 | Deepa off sunday: skip 8,15,22
-- P2 starts 2026-03-02

INSERT INTO job_allocations (
  id, plan_request_id, plan_request_item_id, service_provider_id, customer_id, supervisor_id,
  scheduled_date, scheduled_start_time, scheduled_end_time,
  actual_start_time, actual_end_time,
  status, is_locked, supervisor_notes
) VALUES
-- === P2-HKP (Ravi, 07:45-08:15) ===
('fa210000-0000-0000-0000-202603030000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-03','07:45','08:15','2026-03-03 07:46:00+05:30','2026-03-03 08:16:00+05:30',
 'completed',true,NULL),
('fa210000-0000-0000-0000-202603040000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-04','07:45','08:15','2026-03-04 07:47:00+05:30','2026-03-04 08:17:00+05:30',
 'completed',true,NULL),
('fa210000-0000-0000-0000-202603050000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-05','07:45','08:15','2026-03-05 07:45:00+05:30','2026-03-05 08:15:00+05:30',
 'completed',true,NULL),
('fa210000-0000-0000-0000-202603060000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-06','07:45','08:15','2026-03-06 07:46:00+05:30','2026-03-06 08:16:00+05:30',
 'completed',true,NULL),
('fa210000-0000-0000-0000-202603070000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-07','07:45','08:15','2026-03-07 07:45:00+05:30','2026-03-07 08:14:00+05:30',
 'completed',true,NULL),
-- Mar 8 = Sun, Ravi off
-- Mar 9 — completed_delayed (arrived late)
('fa210000-0000-0000-0000-202603090000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-09','07:45','08:15','2026-03-09 08:10:00+05:30','2026-03-09 08:40:00+05:30',
 'completed_delayed',true,'Provider arrived 25 min late; service completed with delay.'),
('fa210000-0000-0000-0000-202603100000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-10','07:45','08:15','2026-03-10 07:46:00+05:30','2026-03-10 08:17:00+05:30',
 'completed',true,NULL),
('fa210000-0000-0000-0000-202603110000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-11','07:45','08:15','2026-03-11 07:45:00+05:30','2026-03-11 08:15:00+05:30',
 'completed',true,NULL),
('fa210000-0000-0000-0000-202603120000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-12','07:45','08:15','2026-03-12 07:47:00+05:30','2026-03-12 08:18:00+05:30',
 'completed',true,NULL),
('fa210000-0000-0000-0000-202603130000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-13','07:45','08:15','2026-03-13 07:46:00+05:30','2026-03-13 08:16:00+05:30',
 'completed',true,NULL),
-- Mar 14 — cancelled_by_customer
('fa210000-0000-0000-0000-202603140000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-14','07:45','08:15',NULL,NULL,
 'cancelled_by_customer',true,'Customer travelling out of town; requested cancellation.'),
-- Mar 15 = Sun, Ravi off
('fa210000-0000-0000-0000-202603160000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-16','07:45','08:15','2026-03-16 07:46:00+05:30','2026-03-16 08:16:00+05:30',
 'completed',true,NULL),
('fa210000-0000-0000-0000-202603170000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-17','07:45','08:15','2026-03-17 07:45:00+05:30','2026-03-17 08:15:00+05:30',
 'completed',true,NULL),
('fa210000-0000-0000-0000-202603180000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-18','07:45','08:15','2026-03-18 07:46:00+05:30','2026-03-18 08:16:00+05:30',
 'completed',true,NULL),
('fa210000-0000-0000-0000-202603190000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-19','07:45','08:15','2026-03-19 07:45:00+05:30','2026-03-19 08:15:00+05:30',
 'completed',true,NULL),
('fa210000-0000-0000-0000-202603200000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-20','07:45','08:15','2026-03-20 07:47:00+05:30','2026-03-20 08:18:00+05:30',
 'completed',true,NULL),
-- Mar 21 (TODAY) — P2-HKP scheduled_delayed
('fa210000-0000-0000-0000-202603210000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-21','07:45','08:15',NULL,NULL,
 'scheduled_delayed',false,'Provider notified 20 min delay; stuck in traffic.'),
-- Mar 22 = Sun, Ravi off
-- Mar 23–28 scheduled
('fa210000-0000-0000-0000-202603230000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-23','07:45','08:15',NULL,NULL,'scheduled',false,NULL),
('fa210000-0000-0000-0000-202603240000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-24','07:45','08:15',NULL,NULL,'scheduled',false,NULL),
('fa210000-0000-0000-0000-202603260000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-26','07:45','08:15',NULL,NULL,'scheduled',false,NULL),
('fa210000-0000-0000-0000-202603270000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-27','07:45','08:15',NULL,NULL,'scheduled',false,NULL),
('fa210000-0000-0000-0000-202603280000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-28','07:45','08:15',NULL,NULL,'scheduled',false,NULL),

-- === P2-CCR (Deepa, 07:00-07:30, 2 cars) ===
('fa220000-0000-0000-0000-202603030000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-03','07:00','07:30','2026-03-03 07:01:00+05:30','2026-03-03 07:31:00+05:30',
 'completed',true,NULL),
('fa220000-0000-0000-0000-202603040000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-04','07:00','07:30','2026-03-04 07:02:00+05:30','2026-03-04 07:32:00+05:30',
 'completed',true,NULL),
('fa220000-0000-0000-0000-202603050000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-05','07:00','07:30','2026-03-05 07:00:00+05:30','2026-03-05 07:29:00+05:30',
 'completed',true,NULL),
('fa220000-0000-0000-0000-202603060000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-06','07:00','07:30','2026-03-06 07:03:00+05:30','2026-03-06 07:34:00+05:30',
 'completed',true,NULL),
('fa220000-0000-0000-0000-202603070000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-07','07:00','07:30','2026-03-07 07:01:00+05:30','2026-03-07 07:30:00+05:30',
 'completed',true,NULL),
-- Mar 8 = Sun, Deepa off
('fa220000-0000-0000-0000-202603090000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-09','07:00','07:30','2026-03-09 07:02:00+05:30','2026-03-09 07:33:00+05:30',
 'completed',true,NULL),
('fa220000-0000-0000-0000-202603100000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-10','07:00','07:30','2026-03-10 07:01:00+05:30','2026-03-10 07:31:00+05:30',
 'completed',true,NULL),
-- Mar 11 — completed_delayed (car wash ran long)
('fa220000-0000-0000-0000-202603110000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-11','07:00','07:30','2026-03-11 07:18:00+05:30','2026-03-11 07:55:00+05:30',
 'completed_delayed',true,'Provider arrived 18 min late; cars cleaned but service ran over schedule.'),
('fa220000-0000-0000-0000-202603120000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-12','07:00','07:30','2026-03-12 07:02:00+05:30','2026-03-12 07:32:00+05:30',
 'completed',true,NULL),
('fa220000-0000-0000-0000-202603130000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-13','07:00','07:30','2026-03-13 07:01:00+05:30','2026-03-13 07:31:00+05:30',
 'completed',true,NULL),
('fa220000-0000-0000-0000-202603140000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-14','07:00','07:30','2026-03-14 07:00:00+05:30','2026-03-14 07:30:00+05:30',
 'completed',true,NULL),
-- Mar 15 = Sun, Deepa off
('fa220000-0000-0000-0000-202603160000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-16','07:00','07:30','2026-03-16 07:01:00+05:30','2026-03-16 07:31:00+05:30',
 'completed',true,NULL),
('fa220000-0000-0000-0000-202603170000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-17','07:00','07:30','2026-03-17 07:03:00+05:30','2026-03-17 07:33:00+05:30',
 'completed',true,NULL),
('fa220000-0000-0000-0000-202603180000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-18','07:00','07:30','2026-03-18 07:00:00+05:30','2026-03-18 07:29:00+05:30',
 'completed',true,NULL),
('fa220000-0000-0000-0000-202603190000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-19','07:00','07:30','2026-03-19 07:02:00+05:30','2026-03-19 07:32:00+05:30',
 'completed',true,NULL),
('fa220000-0000-0000-0000-202603200000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-20','07:00','07:30','2026-03-20 07:01:00+05:30','2026-03-20 07:31:00+05:30',
 'completed',true,NULL),
-- Mar 21 (TODAY) — P2-CCR in_progress_delayed (Deepa arrived late)
('fa220000-0000-0000-0000-202603210000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-21','07:00','07:30','2026-03-21 07:22:00+05:30',NULL,
 'in_progress_delayed',false,'Provider arrived 22 min late; service in progress.'),
-- Mar 22 = Sun, Deepa off
-- Mar 23–28 scheduled
('fa220000-0000-0000-0000-202603230000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-23','07:00','07:30',NULL,NULL,'scheduled',false,NULL),
('fa220000-0000-0000-0000-202603240000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-24','07:00','07:30',NULL,NULL,'scheduled',false,NULL),
('fa220000-0000-0000-0000-202603260000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-26','07:00','07:30',NULL,NULL,'scheduled',false,NULL),
('fa220000-0000-0000-0000-202603270000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-27','07:00','07:30',NULL,NULL,'scheduled',false,NULL),
('fa220000-0000-0000-0000-202603280000',
 'b0000000-0000-0000-0000-000000000002','e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',
 'f0000000-0000-0000-0000-000000000007',
 '2026-03-28','07:00','07:30',NULL,NULL,'scheduled',false,NULL);


-- ─── P3: Meera — HKP (Priya, 07:00-07:45) + GCR (Satish, 07:45-08:25) ───
-- Priya off Wed: skip 4,11,18,25 | Satish off Mon: skip 9,16,23
-- P3 starts 2026-03-05

INSERT INTO job_allocations (
  id, plan_request_id, plan_request_item_id, service_provider_id, customer_id, supervisor_id,
  scheduled_date, scheduled_start_time, scheduled_end_time,
  actual_start_time, actual_end_time,
  status, is_locked, supervisor_notes
) VALUES
-- === P3-HKP (Priya, 07:00-07:45, off wednesday) ===
('fa310000-0000-0000-0000-202603050000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-05','07:00','07:45','2026-03-05 07:01:00+05:30','2026-03-05 07:45:00+05:30',
 'completed',true,NULL),
('fa310000-0000-0000-0000-202603060000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-06','07:00','07:45','2026-03-06 07:02:00+05:30','2026-03-06 07:47:00+05:30',
 'completed',true,NULL),
('fa310000-0000-0000-0000-202603070000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-07','07:00','07:45','2026-03-07 07:00:00+05:30','2026-03-07 07:44:00+05:30',
 'completed',true,NULL),
('fa310000-0000-0000-0000-202603080000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-08','07:00','07:45','2026-03-08 07:03:00+05:30','2026-03-08 07:48:00+05:30',
 'completed',true,NULL),
('fa310000-0000-0000-0000-202603090000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-09','07:00','07:45','2026-03-09 07:01:00+05:30','2026-03-09 07:45:00+05:30',
 'completed',true,NULL),
('fa310000-0000-0000-0000-202603100000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-10','07:00','07:45','2026-03-10 07:02:00+05:30','2026-03-10 07:46:00+05:30',
 'completed',true,NULL),
-- Mar 11 = Wed, Priya off
('fa310000-0000-0000-0000-202603120000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-12','07:00','07:45','2026-03-12 07:00:00+05:30','2026-03-12 07:44:00+05:30',
 'completed',true,NULL),
('fa310000-0000-0000-0000-202603130000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-13','07:00','07:45','2026-03-13 07:01:00+05:30','2026-03-13 07:45:00+05:30',
 'completed',true,NULL),
('fa310000-0000-0000-0000-202603140000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-14','07:00','07:45','2026-03-14 07:03:00+05:30','2026-03-14 07:48:00+05:30',
 'completed',true,NULL),
('fa310000-0000-0000-0000-202603150000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-15','07:00','07:45','2026-03-15 07:02:00+05:30','2026-03-15 07:46:00+05:30',
 'completed',true,NULL),
('fa310000-0000-0000-0000-202603160000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-16','07:00','07:45','2026-03-16 07:00:00+05:30','2026-03-16 07:44:00+05:30',
 'completed',true,NULL),
-- Mar 17 — incomplete (provider left early)
('fa310000-0000-0000-0000-202603170000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-17','07:00','07:45','2026-03-17 07:02:00+05:30','2026-03-17 07:25:00+05:30',
 'incomplete',true,'Provider left early citing personal emergency; partial cleaning only.'),
-- Mar 18 = Wed, Priya off
('fa310000-0000-0000-0000-202603190000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-19','07:00','07:45','2026-03-19 07:01:00+05:30','2026-03-19 07:45:00+05:30',
 'completed',true,NULL),
('fa310000-0000-0000-0000-202603200000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-20','07:00','07:45','2026-03-20 07:00:00+05:30','2026-03-20 07:44:00+05:30',
 'completed',true,NULL),
-- Mar 21 (TODAY) — P3-HKP scheduled
('fa310000-0000-0000-0000-202603210000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-21','07:00','07:45',NULL,NULL,'scheduled',false,NULL),
-- Mar 22 scheduled (Sun, Priya not off on Sun)
('fa310000-0000-0000-0000-202603220000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-22','07:00','07:45',NULL,NULL,'scheduled',false,NULL),
-- Mar 23 (Mon) scheduled (Priya not off on Mon)
('fa310000-0000-0000-0000-202603230000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-23','07:00','07:45',NULL,NULL,'scheduled',false,NULL),
('fa310000-0000-0000-0000-202603240000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-24','07:00','07:45',NULL,NULL,'scheduled',false,NULL),
-- Mar 25 = Wed, Priya off
('fa310000-0000-0000-0000-202603260000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-26','07:00','07:45',NULL,NULL,'scheduled',false,NULL),
('fa310000-0000-0000-0000-202603270000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-27','07:00','07:45',NULL,NULL,'scheduled',false,NULL),
('fa310000-0000-0000-0000-202603280000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-28','07:00','07:45',NULL,NULL,'scheduled',false,NULL),

-- === P3-GCR (Satish, 07:45-08:25, off monday) ===
('fa320000-0000-0000-0000-202603050000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-05','07:45','08:25','2026-03-05 07:46:00+05:30','2026-03-05 08:26:00+05:30',
 'completed',true,NULL),
('fa320000-0000-0000-0000-202603060000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-06','07:45','08:25','2026-03-06 07:47:00+05:30','2026-03-06 08:28:00+05:30',
 'completed',true,NULL),
('fa320000-0000-0000-0000-202603070000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-07','07:45','08:25','2026-03-07 07:45:00+05:30','2026-03-07 08:24:00+05:30',
 'completed',true,NULL),
('fa320000-0000-0000-0000-202603080000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-08','07:45','08:25','2026-03-08 07:46:00+05:30','2026-03-08 08:27:00+05:30',
 'completed',true,NULL),
-- Mar 9 = Mon, Satish off
('fa320000-0000-0000-0000-202603100000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-10','07:45','08:25','2026-03-10 07:46:00+05:30','2026-03-10 08:26:00+05:30',
 'completed',true,NULL),
('fa320000-0000-0000-0000-202603110000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-11','07:45','08:25','2026-03-11 07:45:00+05:30','2026-03-11 08:25:00+05:30',
 'completed',true,NULL),
('fa320000-0000-0000-0000-202603120000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-12','07:45','08:25','2026-03-12 07:47:00+05:30','2026-03-12 08:28:00+05:30',
 'completed',true,NULL),
('fa320000-0000-0000-0000-202603130000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-13','07:45','08:25','2026-03-13 07:45:00+05:30','2026-03-13 08:25:00+05:30',
 'completed',true,NULL),
('fa320000-0000-0000-0000-202603140000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-14','07:45','08:25','2026-03-14 07:47:00+05:30','2026-03-14 08:28:00+05:30',
 'completed',true,NULL),
('fa320000-0000-0000-0000-202603150000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-15','07:45','08:25','2026-03-15 07:46:00+05:30','2026-03-15 08:26:00+05:30',
 'completed',true,NULL),
-- Mar 16 = Mon, Satish off
-- Mar 17 — completed_delayed
('fa320000-0000-0000-0000-202603170000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-17','07:45','08:25','2026-03-17 08:05:00+05:30','2026-03-17 08:48:00+05:30',
 'completed_delayed',true,'Provider arrived 20 min late; garden care completed with delay.'),
('fa320000-0000-0000-0000-202603180000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-18','07:45','08:25','2026-03-18 07:45:00+05:30','2026-03-18 08:25:00+05:30',
 'completed',true,NULL),
('fa320000-0000-0000-0000-202603190000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-19','07:45','08:25','2026-03-19 07:46:00+05:30','2026-03-19 08:26:00+05:30',
 'completed',true,NULL),
('fa320000-0000-0000-0000-202603200000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-20','07:45','08:25','2026-03-20 07:45:00+05:30','2026-03-20 08:24:00+05:30',
 'completed',true,NULL),
-- Mar 21 (TODAY) — P3-GCR scheduled
('fa320000-0000-0000-0000-202603210000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-21','07:45','08:25',NULL,NULL,'scheduled',false,NULL),
('fa320000-0000-0000-0000-202603220000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-22','07:45','08:25',NULL,NULL,'scheduled',false,NULL),
-- Mar 23 = Mon, Satish off
('fa320000-0000-0000-0000-202603240000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-24','07:45','08:25',NULL,NULL,'scheduled',false,NULL),
-- Mar 25 = Wed, Priya off (no HKP) but Satish works - create GCR
('fa320000-0000-0000-0000-202603250000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-25','07:45','08:25',NULL,NULL,'scheduled',false,NULL),
('fa320000-0000-0000-0000-202603260000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-26','07:45','08:25',NULL,NULL,'scheduled',false,NULL),
('fa320000-0000-0000-0000-202603270000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-27','07:45','08:25',NULL,NULL,'scheduled',false,NULL),
('fa320000-0000-0000-0000-202603280000',
 'b0000000-0000-0000-0000-000000000003','e3000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000003',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-28','07:45','08:25',NULL,NULL,'scheduled',false,NULL);


-- ─── P4: Sanjay — HKP (Ramesh, 08:30-09:15, off wednesday) ──────────────
-- Pause starts 2026-03-18. Mar 18 = Wed (Ramesh off day), so service_on_pause starts Mar 19.
-- Ramesh off Wed: skip 4,11,18,25

INSERT INTO job_allocations (
  id, plan_request_id, plan_request_item_id, service_provider_id, customer_id, supervisor_id,
  scheduled_date, scheduled_start_time, scheduled_end_time,
  actual_start_time, actual_end_time,
  status, is_locked, supervisor_notes
) VALUES
-- === P4-HKP (Ramesh, 08:30-09:15) ===
('fa410000-0000-0000-0000-202603030000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-03','08:30','09:15','2026-03-03 08:31:00+05:30','2026-03-03 09:16:00+05:30',
 'completed',true,NULL),
-- Mar 4 = Wed, Ramesh off
('fa410000-0000-0000-0000-202603050000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-05','08:30','09:15','2026-03-05 08:30:00+05:30','2026-03-05 09:14:00+05:30',
 'completed',true,NULL),
('fa410000-0000-0000-0000-202603060000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-06','08:30','09:15','2026-03-06 08:32:00+05:30','2026-03-06 09:17:00+05:30',
 'completed',true,NULL),
('fa410000-0000-0000-0000-202603070000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-07','08:30','09:15','2026-03-07 08:31:00+05:30','2026-03-07 09:15:00+05:30',
 'completed',true,NULL),
('fa410000-0000-0000-0000-202603080000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-08','08:30','09:15','2026-03-08 08:30:00+05:30','2026-03-08 09:14:00+05:30',
 'completed',true,NULL),
('fa410000-0000-0000-0000-202603090000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-09','08:30','09:15','2026-03-09 08:33:00+05:30','2026-03-09 09:18:00+05:30',
 'completed',true,NULL),
('fa410000-0000-0000-0000-202603100000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-10','08:30','09:15','2026-03-10 08:31:00+05:30','2026-03-10 09:16:00+05:30',
 'completed',true,NULL),
-- Mar 11 = Wed, Ramesh off
('fa410000-0000-0000-0000-202603120000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-12','08:30','09:15','2026-03-12 08:30:00+05:30','2026-03-12 09:14:00+05:30',
 'completed',true,NULL),
('fa410000-0000-0000-0000-202603130000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-13','08:30','09:15','2026-03-13 08:32:00+05:30','2026-03-13 09:17:00+05:30',
 'completed',true,NULL),
-- Mar 14 — completed_delayed
('fa410000-0000-0000-0000-202603140000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-14','08:30','09:15','2026-03-14 08:52:00+05:30','2026-03-14 09:38:00+05:30',
 'completed_delayed',true,'Provider arrived 22 min late. Service completed with delay.'),
('fa410000-0000-0000-0000-202603150000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-15','08:30','09:15','2026-03-15 08:31:00+05:30','2026-03-15 09:16:00+05:30',
 'completed',true,NULL),
('fa410000-0000-0000-0000-202603160000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-16','08:30','09:15','2026-03-16 08:30:00+05:30','2026-03-16 09:14:00+05:30',
 'completed',true,NULL),
('fa410000-0000-0000-0000-202603170000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-17','08:30','09:15','2026-03-17 08:32:00+05:30','2026-03-17 09:17:00+05:30',
 'completed',true,NULL),
-- Mar 18 = Wed, Ramesh off (also pause starts today)
-- Mar 19 onwards = service_on_pause
('fa410000-0000-0000-0000-202603190000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-19','08:30','09:15',NULL,NULL,
 'service_on_pause',false,'Plan paused 18 Mar – 28 Mar per customer vacation request.'),
('fa410000-0000-0000-0000-202603200000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-20','08:30','09:15',NULL,NULL,'service_on_pause',false,NULL),
('fa410000-0000-0000-0000-202603210000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-21','08:30','09:15',NULL,NULL,'service_on_pause',false,NULL),
('fa410000-0000-0000-0000-202603220000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-22','08:30','09:15',NULL,NULL,'service_on_pause',false,NULL),
('fa410000-0000-0000-0000-202603230000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-23','08:30','09:15',NULL,NULL,'service_on_pause',false,NULL),
('fa410000-0000-0000-0000-202603240000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-24','08:30','09:15',NULL,NULL,'service_on_pause',false,NULL),
-- Mar 25 = Wed, Ramesh off (skip)
('fa410000-0000-0000-0000-202603260000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-26','08:30','09:15',NULL,NULL,'service_on_pause',false,NULL),
('fa410000-0000-0000-0000-202603270000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-27','08:30','09:15',NULL,NULL,'service_on_pause',false,NULL),
('fa410000-0000-0000-0000-202603280000',
 'b0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000004',
 'f0000000-0000-0000-0000-000000000008',
 '2026-03-28','08:30','09:15',NULL,NULL,'service_on_pause',false,NULL);


-- ── 18. Provider Leave Requests ───────────────────────────────────────────

INSERT INTO provider_leave_requests (id, service_provider_id, leave_start_date, leave_end_date, leave_type, status) VALUES
  -- L1: Ravi Kumar, approved leave
  ('ea000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   '2026-03-28', '2026-03-30', 'personal', 'approved'),
  -- L2: Priya Nair, pending sick leave
  ('ea000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000003',
   '2026-03-25', '2026-03-26', 'sick', 'pending');


-- ── 19. Pause Requests ────────────────────────────────────────────────────

INSERT INTO pause_requests (id, customer_id, plan_request_id, pause_type, pause_start_date, pause_end_date, status, created_at, updated_at) VALUES
  -- PR1: C4 Sanjay (P4) vacation pause — active (supervisor approved)
  ('eb000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000004',
   'vacation', '2026-03-18', '2026-03-28', 'active',
   '2026-03-15 10:00:00+05:30', '2026-03-18 08:00:00+05:30'),
  -- PR2: C1 Ananya (P1) short break — pending (just submitted)
  ('eb000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'short_break', '2026-03-24', '2026-03-24', 'pending',
   '2026-03-21 10:00:00+05:30', '2026-03-21 10:00:00+05:30');


-- ── 20. On-Demand Requests ────────────────────────────────────────────────

INSERT INTO on_demand_requests (id, customer_id, plan_request_id, job_id, request_date, status, service_provider_id, customer_notes, created_at) VALUES
  -- OD1: Ananya — Electrician visit, pending
  ('ec000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   '55000000-0000-0000-0000-000000000001',
   '2026-03-22', 'pending', NULL,
   'Switch in bedroom not working',
   '2026-03-21 09:30:00+05:30'),
  -- OD2: Vikram — AC Service, allocated to Arjun
  ('ec000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000002',
   '55000000-0000-0000-0000-000000000005',
   '2026-03-23', 'allocated',
   'a0000000-0000-0000-0000-000000000009',
   NULL,
   '2026-03-21 11:00:00+05:30');


-- ── 21. Issue Tickets ─────────────────────────────────────────────────────

INSERT INTO issue_tickets (id, customer_id, plan_request_id, title, description, status, priority, supervisor_response, created_at, updated_at) VALUES
  -- IT1: Ananya — cook arrived late on Mar 16, resolved
  ('ed000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'Cook arrived late on Mar 16',
   'The cook arrived more than 30 minutes late on March 16 without prior notice. Please ensure this does not recur.',
   'resolved', 'medium',
   'Apologized to customer; cook counselled. Will not recur.',
   '2026-03-16 20:00:00+05:30', '2026-03-17 10:00:00+05:30'),
  -- IT2: Vikram — car wash missed on Mar 16, open
  ('ed000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000002',
   'Car wash missed on Mar 16',
   'Deepa did not show up for car wash on March 16. Both cars were dirty and I had to leave for an important meeting.',
   'open', 'high', NULL,
   '2026-03-16 19:00:00+05:30', '2026-03-16 19:00:00+05:30'),
  -- IT3: Meera — plants not watered, in_progress
  ('ed000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000003',
   'Plants not watered properly on Mar 18',
   'Satish watered only about half the plants on March 18. Several plants are showing signs of dehydration.',
   'in_progress', 'medium', NULL,
   '2026-03-18 21:00:00+05:30', '2026-03-19 09:30:00+05:30');


-- ── 22. Issue Comments ────────────────────────────────────────────────────

INSERT INTO issue_comments (id, issue_ticket_id, commenter_id, commenter_type, comment_text, created_at) VALUES
  -- IT1: Ananya raised it (customer)
  ('ee000000-0000-0000-0000-000000000001',
   'ed000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', 'customer',
   'Cook arrived 35 minutes late today (Mar 16). This is the second time this month. Please address this urgently.',
   '2026-03-16 20:00:00+05:30'),
  -- IT1: Amit (supervisor) responded
  ('ee000000-0000-0000-0000-000000000002',
   'ed000000-0000-0000-0000-000000000001',
   'f0000000-0000-0000-0000-000000000007', 'supervisor',
   'Hi Ananya, I have spoken with Sunita about this. She has been counselled and assured it will not happen again. Sorry for the inconvenience.',
   '2026-03-17 10:00:00+05:30'),
  -- IT2: Vikram raised it (customer)
  ('ee000000-0000-0000-0000-000000000003',
   'ed000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000002', 'customer',
   'Deepa did not show up on March 16. I had an important meeting and both cars were dirty. This is unacceptable.',
   '2026-03-16 19:00:00+05:30'),
  -- IT3: Sneha (supervisor) acknowledged
  ('ee000000-0000-0000-0000-000000000004',
   'ed000000-0000-0000-0000-000000000003',
   'f0000000-0000-0000-0000-000000000008', 'supervisor',
   'Hi Meera, I am looking into this. I will speak to Satish and ensure all 20 plants are watered properly from tomorrow.',
   '2026-03-19 09:30:00+05:30');


-- ── 23. Tech Services Allowance ───────────────────────────────────────────
-- month_year stored as 'YYYY-MM'

INSERT INTO tech_services_allowance (plan_request_id, service_type, month_year, allowed_count, used_count) VALUES
  -- P1: electrician allowance (OD1 is pending, will consume 1 when done)
  ('b0000000-0000-0000-0000-000000000001', 'electrician', '2026-03', 2, 1),
  -- P2: ac_service allowance (OD2 allocated)
  ('b0000000-0000-0000-0000-000000000002', 'ac_service',  '2026-03', 2, 1);

-- ── END OF SEED ───────────────────────────────────────────────────────────

