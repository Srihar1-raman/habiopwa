import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId } = await params;
  const body = await req.json();
  // Accept both naming conventions for dates
  const leave_start_date = body.start_date ?? body.leave_start_date;
  const leave_end_date = body.end_date ?? body.leave_end_date;
  const { leave_type, status } = body;

  if (!leave_start_date || !leave_end_date || !leave_type) {
    return NextResponse.json(
      { error: "start_date (or leave_start_date), end_date (or leave_end_date), and leave_type are required" },
      { status: 400 }
    );
  }

  const { data: leave, error } = await supabaseAdmin
    .from("provider_leave_requests")
    .insert({
      service_provider_id: providerId,
      leave_start_date,
      leave_end_date,
      leave_type,
      ...(status ? { status } : {}),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, leave });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;

  const { data, error } = await supabaseAdmin
    .from("provider_leave_requests")
    .select("*")
    .eq("service_provider_id", providerId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leaves: data ?? [] });
}
