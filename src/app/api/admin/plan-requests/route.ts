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
    const statusFilter = searchParams.get("status");

    let query = supabaseAdmin
      .from("plan_requests")
      .select(
        `id, request_code, status, total_price_monthly, created_at, plan_start_date, is_recurring,
         customers(id, name, phone),
         assigned_supervisor:staff_accounts!plan_requests_assigned_supervisor_id_fkey(id, name)`
      )
      .order("created_at", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (data ?? []).map((row) => {
      const customer = Array.isArray(row.customers)
        ? row.customers[0]
        : row.customers;
      const supervisor = Array.isArray(row.assigned_supervisor)
        ? row.assigned_supervisor[0]
        : row.assigned_supervisor;
      return {
        id: row.id,
        request_code: row.request_code,
        status: row.status,
        total_price_monthly: row.total_price_monthly,
        created_at: row.created_at,
        plan_start_date: row.plan_start_date,
        is_recurring: row.is_recurring,
        customer_name: customer?.name ?? null,
        customer_phone: customer?.phone ?? null,
        customer_id: customer?.id ?? null,
        supervisor_name: supervisor?.name ?? null,
      };
    });

    return NextResponse.json({ planRequests: result });
  } catch (err) {
    console.error("Plan requests error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
