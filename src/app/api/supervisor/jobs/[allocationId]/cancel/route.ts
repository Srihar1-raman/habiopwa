import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ allocationId: string }> }
) {
  const { allocationId } = await params;
  const body = await req.json();
  const { cancellation_reason } = body ?? {};

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
