import { NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { generateRequestCode } from "@/lib/utils";

export async function POST() {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get active cart with items — fetch all catalog snapshot fields.
  // order+limit ensures we pick the most recent active cart even if
  // duplicate carts exist from a previous race condition.
  const { data: cart } = await supabaseAdmin
    .from("carts")
    .select(
      `id, preferred_start_date, cart_items(
        id, category_id, job_id, job_code, custom_title,
        frequency_label, unit_type, unit_value, minutes,
        base_rate_per_unit, instances_per_month, discount_pct,
        time_multiple, formula_type, base_price_monthly,
        unit_price_monthly, mrp_monthly, expectations_snapshot,
        service_jobs(name), service_categories(name)
      )`
    )
    .eq("customer_id", customer.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  interface CartItemRow {
    id: string;
    category_id: string;
    job_id: string | null;
    job_code: string | null;
    custom_title: string | null;
    frequency_label: string;
    unit_type: string;
    unit_value: number;
    minutes: number;
    base_rate_per_unit: number | null;
    instances_per_month: number | null;
    discount_pct: number | null;
    time_multiple: number | null;
    formula_type: string | null;
    base_price_monthly: number | null;
    unit_price_monthly: number;
    mrp_monthly: number | null;
    expectations_snapshot: unknown;
    service_jobs: { name: string } | null;
    service_categories: { name: string } | null;
  }

  interface CartRow {
    id: string;
    preferred_start_date: string | null;
    cart_items: CartItemRow[];
  }

  const cartData = cart as unknown as CartRow;
  const cartItems = cartData.cart_items;
  const planStartDate = cartData.preferred_start_date ?? null;

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
      plan_start_date: planStartDate,
    })
    .select("id, request_code, status, total_price_monthly, plan_start_date")
    .single();

  if (reqError || !planRequest) {
    return NextResponse.json(
      { error: reqError?.message || "Failed to create request" },
      { status: 500 }
    );
  }

  // Snapshot all catalog fields at time of submission
  const requestItems = cartItems.map((item) => ({
    plan_request_id: planRequest.id,
    category_id: item.category_id,
    job_id: item.job_id,
    job_code: item.job_code || null,
    title:
      item.custom_title ||
      item.service_jobs?.name ||
      "Custom Service",
    frequency_label: item.frequency_label,
    unit_type: item.unit_type || "min",
    unit_value: item.unit_value ?? item.minutes ?? 30,
    minutes: item.minutes ?? item.unit_value ?? 30,
    base_rate_per_unit: item.base_rate_per_unit ?? null,
    instances_per_month: item.instances_per_month ?? null,
    discount_pct: item.discount_pct ?? null,
    time_multiple: item.time_multiple ?? null,
    formula_type: item.formula_type || null,
    base_price_monthly: item.base_price_monthly ?? null,
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

  interface PlanRequestRow {
    id: string;
    request_code: string;
    status: string;
    total_price_monthly: number;
    plan_start_date: string | null;
  }

  const planData = planRequest as unknown as PlanRequestRow;

  return NextResponse.json({
    ok: true,
    requestCode: planData.request_code,
    requestId: planData.id,
    status: planData.status,
    total: planData.total_price_monthly,
    planStartDate: planData.plan_start_date ?? null,
  });
}
