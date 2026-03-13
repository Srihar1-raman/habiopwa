import { NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { generateRequestCode } from "@/lib/utils";

export async function POST() {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get active cart with items
  const { data: cart } = await supabaseAdmin
    .from("carts")
    .select(
      "id, cart_items(id, category_id, job_id, custom_title, frequency_label, minutes, unit_price_monthly, mrp_monthly, expectations_snapshot, service_jobs(name), service_categories(name))"
    )
    .eq("customer_id", customer.id)
    .eq("status", "active")
    .single();

  if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const cartItems = (cart.cart_items as unknown) as Array<{
    id: string;
    category_id: string;
    job_id: string | null;
    custom_title: string | null;
    frequency_label: string;
    minutes: number;
    unit_price_monthly: number;
    mrp_monthly: number | null;
    expectations_snapshot: unknown;
    service_jobs: { name: string } | null;
    service_categories: { name: string } | null;
  }>;

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + Number(item.unit_price_monthly),
    0
  );

  // Generate unique request code
  const requestCode = generateRequestCode();

  // Create plan request
  const { data: planRequest, error: reqError } = await supabaseAdmin
    .from("plan_requests")
    .insert({
      request_code: requestCode,
      customer_id: customer.id,
      status: "submitted",
      total_price_monthly: totalPrice,
    })
    .select("id, request_code, status, total_price_monthly")
    .single();

  if (reqError || !planRequest) {
    return NextResponse.json(
      { error: reqError?.message || "Failed to create request" },
      { status: 500 }
    );
  }

  // Copy cart items to plan request items
  const requestItems = cartItems.map((item) => ({
    plan_request_id: planRequest.id,
    category_id: item.category_id,
    job_id: item.job_id,
    title:
      item.custom_title ||
      item.service_jobs?.name ||
      "Custom Service",
    frequency_label: item.frequency_label,
    minutes: item.minutes,
    price_monthly: item.unit_price_monthly,
    mrp_monthly: item.mrp_monthly,
    expectations_snapshot: item.expectations_snapshot,
  }));

  const { error: itemsError } = await supabaseAdmin
    .from("plan_request_items")
    .insert(requestItems);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Mark cart as submitted
  await supabaseAdmin
    .from("carts")
    .update({ status: "submitted" })
    .eq("id", cart.id);

  // Log event
  await supabaseAdmin.from("plan_request_events").insert({
    plan_request_id: planRequest.id,
    event_type: "submitted",
    note: "Customer submitted plan request",
  });

  return NextResponse.json({
    ok: true,
    requestCode: planRequest.request_code,
    requestId: planRequest.id,
    status: planRequest.status,
    total: planRequest.total_price_monthly,
  });
}
