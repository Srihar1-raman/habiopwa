import { NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/auth/session
 * Returns the current session state (authenticated, profile complete, plan status).
 * Used by the login page to auto-redirect already-authenticated users.
 */
export async function GET() {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ authenticated: false });
  }

  const { data: profile } = await supabaseAdmin
    .from("customer_profiles")
    .select("customer_id")
    .eq("customer_id", customer.id)
    .single();

  const { data: planRequest } = await supabaseAdmin
    .from("plan_requests")
    .select("id, status")
    .eq("customer_id", customer.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    authenticated: true,
    hasProfile: !!profile,
    planStatus: planRequest?.status ?? null,
    customer: { id: customer.id, phone: customer.phone },
  });
}
