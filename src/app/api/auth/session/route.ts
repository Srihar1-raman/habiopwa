import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCustomerFromRequest, getSessionCustomer, clearSessionCookieOptions } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

const SESSION_COOKIE = "habio_session";

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
    .maybeSingle();

  const { data: planRequest } = await supabaseAdmin
    .from("plan_requests")
    .select("id, status")
    .eq("customer_id", customer.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    authenticated: true,
    hasProfile: !!profile,
    planStatus: planRequest?.status ?? null,
    customer: { id: customer.id, phone: customer.phone, name: customer.name },
  });
}

/**
 * DELETE /api/auth/session
 * Signs out the current user by deleting the session from the database and
 * clearing the httpOnly session cookie.
 */
export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const customer = await getSessionCustomer(token);
    if (customer) {
      await supabaseAdmin
        .from("customer_sessions")
        .delete()
        .eq("session_token", token);
    }
  }

  const response = NextResponse.json({ ok: true });
  const cookieOpts = clearSessionCookieOptions();
  response.cookies.set(cookieOpts.name, cookieOpts.value, {
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    maxAge: cookieOpts.maxAge,
    path: cookieOpts.path,
  });
  return response;
}
