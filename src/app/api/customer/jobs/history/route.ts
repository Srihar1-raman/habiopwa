import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCustomerFromRequest } from "@/lib/session";

/**
 * GET /api/customer/jobs/history
 * Returns the last 50 completed/missed job allocations for the customer.
 */
export async function GET() {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("job_allocations")
    .select(
      "id, scheduled_date, scheduled_start_time, status, plan_request_items(title), service_providers(name)"
    )
    .eq("customer_id", customer.id)
    .in("status", ["completed", "missed", "cancelled"])
    .order("scheduled_date", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: "Failed to fetch job history" }, { status: 500 });
  }

  return NextResponse.json({ jobs: data ?? [] });
}
