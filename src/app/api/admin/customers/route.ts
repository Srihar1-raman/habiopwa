import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET() {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Fetch plan counts separately
    const { data: planCounts } = await supabaseAdmin
      .from("plan_requests")
      .select("customer_id");

    const countMap: Record<string, number> = {};
    for (const row of planCounts ?? []) {
      countMap[row.customer_id] = (countMap[row.customer_id] ?? 0) + 1;
    }

    const result = (customers ?? []).map((c) => {
      const profile = Array.isArray(c.customer_profiles)
        ? c.customer_profiles[0]
        : c.customer_profiles;
      return {
        id: c.id,
        phone: c.phone,
        name: c.name,
        flat_no: profile?.flat_no ?? null,
        building: profile?.building ?? null,
        society: profile?.society ?? null,
        city: profile?.city ?? null,
        plan_count: countMap[c.id] ?? 0,
      };
    });

    return NextResponse.json({ customers: result });
  } catch (err) {
    console.error("Customers list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
