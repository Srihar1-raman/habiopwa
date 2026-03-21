import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticketId } = await params;
  const body = await req.json();
  const { comment_text } = body;

  if (!comment_text) {
    return NextResponse.json({ error: "comment_text is required" }, { status: 400 });
  }

  const { data: comment, error } = await supabaseAdmin
    .from("issue_comments")
    .insert({
      issue_ticket_id: ticketId,
      comment_text,
      commenter_id: staff.id,
      commenter_type: "supervisor",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, comment });
}
