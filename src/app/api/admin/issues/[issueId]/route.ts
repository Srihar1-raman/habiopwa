import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { issueId } = await params;
    const body = await req.json();
    const { status, supervisor_response } = body;

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (supervisor_response !== undefined) updates.supervisor_response = supervisor_response;

    const { data, error } = await supabaseAdmin
      .from("issue_tickets")
      .update(updates)
      .eq("id", issueId)
      .select("id, title, status, priority, supervisor_response")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ issue: data });
  } catch (err) {
    console.error("Issue update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
