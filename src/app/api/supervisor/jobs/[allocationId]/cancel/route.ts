import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest, getSupervisorProviderIds } from "@/lib/staff-session";

// Auth: supervisor session required (added PR1)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ allocationId: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allocationId } = await params;
  const body = await req.json();
  const { cancellation_reason } = body ?? {};

  // Verify the allocation belongs to one of this supervisor's providers
  const providerIds = await getSupervisorProviderIds(staff.id);
  const { data: allocation, error: fetchError } = await supabaseAdmin
    .from("job_allocations")
    .select("id, service_provider_id")
    .eq("id", allocationId)
    .single();

  if (fetchError || !allocation) {
    return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
  }

  if (!providerIds.includes(allocation.service_provider_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("job_allocations")
    .update({
      status: "cancelled_by_customer",
      is_locked: true,
      ...(cancellation_reason !== undefined && { cancellation_reason }),
    })
    .eq("id", allocationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
