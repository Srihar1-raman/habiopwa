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

/** Auto-update "scheduled" jobs that are 10+ min past their start time to "scheduled_delayed" */
async function autoMarkDelayed(providerId: string, date: string) {
  const nowSecs = (() => {
    const t = new Date().toTimeString().slice(0, 8);
    const [h, m, s = "0"] = t.split(":");
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
  })();

  const { data: overdue } = await supabaseAdmin
    .from("job_allocations")
    .select("id, scheduled_start_time")
    .eq("service_provider_id", providerId)
    .eq("scheduled_date", date)
    .eq("status", "scheduled");

  const toMark = (overdue ?? []).filter((job) => {
    if (!job.scheduled_start_time) return false;
    const [h, m, s = "0"] = job.scheduled_start_time.split(":");
    const startSecs = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
    return nowSecs > startSecs + 10 * 60;
  });

  if (toMark.length > 0) {
    await supabaseAdmin
      .from("job_allocations")
      .update({ status: "scheduled_delayed", updated_at: new Date().toISOString() })
      .in("id", toMark.map((j) => j.id));
  }
}

export async function GET() {
  const provider = await getProviderFromRequest();
  if (!provider) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

  // Auto-mark overdue scheduled jobs before returning
  await autoMarkDelayed(provider.id, today);

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
