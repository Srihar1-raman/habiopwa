# HABIO MVP

A **mobile-first** home services subscription platform — customer-facing web app + supervisor admin, backed by Supabase (Postgres).

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** (mobile-first)
- Custom UI components (Radix UI primitives)
- **lucide-react** icons
- **Supabase** (Postgres) as database — service role key on server only
- Cookie-based session handling (HttpOnly)

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> ⚠️ **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.** It is only used in server route handlers.

---

## Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. In the SQL editor, run **`supabase/schema.sql`** to create all tables, types, and indexes.
3. Then run **`supabase/seed.sql`** to populate catalog data (categories, jobs, pricing, expectations).

---

## Local Development

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL and service role key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Customer flow: `/login` → `/onboarding` → `/services` → `/plan` → `/payment` → `/plan-active`
- Supervisor: `/supervisor`

---

## Important Notes

### Hardcoded OTP
The OTP verification is **hardcoded to `123456`** for this MVP. There is no real SMS provider integration. In production, replace the `HARDCODED_OTP` constant in `src/app/api/auth/verify/route.ts` with a real OTP delivery service (Twilio, MSG91, etc.).

### No Supervisor Auth
The supervisor section (`/supervisor/*`) has **no authentication** for the MVP. It is accessible to anyone who knows the URL. Add auth middleware before production use.

### RLS Policy
Row-Level Security is enabled on all tables with **deny-by-default** for public/anon access. All database operations go through the **service role key on the server side** via route handlers.

### Payment Stub
The payment flow is a stub — it simulates a 2-second processing delay and marks the plan as paid. No real payment gateway is integrated.

---

## Customer Flow

1. **Login** — Phone + OTP (hardcoded: `123456`)
2. **Onboarding** — Address → Home details → Kitchen context (first-time users only)
3. **Services Home** — Browse categories, auto-swiping banner
4. **Category Plan** — Toggle jobs on/off, expand to adjust duration & see pricing
5. **Finalize Plan** — Review all selected jobs grouped by category, submit request
6. **After supervisor finalizes** — Pay button appears
7. **Payment** — Stub payment, then plan active summary

## Supervisor Flow

1. `/supervisor` — View all plan requests with status tabs
2. `/supervisor/requests/[id]` — Edit items (duration, price, add custom), finalize plan

---

## Directory Structure

```
src/
  app/
    (customer)/          # Customer pages (login, onboarding, services, plan, payment)
    supervisor/          # Supervisor pages
    api/                 # All route handlers (server-side only)
  components/
    ui/                  # Reusable UI components (Button, Input, Card)
    CartCapsule.tsx      # Floating cart summary
  contexts/
    CartContext.tsx      # Client-side cart state
  lib/
    supabase.ts          # Supabase admin client (server only)
    session.ts           # Session creation/validation helpers
    pricing.ts           # Shared pricing calculation utilities (all formula types)
    utils.ts             # Utility functions
supabase/
  schema.sql             # Database schema
  seed.sql               # Catalog seed data (source of truth: masterdata.xlsx)
```

---

## Catalog — Job Card Fields & Mappings

The canonical job catalog is `masterdata.xlsx` (also provided as `masterdata.csv` and `masterdata.md`).  
`supabase/seed.sql` is a **literal, cell-for-cell ingest** of that spreadsheet. Every `service_jobs` row maps 1:1 to a spreadsheet row.

### Column → Database Field Mapping

| Excel Column | DB Field | Notes |
|---|---|---|
| col 1: Service Category | `category_id` | Resolved to a fixed UUID (see table below) |
| col 2: Class | `class` | e.g. `HKP1`, `KCH`, `CCR`, `GCR`, `HMT`, `SMT` |
| col 3: Service Type | `service_type` | `Core - Routine`, `Add on - Routine`, or `On Demand` |
| col 4: Frequency | `frequency_label` | `Daily`, `Weekly`, or `On demand` |
| col 5: Primary Job Card ID | *(not stored)* | Used only to derive `primary_card` grouping |
| col 6: Primary Job Card Name | `primary_card` | Group header in the UI. For compound heads the full service name is used. |
| col 7: Sub Job Card ID | `code` (unique) | Internal code; slug is the lowercase version (e.g. `HKP1-CR-D-1A` → `hkp1-cr-d-1a`) |
| col 8: Sub Job Card Name | `name` / `sub_card` | `name` = what user sees (compound_head uses primary card name); `sub_card` = staff-allocation label |
| col 9: Unit | `unit_type` | `min`, `count_washrooms`, `count_cars`, `count_plants`, `count_visits`, `count_acs` |
| col 10: Unit Interval | `unit_interval` | Stepper increment in UI (e.g. 15 for minutes, 1 for count) |
| col 11: Min Unit | `min_unit` | Minimum allowed input value |
| col 12: Unit Time Multiple (min) | `time_multiple` | Minutes per unit for count-based and compound jobs; `NULL` for `min` unit_type rows |
| col 13: Base Rate per minute (₹) | `base_rate_per_unit` | ₹ per minute |
| col 14: Job Instances per month | `instances_per_month` | Set to `1` for on-demand / per-use jobs (instances blank in Excel) |
| col 15: Discount | `discount_pct` | `0.30` = 30% subscription discount |

Additional fields set by seed logic (not from Excel columns):

| DB Field | Value / Rule |
|---|---|
| `id` | Stable UUID — see scheme below |
| `slug` | Lowercase `code` (e.g. `hkp1-cr-d-1a`) |
| `is_on_demand` | `true` when service_type = `On Demand` |
| `formula_type` | `standard` for `min` unit_type; `time_multiple` for count unit_types; `compound_head`/`compound_child` for compound pairs |
| `compound_child_code` | `code` of the paired child row, for `compound_head` rows only |
| `max_unit` | Reasonable upper bound (120 min / 6 washrooms / 4 cars / 50 plants / 5 ACs etc.) |
| `default_unit` | Set to `min_unit` (or scenario-1 input where available) |
| `active` | `true` for all seeded rows |
| `sort_order` | Position within category as listed in masterdata.xlsx |

### Service Category IDs (fixed UUIDs)

| UUID | Code | Slug | Name |
|---|---|---|---|
| `00000000-0000-0000-0000-000000000001` | HKP | `housekeeping` | Housekeeping |
| `00000000-0000-0000-0000-000000000002` | KCH | `kitchen-services` | Kitchen Services |
| `00000000-0000-0000-0000-000000000003` | CCR | `car-care` | Car Care |
| `00000000-0000-0000-0000-000000000004` | GCR | `garden-care` | Garden Care |
| `00000000-0000-0000-0000-000000000005` | HMT | `technician-services` | Technician Services |

### Job UUID Scheme

| Prefix | Category |
|---|---|
| `11000000-…-000000000001` through `…000000000012` | Housekeeping (12 jobs) |
| `22000000-…-000000000001` through `…000000000003` | Kitchen Services (3 jobs) |
| `33000000-…-000000000001` through `…000000000004` | Car Care (4 jobs) |
| `44000000-…-000000000001` through `…000000000002` | Garden Care (2 jobs) |
| `55000000-…-000000000001` through `…000000000005` | Technician Services (5 jobs) |

---

## Pricing Calculation Rules

All formulas are implemented in `src/lib/pricing.ts` and match the master Excel scenario outputs exactly.

### `standard` (unit_type = `min`)
```
base_price      = input_minutes × base_rate_per_unit × instances_per_month
effective_price = base_price × (1 - discount_pct)
```
Used by: HKP1-CR-D-1A, HKP1-CR-D-2A, HKP1-AR-D-3A, HKP1-AR-D-5A, HKP1-AR-W-7A through W-11A, KCH-CR-D-1A, KCH-CR-D-2A, all on-demand `min` jobs.

### `time_multiple` (count unit_types)
```
base_price      = input_count × time_multiple × base_rate_per_unit × instances_per_month
effective_price = base_price × (1 - discount_pct)
```
Used by: HKP1-AR-D-4A (washrooms), HKP2-CR-W-6A (washrooms), CCR-AR-D-2A, CCR-AR-D-3A (cars), HMT-OD-OD-1A–4A (visits), HMT-OD-OD-5A (ACs).

### `compound_head` + `compound_child` (bundled service pairs)
```
base_price = input × ((TM_head × rate_head × inst_head) + (TM_child × rate_child × inst_child))
effective_price = base_price × (1 - discount_pct)
```
- `compound_child` rows are **hidden from users** — priced entirely through the head row.
- `compound_child_code` on the head row points to its paired child.

| Head | Child | Description |
|---|---|---|
| CCR-CR-D-1A | CCR-CR-D-1B | Basic Car Care Routine (daily wash + weekly cabin clean) |
| GCR-CR-D-1A | GCR-CR-D-1B | Basic Garden Care Routine (daily watering + weekly pruning) |

**Verification example — CCR-CR-D-1A, 1 car:**
```
base = 1 × (15 × 3.3 × 30 + 15 × 3.3 × 4) = 1 × (1485 + 198) = ₹1683
effective = 1683 × 0.70 = ₹1178
```

**Verification example — GCR-CR-D-1A, 15 plants:**
```
base = 15 × (0.5 × 3.3 × 30 + 3 × 3.3 × 4) = 15 × 89.1 = ₹1337 (rounded)
effective = 1337 × 0.70 = ₹936 (rounded)
```

### On-Demand Logic
On-demand jobs (`is_on_demand = true`) are **locked** in the UI until the user has at least one non-on-demand job in their cart.  
Detection: any cart item whose `job_code` does **not** contain `-OD-OD-` is counted as a base plan job.  
Enforced in `services/[categorySlug]/page.tsx`.

### Monthly Totals
Plan base price total = `SUM(base_price)` for all non-on-demand items.  
Plan effective price total = `SUM(effective_price)` for all non-on-demand items.  
On-demand jobs show a per-use price (`instances_per_month = 1`) and are included in the cart total.

---

## Reseed / Catalog Update Instructions

1. **Full reset** — `supabase/seed.sql` now handles this automatically. Running the seed will
   `DELETE` all catalog data, service provider data, customer sessions, customers, and job data
   before re-inserting. You can also do a manual hard reset if needed:
   ```sql
   truncate table
     issue_comments, issue_tickets, on_demand_requests, pause_requests,
     job_allocations, provider_leave_requests, tech_services_allowance,
     payments, plan_request_events, plan_request_items, plan_requests,
     cart_items, carts, customer_sessions, customer_profiles, customers,
     provider_sessions, service_providers,
     job_expectations, job_pricing, service_jobs, service_categories
   restart identity cascade;
   ```
2. Run `supabase/schema.sql` (safe to re-run; uses `CREATE TABLE IF NOT EXISTS`).
3. Run `supabase/seed.sql` to populate catalog + demo users.

To update the catalog from a new version of the Excel sheet:
1. Update `supabase/seed.sql` with the new values using the same UUID scheme and field mapping.
2. Run the seed SQL (it issues `DELETE` at the top before inserting).
3. Code changes are only needed if a **new `unit_type`** or **new `formula_type`** is introduced; update `src/lib/pricing.ts` accordingly.

---

## Demo Users (Seed Data)

`supabase/seed.sql` seeds **2 active customers** with a full 3-week history of jobs so you can
test every flow immediately after seeding.

### Seed Credentials

| Role | Name | Phone | OTP |
|------|------|-------|-----|
| Customer | Ananya Sharma | `+919800000001` | `123456` |
| Customer | Vikram Patel | `+919800000002` | `123456` |
| Provider | Ravi Kumar (HKP) | `+919900000001` | `123456` |
| Provider | Sunita Devi (Cook) | `+919900000002` | `123456` |
| Provider | Priya Nair (HKP) | `+919900000005` | `123456` |
| Provider | Deepa Kumari (Cars) | `+919900000007` | `123456` |

### What's Seeded

**Ananya Sharma** — plan active since 26 Feb 2026 (∼3 weeks)
- Housekeeping: 45 min/day @ ₹3,118.50/mo — Ravi Kumar (07:00–07:45)
- Daily Cooking Morning: 60 min/day @ ₹5,040/mo — Sunita Devi (08:30–09:30)
- **Mar 11–17**: all jobs completed (with 1 `service_incomplete` on Mar 16 cooking, cook left early)
- **Mar 18 (today)**: HKP = `ongoing`, Cooking = `scheduled`
- **Mar 19–25**: all `scheduled` (HKP on Mar 24 = `service_on_pause` — 1-day approved pause)
- Approved 1-day pause request (Mar 24) already in `pause_requests`

**Vikram Patel** — plan active since 2 Mar 2026 (∼2.5 weeks)
- Housekeeping: 30 min/day @ ₹2,079/mo — Priya Nair (08:00–08:30)
- Basic Car Care (1 car): 15 min/day @ ₹1,178.10/mo — Deepa Kumari (07:00–07:15)
- **Mar 11–17**: mostly completed (1 `completed_delayed` on Mar 15 HKP, 1 `cancelled_by_customer` on Mar 16 car care)
- **Mar 18 (today)**: both `scheduled`
- **Mar 19–25**: all `scheduled`

### Service Providers (all seeded)

| ID suffix | Name | Specialization | Phone |
|-----------|------|----------------|-------|
| …001 | Ravi Kumar | Housekeeping | +919900000001 |
| …002 | Sunita Devi | Cooking | +919900000002 |
| …003 | Arjun Sharma | Electrician | +919900000003 |
| …004 | Mohan Singh | Plumber | +919900000004 |
| …005 | Priya Nair | Housekeeping | +919900000005 |
| …006 | Ramesh Gupta | Carpenter | +919900000006 |
| …007 | Deepa Kumari | Car Care | +919900000007 |

---

## Post-Seed Verification

Run these queries in Supabase SQL editor after seeding to confirm every row landed correctly:

```sql
-- 1. Category count (expect 5)
SELECT count(*) FROM service_categories;

-- 2. Job count per category (expect HKP=12, KCH=3, CCR=4, GCR=2, HMT=5)
SELECT c.name, count(j.id) AS jobs
FROM service_categories c
JOIN service_jobs j ON j.category_id = c.id
GROUP BY c.name ORDER BY c.sort_order;

-- 3. All job codes (expect 26 rows matching masterdata sub-card IDs)
SELECT code, name, formula_type, unit_type, base_rate_per_unit, instances_per_month, discount_pct
FROM service_jobs ORDER BY category_id, sort_order;

-- 4. Compound pairs (expect CCR-CR-D-1B and GCR-CR-D-1B as children)
SELECT code, formula_type, compound_child_code
FROM service_jobs WHERE formula_type IN ('compound_head','compound_child');

-- 5. On-demand jobs (expect 8: HKP1-OD-OD-12A, KCH-OD-OD-2A, HMT-OD-OD-1A..5A)
SELECT code, name FROM service_jobs WHERE is_on_demand = true ORDER BY code;

-- 6. Expectations count (expect 3 per job, 75 total; compound_child rows have 0)
SELECT j.code, count(e.id) AS expectations
FROM service_jobs j
LEFT JOIN job_expectations e ON e.job_id = j.id
GROUP BY j.code ORDER BY j.category_id, j.sort_order;

-- 7. Spot-check CCR-CR-D-1A compound formula prices
-- expect base=1683, effective=1178 for 1 car
SELECT
  j.code,
  1 * (j.time_multiple * j.base_rate_per_unit * j.instances_per_month
    + c.time_multiple * c.base_rate_per_unit * c.instances_per_month) AS base_1car,
  round(1 * (j.time_multiple * j.base_rate_per_unit * j.instances_per_month
    + c.time_multiple * c.base_rate_per_unit * c.instances_per_month)
    * (1 - j.discount_pct)) AS effective_1car
FROM service_jobs j
JOIN service_jobs c ON c.code = j.compound_child_code
WHERE j.code = 'CCR-CR-D-1A';

-- 8. Seed user check (expect 2 customers, 2 paid plans, 60 job allocations)
SELECT count(*) AS customers FROM customers;
SELECT status, count(*) FROM plan_requests GROUP BY status;
SELECT status, count(*) FROM job_allocations GROUP BY status ORDER BY count DESC;
```
