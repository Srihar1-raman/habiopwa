import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

interface PlanItemInput {
  category_id: string;
  job_id?: string | null;
  job_code?: string | null;
  title: string;
  frequency_label?: string;
  unit_type?: string;
  unit_value?: number;
  minutes?: number;
  base_rate_per_unit?: number | null;
  instances_per_month?: number | null;
  discount_pct?: number | null;
  time_multiple?: number | null;
  formula_type?: string | null;
  base_price_monthly?: number | null;
  price_monthly: number;
  mrp_monthly?: number | null;
  expectations_snapshot?: unknown;
}

// PATCH — update or replace all items for a request
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { items } = await req.json();

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  // Verify request exists
  const { data: planRequest } = await supabaseAdmin
    .from("plan_requests")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!planRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (planRequest.status === "active" || planRequest.status === "cancelled" || planRequest.status === "closed") {
    return NextResponse.json(
      { error: "Cannot modify an active, cancelled, or closed request" },
      { status: 400 }
    );
  }

  // Delete existing items and re-insert
  await supabaseAdmin
    .from("plan_request_items")
    .delete()
    .eq("plan_request_id", id);

  const newItems = (items as PlanItemInput[]).map((item) => ({
    plan_request_id: id,
    category_id: item.category_id,
    job_id: item.job_id || null,
    job_code: item.job_code || null,
    title: item.title,
    frequency_label: item.frequency_label || "Daily",
    unit_type: item.unit_type || "min",
    unit_value: item.unit_value ?? item.minutes ?? 30,
    minutes: item.minutes ?? item.unit_value ?? 30,
    base_rate_per_unit: item.base_rate_per_unit ?? null,
    instances_per_month: item.instances_per_month ?? null,
    discount_pct: item.discount_pct ?? null,
    time_multiple: item.time_multiple ?? null,
    formula_type: item.formula_type || null,
    base_price_monthly: item.base_price_monthly ?? null,
    price_monthly: item.price_monthly,
    mrp_monthly: item.mrp_monthly || null,
    expectations_snapshot: item.expectations_snapshot || null,
  }));

  const { error: insertError } = await supabaseAdmin
    .from("plan_request_items")
    .insert(newItems);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Recalculate total
  const total = newItems.reduce((sum, item) => sum + Number(item.price_monthly), 0);

  await supabaseAdmin
    .from("plan_requests")
    .update({
      total_price_monthly: total,
      status: "captain_review_pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Log event
  await supabaseAdmin.from("plan_request_events").insert({
    plan_request_id: id,
    event_type: "items_updated",
    note: "Supervisor updated plan items",
  });

  return NextResponse.json({ ok: true, total });
}
