-- HABIO MVP Schema
-- Run this in Supabase SQL editor (or via psql)

-- =====================
-- CATALOG
-- =====================

CREATE TABLE IF NOT EXISTS service_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS service_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      uuid NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  slug             text UNIQUE NOT NULL,
  name             text NOT NULL,
  frequency_label  text NOT NULL DEFAULT 'Daily',
  active           boolean NOT NULL DEFAULT true,
  sort_order       int     NOT NULL DEFAULT 0
);

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

CREATE TYPE IF NOT EXISTS cart_status AS ENUM ('active', 'submitted');

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
  custom_title          text,
  frequency_label       text NOT NULL DEFAULT 'Daily',
  minutes               int  NOT NULL DEFAULT 30,
  unit_price_monthly    numeric(10,2) NOT NULL,
  mrp_monthly           numeric(10,2),
  expectations_snapshot jsonb,
  sort_order            int  NOT NULL DEFAULT 0
);

-- =====================
-- PLAN REQUESTS
-- =====================

CREATE TYPE IF NOT EXISTS plan_request_status AS ENUM (
  'submitted', 'under_process', 'finalized', 'paid', 'cancelled'
);

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
  title                 text NOT NULL,
  frequency_label       text NOT NULL DEFAULT 'Daily',
  minutes               int  NOT NULL DEFAULT 30,
  price_monthly         numeric(10,2) NOT NULL,
  mrp_monthly           numeric(10,2),
  expectations_snapshot jsonb,
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

CREATE TYPE IF NOT EXISTS payment_status AS ENUM ('pending', 'succeeded', 'failed');

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
-- RLS: deny public, allow service role
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
