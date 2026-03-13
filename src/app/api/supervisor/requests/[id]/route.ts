import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("plan_requests")
    .select(
      `id, request_code, status, total_price_monthly, created_at, updated_at,
       customers(id, phone, name, customer_profiles(*)),
       plan_request_items(
         id, category_id, job_id, job_code, title,
         frequency_label, unit_type, unit_value, minutes,
         base_rate_per_unit, instances_per_month, discount_pct,
         time_multiple, formula_type, base_price_monthly,
         price_monthly, mrp_monthly, expectations_snapshot,
         service_categories(slug, name),
         service_jobs(slug, name, code)
       ),
       plan_request_events(id, event_type, note, created_at)`
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ request: data });
}
