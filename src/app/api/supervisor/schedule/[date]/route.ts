import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest, getSupervisorProviderIds } from "@/lib/staff-session";

// Auth: supervisor session required (added PR1)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerIds = await getSupervisorProviderIds(staff.id);
  const { date } = await params;

  if (providerIds.length === 0) {
    return NextResponse.json({ allocations: [], onDemand: [], date });
  }

  const [allocResult, onDemandResult] = await Promise.all([
    supabaseAdmin
      .from("job_allocations")
      .select(
        "*, service_providers(name, provider_type), plan_request_items(title), customers(name, customer_profiles(flat_no, society))"
      )
      .eq("scheduled_date", date)
      .in("service_provider_id", providerIds)
      .order("scheduled_start_time", { ascending: true }),
    supabaseAdmin
      .from("on_demand_requests")
      .select(
        "id, allocated_date, allocated_start_time, allocated_end_time, status, service_providers(name), customers(name), service_jobs(name)"
      )
      .eq("allocated_date", date)
      .in("service_provider_id", providerIds)
      .order("allocated_start_time", { ascending: true }),
  ]);

  if (allocResult.error) {
    return NextResponse.json({ error: allocResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    allocations: allocResult.data ?? [],
    onDemand: onDemandResult.data ?? [],
    date,
  });
}
