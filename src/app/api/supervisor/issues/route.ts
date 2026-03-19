import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// Auth: supervisor session required (added PR1)
export async function GET() {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get customer_ids from plan_requests assigned to this supervisor
  const { data: plans } = await supabaseAdmin
    .from("plan_requests")
    .select("customer_id")
    .eq("assigned_supervisor_id", staff.id);

  if (!plans || plans.length === 0) {
    return NextResponse.json({ issues: [] });
  }

  const customerIds = [...new Set(plans.map((p) => p.customer_id))];

  const { data, error } = await supabaseAdmin
    .from("issue_tickets")
    .select(
      "*, customers(name, phone), plan_requests(request_code)"
    )
    .in("customer_id", customerIds)
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ issues: data ?? [] });
}
