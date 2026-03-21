import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { getProviderFromSession, PROVIDER_SESSION_COOKIE } from "@/lib/provider-session";

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(PROVIDER_SESSION_COOKIE)?.value;
  const provider = await getProviderFromSession(token);

  if (!provider) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("service_providers")
    .select("id, name, phone, provider_type, status")
    .eq("id", provider.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Provider not found" }, { status: 404 });
  }

  return NextResponse.json({
    provider: {
      id: data.id,
      name: data.name,
      phone: data.phone,
      provider_type: data.provider_type,
      status: data.status,
    },
  });
}
