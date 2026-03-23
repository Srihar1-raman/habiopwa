import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// Auth: supervisor session required (added PR1)
export async function GET() {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Show all pending pause requests so supervisors can act on them
  // (not filtered by assigned_supervisor_id — plans may not yet be assigned)
  const { data, error } = await supabaseAdmin
    .from("pause_requests")
    .select(
      "*, customers(name, phone), plan_requests(request_code), job_allocations(id, scheduled_date, scheduled_start_time, plan_request_items(title))"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pauseRequests: data ?? [] });
}
