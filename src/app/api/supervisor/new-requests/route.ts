import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// Auth: supervisor session required (added PR1)
export async function GET() {
  const staff = await getStaffFromRequest();
  if (!staff || staff.role !== "supervisor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const selectFields =
    "id, request_code, status, total_price_monthly, created_at, updated_at, customers(phone, name, customer_profiles(flat_no, society, sector, city))";

  // 1. Regular new plan submissions (initial requests) assigned to this supervisor
  const { data: regularRequests, error } = await supabaseAdmin
    .from("plan_requests")
    .select(selectFields)
    .in("status", ["submitted", "under_process"])
    .eq("assigned_supervisor_id", staff.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Paid/finalized plans that have unallocated addon items
  // Step a: find addon items that haven't been allocated yet
  const { data: addonItems } = await supabaseAdmin
    .from("plan_request_items")
    .select("id, plan_request_id")
    .eq("is_addon", true);

  let addonPlanRequests: typeof regularRequests = [];

  if (addonItems && addonItems.length > 0) {
    const addonItemIds = addonItems.map((i) => i.id);

    // Step b: which of those items already have a job_allocation?
    const { data: existingAllocations } = await supabaseAdmin
      .from("job_allocations")
      .select("plan_request_item_id")
      .in("plan_request_item_id", addonItemIds);

    const allocatedIds = new Set(
      (existingAllocations ?? []).map((a) => a.plan_request_item_id)
    );

    // Step c: collect plan_request_ids for items not yet allocated
    const pendingAddonPlanIds = [
      ...new Set(
        addonItems
          .filter((i) => !allocatedIds.has(i.id))
          .map((i) => i.plan_request_id)
      ),
    ];

    if (pendingAddonPlanIds.length > 0) {
      const { data: addonPlans } = await supabaseAdmin
        .from("plan_requests")
        .select(selectFields)
        .in("id", pendingAddonPlanIds)
        .in("status", ["paid", "finalized"])
        .eq("assigned_supervisor_id", staff.id)
        .order("created_at", { ascending: false });

      addonPlanRequests = addonPlans ?? [];
    }
  }

  // Combine and de-duplicate by id
  const allRequests = [...(regularRequests ?? []), ...addonPlanRequests];
  const seen = new Set<string>();
  const deduped = allRequests.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return NextResponse.json({ requests: deduped });
}
