import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getProviderFromRequest } from "@/lib/provider-session";

const LOCKED_STATUSES = new Set([
  "completed",
  "completed_delayed",
  "cancelled_by_customer",
  "service_on_pause",
  "incomplete",
  "status_not_marked",
]);

const ALL_STATUSES = [
  "scheduled",
  "scheduled_delayed",
  "in_progress",
  "in_progress_delayed",
  "completed",
  "completed_delayed",
  "cancelled_by_customer",
  "service_on_pause",
  "incomplete",
  "status_not_marked",
] as const;

/** Parse "HH:MM:SS" into total seconds since midnight */
function timeToSeconds(t: string): number {
  const [h, m, s = "0"] = t.split(":");
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
}

/** Return current UTC timestamp as an ISO string (timestamptz) */
function nowIso(): string {
  return new Date().toISOString();
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ allocationId: string }> }
) {
  const provider = await getProviderFromRequest();
  if (!provider) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allocationId } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const requestedStatus = body.status;
  if (!requestedStatus) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  // Fetch the current job
  const { data: job, error: fetchError } = await supabaseAdmin
    .from("job_allocations")
    .select(
      "id, service_provider_id, customer_id, scheduled_date, scheduled_start_time, scheduled_end_time, actual_start_time, actual_end_time, status, is_locked"
    )
    .eq("id", allocationId)
    .single();

  if (fetchError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.service_provider_id !== provider.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (job.is_locked) {
    return NextResponse.json({ error: "Job is locked" }, { status: 400 });
  }

  const currentStatus: string = job.status;
  const now = new Date();
  const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const updates: Record<string, unknown> = { updated_at: now.toISOString() };

  if (requestedStatus === "in_progress") {
    if (currentStatus !== "scheduled" && currentStatus !== "scheduled_delayed") {
      return NextResponse.json(
        { error: `Cannot transition from "${currentStatus}" to "in_progress"` },
        { status: 400 }
      );
    }

    // Check all earlier jobs on the same day are done/cancelled/paused
    const { data: earlierJobs, error: earlierError } = await supabaseAdmin
      .from("job_allocations")
      .select("id, scheduled_start_time, status")
      .eq("service_provider_id", provider.id)
      .eq("scheduled_date", job.scheduled_date)
      .neq("id", allocationId)
      .lt("scheduled_start_time", job.scheduled_start_time);

    if (earlierError) {
      return NextResponse.json({ error: earlierError.message }, { status: 500 });
    }

    const blockedBy = (earlierJobs ?? []).find(
      (j) => !LOCKED_STATUSES.has(j.status)
    );
    if (blockedBy) {
      return NextResponse.json(
        { error: "Complete earlier jobs first" },
        { status: 400 }
      );
    }

    updates.actual_start_time = nowIso();

    const scheduledStartSecs = timeToSeconds(job.scheduled_start_time);
    const isLate = nowSecs > scheduledStartSecs + 10 * 60;

    // If already marked delayed or started late → promote to in_progress_delayed
    updates.status =
      currentStatus === "scheduled_delayed" || isLate ? "in_progress_delayed" : "in_progress";
  } else if (requestedStatus === "completed") {
    if (currentStatus !== "in_progress" && currentStatus !== "in_progress_delayed") {
      return NextResponse.json(
        { error: `Cannot transition from "${currentStatus}" to "completed"` },
        { status: 400 }
      );
    }

    updates.actual_end_time = nowIso();

    const scheduledEndSecs = timeToSeconds(job.scheduled_end_time);
    const isLate = nowSecs > scheduledEndSecs + 10 * 60;

    updates.status = isLate ? "completed_delayed" : "completed";
    updates.is_locked = true;
  } else {
    // For other status transitions (e.g. service_on_pause, incomplete, etc.)
    // validate it's a known status value
    if (!ALL_STATUSES.includes(requestedStatus as typeof ALL_STATUSES[number])) {
      return NextResponse.json({ error: `Unknown status "${requestedStatus}"` }, { status: 400 });
    }

    updates.status = requestedStatus;

    // Lock the card for terminal statuses
    if (LOCKED_STATUSES.has(requestedStatus)) {
      updates.is_locked = true;
    }
  }

  const { data: updatedJob, error: updateError } = await supabaseAdmin
    .from("job_allocations")
    .update(updates)
    .eq("id", allocationId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, job: updatedJob });
}
