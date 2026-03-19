import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest, getSupervisorProviderIds } from "@/lib/staff-session";

// Auth: supervisor session required (added PR1)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerIds = await getSupervisorProviderIds(staff.id);
  if (providerIds.length === 0) {
    return NextResponse.json({ allocations: [], date: (await params).date });
  }

  const { date } = await params;

  const { data, error } = await supabaseAdmin
    .from("job_allocations")
    .select(
      "*, service_providers(name, specialization), plan_request_items(title), customers(name, customer_profiles(flat_no, society))"
    )
    .eq("scheduled_date", date)
    .in("service_provider_id", providerIds)
    .order("scheduled_start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ allocations: data ?? [], date });
}
