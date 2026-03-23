import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";
import { calcJobPrices, type JobPricingParams } from "@/lib/pricing";

// PATCH /api/admin/plan-requests/[planRequestId]/items/[itemId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planRequestId: string; itemId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planRequestId, itemId } = await params;
    const body = await req.json();
    const {
      title,
      unit_value,
      preferred_start_time,
      preferred_provider_id,
      backup_provider_id,
      scheduled_day_of_week,
    } = body ?? {};

    if (
      title === undefined &&
      unit_value === undefined &&
      preferred_start_time === undefined &&
      preferred_provider_id === undefined &&
      backup_provider_id === undefined &&
      scheduled_day_of_week === undefined
    ) {
      return NextResponse.json(
        { error: "At least one field is required" },
        { status: 400 }
      );
    }

    // Fetch existing item to recompute pricing
    const { data: existingItem, error: fetchErr } = await supabaseAdmin
      .from("plan_request_items")
      .select("*")
      .eq("id", itemId)
      .eq("plan_request_id", planRequestId)
      .single();

    if (fetchErr || !existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (preferred_start_time !== undefined)
      updates.preferred_start_time = preferred_start_time || null;
    if (preferred_provider_id !== undefined)
      updates.preferred_provider_id = preferred_provider_id || null;
    if (backup_provider_id !== undefined)
      updates.backup_provider_id = backup_provider_id || null;
    if (scheduled_day_of_week !== undefined)
      updates.scheduled_day_of_week = scheduled_day_of_week !== null ? Number(scheduled_day_of_week) : null;

    // When unit_value changes, recompute pricing from stored formula params
    if (unit_value !== undefined) {
      updates.unit_value = unit_value;

      // Compute new minutes
      const tm = existingItem.time_multiple
        ? Number(existingItem.time_multiple)
        : null;
      const minutes =
        existingItem.unit_type === "min"
          ? unit_value
          : tm != null && tm > 0
          ? Math.round(unit_value * tm)
          : unit_value;
      updates.minutes = minutes;

      // Recompute pricing if formula params are stored
      if (
        existingItem.base_rate_per_unit != null &&
        existingItem.instances_per_month != null
      ) {
        const pricingParams: JobPricingParams = {
          formula_type: existingItem.formula_type ?? "standard",
          unit_type: existingItem.unit_type ?? "min",
          base_rate_per_unit: Number(existingItem.base_rate_per_unit),
          instances_per_month: Number(existingItem.instances_per_month),
          discount_pct: Number(existingItem.discount_pct ?? 0),
          time_multiple: tm,
        };
        const { base, effective } = calcJobPrices(unit_value, pricingParams);
        updates.base_price_monthly = base;
        updates.price_monthly = effective;
        updates.mrp_monthly = base;
      }
    }

    const { data: item, error: updateError } = await supabaseAdmin
      .from("plan_request_items")
      .update(updates)
      .eq("id", itemId)
      .eq("plan_request_id", planRequestId)
      .select("*")
      .single();

    if (updateError || !item) {
      return NextResponse.json(
        { error: updateError?.message ?? "Item not found" },
        { status: 404 }
      );
    }

    // Recalculate and update plan total_price_monthly
    const { data: allItems } = await supabaseAdmin
      .from("plan_request_items")
      .select("price_monthly")
      .eq("plan_request_id", planRequestId);

    const newTotal = (allItems ?? []).reduce(
      (sum, i) => sum + Number(i.price_monthly ?? 0),
      0
    );
    await supabaseAdmin
      .from("plan_requests")
      .update({ total_price_monthly: newTotal })
      .eq("id", planRequestId);

    return NextResponse.json({ item });
  } catch (err) {
    console.error("Plan request item PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/plan-requests/[planRequestId]/items/[itemId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planRequestId: string; itemId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planRequestId, itemId } = await params;

    const { error: deleteError } = await supabaseAdmin
      .from("plan_request_items")
      .delete()
      .eq("id", itemId)
      .eq("plan_request_id", planRequestId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Plan request item DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
