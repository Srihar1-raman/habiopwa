import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// POST /api/admin/plan-requests/[planRequestId]/items
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planRequestId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planRequestId } = await params;
    const body = await req.json();
    const {
      category_id,
      job_id,
      title,
      unit_value,
      price_monthly,
      frequency_label,
      unit_type,
      formula_type,
      job_code,
    } = body ?? {};

    if (!category_id || !title) {
      return NextResponse.json({ error: "category_id and title are required" }, { status: 400 });
    }

    // Verify plan request exists
    const { data: planRequest } = await supabaseAdmin
      .from("plan_requests")
      .select("id, status")
      .eq("id", planRequestId)
      .single();

    if (!planRequest) {
      return NextResponse.json({ error: "Plan request not found" }, { status: 404 });
    }

    const { data: item, error: insertError } = await supabaseAdmin
      .from("plan_request_items")
      .insert({
        plan_request_id: planRequestId,
        category_id,
        job_id: job_id ?? null,
        job_code: job_code ?? null,
        title,
        unit_value: unit_value ?? 30,
        price_monthly: price_monthly ?? 0,
        frequency_label: frequency_label ?? "Daily",
        unit_type: unit_type ?? "min",
        formula_type: formula_type ?? "standard",
      })
      .select("*")
      .single();

    if (insertError || !item) {
      return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error("Plan request items POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
