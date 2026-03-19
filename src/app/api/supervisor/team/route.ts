import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest, getSupervisorProviderIds } from "@/lib/staff-session";

// Auth: supervisor session required (added PR1)
export async function GET() {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerIds = await getSupervisorProviderIds(staff.id);
  if (providerIds.length === 0) {
    return NextResponse.json({ providers: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("service_providers")
    .select("*")
    .in("id", providerIds)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ providers: data ?? [] });
}
