import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// PATCH — update or replace all items for a request
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  if (planRequest.status === "paid" || planRequest.status === "cancelled") {
    return NextResponse.json(
      { error: "Cannot modify a paid or cancelled request" },
      { status: 400 }
    );
  }

  // Delete existing items and re-insert
  await supabaseAdmin
    .from("plan_request_items")
    .delete()
    .eq("plan_request_id", id);

  const newItems = items.map((item: {
    category_id: string;
    job_id?: string | null;
    title: string;
    frequency_label?: string;
    minutes?: number;
    price_monthly: number;
    mrp_monthly?: number | null;
    expectations_snapshot?: unknown;
  }) => ({
    plan_request_id: id,
    category_id: item.category_id,
    job_id: item.job_id || null,
    title: item.title,
    frequency_label: item.frequency_label || "Daily",
    minutes: item.minutes || 30,
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
      status: "under_process",
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
