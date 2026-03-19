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

    const { data, error } = await supabaseAdmin
      .from("daily_reports")
      .select(
        "id, report_date, total_jobs_scheduled, total_jobs_completed, total_jobs_delayed, total_jobs_cancelled, breakage_count, summary_notes"
      )
      .eq("report_date", date)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ report: data ?? null });
  } catch (err) {
    console.error("Daily report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
