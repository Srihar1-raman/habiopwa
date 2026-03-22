import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string; leaveId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leaveId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("provider_leave_requests")
      .update({ status })
      .eq("id", leaveId)
      .select("id, leave_start_date, leave_end_date, leave_type, status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leave: data });
  } catch (err) {
    console.error("Leave update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
