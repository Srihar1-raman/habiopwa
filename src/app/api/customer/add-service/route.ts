import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCustomerFromRequest } from "@/lib/session";

interface AddServiceItem {
  job_id: string;
  category_id: string;
  title: string;
  frequency_label: string;
  unit_type: string;
  unit_value: number;
  minutes?: number;
  price_monthly: number;
}

export async function POST(req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { plan_request_id, items } = body as {
    plan_request_id: string;
    items: AddServiceItem[];
  };

  if (!plan_request_id || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  const { data: plan, error: planError } = await supabaseAdmin
    .from("plan_requests")
    .select("id, status, customer_id")
    .eq("id", plan_request_id)
    .eq("customer_id", customer.id)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ ok: false, error: "Plan not found" }, { status: 404 });
  }

  const allowedStatuses = ["submitted", "under_process", "finalized", "paid"];
  if (!allowedStatuses.includes(plan.status)) {
    return NextResponse.json(
      { ok: false, error: "Plan is not in a state that allows adding services" },
      { status: 400 }
    );
  }

  const newItems = items.map((item) => ({
    plan_request_id,
    job_id: item.job_id,
    category_id: item.category_id,
    title: item.title,
    frequency_label: item.frequency_label,
    unit_type: item.unit_type,
    unit_value: item.unit_value,
    minutes: item.minutes !== undefined ? item.minutes : item.unit_value,
    price_monthly: item.price_monthly,
    is_addon: true,
  }));

  const { error: insertError } = await supabaseAdmin
    .from("plan_request_items")
    .insert(newItems);

  if (insertError) {
    return NextResponse.json({ ok: false, error: "Failed to add services" }, { status: 500 });
  }

  // Only degrade status for plans that aren't yet active (paid/finalized stays as-is)
  if (plan.status !== "paid" && plan.status !== "finalized") {
    const { error: updateError } = await supabaseAdmin
      .from("plan_requests")
      .update({ status: "under_process" })
      .eq("id", plan_request_id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: "Services added but failed to update plan status" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
