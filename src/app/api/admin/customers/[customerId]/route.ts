import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { customerId } = await params;

    const [customerRes, planRequestsRes, issueTicketsRes] = await Promise.all([
      supabaseAdmin
        .from("customers")
        .select(`id, phone, name, default_supervisor_id, customer_profiles(*),
                 default_supervisor:staff_accounts!default_supervisor_id(id, name, phone)`)
        .eq("id", customerId)
        .single(),
      supabaseAdmin
        .from("plan_requests")
        .select(
          `id, request_code, status, total_price_monthly, plan_start_date, plan_active_start_date,
           plan_active_end_date, created_at, is_recurring, assigned_supervisor_id,
           assigned_supervisor:staff_accounts!assigned_supervisor_id(id, name, phone)`
        )
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("issue_tickets")
        .select("id, title, status, priority, created_at, description")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
    ]);

    if (customerRes.error || !customerRes.data) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({
      customer: customerRes.data,
      planRequests: planRequestsRes.data ?? [],
      issueTickets: issueTicketsRes.data ?? [],
    });
  } catch (err) {
    console.error("Customer detail error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { customerId } = await params;
    const body = await req.json();

    // Only allow updating default_supervisor_id via this endpoint
    const { default_supervisor_id } = body as { default_supervisor_id?: string | null };

    const { data, error } = await supabaseAdmin
      .from("customers")
      .update({ default_supervisor_id: default_supervisor_id ?? null })
      .eq("id", customerId)
      .select("id, default_supervisor_id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ customer: data });
  } catch (err) {
    console.error("Customer PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
