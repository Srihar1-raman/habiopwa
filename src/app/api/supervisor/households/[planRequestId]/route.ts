import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planRequestId: string }> }
) {
  const { planRequestId } = await params;

  const { data, error } = await supabaseAdmin
    .from("plan_requests")
    .select(
      `id, request_code, status, total_price_monthly, plan_start_date, created_at, updated_at,
      plan_request_items(id, title, frequency_label, unit_type, unit_value, price_monthly,
        service_categories(slug, name), service_jobs(name)),
      job_allocations(id, scheduled_date, scheduled_start_time, scheduled_end_time, status,
        service_providers(name, specialization)),
      customers(phone, name, customer_profiles(*))`
    )
    .eq("id", planRequestId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ household: data });
}
