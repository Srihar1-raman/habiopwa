import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { clearProviderSessionCookieOptions } from "@/lib/provider-session";

const SESSION_COOKIE = "habio_provider_session";

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await supabaseAdmin
      .from("provider_sessions")
      .delete()
      .eq("session_token", token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearProviderSessionCookieOptions());
  return response;
}
