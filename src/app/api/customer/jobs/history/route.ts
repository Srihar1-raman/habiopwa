import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCustomerFromRequest } from "@/lib/session";

/**
 * GET /api/customer/jobs/history
 * Returns job allocations for the customer.
 * - By default: today + yesterday (all statuses).
 * - If ?date=YYYY-MM-DD provided: only that specific date (all statuses).
 * - If ?from=YYYY-MM-DD&to=YYYY-MM-DD: date range (all statuses).
 * - If ?all=true: last 50 jobs (all statuses) for "see more".
 */
export async function GET(req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const allParam = searchParams.get("all");

  let query = supabaseAdmin
    .from("job_allocations")
    .select(
      "id, scheduled_date, scheduled_start_time, status, plan_request_items(title), service_providers(name)"
    )
    .eq("customer_id", customer.id)
    .order("scheduled_date", { ascending: false })
    .order("scheduled_start_time", { ascending: false });

  if (dateParam) {
    query = query.eq("scheduled_date", dateParam);
  } else if (fromParam && toParam) {
    query = query.gte("scheduled_date", fromParam).lte("scheduled_date", toParam);
  } else if (allParam === "true") {
    query = query.limit(50);
  } else {
    // Default: today + yesterday
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    query = query.gte("scheduled_date", yesterdayStr).lte("scheduled_date", todayStr);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: "Failed to fetch job history" }, { status: 500 });
  }

  return NextResponse.json({ jobs: data ?? [] });
}
