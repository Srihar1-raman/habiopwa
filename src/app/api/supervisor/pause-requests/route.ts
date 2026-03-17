import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("pause_requests")
    .select(
      "*, customers(name, phone), plan_requests(request_code)"
    )
    .or("status.eq.pending,supervisor_approval_status.eq.pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pauseRequests: data ?? [] });
}
