import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planRequestId: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planRequestId } = await params;

  const [planResult, ticketsResult, pausesResult] = await Promise.all([
    supabaseAdmin
      .from("plan_requests")
      .select(
        `id, request_code, status, total_price_monthly, plan_start_date, created_at, updated_at,
        plan_request_items(id, title, frequency_label, unit_type, unit_value, price_monthly,
          service_categories(slug, name), service_jobs(name)),
        job_allocations(id, scheduled_date, scheduled_start_time, scheduled_end_time, status,
          service_provider_id, service_providers(id, name, provider_type)),
        customers(phone, name, customer_profiles(flat_no, building, society, sector, city, pincode, home_type, bhk))`
      )
      .eq("id", planRequestId)
      .single(),
    supabaseAdmin
      .from("issue_tickets")
      .select("id, title, description, status, priority, created_at")
      .eq("plan_request_id", planRequestId)
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("pause_requests")
      .select("id, status, pause_start_date, pause_end_date, pause_days, reason, created_at")
      .eq("plan_request_id", planRequestId)
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false }),
  ]);

  if (planResult.error) {
    return NextResponse.json({ error: planResult.error.message }, { status: 500 });
  }
  const data = planResult.data;
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  type CustomerRow = {
    phone: string;
    name: string | null;
    customer_profiles: {
      flat_no: string | null; building: string | null; society: string | null;
      sector: string | null; city: string | null; pincode: string | null;
      home_type: string | null; bhk: number | null;
    } | null;
  };
  type AllocationRow = {
    id: string;
    scheduled_date: string | null;
    scheduled_start_time: string | null;
    scheduled_end_time: string | null;
    status: string;
    service_provider_id: string | null;
    service_providers: { id: string; name: string; provider_type: string | null } | null;
  };

  const customer = data.customers as unknown as CustomerRow | null;
  const profile = customer?.customer_profiles ?? null;
  const rawAllocations = (data.job_allocations ?? []) as unknown as AllocationRow[];

  // Build recent jobs (last 30, sorted by date desc)
  const recentJobs = [...rawAllocations]
    .sort((a, b) => {
      const da = a.scheduled_date ?? "";
      const db = b.scheduled_date ?? "";
      return db.localeCompare(da);
    })
    .slice(0, 30)
    .map((alloc) => ({
      id: alloc.id,
      provider_name: alloc.service_providers?.name ?? null,
      provider_id: alloc.service_provider_id ?? null,
      scheduled_date: alloc.scheduled_date,
      scheduled_start_time: alloc.scheduled_start_time,
      status: alloc.status,
    }));

  // Build unique providers
  const seenProviders = new Map<string, { id: string; name: string; provider_type: string | null; recent_date: string | null; recent_status: string }>();
  for (const alloc of rawAllocations) {
    const sp = alloc.service_providers;
    if (!sp) continue;
    const existing = seenProviders.get(sp.id);
    if (!existing || (alloc.scheduled_date ?? "") > (existing.recent_date ?? "")) {
      seenProviders.set(sp.id, {
        id: sp.id,
        name: sp.name,
        provider_type: sp.provider_type,
        recent_date: alloc.scheduled_date,
        recent_status: alloc.status,
      });
    }
  }
  const providers = Array.from(seenProviders.values());

  const household = {
    request_code: data.request_code,
    status: data.status,
    total_price_monthly: data.total_price_monthly,
    plan_start_date: data.plan_start_date ?? null,
    flat_no: profile?.flat_no ?? null,
    building: profile?.building ?? null,
    society: profile?.society ?? null,
    sector: profile?.sector ?? null,
    city: profile?.city ?? null,
    pincode: profile?.pincode ?? null,
    phone: customer?.phone ?? "",
    name: customer?.name ?? null,
    home_type: profile?.home_type ?? null,
    bhk: profile?.bhk ?? null,
    plan_request_items: data.plan_request_items ?? [],
    providers,
    recentJobs,
    tickets: ticketsResult.data ?? [],
    pauses: pausesResult.data ?? [],
  };

  return NextResponse.json({ household });
}
