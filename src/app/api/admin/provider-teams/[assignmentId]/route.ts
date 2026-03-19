import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assignmentId } = await params;

    const { error } = await supabaseAdmin
      .from("provider_team_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Provider team DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
