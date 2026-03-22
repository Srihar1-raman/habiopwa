import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCustomerFromRequest } from "@/lib/session";

export async function POST(req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    plan_request_id,
    pause_type,
    pause_start_date,
    pause_end_date,
    job_allocation_id,
    notes,
  } = body as {
    plan_request_id: string;
    pause_type: string;
    pause_start_date: string;
    pause_end_date?: string;
    job_allocation_id?: string;
    notes?: string;
  };

  if (!plan_request_id || !pause_type || !pause_start_date) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  const { data: plan, error: planError } = await supabaseAdmin
    .from("plan_requests")
    .select("id, customer_id")
    .eq("id", plan_request_id)
    .eq("customer_id", customer.id)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ ok: false, error: "Plan not found" }, { status: 404 });
  }

  const { data: pauseRequest, error: insertError } = await supabaseAdmin
    .from("pause_requests")
    .insert({
      customer_id: customer.id,
      plan_request_id,
      pause_type,
      pause_start_date,
      ...(pause_end_date !== undefined && { pause_end_date }),
      ...(job_allocation_id !== undefined && { job_allocation_id }),
      ...(notes !== undefined && { reason: notes }),
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: "Failed to submit pause request" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, pauseRequest });
}

export async function GET(_req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("pause_requests")
    .select("*")
    .eq("customer_id", customer.id)
    .neq("status", "completed")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to fetch pause requests" },
      { status: 500 }
    );
  }

  return NextResponse.json({ pauseRequests: data ?? [] });
}
