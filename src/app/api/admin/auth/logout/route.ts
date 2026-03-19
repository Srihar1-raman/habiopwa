import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import {
  STAFF_SESSION_COOKIE,
  clearStaffSessionCookieOptions,
} from "@/lib/staff-session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;

  if (token) {
    await supabaseAdmin
      .from("staff_sessions")
      .delete()
      .eq("session_token", token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearStaffSessionCookieOptions());
  return response;
}
