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

  const { data, error } = await supabaseAdmin
    .from("plan_requests")
    .select(
      `id, request_code, status, total_price_monthly, plan_start_date, created_at, updated_at,
      plan_request_items(id, title, frequency_label, unit_type, unit_value, price_monthly,
        service_categories(slug, name), service_jobs(name)),
      job_allocations(id, scheduled_date, scheduled_start_time, scheduled_end_time, status,
        service_providers(name, provider_type)),
      customers(phone, name, customer_profiles(flat_no, building, society, sector, city, pincode, home_type, bhk))`
    )
    .eq("id", planRequestId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Flatten nested Supabase structure into the shape the UI expects
  type CustomerRow = { phone: string; name: string | null; customer_profiles: { flat_no: string | null; building: string | null; society: string | null; sector: string | null; city: string | null; pincode: string | null; home_type: string | null; bhk: number | null } | null };
  type AllocationRow = { id: string; scheduled_date: string | null; scheduled_start_time: string | null; scheduled_end_time: string | null; status: string; service_providers: { name: string; provider_type: string | null } | null };

  const customer = data.customers as unknown as CustomerRow | null;
  const profile = customer?.customer_profiles ?? null;

  const jobAllocations = ((data.job_allocations ?? []) as unknown as AllocationRow[]).map((alloc) => ({
    id: alloc.id,
    provider_name: alloc.service_providers?.name ?? null,
    job_title: alloc.service_providers?.provider_type ?? "Service",
    scheduled_date: alloc.scheduled_date,
    scheduled_start_time: alloc.scheduled_start_time,
    status: alloc.status,
  }));

  const household = {
    request_code: data.request_code,
    status: data.status,
    total_price_monthly: data.total_price_monthly,
    plan_start_date: data.plan_start_date ?? null,
    flat_no: profile?.flat_no ?? null,
    society: profile?.society ?? null,
    sector: profile?.sector ?? null,
    city: profile?.city ?? null,
    phone: customer?.phone ?? "",
    name: customer?.name ?? null,
    home_type: profile?.home_type ?? null,
    bhk: profile?.bhk ?? null,
    job_allocations: jobAllocations,
    plan_request_items: data.plan_request_items ?? [],
  };

  return NextResponse.json({ household });
}
