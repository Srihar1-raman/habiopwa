"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, Search, Zap } from "lucide-react";

const JOB_STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  scheduled:        { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-300" },
  in_progress:      { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-300" },
  completed:        { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-300" },
  cancelled:        { bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200" },
  cancelled_by_customer: { bg: "bg-red-50", text: "text-red-600",  border: "border-red-200" },
  delayed:          { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300" },
  service_on_pause: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-300" },
  allocated:        { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-300" },
};

const DEFAULT_STYLE = { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };

// Timeline spans 4:00–23:00, 30-min slots
const TIMELINE_START_MIN = 4 * 60; // 4:00 AM in minutes from midnight
const TIMELINE_END_MIN = 23 * 60;  // 11:00 PM
const SLOT_HEIGHT = 40; // px per 30-min slot
const SLOTS: string[] = [];
for (let m = TIMELINE_START_MIN; m < TIMELINE_END_MIN; m += 30) {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  SLOTS.push(`${h}:${min}`);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

interface Allocation {
  id: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  status: string;
  service_providers: { name: string; provider_type: string | null } | null;
  plan_request_items: { title: string } | null;
  customers: { name: string | null; customer_profiles: { flat_no: string | null; society: string | null } | null } | null;
  _type?: "job";
}

interface OnDemand {
  id: string;
  allocated_start_time: string | null;
  allocated_end_time: string | null;
  status: string;
  service_providers: { name: string } | null;
  customers: { name: string | null } | null;
  service_jobs: { name: string } | null;
  _type: "on_demand";
}

type TimelineItem = (Allocation & { _type: "job" }) | OnDemand;

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function itemStartTime(item: TimelineItem): string {
  return (item._type === "on_demand"
    ? item.allocated_start_time
    : (item as Allocation).scheduled_start_time) ?? "00:00";
}

function itemEndTime(item: TimelineItem): string {
  return (item._type === "on_demand"
    ? item.allocated_end_time
    : (item as Allocation).scheduled_end_time) ?? "00:30";
}

function itemTitle(item: TimelineItem): string {
  if (item._type === "on_demand") {
    return (item as OnDemand).service_jobs?.name ?? "On-Demand";
  }
  return (item as Allocation).plan_request_items?.title ?? "—";
}

function itemProvider(item: TimelineItem): string {
  return item.service_providers?.name ?? "Unassigned";
}

function itemCustomer(item: TimelineItem): string {
  return item.customers?.name ?? "";
}

export default function SchedulePage() {
  const router = useRouter();
  const params = useParams();
  const date = params.date as string;

  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [onDemand, setOnDemand] = useState<OnDemand[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterProvider, setFilterProvider] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/supervisor/schedule/${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setAllocations(d.allocations ?? []);
        setOnDemand(d.onDemand ?? []);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date]);

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "short", year: "numeric",
  });

  // Merge and tag items
  const allItems: TimelineItem[] = useMemo(() => {
    const jobs: TimelineItem[] = allocations.map((a) => ({ ...a, _type: "job" as const }));
    const od: TimelineItem[] = onDemand.map((o) => ({ ...o, _type: "on_demand" as const }));
    return [...jobs, ...od].sort((a, b) =>
      itemStartTime(a).localeCompare(itemStartTime(b))
    );
  }, [allocations, onDemand]);

  // Provider options for filter
  const providerOptions = useMemo(() => {
    const names = new Set(allItems.map((i) => itemProvider(i)).filter(Boolean));
    return Array.from(names).sort();
  }, [allItems]);

  // Status options
  const statusOptions = useMemo(() => {
    const statuses = new Set(allItems.map((i) => i.status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [allItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allItems.filter((item) => {
      if (filterProvider && itemProvider(item) !== filterProvider) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      if (q) {
        const title = itemTitle(item).toLowerCase();
        const customer = itemCustomer(item).toLowerCase();
        if (!title.includes(q) && !customer.includes(q)) return false;
      }
      return true;
    });
  }, [allItems, filterProvider, filterStatus, searchQuery]);

  function getItemStyle(item: TimelineItem): { top: number; height: number } {
    const start = timeToMinutes(itemStartTime(item));
    const end = timeToMinutes(itemEndTime(item));
    const startClamped = clamp(start, TIMELINE_START_MIN, TIMELINE_END_MIN);
    const endClamped = clamp(end, TIMELINE_START_MIN, TIMELINE_END_MIN);
    const topSlots = (startClamped - TIMELINE_START_MIN) / 30;
    const durationSlots = Math.max(1, (endClamped - startClamped) / 30);
    return {
      top: topSlots * SLOT_HEIGHT,
      height: durationSlots * SLOT_HEIGHT,
    };
  }

  const totalTimelineHeight = SLOTS.length * SLOT_HEIGHT;

  return (
    <div className="flex flex-col min-h-dvh pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.push("/supervisor/dashboard")}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1">Schedule</h1>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button onClick={() => router.push(`/supervisor/schedule/${offsetDate(date, -1)}`)} className="p-2 rounded-full hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#004aad]" />
          <span className="text-sm font-semibold text-gray-700">{displayDate}</span>
        </div>
        <button onClick={() => router.push(`/supervisor/schedule/${offsetDate(date, 1)}`)} className="p-2 rounded-full hover:bg-gray-100">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customer or job…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#004aad]/30 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
          >
            <option value="">All Providers</option>
            {providerOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary counts */}
      {!loading && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs text-gray-500">
          <span>{filteredItems.length} items</span>
          {onDemand.length > 0 && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-pink-500" />
              {onDemand.length} on-demand
            </span>
          )}
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 py-16">Loading…</div>
      ) : filteredItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 py-16">
          <Calendar className="w-10 h-10 text-gray-300" />
          <p>No allocations for this day</p>
        </div>
      ) : (
        <div className="flex mx-4 mt-4 overflow-x-auto">
          {/* Time labels */}
          <div className="flex-shrink-0 w-14 relative" style={{ height: totalTimelineHeight }}>
            {SLOTS.map((slot, i) => (
              <div
                key={slot}
                className="absolute left-0 right-0 flex items-start justify-end pr-2"
                style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
              >
                <span className="text-xs text-gray-400 leading-none pt-0.5">{slot}</span>
              </div>
            ))}
          </div>

          {/* Job blocks area */}
          <div
            className="flex-1 relative ml-1 border-l border-gray-200"
            style={{ height: totalTimelineHeight }}
          >
            {/* Horizontal slot lines */}
            {SLOTS.map((slot, i) => (
              <div
                key={slot}
                className="absolute left-0 right-0 border-t border-gray-100"
                style={{ top: i * SLOT_HEIGHT }}
              />
            ))}

            {/* Job blocks */}
            {filteredItems.map((item) => {
              const { top, height } = getItemStyle(item);
              const style = JOB_STATUS_STYLE[item.status] ?? DEFAULT_STYLE;
              const isOnDemand = item._type === "on_demand";
              return (
                <div
                  key={`${item._type}-${item.id}`}
                  className={`absolute left-1 right-1 rounded-lg border px-2 py-1 overflow-hidden ${style.bg} ${style.border}`}
                  style={{ top: top + 1, height: height - 2 }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className={`text-xs font-semibold leading-tight truncate ${style.text}`}>
                      {itemTitle(item)}
                    </p>
                    {isOnDemand && (
                      <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-pink-600 bg-pink-50 border border-pink-200 rounded px-1">
                        <Zap className="w-2.5 h-2.5" />
                        OD
                      </span>
                    )}
                  </div>
                  {height >= 50 && (
                    <p className="text-[10px] text-gray-500 truncate">{itemProvider(item)}</p>
                  )}
                  {height >= 65 && itemCustomer(item) && (
                    <p className="text-[10px] text-gray-400 truncate">{itemCustomer(item)}</p>
                  )}
                  {height >= 80 && (
                    <span
                      className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${style.bg} ${style.text} border ${style.border}`}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
