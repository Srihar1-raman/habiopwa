import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ allocationId: string }> }
) {
  const { allocationId } = await params;
  const body = await req.json();
  const { service_provider_id } = body;

  if (!service_provider_id) {
    return NextResponse.json({ error: "service_provider_id is required" }, { status: 400 });
  }

  // Fetch current allocation to get date and time window
  const { data: current, error: fetchError } = await supabaseAdmin
    .from("job_allocations")
    .select("id, scheduled_date, scheduled_start_time, scheduled_end_time")
    .eq("id", allocationId)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
  }

  // Validate no time overlap for new provider
  const { data: existing, error: overlapError } = await supabaseAdmin
    .from("job_allocations")
    .select("id, scheduled_start_time, scheduled_end_time")
    .eq("service_provider_id", service_provider_id)
    .eq("scheduled_date", current.scheduled_date)
    .neq("id", allocationId)
    .not("status", "eq", "cancelled_by_customer");

  if (overlapError) {
    return NextResponse.json({ error: overlapError.message }, { status: 500 });
  }

  const hasOverlap = (existing ?? []).some(
    (e) =>
      current.scheduled_start_time < e.scheduled_end_time &&
      current.scheduled_end_time > e.scheduled_start_time
  );

  if (hasOverlap) {
    return NextResponse.json(
      { error: `Time overlap detected for provider ${service_provider_id} on ${current.scheduled_date}` },
      { status: 409 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("job_allocations")
    .update({
      service_provider_id,
      status: "scheduled",
      is_locked: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", allocationId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
