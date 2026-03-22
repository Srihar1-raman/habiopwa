import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// Auth: supervisor session required (added PR1)
export async function GET() {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("plan_requests")
    .select(
      "id, request_code, status, total_price_monthly, plan_start_date, created_at, updated_at, customers(phone, name, customer_profiles(flat_no, society, sector, city))"
    )
    .eq("status", "active")
    .eq("assigned_supervisor_id", staff.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten the nested Supabase structure into what the UI expects
  const households = (data ?? []).map((row) => {
    type CustomerRow = { phone: string; name: string | null; customer_profiles: { flat_no: string | null; society: string | null; sector: string | null; city: string | null } | null };
    const customer = row.customers as unknown as CustomerRow | null;
    const profile = customer?.customer_profiles ?? null;
    return {
      plan_request_id: row.id,
      request_code: row.request_code,
      status: row.status,
      total_price_monthly: row.total_price_monthly,
      plan_start_date: row.plan_start_date ?? null,
      customer_name: customer?.name ?? null,
      customer_phone: customer?.phone ?? "",
      flat_no: profile?.flat_no ?? null,
      society: profile?.society ?? null,
      sector: profile?.sector ?? null,
      city: profile?.city ?? null,
    };
  });

  return NextResponse.json({ households });
}
