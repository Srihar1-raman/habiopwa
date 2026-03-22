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
      .from("provider_week_offs")
      .select("id, service_provider_id, day_of_week, effective_from, effective_to, created_at")
      .eq("service_provider_id", providerId)
      .order("effective_from", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ weekOffs: data ?? [] });
  } catch (err) {
    console.error("Week-offs list error:", err);
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
    const { day_of_week, effective_from, effective_to } = body;

    if (!day_of_week || !effective_from) {
      return NextResponse.json(
        { error: "day_of_week and effective_from are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("provider_week_offs")
      .insert({
        service_provider_id: providerId,
        day_of_week,
        effective_from,
        effective_to: effective_to || null,
      })
      .select("id, service_provider_id, day_of_week, effective_from, effective_to, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ weekOff: data }, { status: 201 });
  } catch (err) {
    console.error("Week-off create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
