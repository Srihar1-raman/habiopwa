import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || staff.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await params;
    const body = await req.json();
    const { name, email, phone, role, status, location_id, reports_to } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email || null;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
    if (location_id !== undefined) updates.location_id = location_id || null;
    if (reports_to !== undefined) updates.reports_to = reports_to || null;

    const { data, error } = await supabaseAdmin
      .from("staff_accounts")
      .update(updates)
      .eq("id", staffId)
      .select("id, name, email, phone, role, status, location_id, reports_to")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ staff: data });
  } catch (err) {
    console.error("Staff update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
