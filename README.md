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
    utils.ts             # Utility functions
supabase/
  schema.sql             # Database schema
  seed.sql               # Seed data
```
