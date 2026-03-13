import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();

  if (!phone || !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  // Upsert customer record (phone only at this stage)
  const { error } = await supabaseAdmin
    .from("customers")
    .upsert({ phone }, { onConflict: "phone", ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // In production: send OTP via SMS provider. For MVP: hardcoded OTP 123456.
  return NextResponse.json({ ok: true });
}
