import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
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
      commented_by: "supervisor",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, comment });
}
