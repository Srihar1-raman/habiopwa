-- HABIO MVP Schema
-- Run this in Supabase SQL editor

-- =====================
-- EXTENSIONS
-- =====================
create extension if not exists pgcrypto;

-- =====================
-- ENUM TYPES (compat-safe for Supabase/Postgres)
-- =====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cart_status') THEN
    CREATE TYPE cart_status AS ENUM ('active', 'submitted');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_request_status') THEN
    CREATE TYPE plan_request_status AS ENUM ('submitted', 'under_process', 'finalized', 'paid', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed');
  END IF;
END $$;

-- =====================
-- CATALOG
-- =====================

CREATE TABLE IF NOT EXISTS service_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  code        text,
  sort_order  int  NOT NULL DEFAULT 0
);

-- service_jobs: full catalog with pricing parameters and formula metadata
-- formula_type:
--   standard       => base_price = input * base_rate_per_unit * instances_per_month
--   time_multiple  => base_price = input * time_multiple * base_rate_per_unit * instances_per_month
--   compound_head  => base_price = input * ((TM_head * rate_head * inst_head) + (TM_child * rate_child * inst_child))
--   compound_child => priced via compound_head, not shown as standalone
-- unit_type: 'min' | 'count_washrooms' | 'count_cars' | 'count_plants' | 'count_balconies' | 'count_visits'
CREATE TABLE IF NOT EXISTS service_jobs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id          uuid NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  slug                 text UNIQUE NOT NULL,
  name                 text NOT NULL,
  code                 text UNIQUE,
  class                text,
  service_type         text,
  primary_card         text,
  sub_card             text,
  frequency_label      text NOT NULL DEFAULT 'Daily',
  unit_type            text NOT NULL DEFAULT 'min',
  unit_interval        int  NOT NULL DEFAULT 15,
  min_unit             int  NOT NULL DEFAULT 15,
  max_unit             int  NOT NULL DEFAULT 120,
  default_unit         int  NOT NULL DEFAULT 30,
  time_multiple        numeric(6,2),
  base_rate_per_unit   numeric(10,4) NOT NULL DEFAULT 0,
  instances_per_month  int  NOT NULL DEFAULT 26,
  discount_pct         numeric(5,4) NOT NULL DEFAULT 0.2000,
  is_on_demand         boolean NOT NULL DEFAULT false,
  formula_type         text NOT NULL DEFAULT 'standard',
  compound_child_code  text,
  active               boolean NOT NULL DEFAULT true,
  sort_order           int     NOT NULL DEFAULT 0
);

-- job_pricing is kept for backward compatibility; new pricing comes from service_jobs formula fields
CREATE TABLE IF NOT EXISTS job_pricing (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           uuid UNIQUE NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
  currency         text NOT NULL DEFAULT 'INR',
  mrp_monthly      numeric(10,2),
  price_monthly    numeric(10,2) NOT NULL,
  default_minutes  int NOT NULL DEFAULT 30,
  min_minutes      int NOT NULL DEFAULT 15,
  max_minutes      int NOT NULL DEFAULT 90,
  step_minutes     int NOT NULL DEFAULT 15
);

CREATE TABLE IF NOT EXISTS job_expectations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     uuid NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
  sort_order int  NOT NULL DEFAULT 0,
  text       text NOT NULL
);

-- =====================
-- CUSTOMER
-- =====================

CREATE TABLE IF NOT EXISTS customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text UNIQUE NOT NULL,
  name       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  customer_id      uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  flat_no          text NOT NULL,
  building         text,
  society          text,
  sector           text,
  city             text,
  pincode          text,
  home_type        text,
  bhk              int,
  bathrooms        int,
  balconies        int,
  diet_pref        text,
  people_count     int,
  cook_window_morning  boolean NOT NULL DEFAULT false,
  cook_window_evening  boolean NOT NULL DEFAULT false,
  kitchen_notes    text
);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- =====================
-- CART
-- =====================

CREATE TABLE IF NOT EXISTS carts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status      cart_status NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id               uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  category_id           uuid NOT NULL REFERENCES service_categories(id),
  job_id                uuid REFERENCES service_jobs(id),
  job_code              text,
  custom_title          text,
  frequency_label       text NOT NULL DEFAULT 'Daily',
  -- unit snapshot (set at add-to-cart time, updated when user changes input)
  unit_type             text NOT NULL DEFAULT 'min',
  unit_value            int  NOT NULL DEFAULT 30,
  minutes               int  NOT NULL DEFAULT 30,   -- kept for backward compat; equals unit_value when unit_type='min'
  -- pricing snapshot fields (immutable once submitted)
  base_rate_per_unit    numeric(10,4),
  instances_per_month   int,
  discount_pct          numeric(5,4),
  time_multiple         numeric(6,2),
  formula_type          text,
  base_price_monthly    numeric(10,2),
  unit_price_monthly    numeric(10,2) NOT NULL,
  mrp_monthly           numeric(10,2),
  expectations_snapshot jsonb,
  sort_order            int  NOT NULL DEFAULT 0
);

-- =====================
-- PLAN REQUESTS
-- =====================

CREATE TABLE IF NOT EXISTS plan_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code        text UNIQUE NOT NULL,
  customer_id         uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status              plan_request_status NOT NULL DEFAULT 'submitted',
  total_price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_request_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_request_id       uuid NOT NULL REFERENCES plan_requests(id) ON DELETE CASCADE,
  category_id           uuid NOT NULL REFERENCES service_categories(id),
  job_id                uuid REFERENCES service_jobs(id),
  job_code              text,
  title                 text NOT NULL,
  frequency_label       text NOT NULL DEFAULT 'Daily',
  unit_type             text NOT NULL DEFAULT 'min',
  unit_value            int  NOT NULL DEFAULT 30,
  minutes               int  NOT NULL DEFAULT 30,
  -- full pricing snapshot at time of submission
  base_rate_per_unit    numeric(10,4),
  instances_per_month   int,
  discount_pct          numeric(5,4),
  time_multiple         numeric(6,2),
  formula_type          text,
  base_price_monthly    numeric(10,2),
  price_monthly         numeric(10,2) NOT NULL,
  mrp_monthly           numeric(10,2),
  expectations_snapshot jsonb,
  is_addon              boolean NOT NULL DEFAULT false,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_request_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_request_id uuid NOT NULL REFERENCES plan_requests(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =====================
-- PAYMENTS (stub)
-- =====================

CREATE TABLE IF NOT EXISTS payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_request_id uuid NOT NULL REFERENCES plan_requests(id) ON DELETE CASCADE,
  amount          numeric(10,2) NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  provider        text,
  provider_ref    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =====================
-- INDEXES
-- =====================

CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_customer ON carts(customer_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_plan_requests_customer ON plan_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_plan_requests_status ON plan_requests(status);
CREATE INDEX IF NOT EXISTS idx_plan_requests_code ON plan_requests(request_code);
CREATE INDEX IF NOT EXISTS idx_plan_request_items_request ON plan_request_items(plan_request_id);
CREATE INDEX IF NOT EXISTS idx_service_jobs_category ON service_jobs(category_id);

-- =====================
-- RLS: deny public, allow service role (server only)
-- =====================

ALTER TABLE service_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_pricing            ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_expectations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_request_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_request_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments               ENABLE ROW LEVEL SECURITY;

-- NOTE:
-- No RLS policies are created here on purpose.
-- With RLS enabled and no policies, anon/authenticated users are denied.
-- Your Next.js server should use the Supabase SERVICE_ROLE key to access data securely.

-- =====================
-- UPGRADE MIGRATION (existing installations)
-- These ALTER TABLE statements are safe to run multiple times (IF NOT EXISTS).
-- If you are doing a fresh install from this schema, the columns already exist above.
-- =====================

ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS code text;

ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS code                text;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS class               text;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS service_type        text;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS primary_card        text;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS sub_card            text;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS unit_type           text NOT NULL DEFAULT 'min';
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS unit_interval       int  NOT NULL DEFAULT 15;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS min_unit            int  NOT NULL DEFAULT 15;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS max_unit            int  NOT NULL DEFAULT 120;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS default_unit        int  NOT NULL DEFAULT 30;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS time_multiple       numeric(6,2);
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS base_rate_per_unit  numeric(10,4) NOT NULL DEFAULT 0;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS instances_per_month int  NOT NULL DEFAULT 26;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS discount_pct        numeric(5,4) NOT NULL DEFAULT 0.2000;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS is_on_demand        boolean NOT NULL DEFAULT false;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS formula_type        text NOT NULL DEFAULT 'standard';
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS compound_child_code text;

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS job_code             text;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS unit_type            text NOT NULL DEFAULT 'min';
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS unit_value           int  NOT NULL DEFAULT 30;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS base_rate_per_unit   numeric(10,4);
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS instances_per_month  int;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS discount_pct         numeric(5,4);
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS time_multiple        numeric(6,2);
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS formula_type         text;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS base_price_monthly   numeric(10,2);

ALTER TABLE plan_request_items ADD COLUMN IF NOT EXISTS job_code             text;
ALTER TABLE plan_request_items ADD COLUMN IF NOT EXISTS unit_type            text NOT NULL DEFAULT 'min';
ALTER TABLE plan_request_items ADD COLUMN IF NOT EXISTS unit_value           int  NOT NULL DEFAULT 30;
ALTER TABLE plan_request_items ADD COLUMN IF NOT EXISTS base_rate_per_unit   numeric(10,4);
ALTER TABLE plan_request_items ADD COLUMN IF NOT EXISTS instances_per_month  int;
ALTER TABLE plan_request_items ADD COLUMN IF NOT EXISTS discount_pct         numeric(5,4);
ALTER TABLE plan_request_items ADD COLUMN IF NOT EXISTS time_multiple        numeric(6,2);
ALTER TABLE plan_request_items ADD COLUMN IF NOT EXISTS formula_type         text;
ALTER TABLE plan_request_items ADD COLUMN IF NOT EXISTS base_price_monthly   numeric(10,2);
ALTER TABLE plan_request_items ADD COLUMN IF NOT EXISTS is_addon             boolean NOT NULL DEFAULT false;
-- =====================
-- PLAN START DATE & CART PREFERRED DATE
-- Add plan_start_date to plan_requests and preferred_start_date to carts.
-- Safe to run multiple times (IF NOT EXISTS).
-- =====================

ALTER TABLE plan_requests
  ADD COLUMN IF NOT EXISTS plan_start_date DATE;

ALTER TABLE carts
  ADD COLUMN IF NOT EXISTS preferred_start_date DATE;

-- =====================
-- PLAN ACTIVE DATE TRACKING
-- =====================
ALTER TABLE plan_requests
  ADD COLUMN IF NOT EXISTS plan_active_start_date date;

ALTER TABLE plan_requests
  ADD COLUMN IF NOT EXISTS plan_active_end_date date;

ALTER TABLE plan_requests
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT true;

-- =====================
-- SERVICE PROVIDERS
-- =====================

CREATE TABLE IF NOT EXISTS service_providers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone            text UNIQUE NOT NULL,
  name             text NOT NULL,
  specialization   text NOT NULL,
  is_active        boolean DEFAULT true,
  status           text DEFAULT 'available',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_providers_phone ON service_providers(phone);
CREATE INDEX IF NOT EXISTS idx_service_providers_specialization ON service_providers(specialization);

-- =====================
-- PROVIDER SESSIONS
-- =====================

CREATE TABLE IF NOT EXISTS provider_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id  uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  session_token        text UNIQUE NOT NULL,
  expires_at           timestamptz NOT NULL,
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_sessions_token ON provider_sessions(session_token);

ALTER TABLE provider_sessions ENABLE ROW LEVEL SECURITY;

-- =====================
-- JOB ALLOCATIONS
-- =====================

CREATE TABLE IF NOT EXISTS job_allocations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_request_id          uuid NOT NULL REFERENCES plan_requests(id) ON DELETE CASCADE,
  plan_request_item_id     uuid NOT NULL REFERENCES plan_request_items(id) ON DELETE CASCADE,
  service_provider_id      uuid NOT NULL REFERENCES service_providers(id),
  customer_id              uuid NOT NULL REFERENCES customers(id),
  scheduled_date           date NOT NULL,
  scheduled_start_time     time NOT NULL,
  scheduled_end_time       time NOT NULL,
  actual_start_time        time,
  actual_end_time          time,
  status                   text NOT NULL DEFAULT 'scheduled',
  is_locked                boolean DEFAULT false,
  cancellation_reason      text,
  supervisor_notes         text,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_allocations_plan ON job_allocations(plan_request_id);
CREATE INDEX IF NOT EXISTS idx_job_allocations_provider ON job_allocations(service_provider_id);
CREATE INDEX IF NOT EXISTS idx_job_allocations_customer ON job_allocations(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_allocations_date ON job_allocations(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_job_allocations_status ON job_allocations(status);

ALTER TABLE job_allocations ENABLE ROW LEVEL SECURITY;

-- =====================
-- PAUSE REQUESTS
-- =====================

CREATE TABLE IF NOT EXISTS pause_requests (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id                 uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_request_id             uuid NOT NULL REFERENCES plan_requests(id) ON DELETE CASCADE,
  pause_type                  text NOT NULL,
  pause_start_date            date NOT NULL,
  pause_end_date              date,
  pause_duration_unit         text,
  pause_duration_value        int,
  status                      text DEFAULT 'active',
  supervisor_approval_status  text DEFAULT 'pending',
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pause_requests_customer ON pause_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_pause_requests_plan ON pause_requests(plan_request_id);
CREATE INDEX IF NOT EXISTS idx_pause_requests_status ON pause_requests(status);

ALTER TABLE pause_requests ENABLE ROW LEVEL SECURITY;

-- =====================
-- ON-DEMAND REQUESTS
-- =====================

CREATE TABLE IF NOT EXISTS on_demand_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_request_id       uuid NOT NULL REFERENCES plan_requests(id),
  job_id                uuid NOT NULL REFERENCES service_jobs(id),
  request_date          date NOT NULL,
  request_time_preference text,
  service_provider_id   uuid REFERENCES service_providers(id),
  allocated_date        date,
  allocated_start_time  time,
  allocated_end_time    time,
  status                text DEFAULT 'pending',
  customer_notes        text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_on_demand_requests_customer ON on_demand_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_on_demand_requests_plan ON on_demand_requests(plan_request_id);
CREATE INDEX IF NOT EXISTS idx_on_demand_requests_status ON on_demand_requests(status);

ALTER TABLE on_demand_requests ENABLE ROW LEVEL SECURITY;

-- =====================
-- TECH SERVICES ALLOWANCE
-- =====================

CREATE TABLE IF NOT EXISTS tech_services_allowance (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_request_id  uuid NOT NULL REFERENCES plan_requests(id) ON DELETE CASCADE,
  service_type     text NOT NULL,
  allowed_count    int DEFAULT 2,
  used_count       int DEFAULT 0,
  current_month    int,
  current_year     int,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT unique_plan_service UNIQUE (plan_request_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_tech_allowance_plan ON tech_services_allowance(plan_request_id);

ALTER TABLE tech_services_allowance ENABLE ROW LEVEL SECURITY;

-- =====================
-- ISSUE TICKETS
-- =====================

CREATE TABLE IF NOT EXISTS issue_tickets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_request_id     uuid NOT NULL REFERENCES plan_requests(id),
  job_allocation_id   uuid REFERENCES job_allocations(id),
  title               text NOT NULL,
  description         text,
  status              text DEFAULT 'open',
  priority            text DEFAULT 'medium',
  supervisor_response text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_tickets_customer ON issue_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_issue_tickets_status ON issue_tickets(status);

ALTER TABLE issue_tickets ENABLE ROW LEVEL SECURITY;

-- =====================
-- ISSUE COMMENTS
-- =====================

CREATE TABLE IF NOT EXISTS issue_comments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_ticket_id  uuid NOT NULL REFERENCES issue_tickets(id) ON DELETE CASCADE,
  commented_by     text NOT NULL,
  comment_text     text NOT NULL,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_comments_ticket ON issue_comments(issue_ticket_id);

ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;

-- =====================
-- PROVIDER LEAVE REQUESTS
-- =====================

CREATE TABLE IF NOT EXISTS provider_leave_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id  uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  leave_start_date     date NOT NULL,
  leave_end_date       date NOT NULL,
  leave_type           text,
  status               text DEFAULT 'pending',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_leave_provider ON provider_leave_requests(service_provider_id);

ALTER TABLE provider_leave_requests ENABLE ROW LEVEL SECURITY;

-- =====================
-- DAILY REPORTS
-- =====================

CREATE TABLE IF NOT EXISTS daily_reports (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date             date NOT NULL UNIQUE,
  total_jobs_scheduled    int DEFAULT 0,
  total_jobs_completed    int DEFAULT 0,
  total_jobs_delayed      int DEFAULT 0,
  total_jobs_cancelled    int DEFAULT 0,
  breakage_count          int DEFAULT 0,
  summary_notes           text,
  created_at              timestamptz DEFAULT now()
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS for service_providers (read via service role only)
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
