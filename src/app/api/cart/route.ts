import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

async function getOrCreateActiveCart(customerId: string) {
  // Try to find existing active cart
  const { data: existing } = await supabaseAdmin
    .from("carts")
    .select("id")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .single();

  if (existing) return existing.id as string;

  // Create new cart
  const { data: newCart, error } = await supabaseAdmin
    .from("carts")
    .insert({ customer_id: customerId, status: "active" })
    .select("id")
    .single();

  if (error || !newCart) throw new Error("Failed to create cart");
  return newCart.id as string;
}

export async function GET() {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cartId = await getOrCreateActiveCart(customer.id);

  const { data: items, error } = await supabaseAdmin
    .from("cart_items")
    .select(
      `id, category_id, job_id, job_code, custom_title,
       frequency_label, unit_type, unit_value, minutes,
       base_rate_per_unit, instances_per_month, discount_pct,
       time_multiple, formula_type, base_price_monthly,
       unit_price_monthly, mrp_monthly,
       expectations_snapshot, sort_order,
       service_categories(slug, name),
       service_jobs(slug, name, code, is_on_demand)`
    )
    .eq("cart_id", cartId)
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = (items ?? []).reduce(
    (sum, item) => sum + Number(item.unit_price_monthly),
    0
  );

  return NextResponse.json({ cartId, items: items ?? [], total });
}

export async function POST(req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    category_id,
    job_id,
    job_code,
    custom_title,
    frequency_label,
    unit_type,
    unit_value,
    minutes,
    base_rate_per_unit,
    instances_per_month,
    discount_pct,
    time_multiple,
    formula_type,
    base_price_monthly,
    unit_price_monthly,
    mrp_monthly,
    expectations_snapshot,
  } = body;

  if (!category_id || !unit_price_monthly) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const cartId = await getOrCreateActiveCart(customer.id);

  // Check if job already in cart
  if (job_id) {
    const { data: existing } = await supabaseAdmin
      .from("cart_items")
      .select("id")
      .eq("cart_id", cartId)
      .eq("job_id", job_id)
      .single();

    if (existing) {
      // Update existing item with new unit/pricing values
      const { data: updated, error } = await supabaseAdmin
        .from("cart_items")
        .update({
          unit_type: unit_type ?? "min",
          unit_value: unit_value ?? minutes ?? 30,
          minutes: minutes ?? unit_value ?? 30,
          base_rate_per_unit,
          instances_per_month,
          discount_pct,
          time_multiple: time_multiple ?? null,
          formula_type,
          base_price_monthly,
          unit_price_monthly,
          mrp_monthly: mrp_monthly ?? null,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ item: updated });
    }
  }

  // Get sort_order from existing items count
  const { count } = await supabaseAdmin
    .from("cart_items")
    .select("*", { count: "exact", head: true })
    .eq("cart_id", cartId);

  const { data: item, error } = await supabaseAdmin
    .from("cart_items")
    .insert({
      cart_id: cartId,
      category_id,
      job_id: job_id || null,
      job_code: job_code || null,
      custom_title: custom_title || null,
      frequency_label: frequency_label || "Daily",
      unit_type: unit_type || "min",
      unit_value: unit_value ?? minutes ?? 30,
      minutes: minutes ?? unit_value ?? 30,
      base_rate_per_unit: base_rate_per_unit ?? null,
      instances_per_month: instances_per_month ?? null,
      discount_pct: discount_pct ?? null,
      time_multiple: time_multiple ?? null,
      formula_type: formula_type || null,
      base_price_monthly: base_price_monthly ?? null,
      unit_price_monthly,
      mrp_monthly: mrp_monthly || null,
      expectations_snapshot: expectations_snapshot || null,
      sort_order: count ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item });
}
