import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCustomerFromRequest } from "@/lib/session";

export async function GET(_req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: plan, error: planError } = await supabaseAdmin
    .from("plan_requests")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (planError || !plan) {
    return NextResponse.json({
      available: false,
      message: "Complete payment to unlock on-demand services",
    });
  }

  const [{ data: jobs, error: jobsError }, { data: techAllowance, error: allowanceError }] =
    await Promise.all([
      supabaseAdmin
        .from("service_jobs")
        .select("id, name, slug, code, unit_type, frequency_label, category_id")
        .eq("is_on_demand", true)
        .eq("active", true),
      supabaseAdmin
        .from("tech_services_allowance")
        .select("*")
        .eq("plan_request_id", plan.id),
    ]);

  if (jobsError) {
    return NextResponse.json({ ok: false, error: "Failed to fetch on-demand jobs" }, { status: 500 });
  }

  return NextResponse.json({
    available: true,
    jobs: jobs ?? [],
    techAllowance: allowanceError ? [] : (techAllowance ?? []),
  });
}
