import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;

  const { data, error } = await supabaseAdmin
    .from("job_allocations")
    .select(
      "*, service_providers(name, specialization), plan_request_items(title), customers(name, customer_profiles(flat_no, society))"
    )
    .eq("scheduled_date", date)
    .order("scheduled_start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ allocations: data ?? [], date });
}
