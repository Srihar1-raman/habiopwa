import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCustomerFromRequest } from "@/lib/session";

/**
 * GET /api/customer/providers/[providerId]
 * Returns details about a specific provider and their job history with this customer.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { providerId } = await params;

  const [providerResult, jobsResult] = await Promise.all([
    supabaseAdmin
      .from("service_providers")
      .select("id, name, provider_type, status, phone")
      .eq("id", providerId)
      .single(),
    supabaseAdmin
      .from("job_allocations")
      .select(
        "id, scheduled_date, scheduled_start_time, scheduled_end_time, status, plan_request_items(title, frequency_label)"
      )
      .eq("service_provider_id", providerId)
      .eq("customer_id", customer.id)
      .order("scheduled_date", { ascending: false })
      .limit(100),
  ]);

  if (providerResult.error || !providerResult.data) {
    return NextResponse.json({ ok: false, error: "Provider not found" }, { status: 404 });
  }

  const allJobs = jobsResult.data ?? [];

  // Check if this provider actually served this customer
  if (allJobs.length === 0) {
    return NextResponse.json({ ok: false, error: "Provider not found for this customer" }, { status: 403 });
  }

  // Compute today and 3 days ago
  const today = new Date().toISOString().split("T")[0];
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);
  const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];

  const recentJobs = allJobs.filter(
    (j) => j.scheduled_date && j.scheduled_date >= threeDaysAgoStr && j.scheduled_date <= today
  );

  const scheduledJobs = allJobs.filter(
    (j) => j.scheduled_date && j.scheduled_date >= today &&
      (j.status === "scheduled" || j.status === "scheduled_delayed")
  );

  return NextResponse.json({
    provider: providerResult.data,
    recentJobs,
    scheduledJobs,
    totalJobs: allJobs.length,
    allJobs,
  });
}
