import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getProviderFromRequest } from "@/lib/provider-session";

const LOCKED_STATUSES = new Set([
  "completed",
  "completed_delayed",
  "cancelled_by_customer",
  "service_on_pause",
  "service_incomplete",
  "status_not_marked",
]);

const ALL_STATUSES = [
  "scheduled",
  "scheduled_delayed",
  "ongoing",
  "ongoing_delayed",
  "completed",
  "completed_delayed",
  "cancelled_by_customer",
  "service_on_pause",
  "service_incomplete",
  "status_not_marked",
] as const;

/** Parse "HH:MM:SS" into total seconds since midnight */
function timeToSeconds(t: string): number {
  const [h, m, s = "0"] = t.split(":");
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
}

/** Return current wall-clock time as "HH:MM:SS" */
function nowTimeString(): string {
  return new Date().toTimeString().slice(0, 8);
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
  const now = nowTimeString();
  const nowSecs = timeToSeconds(now);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (requestedStatus === "ongoing") {
    if (currentStatus !== "scheduled" && currentStatus !== "scheduled_delayed") {
      return NextResponse.json(
        { error: `Cannot transition from "${currentStatus}" to "ongoing"` },
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

    updates.actual_start_time = now;

    const scheduledStartSecs = timeToSeconds(job.scheduled_start_time);
    const isLate = nowSecs > scheduledStartSecs + 10 * 60;

    // If already marked delayed or started late → preserve/promote to ongoing_delayed
    updates.status =
      currentStatus === "scheduled_delayed" || isLate ? "ongoing_delayed" : "ongoing";
  } else if (requestedStatus === "completed") {
    if (currentStatus !== "ongoing" && currentStatus !== "ongoing_delayed") {
      return NextResponse.json(
        { error: `Cannot transition from "${currentStatus}" to "completed"` },
        { status: 400 }
      );
    }

    updates.actual_end_time = now;

    const scheduledEndSecs = timeToSeconds(job.scheduled_end_time);
    const isLate = nowSecs > scheduledEndSecs + 10 * 60;

    updates.status = isLate ? "completed_delayed" : "completed";
    updates.is_locked = true;
  } else {
    // For other status transitions (e.g. service_on_pause, service_incomplete, etc.)
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
