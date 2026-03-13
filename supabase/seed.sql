-- HABIO MVP Seed Data
-- Run AFTER schema.sql

-- =====================
-- SERVICE CATEGORIES
-- =====================
INSERT INTO service_categories (id, slug, name, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'housekeeping',       'Housekeeping',       1),
  ('00000000-0000-0000-0000-000000000002', 'kitchen-services',   'Kitchen Services',   2),
  ('00000000-0000-0000-0000-000000000003', 'garden-care',        'Garden Care',        3),
  ('00000000-0000-0000-0000-000000000004', 'car-care',           'Car Care',           4),
  ('00000000-0000-0000-0000-000000000005', 'on-demand',          'On-demand Services', 5)
ON CONFLICT (slug) DO NOTHING;

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
