import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

function generateRequestCode(): string {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `HB-${yyyymmdd}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { customer_id } = body ?? {};

    if (!customer_id) {
      return NextResponse.json({ error: "customer_id is required" }, { status: 400 });
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("id", customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const request_code = generateRequestCode();

    const { data: planRequest, error: insertError } = await supabaseAdmin
      .from("plan_requests")
      .insert({ customer_id, request_code, status: "cart_in_progress" })
      .select("id, request_code, status")
      .single();

    if (insertError || !planRequest) {
      return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
    }

    return NextResponse.json({ planRequest }, { status: 201 });
  } catch (err) {
    console.error("Plan request POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
