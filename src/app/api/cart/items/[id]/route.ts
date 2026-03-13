import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const {
    unit_type,
    unit_value,
    minutes,
    base_price_monthly,
    unit_price_monthly,
    mrp_monthly,
  } = body;

  // Verify item belongs to customer
  const { data: item } = await supabaseAdmin
    .from("cart_items")
    .select("id, carts(customer_id)")
    .eq("id", id)
    .single();

  const cart = item?.carts as unknown as { customer_id: string } | null;
  if (!item || cart?.customer_id !== customer.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("cart_items")
    .update({
      ...(unit_type !== undefined && { unit_type }),
      ...(unit_value !== undefined && {
        unit_value,
        // Only sync minutes with unit_value when unit_type is 'min' (or not specified, defaulting to min).
        // For count-based units (count_washrooms, count_cars, etc.) minutes stays at catalog default.
        ...((unit_type === "min" || unit_type === undefined) && { minutes: unit_value }),
      }),
      ...(minutes !== undefined && { minutes }),
      ...(base_price_monthly !== undefined && { base_price_monthly }),
      ...(unit_price_monthly !== undefined && { unit_price_monthly }),
      ...(mrp_monthly !== undefined && { mrp_monthly }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify item belongs to customer
  const { data: item } = await supabaseAdmin
    .from("cart_items")
    .select("id, carts(customer_id)")
    .eq("id", id)
    .single();

  const cart = item?.carts as unknown as { customer_id: string } | null;
  if (!item || cart?.customer_id !== customer.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("cart_items")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
