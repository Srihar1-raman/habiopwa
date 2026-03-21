import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    cars,
    plants,
    diet_pref,
    people_count,
    cook_window_morning,
    cook_window_evening,
    kitchen_notes,
  } = body;

  // Save name to customers table if provided
  if (name) {
    const { error: nameError } = await supabaseAdmin
      .from("customers")
      .update({ name })
      .eq("id", customer.id);

    if (nameError) {
      return NextResponse.json({ error: "Failed to save name" }, { status: 500 });
    }
  }

  const { error } = await supabaseAdmin.from("customer_profiles").upsert(
    {
      customer_id: customer.id,
      flat_no: flat_no || null,
      building: building || null,
      society: society || null,
      sector: sector || null,
      city: city || null,
      pincode: pincode || null,
      home_type: home_type || null,
      bhk: bhk ? Number(bhk) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      balconies: balconies ? Number(balconies) : null,
      cars: cars ? Number(cars) : 0,
      plants: plants ? Number(plants) : 0,
      diet_pref: diet_pref || null,
      people_count: people_count ? Number(people_count) : null,
      cook_window_morning: !!cook_window_morning,
      cook_window_evening: !!cook_window_evening,
      kitchen_notes: kitchen_notes || null,
    },
    { onConflict: "customer_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
