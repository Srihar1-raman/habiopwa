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
      .from("issue_tickets")
      .select(
        `id, title, status, priority, created_at, description, supervisor_response, plan_request_id, job_allocation_id,
         customers(id, name, phone),
         plan_requests(
           assigned_supervisor_id,
           assigned_supervisor:staff_accounts!plan_requests_assigned_supervisor_id_fkey(
             id, name, phone,
             locations(name, city, sector)
           )
         )`
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
      const planRequest = Array.isArray(row.plan_requests)
        ? row.plan_requests[0]
        : row.plan_requests;
      const supervisor = planRequest
        ? Array.isArray(planRequest.assigned_supervisor)
          ? planRequest.assigned_supervisor[0]
          : planRequest.assigned_supervisor
        : null;
      const location = supervisor
        ? Array.isArray(supervisor.locations)
          ? supervisor.locations[0]
          : supervisor.locations
        : null;
      const clusterName = location
        ? location.city
          ? `${location.name}, ${location.city}`
          : location.name
        : null;
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        priority: row.priority,
        created_at: row.created_at,
        description: row.description,
        supervisor_response: row.supervisor_response,
        plan_request_id: row.plan_request_id,
        job_allocation_id: row.job_allocation_id,
        customer_name: customer?.name ?? null,
        customer_phone: customer?.phone ?? null,
        customer_id: customer?.id ?? null,
        supervisor_name: supervisor?.name ?? null,
        supervisor_phone: supervisor?.phone ?? null,
        cluster_name: clusterName,
      };
    });

    return NextResponse.json({ issues: result });
  } catch (err) {
    console.error("Issues list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
