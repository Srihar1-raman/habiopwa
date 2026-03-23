/**
 * expandPlanAllocations
 *
 * Generates the full 30-day set of job_allocation rows for a plan after payment.
 *
 * - Daily items  → one allocation per calendar day across 30 days.
 * - Weekly items → one allocation per week on the configured scheduled_day_of_week
 *                  (falls back to day-of-week of plan_start_date when not set).
 *
 * For each date, if the primary provider has their week-off on that day,
 * backup_provider_id is used instead. If no backup is set, primary is kept.
 *
 * The supervisor's single "template" allocation rows (inserted at review time)
 * are deleted and replaced by the generated dated rows.
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ─── Internal types ────────────────────────────────────────────────────────────

interface PlanRow {
  id: string;
  plan_start_date: string | null;
  customer_id: string;
  assigned_supervisor_id: string | null;
}

interface ItemRow {
  id: string;
  frequency_label: string;
  preferred_start_time: string | null;
  unit_value: number;
  unit_type: string;
  time_multiple: number | null;
  backup_provider_id: string | null;
  scheduled_day_of_week: number | null;
}

interface TemplateAlloc {
  plan_request_item_id: string;
  service_provider_id: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
}

interface WeekOffRow {
  service_provider_id: string;
  day_of_week: string; // "monday" | "tuesday" | …
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD of (dateStr + days). */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Returns UTC day-of-week (0=Sunday … 6=Saturday) for YYYY-MM-DD. */
function getDow(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

/** Returns an array of YYYY-MM-DD strings starting from `start` for `count` days. */
function dateRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** Maps JS getDay() → lowercase weekday name as stored in provider_week_offs.day_off. */
const DOW_TO_NAME: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Expand a plan into 30 days of job_allocations after payment is confirmed.
 *
 * @param planRequestId - UUID of the plan_request row.
 * @param supabase      - Supabase admin client (service-role).
 */
export async function expandPlanAllocations(
  planRequestId: string,
  supabase: SupabaseClient
): Promise<void> {
  // ── Step 1: Fetch the plan ────────────────────────────────────────────────
  const { data: plan, error: planErr } = await supabase
    .from("plan_requests")
    .select("id, plan_start_date, customer_id, assigned_supervisor_id")
    .eq("id", planRequestId)
    .single<PlanRow>();

  if (planErr || !plan) {
    console.error("[expandPlanAllocations] Could not fetch plan:", planErr?.message);
    return;
  }

  const startDate = plan.plan_start_date;
  if (!startDate) {
    console.error("[expandPlanAllocations] plan_start_date is null — skipping expansion.");
    return;
  }

  const endDate = addDays(startDate, 29); // 30 days inclusive

  // ── Step 2: Write plan_active_start_date / plan_active_end_date ───────────
  const { error: updateErr } = await supabase
    .from("plan_requests")
    .update({ plan_active_start_date: startDate, plan_active_end_date: endDate })
    .eq("id", planRequestId);

  if (updateErr) {
    console.error("[expandPlanAllocations] Failed to set active dates:", updateErr.message);
    // Non-fatal — continue with allocation generation
  }

  // ── Step 3: Fetch plan_request_items ──────────────────────────────────────
  const { data: rawItems, error: itemsErr } = await supabase
    .from("plan_request_items")
    .select(
      "id, frequency_label, preferred_start_time, unit_value, unit_type, time_multiple, backup_provider_id, scheduled_day_of_week"
    )
    .eq("plan_request_id", planRequestId);

  if (itemsErr) {
    console.error("[expandPlanAllocations] Could not fetch items:", itemsErr.message);
    return;
  }

  const items: ItemRow[] = rawItems ?? [];
  if (items.length === 0) return;

  const itemIds = items.map((i) => i.id);

  // ── Step 4: Fetch existing template allocations (one per item) ────────────
  const { data: rawTemplates, error: tmplErr } = await supabase
    .from("job_allocations")
    .select(
      "plan_request_item_id, service_provider_id, scheduled_start_time, scheduled_end_time"
    )
    .in("plan_request_item_id", itemIds);

  if (tmplErr) {
    console.error("[expandPlanAllocations] Could not fetch templates:", tmplErr.message);
    return;
  }

  // Keep only the first template allocation per item
  const templateByItem = new Map<string, TemplateAlloc>();
  for (const row of (rawTemplates ?? []) as TemplateAlloc[]) {
    if (!templateByItem.has(row.plan_request_item_id)) {
      templateByItem.set(row.plan_request_item_id, row);
    }
  }

  // ── Step 5: Fetch week-offs for all primary providers ─────────────────────
  const primaryIds = [
    ...new Set(
      [...templateByItem.values()]
        .map((t) => t.service_provider_id)
        .filter(Boolean)
    ),
  ];

  const weekOffMap = new Map<string, string>(); // provider_id → day name
  if (primaryIds.length > 0) {
    const { data: rawWeekOffs } = await supabase
      .from("provider_week_offs")
      .select("service_provider_id, day_of_week")
      .in("service_provider_id", primaryIds);

    for (const wo of (rawWeekOffs ?? []) as WeekOffRow[]) {
      weekOffMap.set(wo.service_provider_id, wo.day_of_week.toLowerCase());
    }
  }

  // ── Step 6: Delete template allocation rows ───────────────────────────────
  const { error: deleteErr } = await supabase
    .from("job_allocations")
    .delete()
    .in("plan_request_item_id", itemIds);

  if (deleteErr) {
    console.error("[expandPlanAllocations] Could not delete templates:", deleteErr.message);
    return;
  }

  // ── Step 7: Build the 30-day allocation rows ──────────────────────────────
  const allDates = dateRange(startDate, 30);
  const startDow = getDow(startDate); // fallback day-of-week for weekly items

  type NewRow = {
    plan_request_id: string;
    plan_request_item_id: string;
    service_provider_id: string;
    customer_id: string;
    scheduled_date: string;
    scheduled_start_time: string;
    scheduled_end_time: string;
    supervisor_id: string | null;
    status: string;
  };

  const newRows: NewRow[] = [];

  for (const item of items) {
    const tmpl = templateByItem.get(item.id);
    if (!tmpl || !tmpl.service_provider_id) {
      console.warn(
        `[expandPlanAllocations] No template allocation for item ${item.id} — skipping.`
      );
      continue;
    }

    const startTime = tmpl.scheduled_start_time || item.preferred_start_time || "08:00";
    const endTime = tmpl.scheduled_end_time;
    const primaryId = tmpl.service_provider_id;
    const backupId = item.backup_provider_id;
    const primaryDayOff = weekOffMap.get(primaryId) ?? null; // e.g. "sunday"

    // Determine which dates this item runs on
    let targetDates: string[];
    if (item.frequency_label === "Daily") {
      targetDates = allDates;
    } else {
      // Weekly — use configured scheduled_day_of_week, or fall back to plan start day
      const targetDow: number =
        item.scheduled_day_of_week !== null && item.scheduled_day_of_week !== undefined
          ? item.scheduled_day_of_week
          : startDow;
      targetDates = allDates.filter((d) => getDow(d) === targetDow);
    }

    for (const date of targetDates) {
      let assignedProvider = primaryId;

      // Swap to backup on primary's day-off
      if (primaryDayOff && DOW_TO_NAME[getDow(date)] === primaryDayOff) {
        if (backupId) {
          assignedProvider = backupId;
        } else {
          console.warn(
            `[expandPlanAllocations] Primary ${primaryId} has day-off on ${date} but no backup for item ${item.id} — using primary.`
          );
        }
      }

      newRows.push({
        plan_request_id: planRequestId,
        plan_request_item_id: item.id,
        service_provider_id: assignedProvider,
        customer_id: plan.customer_id,
        scheduled_date: date,
        scheduled_start_time: startTime,
        scheduled_end_time: endTime,
        supervisor_id: plan.assigned_supervisor_id,
        status: "scheduled",
      });
    }
  }

  // ── Step 8: Bulk-insert in chunks of 100 ─────────────────────────────────
  const CHUNK = 100;
  for (let i = 0; i < newRows.length; i += CHUNK) {
    const { error: insertErr } = await supabase
      .from("job_allocations")
      .insert(newRows.slice(i, i + CHUNK));
    if (insertErr) {
      console.error(
        `[expandPlanAllocations] Insert error at chunk ${i}:`,
        insertErr.message
      );
    }
  }
}
