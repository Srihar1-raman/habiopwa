import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  createStaffSession,
  getStaffSessionCookieOptions,
} from "@/lib/staff-session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phone, otp } = body ?? {};

  if (!phone || !otp) {
    return NextResponse.json(
      { error: "phone and otp are required" },
      { status: 400 }
    );
  }

  const { data: staff, error } = await supabaseAdmin
    .from("staff_accounts")
    .select("id, name, phone, role, status, location_id")
    .eq("phone", phone)
    .eq("role", "supervisor")
    .eq("status", "active")
    .single();

  if (error || !staff) {
    return NextResponse.json({ error: "Supervisor not found" }, { status: 404 });
  }

  // OTP validation: last 4 digits of phone number
  const digits = phone.replace(/\D/g, "");
  const expectedOtp = digits.slice(-4);
  if (otp !== expectedOtp) {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
  }

  const token = await createStaffSession(staff.id);

  const response = NextResponse.json({
    ok: true,
    staff: {
      id: staff.id,
      name: staff.name,
      phone: staff.phone,
      role: staff.role,
      location_id: staff.location_id,
    },
  });
  response.cookies.set(getStaffSessionCookieOptions(token));
  return response;
}
