import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

interface Allocation {
  plan_request_item_id: string;
  service_provider_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planRequestId: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planRequestId } = await params;
  const body = await req.json();
  const allocations: Allocation[] = body.allocations;

  if (!Array.isArray(allocations) || allocations.length === 0) {
    return NextResponse.json({ error: "allocations array is required" }, { status: 400 });
  }

  // Get plan_request to retrieve customer_id and status
  const { data: planRequest, error: prError } = await supabaseAdmin
    .from("plan_requests")
    .select("id, customer_id, status")
    .eq("id", planRequestId)
    .single();

  if (prError || !planRequest) {
    return NextResponse.json({ error: "Plan request not found" }, { status: 404 });
  }

  // Validate no time overlap for each provider on the given date
  for (const alloc of allocations) {
    const { data: existing, error: overlapError } = await supabaseAdmin
      .from("job_allocations")
      .select("id, scheduled_start_time, scheduled_end_time")
      .eq("service_provider_id", alloc.service_provider_id)
      .eq("scheduled_date", alloc.scheduled_date)
      .not("status", "eq", "cancelled_by_customer");

    if (overlapError) {
      return NextResponse.json({ error: overlapError.message }, { status: 500 });
    }

    const hasOverlap = (existing ?? []).some(
      (e) =>
        alloc.scheduled_start_time < e.scheduled_end_time &&
        alloc.scheduled_end_time > e.scheduled_start_time
    );

    if (hasOverlap) {
      return NextResponse.json(
        {
          error: `Time overlap detected for provider ${alloc.service_provider_id} on ${alloc.scheduled_date}`,
        },
        { status: 409 }
      );
    }
  }

  // Insert job_allocations
  const rows = allocations.map((alloc) => ({
    plan_request_id: planRequestId,
    plan_request_item_id: alloc.plan_request_item_id,
    service_provider_id: alloc.service_provider_id,
    customer_id: planRequest.customer_id,
    scheduled_date: alloc.scheduled_date,
    scheduled_start_time: alloc.scheduled_start_time,
    scheduled_end_time: alloc.scheduled_end_time,
    status: "scheduled",
  }));

  const { error: insertError } = await supabaseAdmin
    .from("job_allocations")
    .insert(rows);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // For active plans (addon allocations), keep the plan status unchanged.
  // Only update to "payment_pending" for initial plan submissions.
  if (planRequest.status !== "active" && planRequest.status !== "paused") {
    const { error: updateError } = await supabaseAdmin
      .from("plan_requests")
      .update({ status: "payment_pending" })
      .eq("id", planRequestId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
