import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCustomerFromRequest } from "@/lib/session";

export async function GET(_req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: requests, error } = await supabaseAdmin
    .from("on_demand_requests")
    .select("id, status, request_date, request_time_preference, customer_notes, created_at, service_jobs(name)")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, requests: requests ?? [] });
}

export async function POST(req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    plan_request_id,
    job_id,
    request_date,
    request_time_preference,
    customer_notes,
  } = body as {
    plan_request_id?: string;
    job_id: string;
    request_date: string;
    request_time_preference?: string;
    customer_notes?: string;
  };

  if (!job_id || !request_date) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  // If plan_request_id provided, validate it belongs to the customer and is active
  if (plan_request_id) {
    const { data: plan, error: planError } = await supabaseAdmin
      .from("plan_requests")
      .select("id, status, customer_id")
      .eq("id", plan_request_id)
      .eq("customer_id", customer.id)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ ok: false, error: "Plan not found" }, { status: 404 });
    }

    if (plan.status !== "active") {
      return NextResponse.json(
        { ok: false, error: "Plan must be active to request on-demand services" },
        { status: 400 }
      );
    }
  }

  // Check if this is a tech service by looking up the job's category slug and service_type
  const { data: job, error: jobError } = await supabaseAdmin
    .from("service_jobs")
    .select("id, service_type, service_categories(slug)")
    .eq("id", job_id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }

  const categorySlug = (job.service_categories as unknown as { slug: string } | null)?.slug;
  const isTechService = categorySlug === "technician-services";

  if (isTechService && job.service_type && plan_request_id) {
    const monthYear = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const { data: allowance, error: allowanceError } = await supabaseAdmin
      .from("tech_services_allowance")
      .select("used_count, allowed_count")
      .eq("plan_request_id", plan_request_id)
      .eq("service_type", job.service_type)
      .eq("month_year", monthYear)
      .maybeSingle();

    if (!allowanceError && allowance && allowance.used_count >= allowance.allowed_count) {
      return NextResponse.json(
        { ok: false, error: "Monthly allowance exhausted" },
        { status: 400 }
      );
    }
  }

  const { data: request, error: insertError } = await supabaseAdmin
    .from("on_demand_requests")
    .insert({
      customer_id: customer.id,
      plan_request_id,
      job_id,
      request_date,
      ...(request_time_preference !== undefined && { request_time_preference }),
      ...(customer_notes !== undefined && { customer_notes }),
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: "Failed to submit request" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, request });
}
