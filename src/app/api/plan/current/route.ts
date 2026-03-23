import { NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get most recent plan request (not cancelled)
  const { data: planRequest, error } = await supabaseAdmin
    .from("plan_requests")
    .select(
      `id, request_code, status, total_price_monthly, plan_start_date, plan_active_start_date, plan_active_end_date, created_at, updated_at,
       plan_request_items(
         id, category_id, job_id, job_code, title,
         frequency_label, unit_type, unit_value, minutes,
         base_rate_per_unit, instances_per_month, discount_pct,
         time_multiple, formula_type, base_price_monthly,
         price_monthly, mrp_monthly, expectations_snapshot,
         preferred_start_time, preferred_provider_id, backup_provider_id,
         scheduled_day_of_week,
         service_categories(slug, name),
         primary_provider:service_providers!plan_request_items_preferred_provider_id_fkey(id, name, provider_type),
         backup_provider:service_providers!plan_request_items_backup_provider_id_fkey(id, name, provider_type)
       )`
    )
    .eq("customer_id", customer.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !planRequest) {
    return NextResponse.json({ planRequest: null });
  }

  return NextResponse.json({ planRequest });
}
