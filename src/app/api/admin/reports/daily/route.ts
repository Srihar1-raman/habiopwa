import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET(req: NextRequest) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "date query param required" }, { status: 400 });
    }

    // daily_reports table has been removed. Compute on-the-fly from job_allocations.
    const { data: allocations, error } = await supabaseAdmin
      .from("job_allocations")
      .select("id, status")
      .eq("scheduled_date", date);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = allocations ?? [];
    const report = {
      report_date: date,
      total_jobs_scheduled: list.length,
      total_jobs_completed: list.filter(
        (a) => a.status === "completed" || a.status === "completed_delayed"
      ).length,
      total_jobs_delayed: list.filter(
        (a) => a.status === "completed_delayed" || a.status === "in_progress_delayed"
      ).length,
      total_jobs_cancelled: list.filter(
        (a) => a.status === "cancelled" || a.status === "cancelled_by_customer"
      ).length,
    };

    return NextResponse.json({ report });
  } catch (err) {
    console.error("Daily report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
