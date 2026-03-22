import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

/**
 * GET /api/admin/phone-check?phone=9876543210
 * Returns { exists: boolean, in: "customer"|"staff"|"provider"|null }
 */
export async function GET(req: NextRequest) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone")?.trim();

    if (!phone || !/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const [customerRes, staffRes, providerRes] = await Promise.all([
      supabaseAdmin.from("customers").select("id").eq("phone", phone).maybeSingle(),
      supabaseAdmin.from("staff_accounts").select("id").eq("phone", phone).maybeSingle(),
      supabaseAdmin.from("service_providers").select("id").eq("phone", phone).maybeSingle(),
    ]);

    if (customerRes.data) return NextResponse.json({ exists: true, in: "customer" });
    if (staffRes.data) return NextResponse.json({ exists: true, in: "staff" });
    if (providerRes.data) return NextResponse.json({ exists: true, in: "provider" });

    return NextResponse.json({ exists: false, in: null });
  } catch (err) {
    console.error("Phone check error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
