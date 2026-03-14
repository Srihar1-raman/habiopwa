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
  seed.sql               # Catalog seed data (source of truth: housekeeping-job-cards.md)
```

---

## Catalog — Job Card Fields & Mappings

The canonical job catalog lives in `supabase/seed.sql`. Every `service_jobs` row maps directly to a row in the master Excel (`housekeeping-job-cards.md`). The table below describes every field:

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Stable UUID (prefix: `aa…` HKP, `bb…` KCH, `cc…` CAR, `dd…` GRD, `ee…` OND) |
| `category_id` | UUID | FK → `service_categories.id` |
| `slug` | text | URL-safe lowercase code (e.g. `hkp-001`) |
| `name` | text | Human-readable job name shown in the UI |
| `code` | text | Short internal code from Excel (e.g. `HKP-001`) |
| `class` | text | Class grouping from Excel (e.g. `HKP1`, `KCH`, `CAR`, `GRD`, `OND`) |
| `service_type` | text | `Core - Routine`, `Add on - Routine`, or `On Demand` |
| `primary_card` | text | Primary job card name (for grouping in UI) |
| `sub_card` | text | Sub job card name (for staff allocation) |
| `frequency_label` | text | Display frequency (e.g. `Daily`, `3x / week`, `Weekly`, `On demand`) |
| `unit_type` | text | What the user's input represents: `min`, `count_washrooms`, `count_cars`, `count_plants`, `count_balconies`, `count_visits` |
| `unit_interval` | int | Step size when adjusting the unit selector (e.g. 15 for minutes, 1 for count) |
| `min_unit` | int | Minimum allowed input value |
| `max_unit` | int | Maximum allowed input value |
| `default_unit` | int | Default value pre-selected in the UI |
| `time_multiple` | numeric | Minutes per unit (for time_multiple/compound formulas); NULL for standard |
| `base_rate_per_unit` | numeric | Rate per minute (₹/min) or rate per item (₹/car, ₹/plant, etc.) |
| `instances_per_month` | int | How many times per month this job is performed |
| `discount_pct` | numeric | Discount fraction (0.20 = 20%). Effective price = base × (1 - discount_pct) |
| `is_on_demand` | bool | True for on-demand jobs (require active base plan to select) |
| `formula_type` | text | Calculation method: `standard`, `time_multiple`, `compound_head`, `compound_child` |
| `compound_child_code` | text | For `compound_head` rows: the code of the paired `compound_child` row |
| `active` | bool | Whether to show this job in the catalog (defaults true) |
| `sort_order` | int | Display order within the category |

### Service Category IDs

| ID | Code | Name |
|---|---|---|
| `00000000-0000-0000-0000-000000000001` | HKP | Housekeeping |
| `00000000-0000-0000-0000-000000000002` | KCH | Kitchen Services |
| `00000000-0000-0000-0000-000000000003` | GRD | Garden Care |
| `00000000-0000-0000-0000-000000000004` | CAR | Car Care |
| `00000000-0000-0000-0000-000000000005` | OND | On-demand Services |

---

## Pricing Calculation Rules

All formulas are implemented in `src/lib/pricing.ts` and match the master Excel exactly.

### `standard`
```
base_price = input × base_rate_per_unit × instances_per_month
effective_price = base_price × (1 - discount_pct)
```
Used by: HKP-001, HKP-002, HKP-003, HKP-005, KCH-001..004, CAR-001, CAR-002, GRD-001, OND-001..003

### `time_multiple`
```
base_price = input × time_multiple × base_rate_per_unit × instances_per_month
effective_price = base_price × (1 - discount_pct)
```
Used by: HKP-004 (washrooms), HKP-006 (balconies), HKP-008 (buffer time), KCH-005 (extra kitchen time)

### `compound_head` + `compound_child` (special cases: weekly deep clean & gardening)
```
base_price = input × ((TM_head × rate_head × inst_head) + (TM_child × rate_child × inst_child))
effective_price = base_price × (1 - discount_pct)
```
- `compound_child` rows are **hidden from users** — they are only used internally for the compound calculation.
- The `compound_child_code` column on the `compound_head` row points to its paired child.
- Used by: HKP-007H + HKP-007C (deep clean), GRD-002H + GRD-002C (gardening & pruning)

### On-Demand Logic
On-demand jobs (`is_on_demand = true`) are **locked** until the user has at least one non-on-demand job in their cart. Enforced in `services/[categorySlug]/page.tsx`.

### Monthly Totals
Plan base price total = `SUM(base_price)` for all non-on-demand items.
Plan effective price total = `SUM(effective_price)` for all non-on-demand items.
On-demand jobs are not included in the plan base price total but are included in the cart total.

---

## Migrating from Excel

To update the catalog from a new version of the Excel sheet:

1. Update `supabase/seed.sql` — insert new/updated rows using the same UUID prefixes and field mapping as above.
2. Run the seed SQL against your Supabase project (it clears all catalog + plan data first — see the DELETE block at the top of seed.sql).
3. No code changes needed if you are only updating data values; only change `src/lib/pricing.ts` if new formula types are introduced.
