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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const provider = await getProviderFromRequest();
  if (!provider) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  const { data: jobs, error } = await supabaseAdmin
    .from("job_allocations")
    .select(JOB_SELECT)
    .eq("service_provider_id", provider.id)
    .eq("scheduled_date", date)
    .order("scheduled_start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: jobs ?? [] });
}
