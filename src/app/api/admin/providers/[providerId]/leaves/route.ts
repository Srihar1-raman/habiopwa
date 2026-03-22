import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId } = await params;

    const { data, error } = await supabaseAdmin
      .from("provider_leave_requests")
      .select("id, service_provider_id, leave_start_date, leave_end_date, leave_type, status, created_at")
      .eq("service_provider_id", providerId)
      .order("leave_start_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leaves: data ?? [] });
  } catch (err) {
    console.error("Leaves list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId } = await params;
    const body = await req.json();
    const { leave_start_date, leave_end_date, leave_type } = body;

    if (!leave_start_date || !leave_end_date) {
      return NextResponse.json(
        { error: "leave_start_date and leave_end_date are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("provider_leave_requests")
      .insert({
        service_provider_id: providerId,
        leave_start_date,
        leave_end_date,
        leave_type: leave_type || null,
        status: "pending",
      })
      .select("id, service_provider_id, leave_start_date, leave_end_date, leave_type, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leave: data }, { status: 201 });
  } catch (err) {
    console.error("Leave create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
