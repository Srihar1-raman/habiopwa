import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function POST(req: NextRequest) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      phone, name,
      flat_no, building, society, sector, city, pincode,
      home_type, bhk, bathrooms, balconies, cars, plants,
      diet_pref, people_count,
    } = body;

    if (!phone || !name || !flat_no) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if customer already exists
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Customer already exists" }, { status: 409 });
    }

    // Create customer
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .insert({ phone, name })
      .select("id")
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: customerError?.message ?? "Failed to create customer" }, { status: 500 });
    }

    // Create customer profile
    const { error: profileError } = await supabaseAdmin
      .from("customer_profiles")
      .insert({
        customer_id: customer.id,
        flat_no,
        building: building || null,
        society: society || null,
        sector: sector || null,
        city: city || null,
        pincode: pincode || null,
        home_type: home_type || null,
        bhk: bhk ? Number(bhk) : null,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        balconies: balconies !== undefined && balconies !== null ? Number(balconies) : null,
        cars: cars !== undefined && cars !== null ? Number(cars) : 0,
        plants: plants !== undefined && plants !== null ? Number(plants) : 0,
        diet_pref: diet_pref || null,
        people_count: people_count ? Number(people_count) : null,
      });

    if (profileError) {
      // Rollback: delete the customer we just created
      await supabaseAdmin.from("customers").delete().eq("id", customer.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ customerId: customer.id }, { status: 201 });
  } catch (err) {
    console.error("Create customer error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
        result = result.filter((c) => !c.latest_plan_status && !c.cart_id);
      } else if (planStatusFilter === "has_cart") {
        // "Has Cart (Not Submitted)": customers with cart_in_progress plan OR old-style carts with no plan
        result = result.filter(
          (c) =>
            c.latest_plan_status === "cart_in_progress" ||
            (!c.latest_plan_status && c.cart_id)
        );
      } else if (planStatusFilter === "submitted") {
        // "submitted" and "captain_allocation_pending" are treated as the same stage
        result = result.filter(
          (c) =>
            c.latest_plan_status === "submitted" ||
            c.latest_plan_status === "captain_allocation_pending"
        );
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

