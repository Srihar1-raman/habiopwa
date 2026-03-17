import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("plan_requests")
    .select(
      "id, request_code, status, total_price_monthly, created_at, updated_at, customers(phone, name, customer_profiles(flat_no, society, sector, city))"
    )
    .in("status", ["submitted", "under_process"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}
