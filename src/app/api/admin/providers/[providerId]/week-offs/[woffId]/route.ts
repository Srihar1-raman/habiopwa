import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string; woffId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { woffId } = await params;
    const body = await req.json();
    const { effective_to } = body;

    if (!effective_to) {
      return NextResponse.json({ error: "effective_to is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("provider_week_offs")
      .update({ effective_to })
      .eq("id", woffId)
      .select("id, day_of_week, effective_from, effective_to")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ weekOff: data });
  } catch (err) {
    console.error("Week-off update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ providerId: string; woffId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { woffId } = await params;

    const { error } = await supabaseAdmin
      .from("provider_week_offs")
      .delete()
      .eq("id", woffId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Week-off delete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
