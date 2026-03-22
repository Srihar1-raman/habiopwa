import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: planRequest } = await supabaseAdmin
    .from("plan_requests")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!planRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (planRequest.status === "payment_pending" || planRequest.status === "active") {
    return NextResponse.json(
      { error: "Already finalized or active" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("plan_requests")
    .update({
      status: "payment_pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("plan_request_events").insert({
    plan_request_id: id,
    event_type: "payment_pending",
    note: "Supervisor finalised the plan — awaiting payment",
  });

  return NextResponse.json({ ok: true });
}
