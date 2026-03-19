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
        .select("id, phone, name, customer_profiles(*)")
        .eq("id", customerId)
        .single(),
      supabaseAdmin
        .from("plan_requests")
        .select(
          "id, request_code, status, total_price_monthly, plan_start_date, plan_active_start_date, plan_active_end_date, created_at, is_recurring"
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
