-- ============================================================
-- HABIO Catalog Seed — sourced 1:1 from masterdata.xlsx
-- Run AFTER schema.sql in the Supabase SQL editor.
--
-- WARNING: This script clears ALL catalog, plan/cart data
-- AND seed user data before re-inserting.
-- Do NOT run on a production database with live data.
--
-- Deletion order respects FK constraints (leaf tables first).
-- ============================================================


-- ── 1. Clear old catalog and dependent transactional data ────

DELETE FROM issue_comments;
DELETE FROM issue_tickets;
DELETE FROM on_demand_requests;
DELETE FROM pause_requests;
DELETE FROM job_allocations;
DELETE FROM provider_leave_requests;
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
DELETE FROM job_pricing;
DELETE FROM job_expectations;
DELETE FROM service_jobs;
DELETE FROM service_categories;


-- ── 2. Service Categories ──────────────────────────────────────
--
-- Stable fixed UUIDs (00…01–05) so category_id FKs never drift.
-- Order matches masterdata.xlsx service-category column.
-- ──────────────────────────────────────────────────────────────

INSERT INTO service_categories (id, slug, name, code, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'housekeeping',        'Housekeeping',        'HKP', 1),
  ('00000000-0000-0000-0000-000000000002', 'kitchen-services',    'Kitchen Services',    'KCH', 2),
  ('00000000-0000-0000-0000-000000000003', 'car-care',            'Car Care',            'CCR', 3),
  ('00000000-0000-0000-0000-000000000004', 'garden-care',         'Garden Care',         'GCR', 4),
  ('00000000-0000-0000-0000-000000000005', 'technician-services', 'Technician Services', 'HMT', 5);


-- ── 3. Service Jobs ────────────────────────────────────────────
--
-- Column mapping from masterdata.xlsx → service_jobs:
--   col 1  Service Category            → category_id (via UUID above)
--   col 2  Class                       → class
--   col 3  Service Type                → service_type
--   col 4  Frequency                   → frequency_label
--   col 5  Primary Job Card ID         → (used to derive primary_card grouping)
--   col 6  Primary Job Card Name       → primary_card  (UI group header)
--   col 7  Sub Job Card ID             → code  (unique internal code; also drives slug)
--   col 8  Sub Job Card Name           → name  (shown to user); for compound_head rows
--                                         the Primary Job Card Name is used as the display name
--                                         because the user sees the full compound service, not the sub-task
--   col 9  Unit                        → unit_type  ('min' | 'count_washrooms' | 'count_cars' |
--                                                    'count_plants' | 'count_visits' | 'count_acs')
--   col 10 Unit Interval               → unit_interval  (step size in the UI stepper)
--   col 11 Min Unit                    → min_unit
--   col 12 Unit Time Multiple (min)    → time_multiple  (NULL for 'min' unit_type rows; for those
--                                         rows the interval acts as the step and is stored in unit_interval)
--   col 13 Base Rate per minute (₹)    → base_rate_per_unit
--   col 14 Job Instances per month     → instances_per_month  (1 for on-demand / per-use jobs)
--   col 15 Discount                    → discount_pct  (0.30 = 30%)
--
-- Formula types:
--   'standard'       → base = input × rate × instances
--                      used for all 'min' unit_type jobs
--   'time_multiple'  → base = input × TM × rate × instances
--                      used for count-based unit_type jobs
--   'compound_head'  → base = input × ((TM_head×rate_head×inst_head) + (TM_child×rate_child×inst_child))
--                      compound_child_code points to the paired compound_child row
--   'compound_child' → priced via compound_head; never shown as standalone in UI
--
-- UUID scheme:
--   11…  Housekeeping (HKP)
--   22…  Kitchen Services (KCH)
--   33…  Car Care (CCR)
--   44…  Garden Care (GCR)
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

-- =====================================================================
-- SERVICE PROVIDER SEED DATA
-- Run AFTER schema.sql (new tables must exist).
-- Uses stable UUIDs so this section is safe to re-run (upsert pattern).
-- =====================================================================

-- Provider UUID scheme: a0000000-0000-0000-0000-0000000000NN (NN = provider number)
-- All characters are valid hex digits (0-9, a-f).
INSERT INTO service_providers (id, phone, name, specialization, is_active, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', '+919900000001', 'Ravi Kumar',   'Housekeeping', true, 'available'),
  ('a0000000-0000-0000-0000-000000000002', '+919900000002', 'Sunita Devi',  'Cooking',      true, 'available'),
  ('a0000000-0000-0000-0000-000000000003', '+919900000003', 'Arjun Sharma', 'Electrician',  true, 'available'),
  ('a0000000-0000-0000-0000-000000000004', '+919900000004', 'Mohan Singh',  'Plumber',      true, 'available'),
  ('a0000000-0000-0000-0000-000000000005', '+919900000005', 'Priya Nair',   'Housekeeping', true, 'available'),
  ('a0000000-0000-0000-0000-000000000006', '+919900000006', 'Ramesh Gupta', 'Carpenter',    true, 'available'),
  ('a0000000-0000-0000-0000-000000000007', '+919900000007', 'Deepa Kumari', 'Car Care',     true, 'available')
ON CONFLICT (id) DO UPDATE SET
  name           = EXCLUDED.name,
  specialization = EXCLUDED.specialization,
  is_active      = EXCLUDED.is_active,
  status         = EXCLUDED.status;


-- =====================================================================
-- SEED USER DATA — 2 active customers with full ecosystem flow
--
-- Customer 1: Ananya Sharma  (+919800000001)
--   • Plan: Housekeeping 45 min/day + Daily Cooking Morning 60 min/day
--   • Started: 2026-02-26  |  Status: paid (active ~3 weeks)
--   • Providers: Ravi Kumar (HKP), Sunita Devi (Cooking)
--
-- Customer 2: Vikram Patel  (+919800000002)
--   • Plan: Housekeeping 30 min/day + Basic Car Care 1 car/day
--   • Started: 2026-03-02  |  Status: paid (active ~2.5 weeks)
--   • Providers: Priya Nair (HKP), Deepa Kumari (Car Care)
--
-- UUID key:
--   Customers:         c1…001 / c2…002
--   Plans:             b1…001 / b2…002
--   Plan items:        e1…00N (C1 items), e2…00N (C2 items)
--   Job allocations:   fa…  | service 0001=C1-HKP 0002=C1-KCH 0003=C2-HKP 0004=C2-CCR
--                            | date 000001-000015 = Mar 11-25
-- =====================================================================

-- ── Customers ────────────────────────────────────────────────────────

INSERT INTO customers (id, phone, name) VALUES
  ('c1000000-0000-0000-0000-000000000001', '+919800000001', 'Ananya Sharma'),
  ('c2000000-0000-0000-0000-000000000002', '+919800000002', 'Vikram Patel');

INSERT INTO customer_profiles (
  customer_id, flat_no, building, society, sector, city, pincode,
  home_type, bhk, bathrooms, balconies, diet_pref, people_count,
  cook_window_morning, cook_window_evening
) VALUES
  ('c1000000-0000-0000-0000-000000000001',
   '304', 'Tower B', 'Green Valley Residency', 'Sector 45', 'Gurugram', '122003',
   'apartment', 2, 2, 1, 'veg', 3, true, false),
  ('c2000000-0000-0000-0000-000000000002',
   '102', 'Sunrise Block', 'Palm Grove Society', 'Sector 12', 'Noida', '201301',
   'apartment', 3, 3, 2, 'non-veg', 4, false, false);


-- ── Plan Requests (status = paid, active) ────────────────────────────
-- Pricing:
--   C1 HKP 45 min:  45×3.3×30 = 4455 base  → 3118.50 discounted (30%)
--   C1 KCH 60 min:  60×4×30   = 7200 base  → 5040.00 discounted (30%)
--   C2 HKP 30 min:  30×3.3×30 = 2970 base  → 2079.00 discounted (30%)
--   C2 CCR 1 car:   1×((15×3.3×30)+(15×3.3×4)) = 1683 base → 1178.10 discounted (30%)

INSERT INTO plan_requests (
  id, request_code, customer_id, status,
  total_price_monthly, plan_start_date,
  plan_active_start_date, is_recurring,
  created_at, updated_at
) VALUES
  ('b1000000-0000-0000-0000-000000000001',
   'HABIO-C1-0001',
   'c1000000-0000-0000-0000-000000000001',
   'paid',
   8158.50,
   '2026-02-25',
   '2026-02-26',
   true,
   '2026-02-25 09:00:00+05:30',
   '2026-02-26 10:30:00+05:30'),
  ('b2000000-0000-0000-0000-000000000002',
   'HABIO-C2-0002',
   'c2000000-0000-0000-0000-000000000002',
   'paid',
   3257.10,
   '2026-03-01',
   '2026-03-02',
   true,
   '2026-03-01 11:00:00+05:30',
   '2026-03-02 09:45:00+05:30');


-- ── Plan Request Items ────────────────────────────────────────────────

INSERT INTO plan_request_items (
  id, plan_request_id, category_id, job_id, job_code, title,
  frequency_label, unit_type, unit_value, minutes,
  base_rate_per_unit, instances_per_month, discount_pct,
  time_multiple, formula_type, base_price_monthly,
  price_monthly, mrp_monthly, updated_at
) VALUES
  -- C1: Housekeeping — Dusting, Brooming, Mopping (45 min daily)
  ('e1000000-0000-0000-0001-000000000001',
   'b1000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '11000000-0000-0000-0000-000000000001',
   'HKP1-CR-D-1A',
   'Dusting, Brooming, Mopping',
   'Daily', 'min', 45, 45,
   3.3000, 30, 0.3000,
   NULL, 'standard', 4455.00,
   3118.50, 4455.00,
   '2026-02-26 10:30:00+05:30'),
  -- C1: Kitchen — Daily Cooking Morning (60 min daily)
  ('e1000000-0000-0000-0002-000000000001',
   'b1000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '22000000-0000-0000-0000-000000000001',
   'KCH-CR-D-1A',
   'Daily Cooking - Morning Shift',
   'Daily', 'min', 60, 60,
   4.0000, 30, 0.3000,
   NULL, 'standard', 7200.00,
   5040.00, 7200.00,
   '2026-02-26 10:30:00+05:30'),
  -- C2: Housekeeping — Dusting, Brooming, Mopping (30 min daily)
  ('e2000000-0000-0000-0001-000000000001',
   'b2000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   '11000000-0000-0000-0000-000000000001',
   'HKP1-CR-D-1A',
   'Dusting, Brooming, Mopping',
   'Daily', 'min', 30, 30,
   3.3000, 30, 0.3000,
   NULL, 'standard', 2970.00,
   2079.00, 2970.00,
   '2026-03-02 09:45:00+05:30'),
  -- C2: Car Care — Basic Car Care Routine (1 car daily)
  ('e2000000-0000-0000-0002-000000000001',
   'b2000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   '33000000-0000-0000-0000-000000000001',
   'CCR-CR-D-1A',
   'Basic Car Care Routine',
   'Daily', 'count_cars', 1, 15,
   3.3000, 30, 0.3000,
   15.00, 'compound_head', 1683.00,
   1178.10, 1683.00,
   '2026-03-02 09:45:00+05:30');


-- ── Plan Request Events (lifecycle: submitted → under_process → finalized → paid) ─

INSERT INTO plan_request_events (plan_request_id, event_type, note, created_at) VALUES
  -- Customer 1 lifecycle
  ('b1000000-0000-0000-0000-000000000001', 'submitted',
   'Customer submitted plan request for housekeeping + cooking.',
   '2026-02-25 09:00:00+05:30'),
  ('b1000000-0000-0000-0000-000000000001', 'under_process',
   'Supervisor reviewing plan. Checking provider availability in Sector 45, Gurugram.',
   '2026-02-25 11:30:00+05:30'),
  ('b1000000-0000-0000-0000-000000000001', 'finalized',
   'Plan finalized. Ravi Kumar assigned for housekeeping (07:00–07:45). Sunita Devi for cooking (08:30–09:30). Start date: 26 Feb.',
   '2026-02-25 14:00:00+05:30'),
  ('b1000000-0000-0000-0000-000000000001', 'paid',
   'Payment confirmed. Plan activated from 26 Feb 2026.',
   '2026-02-26 09:00:00+05:30'),
  -- Customer 2 lifecycle
  ('b2000000-0000-0000-0000-000000000002', 'submitted',
   'Customer submitted plan request for housekeeping + car care.',
   '2026-03-01 11:00:00+05:30'),
  ('b2000000-0000-0000-0000-000000000002', 'under_process',
   'Supervisor reviewing. Verifying provider availability in Sector 12, Noida.',
   '2026-03-01 14:00:00+05:30'),
  ('b2000000-0000-0000-0000-000000000002', 'finalized',
   'Plan finalized. Priya Nair for housekeeping (08:00–08:30). Deepa Kumari for car care (07:00–07:15). Start date: 2 Mar.',
   '2026-03-01 17:00:00+05:30'),
  ('b2000000-0000-0000-0000-000000000002', 'paid',
   'Payment confirmed. Plan activated from 2 Mar 2026.',
   '2026-03-02 08:30:00+05:30');


-- ── Payments ─────────────────────────────────────────────────────────

INSERT INTO payments (plan_request_id, amount, status, provider, provider_ref, created_at) VALUES
  ('b1000000-0000-0000-0000-000000000001', 8158.50, 'succeeded', 'razorpay', 'pay_seed_c1_001', '2026-02-26 09:00:00+05:30'),
  ('b2000000-0000-0000-0000-000000000002', 3257.10, 'succeeded', 'razorpay', 'pay_seed_c2_002', '2026-03-02 08:30:00+05:30');


-- ── Job Allocations ───────────────────────────────────────────────────
-- Service windows:
--   C1 HKP  → 07:00–07:45  (Ravi Kumar,   a0…001)
--   C1 KCH  → 08:30–09:30  (Sunita Devi,  a0…002)
--   C2 HKP  → 08:00–08:30  (Priya Nair,   a0…005)
--   C2 CCR  → 07:00–07:15  (Deepa Kumari, a0…007)
--
-- Status legend for past days:
--   Mar 8      : C1-KCH = status_not_marked (provider never submitted status)
--   Mar 9      : C2-HKP = scheduled_delayed → completed (recorded as completed_delayed)
--                C2-CCR = ongoing_delayed → completed
--   Mar 11–14  : all completed (normal)
--   Mar 15     : C2-HKP = completed_delayed (provider arrived late, still completed)
--   Mar 16     : C1-KCH = service_incomplete (cook had to leave early)
--                C2-CCR = cancelled_by_customer (customer was travelling)
--   Mar 17     : all completed
--   Mar 18 (today): C1-HKP = ongoing, C1-KCH = scheduled,
--                   C2-HKP = scheduled_delayed, C2-CCR = ongoing_delayed
--   Mar 19–25  : all scheduled
--   Mar 24     : C1-HKP = service_on_pause (customer pre-approved 1-day pause)

-- ─── March 8 (Fri, pre-history) ─── partial day for status variety ──
INSERT INTO job_allocations (
  id, plan_request_id, plan_request_item_id, service_provider_id, customer_id,
  scheduled_date, scheduled_start_time, scheduled_end_time,
  actual_start_time, actual_end_time,
  status, is_locked, supervisor_notes
) VALUES
-- C1-HKP Mar 8 — completed normally
('fa000000-0000-0000-0001-000000000000',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-08', '07:00', '07:45', '07:01', '07:46', 'completed', true, NULL),
-- C1-KCH Mar 8 — status_not_marked (provider never submitted job status)
('fa000000-0000-0000-0002-000000000000',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-08', '08:30', '09:30', NULL, NULL,
 'status_not_marked', true,
 'Provider did not mark job status; auto-flagged after 24 h. Customer confirmed service was done.'),
-- C2-HKP Mar 8 — completed
('fa000000-0000-0000-0003-000000000000',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-08', '08:00', '08:30', '08:00', '08:29', 'completed', true, NULL),
-- C2-CCR Mar 8 — completed
('fa000000-0000-0000-0004-000000000000',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-08', '07:00', '07:15', '07:03', '07:17', 'completed', true, NULL);

-- ─── March 9 (Sat) — scheduled_delayed + ongoing_delayed examples ────
INSERT INTO job_allocations (
  id, plan_request_id, plan_request_item_id, service_provider_id, customer_id,
  scheduled_date, scheduled_start_time, scheduled_end_time,
  actual_start_time, actual_end_time,
  status, is_locked, supervisor_notes
) VALUES
-- C1-HKP Mar 9 — completed
('fa000000-0000-0000-0001-000000000099',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-09', '07:00', '07:45', '07:02', '07:48', 'completed', true, NULL),
-- C1-KCH Mar 9 — completed
('fa000000-0000-0000-0002-000000000099',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-09', '08:30', '09:30', '08:33', '09:34', 'completed', true, NULL),
-- C2-HKP Mar 9 — completed_delayed (provider was delayed; arrived late but finished)
('fa000000-0000-0000-0003-000000000099',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-09', '08:00', '08:30', '08:28', '08:58',
 'completed_delayed', true,
 'Provider marked scheduled_delayed → moved to ongoing_delayed → completed_delayed. Resolved same day.'),
-- C2-CCR Mar 9 — completed
('fa000000-0000-0000-0004-000000000099',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-09', '07:00', '07:15', '07:01', '07:14', 'completed', true, NULL);

-- ─── March 11 (Mon) — all completed ─────────────────────────────────
INSERT INTO job_allocations (
  id, plan_request_id, plan_request_item_id, service_provider_id, customer_id,
  scheduled_date, scheduled_start_time, scheduled_end_time,
  actual_start_time, actual_end_time,
  status, is_locked, supervisor_notes
) VALUES
-- C1-HKP Mar 11
('fa000000-0000-0000-0001-000000000001',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-11', '07:00', '07:45', '07:02', '07:47', 'completed', true, NULL),
-- C1-KCH Mar 11
('fa000000-0000-0000-0002-000000000001',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-11', '08:30', '09:30', '08:31', '09:32', 'completed', true, NULL),
-- C2-HKP Mar 11
('fa000000-0000-0000-0003-000000000001',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-11', '08:00', '08:30', '08:01', '08:31', 'completed', true, NULL),
-- C2-CCR Mar 11
('fa000000-0000-0000-0004-000000000001',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-11', '07:00', '07:15', '07:01', '07:14', 'completed', true, NULL),

-- ─── March 12 (Tue) — all completed ─────────────────────────────────
-- C1-HKP Mar 12
('fa000000-0000-0000-0001-000000000002',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-12', '07:00', '07:45', '07:01', '07:44', 'completed', true, NULL),
-- C1-KCH Mar 12
('fa000000-0000-0000-0002-000000000002',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-12', '08:30', '09:30', '08:33', '09:35', 'completed', true, NULL),
-- C2-HKP Mar 12
('fa000000-0000-0000-0003-000000000002',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-12', '08:00', '08:30', '08:02', '08:33', 'completed', true, NULL),
-- C2-CCR Mar 12
('fa000000-0000-0000-0004-000000000002',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-12', '07:00', '07:15', '07:03', '07:18', 'completed', true, NULL),

-- ─── March 13 (Wed) — all completed ─────────────────────────────────
-- C1-HKP Mar 13
('fa000000-0000-0000-0001-000000000003',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-13', '07:00', '07:45', '07:00', '07:46', 'completed', true, NULL),
-- C1-KCH Mar 13
('fa000000-0000-0000-0002-000000000003',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-13', '08:30', '09:30', '08:30', '09:31', 'completed', true, NULL),
-- C2-HKP Mar 13
('fa000000-0000-0000-0003-000000000003',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-13', '08:00', '08:30', '08:00', '08:30', 'completed', true, NULL),
-- C2-CCR Mar 13
('fa000000-0000-0000-0004-000000000003',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-13', '07:00', '07:15', '07:02', '07:16', 'completed', true, NULL),

-- ─── March 14 (Thu) — all completed ─────────────────────────────────
-- C1-HKP Mar 14
('fa000000-0000-0000-0001-000000000004',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-14', '07:00', '07:45', '07:04', '07:49', 'completed', true, NULL),
-- C1-KCH Mar 14
('fa000000-0000-0000-0002-000000000004',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-14', '08:30', '09:30', '08:32', '09:34', 'completed', true, NULL),
-- C2-HKP Mar 14
('fa000000-0000-0000-0003-000000000004',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-14', '08:00', '08:30', '08:01', '08:29', 'completed', true, NULL),
-- C2-CCR Mar 14
('fa000000-0000-0000-0004-000000000004',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-14', '07:00', '07:15', '07:01', '07:15', 'completed', true, NULL),

-- ─── March 15 (Fri) — C2-HKP = completed_delayed (provider ran late) ─
-- C1-HKP Mar 15
('fa000000-0000-0000-0001-000000000005',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-15', '07:00', '07:45', '07:01', '07:46', 'completed', true, NULL),
-- C1-KCH Mar 15
('fa000000-0000-0000-0002-000000000005',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-15', '08:30', '09:30', '08:35', '09:36', 'completed', true, NULL),
-- C2-HKP Mar 15 — completed_delayed
('fa000000-0000-0000-0003-000000000005',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-15', '08:00', '08:30', '08:22', '08:52',
 'completed_delayed', true, 'Provider arrived late due to traffic; service completed after delay.'),
-- C2-CCR Mar 15
('fa000000-0000-0000-0004-000000000005',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-15', '07:00', '07:15', '07:02', '07:17', 'completed', true, NULL),

-- ─── March 16 (Sat) — C1-KCH = service_incomplete (cook left early) ─
-- C1-HKP Mar 16
('fa000000-0000-0000-0001-000000000006',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-16', '07:00', '07:45', '07:03', '07:47', 'completed', true, NULL),
-- C1-KCH Mar 16 — service_incomplete
('fa000000-0000-0000-0002-000000000006',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-16', '08:30', '09:30', '08:33', '09:05',
 'service_incomplete', true,
 'Cook had a personal emergency and left early; only breakfast prepared, lunch skipped.'),
-- C2-HKP Mar 16
('fa000000-0000-0000-0003-000000000006',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-16', '08:00', '08:30', '08:01', '08:31', 'completed', true, NULL),
-- C2-CCR Mar 16 — cancelled_by_customer (customer was travelling)
('fa000000-0000-0000-0004-000000000006',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-16', '07:00', '07:15', NULL, NULL,
 'cancelled_by_customer', true, 'Customer cancelled; travelling out of city for the day.'),

-- ─── March 17 (Sun) — all completed ─────────────────────────────────
-- C1-HKP Mar 17
('fa000000-0000-0000-0001-000000000007',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-17', '07:00', '07:45', '07:00', '07:45', 'completed', true, NULL),
-- C1-KCH Mar 17
('fa000000-0000-0000-0002-000000000007',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-17', '08:30', '09:30', '08:31', '09:30', 'completed', true, NULL),
-- C2-HKP Mar 17
('fa000000-0000-0000-0003-000000000007',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-17', '08:00', '08:30', '08:02', '08:31', 'completed', true, NULL),
-- C2-CCR Mar 17
('fa000000-0000-0000-0004-000000000007',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-17', '07:00', '07:15', '07:01', '07:15', 'completed', true, NULL),

-- ─── March 18 (TODAY) — C1-HKP ongoing, C2-HKP scheduled_delayed, C2-CCR ongoing_delayed ─
-- C1-HKP Mar 18 — ongoing (provider already started)
('fa000000-0000-0000-0001-000000000008',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-18', '07:00', '07:45', '07:03', NULL, 'ongoing', false, NULL),
-- C1-KCH Mar 18 — scheduled (cook not yet arrived)
('fa000000-0000-0000-0002-000000000008',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-18', '08:30', '09:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-HKP Mar 18 — scheduled_delayed (provider sent ahead notification of delay)
('fa000000-0000-0000-0003-000000000008',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-18', '08:00', '08:30', NULL, NULL,
 'scheduled_delayed', false,
 'Provider notified delay via app — stuck in traffic; ETA ~30 min late.'),
-- C2-CCR Mar 18 — ongoing_delayed (provider started late, still in progress)
('fa000000-0000-0000-0004-000000000008',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-18', '07:00', '07:15', '07:24', NULL,
 'ongoing_delayed', false,
 'Provider arrived late (07:24 vs 07:00 scheduled); service in progress.'),

-- ─── March 19 (Wed) — all scheduled ─────────────────────────────────
-- C1-HKP Mar 19
('fa000000-0000-0000-0001-000000000009',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-19', '07:00', '07:45', NULL, NULL, 'scheduled', false, NULL),
-- C1-KCH Mar 19
('fa000000-0000-0000-0002-000000000009',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-19', '08:30', '09:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-HKP Mar 19
('fa000000-0000-0000-0003-000000000009',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-19', '08:00', '08:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-CCR Mar 19
('fa000000-0000-0000-0004-000000000009',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-19', '07:00', '07:15', NULL, NULL, 'scheduled', false, NULL),

-- ─── March 20 (Thu) — all scheduled ─────────────────────────────────
-- C1-HKP Mar 20
('fa000000-0000-0000-0001-000000000010',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-20', '07:00', '07:45', NULL, NULL, 'scheduled', false, NULL),
-- C1-KCH Mar 20
('fa000000-0000-0000-0002-000000000010',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-20', '08:30', '09:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-HKP Mar 20
('fa000000-0000-0000-0003-000000000010',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-20', '08:00', '08:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-CCR Mar 20
('fa000000-0000-0000-0004-000000000010',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-20', '07:00', '07:15', NULL, NULL, 'scheduled', false, NULL),

-- ─── March 21 (Fri) — all scheduled ─────────────────────────────────
-- C1-HKP Mar 21
('fa000000-0000-0000-0001-000000000011',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-21', '07:00', '07:45', NULL, NULL, 'scheduled', false, NULL),
-- C1-KCH Mar 21
('fa000000-0000-0000-0002-000000000011',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-21', '08:30', '09:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-HKP Mar 21
('fa000000-0000-0000-0003-000000000011',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-21', '08:00', '08:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-CCR Mar 21
('fa000000-0000-0000-0004-000000000011',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-21', '07:00', '07:15', NULL, NULL, 'scheduled', false, NULL),

-- ─── March 22 (Sat) — all scheduled ─────────────────────────────────
-- C1-HKP Mar 22
('fa000000-0000-0000-0001-000000000012',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-22', '07:00', '07:45', NULL, NULL, 'scheduled', false, NULL),
-- C1-KCH Mar 22
('fa000000-0000-0000-0002-000000000012',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-22', '08:30', '09:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-HKP Mar 22
('fa000000-0000-0000-0003-000000000012',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-22', '08:00', '08:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-CCR Mar 22
('fa000000-0000-0000-0004-000000000012',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-22', '07:00', '07:15', NULL, NULL, 'scheduled', false, NULL),

-- ─── March 23 (Sun) — all scheduled ─────────────────────────────────
-- C1-HKP Mar 23
('fa000000-0000-0000-0001-000000000013',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-23', '07:00', '07:45', NULL, NULL, 'scheduled', false, NULL),
-- C1-KCH Mar 23
('fa000000-0000-0000-0002-000000000013',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-23', '08:30', '09:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-HKP Mar 23
('fa000000-0000-0000-0003-000000000013',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-23', '08:00', '08:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-CCR Mar 23
('fa000000-0000-0000-0004-000000000013',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-23', '07:00', '07:15', NULL, NULL, 'scheduled', false, NULL),

-- ─── March 24 (Mon) — C1-HKP = service_on_pause (customer approved pause) ─
-- C1-HKP Mar 24 — paused (customer requested 1-day break)
('fa000000-0000-0000-0001-000000000014',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-24', '07:00', '07:45', NULL, NULL, 'service_on_pause', false,
 'Service paused per customer request — approved via pause request PR-C1-001.'),
-- C1-KCH Mar 24
('fa000000-0000-0000-0002-000000000014',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-24', '08:30', '09:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-HKP Mar 24
('fa000000-0000-0000-0003-000000000014',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-24', '08:00', '08:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-CCR Mar 24
('fa000000-0000-0000-0004-000000000014',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-24', '07:00', '07:15', NULL, NULL, 'scheduled', false, NULL),

-- ─── March 25 (Tue) — all scheduled ─────────────────────────────────
-- C1-HKP Mar 25
('fa000000-0000-0000-0001-000000000015',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-25', '07:00', '07:45', NULL, NULL, 'scheduled', false, NULL),
-- C1-KCH Mar 25
('fa000000-0000-0000-0002-000000000015',
 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
 '2026-03-25', '08:30', '09:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-HKP Mar 25
('fa000000-0000-0000-0003-000000000015',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0001-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-25', '08:00', '08:30', NULL, NULL, 'scheduled', false, NULL),
-- C2-CCR Mar 25
('fa000000-0000-0000-0004-000000000015',
 'b2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0002-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
 '2026-03-25', '07:00', '07:15', NULL, NULL, 'scheduled', false, NULL);


-- ── Pause Requests ────────────────────────────────────────────────────
-- One approved pause for Customer 1 (HKP only on Mar 24 — 1-day pause)

INSERT INTO pause_requests (
  id, customer_id, plan_request_id,
  pause_type, pause_start_date, pause_end_date,
  pause_duration_unit, pause_duration_value,
  status, supervisor_approval_status,
  created_at, updated_at
) VALUES (
  'cc000000-0000-0000-0001-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'single_job',
  '2026-03-24',
  '2026-03-24',
  'days', 1,
  'active', 'approved',
  '2026-03-20 18:00:00+05:30',
  '2026-03-21 09:00:00+05:30'
);


-- ── Tech Services Allowance (for Customer 1 — has HKP+KCH plan) ──────

INSERT INTO tech_services_allowance (
  plan_request_id, service_type, allowed_count, used_count,
  current_month, current_year
) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'electrician', 2, 0, 3, 2026),
  ('b1000000-0000-0000-0000-000000000001', 'plumber',     2, 0, 3, 2026),
  ('b1000000-0000-0000-0000-000000000001', 'carpenter',   1, 0, 3, 2026),
  ('b2000000-0000-0000-0000-000000000002', 'electrician', 2, 0, 3, 2026),
  ('b2000000-0000-0000-0000-000000000002', 'plumber',     2, 0, 3, 2026);


-- ── Seed Provider Sessions (long-lived; for easy login in dev/test) ───
-- Token format is deterministic so you can log in by pasting the token
-- into the habio_provider_session cookie, or just use the /provider/login
-- flow with the seeded phone numbers.
--
-- Provider phones: +919900000001 to +919900000007
-- Session tokens (copy into cookie habio_provider_session):
--   Ravi Kumar   → seed-provider-session-token-ravi-kumar-sp001
--   Sunita Devi  → seed-provider-session-token-sunita-devi-sp002
--   Priya Nair   → seed-provider-session-token-priya-nair-sp005
--   Deepa Kumari → seed-provider-session-token-deepa-kumari-sp007

INSERT INTO provider_sessions (
  id, service_provider_id, session_token, expires_at
) VALUES
  ('d1000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'seed-provider-session-token-ravi-kumar-sp001',
   '2027-12-31 23:59:59+05:30'),
  ('d1000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002',
   'seed-provider-session-token-sunita-devi-sp002',
   '2027-12-31 23:59:59+05:30'),
  ('d1000000-0000-0000-0000-000000000005',
   'a0000000-0000-0000-0000-000000000005',
   'seed-provider-session-token-priya-nair-sp005',
   '2027-12-31 23:59:59+05:30'),
  ('d1000000-0000-0000-0000-000000000007',
   'a0000000-0000-0000-0000-000000000007',
   'seed-provider-session-token-deepa-kumari-sp007',
   '2027-12-31 23:59:59+05:30');


-- ── Seed Customer Sessions (long-lived; for easy login in dev/test) ───
-- Customer phones: +919800000001 (Ananya), +919800000002 (Vikram)
-- Session tokens (copy into cookie habio_session):
--   Ananya Sharma → seed-customer-session-token-ananya-sharma-c1
--   Vikram Patel  → seed-customer-session-token-vikram-patel-c2

INSERT INTO customer_sessions (
  id, customer_id, session_token, expires_at
) VALUES
  ('dc000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   'seed-customer-session-token-ananya-sharma-c1',
   '2027-12-31 23:59:59+05:30'),
  ('dc000000-0000-0000-0000-000000000002',
   'c2000000-0000-0000-0000-000000000002',
   'seed-customer-session-token-vikram-patel-c2',
   '2027-12-31 23:59:59+05:30');

