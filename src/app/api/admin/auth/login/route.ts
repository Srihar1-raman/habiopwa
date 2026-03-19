import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  createStaffSession,
  getStaffSessionCookieOptions,
  verifyPassword,
} from "@/lib/staff-session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body ?? {};

  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 }
    );
  }

  const { data: staff, error } = await supabaseAdmin
    .from("staff_accounts")
    .select("id, name, email, role, status, password_hash")
    .eq("email", email)
    .in("role", ["admin", "ops_lead", "manager"])
    .eq("status", "active")
    .single();

  if (error || !staff) {
    return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  }

  if (!staff.password_hash) {
    return NextResponse.json({ error: "Account not configured" }, { status: 401 });
  }

  const valid = await verifyPassword(password, staff.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createStaffSession(staff.id);

  const response = NextResponse.json({
    ok: true,
    staff: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
    },
  });
  response.cookies.set(getStaffSessionCookieOptions(token));
  return response;
}
