import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createProviderSession, getProviderSessionCookieOptions } from "@/lib/provider-session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phone, otp } = body as { phone?: string; otp?: string };

  if (!phone || !otp) {
    return NextResponse.json(
      { ok: false, error: "phone and otp are required" },
      { status: 400 }
    );
  }

  const { data: provider, error } = await supabaseAdmin
    .from("service_providers")
    .select("id, name, phone, provider_type, status")
    .eq("phone", phone)
    .single();

  if (error || !provider) {
    return NextResponse.json({ ok: false, error: "Provider not found" }, { status: 404 });
  }

  const digits = provider.phone.replace(/\D/g, "");
  const expectedOtp = digits.slice(-4);

  if (otp !== expectedOtp) {
    return NextResponse.json({ ok: false, error: "Invalid OTP" }, { status: 401 });
  }

  const token = await createProviderSession(provider.id);

  const response = NextResponse.json({
    ok: true,
    provider: {
      id: provider.id,
      name: provider.name,
      phone: provider.phone,
      provider_type: provider.provider_type,
      status: provider.status,
    },
  });

  response.cookies.set(getProviderSessionCookieOptions(token));
  return response;
}
