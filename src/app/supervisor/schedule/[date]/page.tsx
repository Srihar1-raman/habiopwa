"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-600",
  cancelled: "bg-red-100 text-red-700",
  delayed: "bg-orange-100 text-orange-600",
};

interface Allocation {
  id: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  status: string;
  service_providers: { name: string; provider_type: string | null } | null;
  plan_request_items: { title: string } | null;
  customers: { name: string | null; customer_profiles: { flat_no: string | null; society: string | null } | null } | null;
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function SchedulePage() {
  const router = useRouter();
  const params = useParams();
  const date = params.date as string;

  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/supervisor/schedule/${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const sorted = (d.allocations ?? []).sort((a: Allocation, b: Allocation) =>
          (a.scheduled_start_time ?? "").localeCompare(b.scheduled_start_time ?? "")
        );
        setAllocations(sorted);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date]);

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  function navigate(days: number) {
    router.push(`/supervisor/schedule/${offsetDate(date, days)}`);
  }

  return (
    <div className="flex flex-col min-h-dvh pb-8">
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
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#004aad]" />
          <span className="text-sm font-semibold text-gray-700">{displayDate}</span>
        </div>
        <button
          onClick={() => navigate(1)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="px-4 mt-3 flex flex-col gap-3">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : allocations.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <Calendar className="w-10 h-10 text-gray-300" />
            <p>No allocations for this day</p>
          </div>
        ) : (
          allocations.map((alloc) => (
            <div
              key={alloc.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-3"
            >
              {/* Time slot */}
              <div className="flex-shrink-0 w-16 text-center">
                <p className="text-xs font-bold text-[#004aad]">
                  {alloc.scheduled_start_time?.slice(0, 5) ?? "--:--"}
                </p>
                {alloc.scheduled_end_time && (
                  <p className="text-xs text-gray-400">
                    {alloc.scheduled_end_time.slice(0, 5)}
                  </p>
                )}
              </div>
              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {alloc.plan_request_items?.title ?? "—"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {alloc.service_providers?.name ?? "Unassigned"}
                </p>
                {alloc.customers?.name && (
                  <p className="text-xs text-gray-400 truncate">{alloc.customers.name}</p>
                )}
              </div>
              <span
                className={`self-start flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                  STATUS_COLORS[alloc.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {alloc.status.replace("_", " ")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
