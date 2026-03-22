import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET() {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      customersWithPaidPlan,
      activePlans,
      pendingRequests,
      openIssues,
      activeStaff,
      activeProviders,
    ] = await Promise.all([
      supabaseAdmin
        .from("plan_requests")
        .select("customer_id")
        .eq("status", "active"),
      supabaseAdmin
        .from("plan_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabaseAdmin
        .from("plan_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["submitted", "captain_allocation_pending", "captain_review_pending", "payment_pending"]),
      supabaseAdmin
        .from("issue_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]),
      supabaseAdmin
        .from("staff_accounts")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabaseAdmin
        .from("service_providers")
        .select("id", { count: "exact", head: true })
        .eq("status", "available"),
    ]);

    // Unique customers with at least one active plan
    const uniqueCustomerIds = new Set(
      (customersWithPaidPlan.data ?? []).map((r) => r.customer_id)
    );

    return NextResponse.json({
      activeCustomers: uniqueCustomerIds.size,
      activePlans: activePlans.count ?? 0,
      pendingRequests: pendingRequests.count ?? 0,
      openIssues: openIssues.count ?? 0,
      activeStaff: activeStaff.count ?? 0,
      activeProviders: activeProviders.count ?? 0,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
