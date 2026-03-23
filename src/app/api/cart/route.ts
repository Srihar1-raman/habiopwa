import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { preferred_start_date } = body;

  // Find active cart — use order+limit so we safely pick the most recent
  // cart even if duplicates were created by a previous race condition.
  // Create one if none exists so the preferred start date can be saved
  // even before the first item is added to the cart.
  let { data: cart } = await supabaseAdmin
    .from("carts")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cart) {
    const { data: newCart, error: createError } = await supabaseAdmin
      .from("carts")
      .insert({ customer_id: customer.id, status: "active" })
      .select("id")
      .single();

    if (createError || !newCart) {
      return NextResponse.json({ error: "Failed to create cart" }, { status: 500 });
    }
    cart = newCart;
  }

  const { error } = await supabaseAdmin
    .from("carts")
    .update({ preferred_start_date: preferred_start_date ?? null })
    .eq("id", cart.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the active cart together with its items in a single query to avoid
  // the extra round-trip that a separate `getOrCreateActiveCart` call incurs.
  // order+limit ensures we always use the most recent active cart even if
  // duplicate carts were created by a previous race condition.
  const { data: cart, error: cartError } = await supabaseAdmin
    .from("carts")
    .select(
      `id, preferred_start_date,
       cart_items(
         id, category_id, job_id, job_code, custom_title,
         frequency_label, unit_type, unit_value, minutes,
         base_rate_per_unit, instances_per_month, discount_pct,
         time_multiple, formula_type, base_price_monthly,
         unit_price_monthly, mrp_monthly,
         expectations_snapshot, sort_order,
         service_categories(slug, name),
         service_jobs(slug, name, code, is_on_demand)
       )`
    )
    .eq("customer_id", customer.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cartError) {
    return NextResponse.json({ error: cartError.message }, { status: 500 });
  }

  // No active cart yet — return empty. Do NOT auto-create a cart here;
  // the POST handler creates the cart lazily when the first item is added.
  // Creating a cart in a GET is a side-effect that causes duplicate carts
  // when the React client runs effects twice in Strict Mode.
  if (!cart) {
    return NextResponse.json({ cartId: null, items: [], total: 0, preferred_start_date: null });
  }

  // Sort items by sort_order in JavaScript (the nested select format does not
  // support an inline ORDER BY for embedded relations)
  const items = [...(cart.cart_items ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const total = items.reduce(
    (sum, item) => sum + Number(item.unit_price_monthly),
    0
  );

  return NextResponse.json({ cartId: cart.id, items, total, preferred_start_date: (cart as { preferred_start_date?: string | null }).preferred_start_date ?? null });
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

  if (!category_id || unit_price_monthly == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Find or create the customer's active cart.
  // order+limit ensures we always use the most recent cart if duplicates exist.
  let cartId: string;
  const { data: existingCart } = await supabaseAdmin
    .from("carts")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingCart) {
    cartId = existingCart.id as string;
  } else {
    const { data: newCart, error: createError } = await supabaseAdmin
      .from("carts")
      .insert({ customer_id: customer.id, status: "active" })
      .select("id")
      .single();

    if (createError || !newCart) {
      return NextResponse.json({ error: "Failed to create cart" }, { status: 500 });
    }
    cartId = newCart.id as string;
  }

  // Check if job already in cart
  if (job_id) {
    const { data: existing } = await supabaseAdmin
      .from("cart_items")
      .select("id")
      .eq("cart_id", cartId)
      .eq("job_id", job_id)
      .maybeSingle();

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
