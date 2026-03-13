import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: planRequest } = await supabaseAdmin
    .from("plan_requests")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!planRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (planRequest.status === "finalized" || planRequest.status === "paid") {
    return NextResponse.json(
      { error: "Already finalized or paid" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("plan_requests")
    .update({
      status: "finalized",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("plan_request_events").insert({
    plan_request_id: id,
    event_type: "finalized",
    note: "Supervisor finalized the plan",
  });

  return NextResponse.json({ ok: true });
}
