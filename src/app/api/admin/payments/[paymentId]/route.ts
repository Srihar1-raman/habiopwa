import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";
import { expandPlanAllocations } from "@/lib/expandPlanAllocations";

// PATCH /api/admin/payments/[paymentId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId } = await params;
    const body = await req.json();
    const { status } = body ?? {};

    if (!status || !["succeeded", "failed"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'succeeded' or 'failed'" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("payments")
      .update({ status })
      .eq("id", paymentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // When admin marks payment as received, expand plan allocations into 30 days
    if (status === "succeeded") {
      const { data: payment } = await supabaseAdmin
        .from("payments")
        .select("plan_request_id")
        .eq("id", paymentId)
        .single<{ plan_request_id: string }>();

      if (payment?.plan_request_id) {
        await expandPlanAllocations(payment.plan_request_id, supabaseAdmin);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Payment PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
