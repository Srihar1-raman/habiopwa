-- HABIO MVP Schema — clean rewrite
-- Run on a fresh Supabase project before seed.sql
-- DO NOT run on existing installations (not migration-safe)

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Cart workflow
CREATE TYPE cart_status AS ENUM ('active', 'submitted');

-- Plan request lifecycle: cart_in_progress → submitted → captain_allocation_pending → captain_review_pending → payment_pending → active → paused/completed/cancelled/closed
CREATE TYPE plan_request_status AS ENUM (
  'cart_in_progress',
  'submitted',
  'captain_allocation_pending',
  'captain_review_pending',
  'payment_pending',
  'active',
  'paused',
  'completed',
  'cancelled',
  'closed'
);

CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed');

-- Staff hierarchy: admin > ops_lead > manager > supervisor
CREATE TYPE staff_role AS ENUM ('admin', 'ops_lead', 'manager', 'supervisor');

CREATE TYPE staff_status AS ENUM ('active', 'inactive');

-- Service provider types (technician subcategories for electrical, plumber, carpenter, RO, AC)
CREATE TYPE provider_type AS ENUM (
  'housekeeping',
  'kitchen',
  'car_care',
  'garden_care',
  'technician_electrical',
  'technician_plumber',
  'technician_carpenter',
  'technician_ro',
  'technician_ac'
);

CREATE TYPE provider_status AS ENUM ('available', 'on_leave', 'inactive');

-- Job allocation lifecycle and delay tracking
CREATE TYPE job_allocation_status AS ENUM (
  'scheduled',
  'in_progress',
  'completed',
  'completed_delayed',
  'scheduled_delayed',
  'in_progress_delayed',
  'cancelled',
  'cancelled_by_customer',
  'service_on_pause',
  'incomplete',
  'status_not_marked'
);

CREATE TYPE pause_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'completed');

CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TYPE on_demand_status AS ENUM ('pending', 'allocated', 'in_progress', 'completed', 'cancelled');

CREATE TYPE issue_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

CREATE TYPE issue_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE commenter_type AS ENUM ('customer', 'supervisor', 'admin', 'provider');

CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- ============================================================================
-- CATALOG TABLES
-- ============================================================================

CREATE TABLE service_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  code        text,
  sort_order  int  NOT NULL DEFAULT 0
);

-- formula_type: standard | time_multiple | compound_head | compound_child
-- unit_type: 'min' | 'count_washrooms' | 'count_cars' | 'count_plants' | 'count_balconies' | 'count_visits' | 'count_acs'
CREATE TABLE service_jobs (
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

CREATE TABLE job_expectations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     uuid NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
  sort_order int  NOT NULL DEFAULT 0,
  text       text NOT NULL
);

-- ============================================================================
-- LOCATIONS
-- ============================================================================

CREATE TABLE locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  city        text,
  sector      text,
  state       text,
  pincode     text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- STAFF TABLES
-- ============================================================================

CREATE TABLE staff_accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             text UNIQUE NOT NULL,
  name              text NOT NULL,
  email             text UNIQUE,
  password_hash     text,
  role              staff_role NOT NULL,
  status            staff_status NOT NULL DEFAULT 'active',
  address           text,
  permanent_address text,
  aadhaar           text,
  location_id       uuid REFERENCES locations(id),
  reports_to        uuid REFERENCES staff_accounts(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE staff_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        uuid NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
  session_token   text UNIQUE NOT NULL,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- CUSTOMER TABLES
-- ============================================================================

CREATE TABLE customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text UNIQUE NOT NULL,
  name       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customer_profiles (
  customer_id          uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  flat_no              text NOT NULL,
  building             text,
  society              text,
  sector               text,
  city                 text,
  pincode              text,
  home_type            text,
  bhk                  int,
  bathrooms            int,
  balconies            int,
  cars                 int NOT NULL DEFAULT 0,
  plants               int NOT NULL DEFAULT 0,
  diet_pref            text,
  people_count         int,
  cook_window_morning  boolean NOT NULL DEFAULT false,
  cook_window_evening  boolean NOT NULL DEFAULT false,
  kitchen_notes        text
);

CREATE TABLE customer_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- CART TABLES
-- ============================================================================

CREATE TABLE carts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status               cart_status NOT NULL DEFAULT 'active',
  preferred_start_date date,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id               uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  category_id           uuid NOT NULL REFERENCES service_categories(id),
  job_id                uuid REFERENCES service_jobs(id),
  job_code              text,
  custom_title          text,
  frequency_label       text NOT NULL DEFAULT 'Daily',
  unit_type             text NOT NULL DEFAULT 'min',
  unit_value            int  NOT NULL DEFAULT 30,
  minutes               int  NOT NULL DEFAULT 30,
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

-- ============================================================================
-- PLAN REQUESTS
-- ============================================================================

CREATE TABLE plan_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code          text UNIQUE NOT NULL,
  customer_id           uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status                plan_request_status NOT NULL DEFAULT 'cart_in_progress',
  total_price_monthly   numeric(10,2) NOT NULL DEFAULT 0,
  plan_start_date       date,
  plan_active_start_date date,
  plan_active_end_date  date,
  is_recurring          boolean DEFAULT true,
  assigned_supervisor_id uuid REFERENCES staff_accounts(id),
  admin_remarks         text,
  closed_at             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plan_request_items (
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

-- plan_request_events.event_type is free text (audit log); expected values match plan_request_status names
CREATE TABLE plan_request_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_request_id uuid NOT NULL REFERENCES plan_requests(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE TABLE payments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_request_id         uuid NOT NULL REFERENCES plan_requests(id) ON DELETE CASCADE,
  amount                  numeric(10,2) NOT NULL,
  status                  payment_status NOT NULL DEFAULT 'pending',
  provider                text,
  provider_ref            text,
  payment_link            text,
  payment_link_expires_at timestamptz,
  paid_at                 timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- SERVICE PROVIDERS
-- ============================================================================

CREATE TABLE service_providers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             text UNIQUE NOT NULL,
  name              text NOT NULL,
  provider_type     provider_type NOT NULL,
  status            provider_status NOT NULL DEFAULT 'available',
  aadhaar           text,
  address           text,
  permanent_address text,
  notes             text,
  location_id       uuid REFERENCES locations(id),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Provider weekly offs (effective date range for flexibility)
CREATE TABLE provider_week_offs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  day_of_week         day_of_week NOT NULL,
  effective_from      date NOT NULL,
  effective_to        date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_provider_weekoff UNIQUE (service_provider_id, day_of_week, effective_from)
);

CREATE TABLE provider_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id  uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  session_token        text UNIQUE NOT NULL,
  expires_at           timestamptz NOT NULL,
  created_at           timestamptz DEFAULT now()
);

CREATE TABLE provider_team_assignments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id   uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  supervisor_id         uuid NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
  assigned_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_provider_supervisor UNIQUE (service_provider_id, supervisor_id)
);

-- ============================================================================
-- JOB ALLOCATIONS
-- ============================================================================

CREATE TABLE job_allocations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_request_id          uuid NOT NULL REFERENCES plan_requests(id) ON DELETE CASCADE,
  plan_request_item_id     uuid NOT NULL REFERENCES plan_request_items(id) ON DELETE CASCADE,
  service_provider_id      uuid NOT NULL REFERENCES service_providers(id),
  customer_id              uuid NOT NULL REFERENCES customers(id),
  supervisor_id            uuid REFERENCES staff_accounts(id),
  scheduled_date           date NOT NULL,
  scheduled_start_time     time NOT NULL,
  scheduled_end_time       time NOT NULL,
  actual_start_time        timestamptz,
  actual_end_time          timestamptz,
  status                   job_allocation_status NOT NULL DEFAULT 'scheduled',
  is_locked                boolean DEFAULT false,
  cancellation_reason      text,
  supervisor_notes         text,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

-- ============================================================================
-- PAUSE REQUESTS
-- ============================================================================

CREATE TABLE pause_requests (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id              uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_request_id          uuid NOT NULL REFERENCES plan_requests(id) ON DELETE CASCADE,
  pause_type               text NOT NULL,
  pause_start_date         date NOT NULL,
  pause_end_date           date,
  pause_duration_unit      text,
  pause_duration_value     int,
  job_allocation_id        uuid REFERENCES job_allocations(id) ON DELETE SET NULL,
  reason                   text,
  status                   pause_status NOT NULL DEFAULT 'pending',
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

-- ============================================================================
-- PROVIDER LEAVE REQUESTS
-- ============================================================================

CREATE TABLE provider_leave_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id  uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  leave_start_date     date NOT NULL,
  leave_end_date       date NOT NULL,
  leave_type           text,
  status               leave_status NOT NULL DEFAULT 'pending',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- ============================================================================
-- ON-DEMAND REQUESTS
-- ============================================================================

CREATE TABLE on_demand_requests (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id             uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_request_id         uuid REFERENCES plan_requests(id),
  job_id                  uuid NOT NULL REFERENCES service_jobs(id),
  request_date            date NOT NULL,
  request_time_preference text,
  service_provider_id     uuid REFERENCES service_providers(id),
  allocated_date          date,
  allocated_start_time    time,
  allocated_end_time      time,
  status                  on_demand_status NOT NULL DEFAULT 'pending',
  customer_notes          text,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- ============================================================================
-- TECH SERVICES ALLOWANCE (simplified: month_year instead of current_month/current_year)
-- ============================================================================

CREATE TABLE tech_services_allowance (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_request_id  uuid NOT NULL REFERENCES plan_requests(id) ON DELETE CASCADE,
  service_type     text NOT NULL,
  month_year       text NOT NULL,
  allowed_count    int DEFAULT 2,
  used_count       int DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT unique_plan_service_month UNIQUE (plan_request_id, service_type, month_year)
);

-- ============================================================================
-- ISSUE TICKETS
-- ============================================================================

CREATE TABLE issue_tickets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_request_id     uuid NOT NULL REFERENCES plan_requests(id),
  job_allocation_id   uuid REFERENCES job_allocations(id),
  title               text NOT NULL,
  description         text,
  status              issue_status NOT NULL DEFAULT 'open',
  priority            issue_priority NOT NULL DEFAULT 'medium',
  supervisor_response text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TABLE issue_comments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_ticket_id  uuid NOT NULL REFERENCES issue_tickets(id) ON DELETE CASCADE,
  commenter_id     uuid NOT NULL,
  commenter_type   commenter_type NOT NULL,
  comment_text     text NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Customer sessions
CREATE INDEX idx_customer_sessions_token ON customer_sessions(session_token);
CREATE INDEX idx_customer_sessions_customer ON customer_sessions(customer_id);

-- Carts
CREATE INDEX idx_carts_customer ON carts(customer_id);

-- Cart items
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);

-- Plan requests
CREATE INDEX idx_plan_requests_customer ON plan_requests(customer_id);
CREATE INDEX idx_plan_requests_status ON plan_requests(status);
CREATE INDEX idx_plan_requests_code ON plan_requests(request_code);
CREATE INDEX idx_plan_requests_supervisor ON plan_requests(assigned_supervisor_id);

-- Plan request items
CREATE INDEX idx_plan_request_items_plan ON plan_request_items(plan_request_id);

-- Service jobs
CREATE INDEX idx_service_jobs_category ON service_jobs(category_id);

-- Service providers
CREATE INDEX idx_service_providers_phone ON service_providers(phone);
CREATE INDEX idx_service_providers_type ON service_providers(provider_type);

-- Provider sessions
CREATE INDEX idx_provider_sessions_token ON provider_sessions(session_token);

-- Job allocations
CREATE INDEX idx_job_allocations_plan ON job_allocations(plan_request_id);
CREATE INDEX idx_job_allocations_provider ON job_allocations(service_provider_id);
CREATE INDEX idx_job_allocations_customer ON job_allocations(customer_id);
CREATE INDEX idx_job_allocations_date ON job_allocations(scheduled_date);
CREATE INDEX idx_job_allocations_status ON job_allocations(status);
CREATE INDEX idx_job_allocations_supervisor ON job_allocations(supervisor_id);

-- Pause requests
CREATE INDEX idx_pause_requests_customer ON pause_requests(customer_id);
CREATE INDEX idx_pause_requests_plan ON pause_requests(plan_request_id);
CREATE INDEX idx_pause_requests_status ON pause_requests(status);

-- On-demand requests
CREATE INDEX idx_on_demand_requests_customer ON on_demand_requests(customer_id);
CREATE INDEX idx_on_demand_requests_plan ON on_demand_requests(plan_request_id);
CREATE INDEX idx_on_demand_requests_status ON on_demand_requests(status);

-- Tech services allowance
CREATE INDEX idx_tech_services_allowance_plan ON tech_services_allowance(plan_request_id);

-- Issue tickets
CREATE INDEX idx_issue_tickets_customer ON issue_tickets(customer_id);
CREATE INDEX idx_issue_tickets_status ON issue_tickets(status);

-- Issue comments
CREATE INDEX idx_issue_comments_ticket ON issue_comments(issue_ticket_id);

-- Provider leave requests
CREATE INDEX idx_provider_leave_requests_provider ON provider_leave_requests(service_provider_id);

-- Provider team assignments
CREATE INDEX idx_provider_team_assignments_provider ON provider_team_assignments(service_provider_id);
CREATE INDEX idx_provider_team_assignments_supervisor ON provider_team_assignments(supervisor_id);

-- Provider week offs
CREATE INDEX idx_provider_week_offs_provider ON provider_week_offs(service_provider_id);

-- Staff accounts
CREATE INDEX idx_staff_accounts_phone ON staff_accounts(phone);
CREATE INDEX idx_staff_accounts_email ON staff_accounts(email);
CREATE INDEX idx_staff_accounts_role ON staff_accounts(role);
CREATE INDEX idx_staff_accounts_reports_to ON staff_accounts(reports_to);

-- Staff sessions
CREATE INDEX idx_staff_sessions_token ON staff_sessions(session_token);
CREATE INDEX idx_staff_sessions_staff ON staff_sessions(staff_id);

-- Locations
CREATE INDEX idx_locations_is_active ON locations(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables (no policies - service role key is used server-side)
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_week_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pause_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_demand_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_services_allowance ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
