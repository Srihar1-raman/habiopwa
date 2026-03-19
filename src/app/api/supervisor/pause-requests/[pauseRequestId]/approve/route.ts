import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ pauseRequestId: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pauseRequestId } = await params;

  // Fetch the pause request to get date range and plan_request_id
  const { data: pauseRequest, error: fetchError } = await supabaseAdmin
    .from("pause_requests")
    .select("id, plan_request_id, pause_start_date, pause_end_date")
    .eq("id", pauseRequestId)
    .single();

  if (fetchError || !pauseRequest) {
    return NextResponse.json({ error: "Pause request not found" }, { status: 404 });
  }

  // Approve the pause request
  const { error: approveError } = await supabaseAdmin
    .from("pause_requests")
    .update({ supervisor_approval_status: "approved" })
    .eq("id", pauseRequestId);

  if (approveError) {
    return NextResponse.json({ error: approveError.message }, { status: 500 });
  }

  // Lock affected job_allocations
  const { error: lockError } = await supabaseAdmin
    .from("job_allocations")
    .update({ status: "service_on_pause", is_locked: true })
    .eq("plan_request_id", pauseRequest.plan_request_id)
    .gte("scheduled_date", pauseRequest.pause_start_date)
    .lte("scheduled_date", pauseRequest.pause_end_date)
    .in("status", ["scheduled", "scheduled_delayed"]);

  if (lockError) {
    return NextResponse.json({ error: lockError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
