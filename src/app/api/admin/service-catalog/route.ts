import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// GET /api/admin/service-catalog
export async function GET() {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
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
    console.error("Service catalog GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
