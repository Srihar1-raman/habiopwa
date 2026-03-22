import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan_request_id } = await req.json();

  if (!plan_request_id) {
    return NextResponse.json(
      { error: "plan_request_id required" },
      { status: 400 }
    );
  }

  // Verify plan belongs to customer and is finalized
  const { data: planRequest } = await supabaseAdmin
    .from("plan_requests")
    .select("id, status, total_price_monthly, customer_id")
    .eq("id", plan_request_id)
    .single();

  if (!planRequest || planRequest.customer_id !== customer.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (planRequest.status !== "payment_pending") {
    return NextResponse.json(
      { error: "Plan must be in payment_pending state before payment" },
      { status: 400 }
    );
  }

  // Stub payment — simulate processing
  const { data: payment, error: payError } = await supabaseAdmin
    .from("payments")
    .insert({
      plan_request_id,
      amount: planRequest.total_price_monthly,
      status: "succeeded",
      provider: "stub",
      provider_ref: "STUB-" + Date.now(),
    })
    .select("id, status, amount")
    .single();

  if (payError || !payment) {
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }

  // Mark plan as active
  await supabaseAdmin
    .from("plan_requests")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", plan_request_id);

  // Log event
  await supabaseAdmin.from("plan_request_events").insert({
    plan_request_id,
    event_type: "active",
    note: "Payment successful — plan is now active (stub)",
  });

  return NextResponse.json({
    ok: true,
    paymentId: payment.id,
    status: "succeeded",
    amount: payment.amount,
  });
}
