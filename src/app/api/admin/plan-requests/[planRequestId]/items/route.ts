import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";
import { calcJobPrices, type JobPricingParams } from "@/lib/pricing";

// POST /api/admin/plan-requests/[planRequestId]/items
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planRequestId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planRequestId } = await params;
    const body = await req.json();
    const {
      category_id,
      job_id,
      title,
      unit_value,
      frequency_label,
      unit_type,
      formula_type,
      job_code,
      // Pricing params from the job catalog
      base_rate_per_unit,
      instances_per_month,
      discount_pct,
      time_multiple,
    } = body ?? {};

    if (!category_id || !title) {
      return NextResponse.json({ error: "category_id and title are required" }, { status: 400 });
    }

    // Verify plan request exists
    const { data: planRequest } = await supabaseAdmin
      .from("plan_requests")
      .select("id, status")
      .eq("id", planRequestId)
      .single();

    if (!planRequest) {
      return NextResponse.json({ error: "Plan request not found" }, { status: 404 });
    }

    // Compute pricing using the formula
    const inputValue = unit_value ?? 30;
    let computedBase = 0;
    let computedEffective = 0;

    if (base_rate_per_unit != null && instances_per_month != null) {
      const pricingParams: JobPricingParams = {
        formula_type: formula_type ?? "standard",
        unit_type: unit_type ?? "min",
        base_rate_per_unit: Number(base_rate_per_unit),
        instances_per_month: Number(instances_per_month),
        discount_pct: Number(discount_pct ?? 0),
        time_multiple: time_multiple != null ? Number(time_multiple) : null,
      };
      const { base, effective } = calcJobPrices(inputValue, pricingParams);
      computedBase = base;
      computedEffective = effective;
    }

    // Compute minutes
    const unitTypeFinal = unit_type ?? "min";
    const minutes =
      unitTypeFinal === "min"
        ? inputValue
        : time_multiple != null && Number(time_multiple) > 0
        ? Math.round(inputValue * Number(time_multiple))
        : inputValue;

    const { data: item, error: insertError } = await supabaseAdmin
      .from("plan_request_items")
      .insert({
        plan_request_id: planRequestId,
        category_id,
        job_id: job_id ?? null,
        job_code: job_code ?? null,
        title,
        unit_value: inputValue,
        minutes,
        price_monthly: computedEffective,
        base_price_monthly: computedBase,
        mrp_monthly: computedBase,
        frequency_label: frequency_label ?? "Daily",
        unit_type: unitTypeFinal,
        formula_type: formula_type ?? "standard",
        base_rate_per_unit: base_rate_per_unit ?? null,
        instances_per_month: instances_per_month ?? null,
        discount_pct: discount_pct ?? null,
        time_multiple: time_multiple ?? null,
      })
      .select("*")
      .single();

    if (insertError || !item) {
      return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
    }

    // Recalculate plan total
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

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error("Plan request items POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
