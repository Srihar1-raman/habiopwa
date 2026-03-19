import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { locationId } = await params;
    const body = await req.json();
    const { name, city, state, pincode, is_active } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (pincode !== undefined) updates.pincode = pincode;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from("locations")
      .update(updates)
      .eq("id", locationId)
      .select("id, name, city, state, pincode, is_active")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ location: data });
  } catch (err) {
    console.error("Location update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
