import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCustomerFromRequest } from "@/lib/session";

export async function GET(_req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("id, phone, name, customer_profiles(*)")
    .eq("id", customer.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ customer: data });
}

export async function PUT(req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    name,
    flat_no,
    building,
    society,
    sector,
    city,
    pincode,
    home_type,
    bhk,
    bathrooms,
    balconies,
    diet_pref,
    people_count,
    cook_window_morning,
    cook_window_evening,
    kitchen_notes,
  } = body;

  if (name !== undefined) {
    const { error } = await supabaseAdmin
      .from("customers")
      .update({ name })
      .eq("id", customer.id);

    if (error) {
      return NextResponse.json({ ok: false, error: "Failed to update name" }, { status: 500 });
    }
  }

  const profileFields = {
    customer_id: customer.id,
    ...(flat_no !== undefined && { flat_no }),
    ...(building !== undefined && { building }),
    ...(society !== undefined && { society }),
    ...(sector !== undefined && { sector }),
    ...(city !== undefined && { city }),
    ...(pincode !== undefined && { pincode }),
    ...(home_type !== undefined && { home_type }),
    ...(bhk !== undefined && { bhk }),
    ...(bathrooms !== undefined && { bathrooms }),
    ...(balconies !== undefined && { balconies }),
    ...(diet_pref !== undefined && { diet_pref }),
    ...(people_count !== undefined && { people_count }),
    ...(cook_window_morning !== undefined && { cook_window_morning }),
    ...(cook_window_evening !== undefined && { cook_window_evening }),
    ...(kitchen_notes !== undefined && { kitchen_notes }),
  };

  const { error: profileError } = await supabaseAdmin
    .from("customer_profiles")
    .upsert(profileFields, { onConflict: "customer_id" });

  if (profileError) {
    return NextResponse.json({ ok: false, error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
