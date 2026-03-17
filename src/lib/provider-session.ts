import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";

const SESSION_COOKIE = "habio_provider_session";
const SESSION_TTL_DAYS = 30;

export async function createProviderSession(providerId: string): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const { error } = await supabaseAdmin.from("provider_sessions").insert({
    service_provider_id: providerId,
    session_token: token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw new Error("Failed to create provider session: " + error.message);
  return token;
}

export async function getProviderFromSession(
  token: string | undefined
): Promise<{
  id: string;
  phone: string;
  name: string | null;
  specialization: string | null;
  status: string | null;
} | null> {
  if (!token) return null;

  const { data, error } = await supabaseAdmin
    .from("provider_sessions")
    .select(
      "service_provider_id, expires_at, service_providers(id, phone, name, specialization, status)"
    )
    .eq("session_token", token)
    .single();

  if (error || !data) return null;

  if (new Date(data.expires_at) < new Date()) {
    await supabaseAdmin
      .from("provider_sessions")
      .delete()
      .eq("session_token", token);
    return null;
  }

  const provider = data.service_providers as unknown as {
    id: string;
    phone: string;
    name: string | null;
    specialization: string | null;
    status: string | null;
  };
  return provider ?? null;
}

export async function getProviderFromRequest(): Promise<{
  id: string;
  phone: string;
  name: string | null;
  specialization: string | null;
  status: string | null;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return getProviderFromSession(token);
}

export function getProviderSessionCookieOptions(token: string) {
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

export function clearProviderSessionCookieOptions() {
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
