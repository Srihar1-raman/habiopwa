import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId } = await params;

  const { data: provider, error: providerError } = await supabaseAdmin
    .from("service_providers")
    .select("*")
    .eq("id", providerId)
    .single();

  if (providerError || !provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const { data: recentJobs, error: jobsError } = await supabaseAdmin
    .from("job_allocations")
    .select(
      "id, scheduled_date, status, plan_request_items(title), customers(name)"
    )
    .eq("service_provider_id", providerId)
    .order("scheduled_date", { ascending: false })
    .limit(20);

  if (jobsError) {
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  return NextResponse.json({ provider, recentJobs: recentJobs ?? [] });
}
