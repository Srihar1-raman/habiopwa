import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// POST /api/admin/plan-requests/[planRequestId]/finalize
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ planRequestId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planRequestId } = await params;

    const { data: planRequest, error: fetchError } = await supabaseAdmin
      .from("plan_requests")
      .select("id, status, total_price_monthly")
      .eq("id", planRequestId)
      .single();

    if (fetchError || !planRequest) {
      return NextResponse.json({ error: "Plan request not found" }, { status: 404 });
    }

    if (planRequest.status !== "captain_review_pending") {
      return NextResponse.json(
        { error: `Cannot finalize a plan with status '${planRequest.status}'. Expected 'captain_review_pending'.` },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("plan_requests")
      .update({ status: "payment_pending" })
      .eq("id", planRequestId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        plan_request_id: planRequestId,
        amount: planRequest.total_price_monthly ?? 0,
        status: "pending",
      });

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    await supabaseAdmin.from("plan_request_events").insert({
      plan_request_id: planRequestId,
      event_type: "status_changed",
      note: `Plan finalized and moved to payment_pending by admin (${staff.name})`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Plan request finalize error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
