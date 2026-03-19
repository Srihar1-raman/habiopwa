import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// Auth: supervisor session required (added PR1)
export async function GET(req: NextRequest) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("plan_requests")
    .select(
      "id, request_code, status, total_price_monthly, created_at, updated_at, customers(phone, name, customer_profiles(flat_no, society, sector, city))"
    )
    .eq("assigned_supervisor_id", staff.id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}
