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

  if (!flat_no) {
    return NextResponse.json(
      { error: "flat_no is required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("customer_profiles").upsert(
    {
      customer_id: customer.id,
      flat_no,
      building: building || null,
      society: society || null,
      sector: sector || null,
      city: city || null,
      pincode: pincode || null,
      home_type: home_type || null,
      bhk: bhk ? Number(bhk) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      balconies: balconies ? Number(balconies) : null,
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
