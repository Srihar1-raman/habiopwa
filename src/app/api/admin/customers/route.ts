import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET(req: NextRequest) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const planStatusFilter = searchParams.get("plan_status");

    const { data: customers, error } = await supabaseAdmin
      .from("customers")
      .select(
        `id, phone, name,
         customer_profiles(flat_no, building, society, city)`
      )
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch latest plan request per customer (status + id)
    const { data: planRequests } = await supabaseAdmin
      .from("plan_requests")
      .select("id, customer_id, status, created_at")
      .order("created_at", { ascending: false });

    // Build maps: latest plan request per customer
    const latestPlanMap: Record<string, { id: string; status: string }> = {};
    const planCountMap: Record<string, number> = {};
    for (const pr of planRequests ?? []) {
      planCountMap[pr.customer_id] = (planCountMap[pr.customer_id] ?? 0) + 1;
      if (!latestPlanMap[pr.customer_id]) {
        latestPlanMap[pr.customer_id] = { id: pr.id, status: pr.status };
      }
    }

    // Fetch carts for customers with no plan
    const { data: carts } = await supabaseAdmin
      .from("carts")
      .select("id, customer_id, status");

    const cartMap: Record<string, { id: string; status: string }> = {};
    for (const c of carts ?? []) {
      if (!cartMap[c.customer_id]) {
        cartMap[c.customer_id] = { id: c.id, status: c.status };
      }
    }

    let result = (customers ?? []).map((c) => {
      const profile = Array.isArray(c.customer_profiles)
        ? c.customer_profiles[0]
        : c.customer_profiles;
      const latestPlan = latestPlanMap[c.id] ?? null;
      const cart = cartMap[c.id] ?? null;

      return {
        id: c.id,
        phone: c.phone,
        name: c.name,
        flat_no: profile?.flat_no ?? null,
        building: profile?.building ?? null,
        society: profile?.society ?? null,
        city: profile?.city ?? null,
        plan_count: planCountMap[c.id] ?? 0,
        latest_plan_id: latestPlan?.id ?? null,
        latest_plan_status: latestPlan?.status ?? null,
        cart_id: !latestPlan && cart ? cart.id : null,
      };
    });

    // Apply plan_status filter if provided
    if (planStatusFilter) {
      if (planStatusFilter === "no_plan") {
        result = result.filter((c) => !c.latest_plan_status);
      } else if (planStatusFilter === "has_cart") {
        result = result.filter((c) => !c.latest_plan_status && c.cart_id);
      } else {
        result = result.filter((c) => c.latest_plan_status === planStatusFilter);
      }
    }

    return NextResponse.json({ customers: result });
  } catch (err) {
    console.error("Customers list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

