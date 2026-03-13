import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data: categories, error: catError } = await supabaseAdmin
    .from("service_categories")
    .select("id, slug, name, code, sort_order")
    .order("sort_order");

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 });
  }

  const { data: jobs, error: jobError } = await supabaseAdmin
    .from("service_jobs")
    .select(
      `id, category_id, slug, name, code, class, service_type,
       primary_card, sub_card, frequency_label,
       unit_type, unit_interval, min_unit, max_unit, default_unit,
       time_multiple, base_rate_per_unit, instances_per_month, discount_pct,
       is_on_demand, formula_type, compound_child_code,
       sort_order,
       job_expectations(id, sort_order, text)`
    )
    .eq("active", true)
    .order("sort_order");

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  // Sort expectations within each job
  const allJobs = (jobs ?? []).map((job) => ({
    ...job,
    job_expectations: [...(job.job_expectations ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  }));

  // Attach compound child data to compound_head rows
  const jobsByCode = new Map(
    allJobs.filter((j) => j.code).map((j) => [j.code, j])
  );

  const jobsWithChildren = allJobs.map((job) => {
    if (job.formula_type === "compound_head" && job.compound_child_code) {
      const child = jobsByCode.get(job.compound_child_code);
      if (child) {
        return {
          ...job,
          compound_child: {
            code: child.code,
            base_rate_per_unit: child.base_rate_per_unit,
            instances_per_month: child.instances_per_month,
            time_multiple: child.time_multiple,
          },
        };
      }
    }
    return { ...job, compound_child: null };
  });

  return NextResponse.json({ categories, jobs: jobsWithChildren });
}
