import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest, getSupervisorProviderIds } from "@/lib/staff-session";

// Auth: supervisor session required (added PR1)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerIds = await getSupervisorProviderIds(staff.id);
  const { date } = await params;

  if (providerIds.length === 0) {
    const emptySummary = { total: 0, completed: 0, completed_delayed: 0, delayed: 0, cancelled: 0, incomplete: 0 };
    return NextResponse.json({ allocations: [], summary: emptySummary, date });
  }

  const { data: allocations, error } = await supabaseAdmin
    .from("job_allocations")
    .select(
      "*, service_providers(name), plan_request_items(title), customers(name)"
    )
    .eq("scheduled_date", date)
    .in("service_provider_id", providerIds)
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
