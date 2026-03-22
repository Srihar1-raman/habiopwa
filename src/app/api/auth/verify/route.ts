import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSession, getSessionCookieOptions } from "@/lib/session";

const HARDCODED_OTP = "123456";

export async function POST(req: NextRequest) {
  const { phone, otp } = await req.json();

  if (!phone || !otp) {
    return NextResponse.json(
      { error: "Phone and OTP are required" },
      { status: 400 }
    );
  }

  if (otp !== HARDCODED_OTP) {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
  }

  // Fetch or create customer — use maybeSingle() so 0-row result is data:null, not an error
  const { data: customerData, error: fetchError } = await supabaseAdmin
    .from("customers")
    .select("id, phone, name")
    .eq("phone", phone)
    .maybeSingle();

  let customer = customerData;

  if (fetchError || !customer) {
    // Only create a new customer when none exists with this phone
    const { data: newCustomer, error: insertError } = await supabaseAdmin
      .from("customers")
      .insert({ phone })
      .select("id, phone, name")
      .single();

    if (insertError || !newCustomer) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    customer = newCustomer;
  }

  // Check if customer has a profile (determines if onboarding needed)
  // Use maybeSingle() — single() throws on 0 rows which masks a real "no profile" vs DB error
  const { data: profile } = await supabaseAdmin
    .from("customer_profiles")
    .select("customer_id")
    .eq("customer_id", customer.id)
    .maybeSingle();

  const hasProfile = !!profile;

  // Create session
  const token = await createSession(customer.id);
  const cookieOpts = getSessionCookieOptions(token);

  const res = NextResponse.json({
    ok: true,
    hasProfile,
    customer: { id: customer.id, phone: customer.phone, name: customer.name },
  });

  res.cookies.set(cookieOpts);
  return res;
}
