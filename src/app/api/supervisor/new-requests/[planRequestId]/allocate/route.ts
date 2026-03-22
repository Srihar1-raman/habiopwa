import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";
import { calcJobPrices, type JobPricingParams } from "@/lib/pricing";

interface Allocation {
  plan_request_item_id: string;
  service_provider_id: string;
  backup_provider_id?: string | null;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  unit_value?: number; // optional — if provided, updates plan_request_items pricing
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planRequestId: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planRequestId } = await params;
  const body = await req.json();
  const allocations: Allocation[] = body.allocations;

  if (!Array.isArray(allocations) || allocations.length === 0) {
    return NextResponse.json({ error: "allocations array is required" }, { status: 400 });
  }

  // Get plan_request to retrieve customer_id and status
  const { data: planRequest, error: prError } = await supabaseAdmin
    .from("plan_requests")
    .select("id, customer_id, status")
    .eq("id", planRequestId)
    .single();

  if (prError || !planRequest) {
    return NextResponse.json({ error: "Plan request not found" }, { status: 404 });
  }

  // Validate no time overlap for each provider on the given date
  for (const alloc of allocations) {
    const { data: existing, error: overlapError } = await supabaseAdmin
      .from("job_allocations")
      .select("id, scheduled_start_time, scheduled_end_time")
      .eq("service_provider_id", alloc.service_provider_id)
      .eq("scheduled_date", alloc.scheduled_date)
      .not("status", "eq", "cancelled_by_customer");

    if (overlapError) {
      return NextResponse.json({ error: overlapError.message }, { status: 500 });
    }

    const hasOverlap = (existing ?? []).some(
      (e) =>
        alloc.scheduled_start_time < e.scheduled_end_time &&
        alloc.scheduled_end_time > e.scheduled_start_time
    );

    if (hasOverlap) {
      return NextResponse.json(
        {
          error: `Time overlap detected for provider ${alloc.service_provider_id} on ${alloc.scheduled_date}`,
        },
        { status: 409 }
      );
    }
  }

  // Update plan_request_items when unit_value or backup_provider_id is provided
  const itemsToUpdate = allocations.filter(
    (a) => a.unit_value !== undefined || a.backup_provider_id !== undefined
  );

  if (itemsToUpdate.length > 0) {
    const itemIds = itemsToUpdate.map((a) => a.plan_request_item_id);
    const { data: existingItems } = await supabaseAdmin
      .from("plan_request_items")
      .select("*")
      .in("id", itemIds);

    const itemMap = new Map(
      (existingItems ?? []).map((i) => [i.id, i])
    );

    for (const alloc of itemsToUpdate) {
      const existing = itemMap.get(alloc.plan_request_item_id);
      if (!existing) continue;

      const itemUpdates: Record<string, unknown> = {
        preferred_start_time: alloc.scheduled_start_time || existing.preferred_start_time,
      };

      // Only recompute pricing when unit_value is explicitly provided
      if (alloc.unit_value !== undefined) {
        const uv = alloc.unit_value;
        const tm = existing.time_multiple ? Number(existing.time_multiple) : null;

        const minutes =
          existing.unit_type === "min"
            ? uv
            : tm != null && tm > 0
            ? Math.round(uv * tm)
            : uv;

        itemUpdates.unit_value = uv;
        itemUpdates.minutes = minutes;

        if (
          existing.base_rate_per_unit != null &&
          existing.instances_per_month != null
        ) {
          const pricingParams: JobPricingParams = {
            formula_type: existing.formula_type ?? "standard",
            unit_type: existing.unit_type ?? "min",
            base_rate_per_unit: Number(existing.base_rate_per_unit),
            instances_per_month: Number(existing.instances_per_month),
            discount_pct: Number(existing.discount_pct ?? 0),
            time_multiple: tm,
          };
          const { base, effective } = calcJobPrices(uv, pricingParams);
          itemUpdates.base_price_monthly = base;
          itemUpdates.price_monthly = effective;
          itemUpdates.mrp_monthly = base;
        }
      }

      // Persist backup_provider_id if provided
      if (alloc.backup_provider_id !== undefined) {
        itemUpdates.backup_provider_id = alloc.backup_provider_id || null;
      }

      await supabaseAdmin
        .from("plan_request_items")
        .update(itemUpdates)
        .eq("id", alloc.plan_request_item_id);
    }

    // Recalculate plan total
    const { data: allPlanItems } = await supabaseAdmin
      .from("plan_request_items")
      .select("price_monthly")
      .eq("plan_request_id", planRequestId);

    const newTotal = (allPlanItems ?? []).reduce(
      (sum, i) => sum + Number(i.price_monthly ?? 0),
      0
    );
    await supabaseAdmin
      .from("plan_requests")
      .update({ total_price_monthly: newTotal })
      .eq("id", planRequestId);
  }

  // Insert job_allocations
  const rows = allocations.map((alloc) => ({
    plan_request_id: planRequestId,
    plan_request_item_id: alloc.plan_request_item_id,
    service_provider_id: alloc.service_provider_id,
    customer_id: planRequest.customer_id,
    scheduled_date: alloc.scheduled_date,
    scheduled_start_time: alloc.scheduled_start_time,
    scheduled_end_time: alloc.scheduled_end_time,
    status: "scheduled",
  }));

  const { error: insertError } = await supabaseAdmin
    .from("job_allocations")
    .insert(rows);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // For active plans (addon allocations), keep the plan status unchanged.
  // Only update to "payment_pending" for initial plan submissions.
  if (planRequest.status !== "active" && planRequest.status !== "paused") {
    const { error: updateError } = await supabaseAdmin
      .from("plan_requests")
      .update({ status: "payment_pending" })
      .eq("id", planRequestId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
