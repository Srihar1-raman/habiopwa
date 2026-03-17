import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getProviderFromRequest } from "@/lib/provider-session";

const JOB_SELECT = `
  id,
  scheduled_date,
  scheduled_start_time,
  scheduled_end_time,
  actual_start_time,
  actual_end_time,
  status,
  is_locked,
  supervisor_notes,
  plan_request_items(title, frequency_label, unit_type, unit_value),
  customers(name, customer_profiles(flat_no, building, society, sector, city, pincode))
`.trim();

export async function GET() {
  const provider = await getProviderFromRequest();
  if (!provider) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: jobs, error } = await supabaseAdmin
    .from("job_allocations")
    .select(JOB_SELECT)
    .eq("service_provider_id", provider.id)
    .eq("scheduled_date", today)
    .order("scheduled_start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: jobs ?? [] });
}
