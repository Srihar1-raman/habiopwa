import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCustomerFromRequest } from "@/lib/session";

/**
 * GET /api/customer/providers
 * Returns unique service providers who have served this customer.
 */
export async function GET() {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("job_allocations")
    .select("service_provider_id, service_providers(id, name)")
    .eq("customer_id", customer.id)
    .not("service_provider_id", "is", null)
    .order("scheduled_date", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: "Failed to fetch providers" }, { status: 500 });
  }

  // Deduplicate by provider id
  const seen = new Set<string>();
  const providers: { id: string; name: string }[] = [];
  for (const row of data ?? []) {
    const sp = (row.service_providers as unknown) as { id: string; name: string } | null;
    if (sp && !seen.has(sp.id)) {
      seen.add(sp.id);
      providers.push({ id: sp.id, name: sp.name });
    }
  }

  return NextResponse.json({ providers });
}
