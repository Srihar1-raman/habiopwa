import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const body = await req.json();
  const { service_provider_id, allocated_date, allocated_start_time, allocated_end_time } = body;

  if (!service_provider_id || !allocated_date || !allocated_start_time || !allocated_end_time) {
    return NextResponse.json(
      { error: "service_provider_id, allocated_date, allocated_start_time, and allocated_end_time are required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("on_demand_requests")
    .update({
      service_provider_id,
      allocated_date,
      allocated_start_time,
      allocated_end_time,
      status: "allocated",
    })
    .eq("id", requestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
