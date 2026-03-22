import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest, getSupervisorProviderIds } from "@/lib/staff-session";

const DOW_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

/**
 * GET /api/supervisor/providers/availability
 * Query params: date (YYYY-MM-DD), start_time (HH:MM), end_time (HH:MM)
 *
 * Returns all providers in the supervisor's team with availability info.
 */
export async function GET(req: NextRequest) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const startTime = searchParams.get("start_time");
    const endTime = searchParams.get("end_time");

    if (!date) {
      return NextResponse.json(
        { error: "date query param is required" },
        { status: 400 }
      );
    }

    const providerIds = await getSupervisorProviderIds(staff.id);
    if (providerIds.length === 0) {
      return NextResponse.json({ providers: [] });
    }

    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = DOW_MAP[dateObj.getDay()];

    // Fetch providers in team
    const { data: providers, error: provErr } = await supabaseAdmin
      .from("service_providers")
      .select("id, name, provider_type, status")
      .in("id", providerIds)
      .order("name");

    if (provErr) {
      return NextResponse.json({ error: provErr.message }, { status: 500 });
    }

    // Fetch existing allocations on that date
    const { data: allocations } = await supabaseAdmin
      .from("job_allocations")
      .select(
        "id, service_provider_id, scheduled_start_time, scheduled_end_time, plan_request_items(title)"
      )
      .in("service_provider_id", providerIds)
      .eq("scheduled_date", date)
      .not("status", "eq", "cancelled_by_customer");

    // Fetch week-offs active on the given date
    const { data: weekOffs } = await supabaseAdmin
      .from("provider_week_offs")
      .select("service_provider_id, day_of_week")
      .in("service_provider_id", providerIds)
      .lte("effective_from", date)
      .or(`effective_to.is.null,effective_to.gte.${date}`);

    // Fetch approved leaves covering the date
    const { data: leaves } = await supabaseAdmin
      .from("provider_leave_requests")
      .select("service_provider_id")
      .in("service_provider_id", providerIds)
      .eq("status", "approved")
      .lte("leave_start_date", date)
      .gte("leave_end_date", date);

    // Build maps
    const allocsByProvider = new Map<string, typeof allocations>();
    for (const alloc of allocations ?? []) {
      const list = allocsByProvider.get(alloc.service_provider_id) ?? [];
      list.push(alloc);
      allocsByProvider.set(alloc.service_provider_id, list);
    }

    const weekOffsByProvider = new Map<string, string>();
    for (const wo of weekOffs ?? []) {
      weekOffsByProvider.set(wo.service_provider_id, wo.day_of_week);
    }

    const onLeaveSet = new Set((leaves ?? []).map((l) => l.service_provider_id));

    const result = (providers ?? []).map((p) => {
      const provAllocs = allocsByProvider.get(p.id) ?? [];
      const dayOff = weekOffsByProvider.get(p.id) ?? null;
      const isDayOff = dayOff === dayOfWeek;
      const onLeave = onLeaveSet.has(p.id);

      let conflicts: { id: string; start: string; end: string; title: string }[] = [];
      if (startTime && endTime) {
        conflicts = provAllocs
          .filter(
            (a) =>
              a.scheduled_start_time < endTime &&
              a.scheduled_end_time > startTime
          )
          .map((a) => ({
            id: a.id,
            start: a.scheduled_start_time,
            end: a.scheduled_end_time,
            title:
              (Array.isArray(a.plan_request_items)
                ? a.plan_request_items[0]?.title
                : (a.plan_request_items as { title?: string } | null)?.title) ?? "Job",
          }));
      }

      const allAllocations = provAllocs.map((a) => ({
        id: a.id,
        start: a.scheduled_start_time,
        end: a.scheduled_end_time,
        title:
          (Array.isArray(a.plan_request_items)
            ? a.plan_request_items[0]?.title
            : (a.plan_request_items as { title?: string } | null)?.title) ?? "Job",
      }));

      return {
        id: p.id,
        name: p.name,
        provider_type: p.provider_type,
        status: p.status,
        is_busy: conflicts.length > 0,
        conflicts,
        all_allocations: allAllocations,
        is_day_off: isDayOff,
        day_off_day: dayOff,
        on_leave: onLeave,
        is_available: !isDayOff && !onLeave && conflicts.length === 0,
      };
    });

    return NextResponse.json({
      providers: result,
      date,
      day_of_week: dayOfWeek,
    });
  } catch (err) {
    console.error("Supervisor provider availability error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
