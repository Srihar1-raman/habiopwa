import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCustomerFromRequest } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ allocationId: string }> }
) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { allocationId } = await params;

  const { data, error } = await supabaseAdmin
    .from("job_allocations")
    .select(
      `
      *,
      service_providers(name, provider_type),
      plan_request_items(title, frequency_label, unit_type, unit_value)
    `
    )
    .eq("id", allocationId)
    .eq("customer_id", customer.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ job: data });
}
