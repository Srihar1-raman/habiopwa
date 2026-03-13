import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data: categories, error: catError } = await supabaseAdmin
    .from("service_categories")
    .select("id, slug, name, sort_order")
    .order("sort_order");

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 });
  }

  const { data: jobs, error: jobError } = await supabaseAdmin
    .from("service_jobs")
    .select(
      "id, category_id, slug, name, frequency_label, sort_order, job_pricing(id, mrp_monthly, price_monthly, default_minutes, min_minutes, max_minutes, step_minutes, currency), job_expectations(id, sort_order, text)"
    )
    .eq("active", true)
    .order("sort_order");

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  // Sort expectations within each job
  const jobsWithSortedExpectations = (jobs ?? []).map((job) => ({
    ...job,
    job_expectations: [...(job.job_expectations ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  }));

  return NextResponse.json({ categories, jobs: jobsWithSortedExpectations });
}
