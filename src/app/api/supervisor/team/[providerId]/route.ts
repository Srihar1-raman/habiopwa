import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest, getSupervisorProviderIds } from "@/lib/staff-session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId } = await params;

  const providerIds = await getSupervisorProviderIds(staff.id);
  if (!providerIds.includes(providerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date().toISOString().split("T")[0];

  const [providerResult, allJobsResult, leavesResult, onLeaveResult] =
    await Promise.all([
      supabaseAdmin
        .from("service_providers")
        .select("*")
        .eq("id", providerId)
        .single(),
      supabaseAdmin
        .from("job_allocations")
        .select(
          "id, scheduled_date, scheduled_start_time, scheduled_end_time, status, plan_request_items(id, title, plan_request_id), customers(name)"
        )
        .eq("service_provider_id", providerId)
        .order("scheduled_date", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("provider_leave_requests")
        .select("*")
        .eq("service_provider_id", providerId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("provider_leave_requests")
        .select("id")
        .eq("service_provider_id", providerId)
        .eq("status", "approved")
        .lte("leave_start_date", today)
        .gte("leave_end_date", today)
        .limit(1),
    ]);

  if (providerResult.error || !providerResult.data) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const allJobs = allJobsResult.data ?? [];

  const total = allJobs.length;
  const completed = allJobs.filter((j) => j.status === "completed").length;
  const scheduled = allJobs.filter(
    (j) => j.status === "scheduled" && (j.scheduled_date ?? "") >= today
  ).length;
  const on_leave = (onLeaveResult.data ?? []).length > 0;

  // Unique customers grouped by name
  const customerMap = new Map<
    string,
    { name: string; count: number; scheduled: number; plan_request_id: string | null }
  >();
  for (const job of allJobs) {
    const cust = Array.isArray(job.customers)
      ? (job.customers[0] as { name: string | null } | undefined) ?? null
      : (job.customers as { name: string | null } | null);
    if (!cust?.name) continue;
    const pri = job.plan_request_items as { id?: string; title?: string; plan_request_id?: string } | null;
    const existing = customerMap.get(cust.name) ?? {
      name: cust.name,
      count: 0,
      scheduled: 0,
      plan_request_id: pri?.plan_request_id ?? null,
    };
    existing.count++;
    if (job.status === "scheduled" && (job.scheduled_date ?? "") >= today) {
      existing.scheduled++;
    }
    customerMap.set(cust.name, existing);
  }
  const customers = Array.from(customerMap.values()).sort(
    (a, b) => b.count - a.count
  );

  const scheduledJobs = allJobs
    .filter(
      (j) => j.status === "scheduled" && (j.scheduled_date ?? "") >= today
    )
    .sort((a, b) =>
      (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? "")
    );

  return NextResponse.json({
    provider: providerResult.data,
    stats: { total, completed, scheduled, on_leave },
    recentJobs: allJobs,
    scheduledJobs,
    leaves: leavesResult.data ?? [],
    customers,
  });
}
