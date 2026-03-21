import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCustomerFromRequest } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { date } = await params;

  const { data, error } = await supabaseAdmin
    .from("job_allocations")
    .select(
      `
      *,
      service_providers(name, provider_type),
      plan_request_items(title, frequency_label)
    `
    )
    .eq("customer_id", customer.id)
    .eq("scheduled_date", date)
    .order("scheduled_start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: "Failed to fetch jobs" }, { status: 500 });
  }

  return NextResponse.json({ jobs: data ?? [], date });
}
