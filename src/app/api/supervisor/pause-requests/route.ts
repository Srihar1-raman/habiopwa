import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// Auth: supervisor session required (added PR1)
export async function GET() {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get plan_request_ids assigned to this supervisor
  const { data: plans } = await supabaseAdmin
    .from("plan_requests")
    .select("id")
    .eq("assigned_supervisor_id", staff.id);

  if (!plans || plans.length === 0) {
    return NextResponse.json({ pauseRequests: [] });
  }

  const planIds = plans.map((p) => p.id);

  const { data, error } = await supabaseAdmin
    .from("pause_requests")
    .select(
      "*, customers(name, phone), plan_requests(request_code), job_allocations(id, scheduled_date, scheduled_start_time, plan_request_items(title))"
    )
    .in("plan_request_id", planIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pauseRequests: data ?? [] });
}
