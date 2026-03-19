import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET() {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("locations")
      .select("id, name, city, state, pincode, is_active")
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ locations: data ?? [] });
  } catch (err) {
    console.error("Locations list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, city, state, pincode } = body;

    if (!name || !city) {
      return NextResponse.json(
        { error: "name and city are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("locations")
      .insert({ name, city, state: state || null, pincode: pincode || null, is_active: true })
      .select("id, name, city, state, pincode, is_active")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ location: data }, { status: 201 });
  } catch (err) {
    console.error("Location create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
