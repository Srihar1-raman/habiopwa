import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// GET /api/supervisor/service-catalog — returns active, non-compound jobs
export async function GET() {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("service_jobs")
      .select("*, service_categories(id, slug, name)")
      .eq("active", true)
      .neq("formula_type", "compound_child")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const jobs = (data ?? []).map((job) => {
      const category = Array.isArray(job.service_categories)
        ? job.service_categories[0]
        : job.service_categories;
      return { ...job, category_name: category?.name ?? null };
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("Supervisor service catalog GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
