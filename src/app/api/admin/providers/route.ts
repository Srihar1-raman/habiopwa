import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET() {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("service_providers")
      .select("id, name, phone, specialization, is_active")
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ providers: data ?? [] });
  } catch (err) {
    console.error("Providers list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
