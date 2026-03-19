/**
 * @fileoverview Staff authentication session management for HABIO admin portal.
 *
 * Handles TWO auth patterns:
 * 1. Email + password (bcryptjs) for: admin, ops_lead, manager
 * 2. Phone + OTP (last 4 digits of phone) for: supervisor
 *
 * Session cookie: "habio_staff_session" (30-day TTL, httpOnly, secure in prod)
 * DB table: staff_sessions (staff_id, session_token, expires_at)
 *
 * CONTEXT FOR PR2/PR3 AGENTS:
 * - Import { getStaffFromRequest, requireRole } in any admin/supervisor API route
 * - requireRole(['admin','ops_lead']) will reject if staff role doesn't match
 * - getSupervisorProviderIds(supervisorId) returns provider IDs for data scoping
 * - The supervisor session uses the SAME cookie/table as admin — one unified staff session
 * - Provider auth (src/lib/provider-session.ts) is COMPLETELY SEPARATE — don't mix them
 * - Customer auth (src/lib/session.ts) is COMPLETELY SEPARATE — don't mix them
 */

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "./supabase";

export const STAFF_SESSION_COOKIE = "habio_staff_session";
const SESSION_TTL_DAYS = 30;

export interface StaffAccount {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  role: "admin" | "ops_lead" | "manager" | "supervisor";
  status: "active" | "inactive";
  location_id: string | null;
  reports_to: string | null;
}

export async function createStaffSession(staffId: string): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const { error } = await supabaseAdmin.from("staff_sessions").insert({
    staff_id: staffId,
    session_token: token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw new Error("Failed to create staff session: " + error.message);
  return token;
}

export async function getStaffFromSession(
  token: string | undefined
): Promise<StaffAccount | null> {
  if (!token) return null;

  const { data, error } = await supabaseAdmin
    .from("staff_sessions")
    .select(
      "staff_id, expires_at, staff_accounts(id, phone, name, email, role, status, location_id, reports_to)"
    )
    .eq("session_token", token)
    .single();

  if (error || !data) return null;

  if (new Date(data.expires_at) < new Date()) {
    await supabaseAdmin
      .from("staff_sessions")
      .delete()
      .eq("session_token", token);
    return null;
  }

  const staff = data.staff_accounts as unknown as StaffAccount | null;
  return staff ?? null;
}

export async function getStaffFromRequest(): Promise<StaffAccount | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  return getStaffFromSession(token);
}

export function getStaffSessionCookieOptions(token: string) {
  return {
    name: STAFF_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  };
}

export function clearStaffSessionCookieOptions() {
  return {
    name: STAFF_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
}

export async function verifyPassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export async function requireRole(
  allowedRoles: string[]
): Promise<StaffAccount> {
  const staff = await getStaffFromRequest();
  if (!staff) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  if (!allowedRoles.includes(staff.role)) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
  return staff;
}

export async function getSupervisorProviderIds(
  supervisorId: string
): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("provider_team_assignments")
    .select("service_provider_id")
    .eq("supervisor_id", supervisorId);

  if (error || !data) return [];
  return data.map((row) => row.service_provider_id);
}
