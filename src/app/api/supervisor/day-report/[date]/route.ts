import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;

  const { data: allocations, error } = await supabaseAdmin
    .from("job_allocations")
    .select(
      "*, service_providers(name), plan_request_items(title), customers(name)"
    )
    .eq("scheduled_date", date)
    .order("scheduled_start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = allocations ?? [];

  const summary = {
    total: list.length,
    completed: list.filter((a) => a.status === "completed").length,
    completed_delayed: list.filter((a) => a.status === "completed_delayed").length,
    delayed: list.filter((a) => a.status === "delayed").length,
    cancelled: list.filter((a) => a.status === "cancelled_by_customer" || a.status === "cancelled").length,
    incomplete: list.filter((a) => a.status === "incomplete").length,
  };

  // Upsert daily_reports record for this date
  await supabaseAdmin.from("daily_reports").upsert(
    {
      report_date: date,
      total_jobs_scheduled: summary.total,
      total_jobs_completed: summary.completed,
      total_jobs_delayed: summary.delayed,
      total_jobs_cancelled: summary.cancelled,
    },
    { onConflict: "report_date" }
  );

  return NextResponse.json({ allocations: list, summary, date });
}
