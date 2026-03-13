import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";

const SESSION_COOKIE = "habio_session";
const SESSION_TTL_DAYS = 30;

export async function createSession(customerId: string): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID(); // 72-char token
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const { error } = await supabaseAdmin.from("customer_sessions").insert({
    customer_id: customerId,
    session_token: token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw new Error("Failed to create session: " + error.message);
  return token;
}

export async function getSessionCustomer(
  token: string | undefined
): Promise<{ id: string; phone: string; name: string | null } | null> {
  if (!token) return null;

  const { data, error } = await supabaseAdmin
    .from("customer_sessions")
    .select("customer_id, expires_at, customers(id, phone, name)")
    .eq("session_token", token)
    .single();

  if (error || !data) return null;

  if (new Date(data.expires_at) < new Date()) {
    // Expired — clean up
    await supabaseAdmin
      .from("customer_sessions")
      .delete()
      .eq("session_token", token);
    return null;
  }

  const customer = data.customers as unknown as {
    id: string;
    phone: string;
    name: string | null;
  };
  return customer ?? null;
}

export async function getCustomerFromRequest(): Promise<{
  id: string;
  phone: string;
  name: string | null;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return getSessionCustomer(token);
}

export function getSessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  };
}

export function clearSessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
}
