import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ pauseRequestId: string }> }
) {
  const { pauseRequestId } = await params;

  const { error } = await supabaseAdmin
    .from("pause_requests")
    .update({ supervisor_approval_status: "rejected" })
    .eq("id", pauseRequestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
