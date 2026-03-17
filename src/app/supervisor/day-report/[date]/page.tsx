"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  status: string;
  service_providers: { name: string } | null;
  plan_request_items: { title: string } | null;
  customers: { name: string | null } | null;
}

interface DaySummary {
  total: number;
  completed: number;
  delayed: number;
  cancelled: number;
}

interface Provider {
  id: string;
  name: string;
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function DayReportPage() {
  const router = useRouter();
  const params = useParams();
  const date = params.date as string;

  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [reallocateId, setReallocateId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/supervisor/day-report/${date}`).then((r) => r.json()),
      fetch("/api/supervisor/team").then((r) => r.json()),
    ]).then(([reportData, teamData]) => {
      setSummary(reportData.summary ?? null);
      setAllocations(reportData.allocations ?? []);
      setProviders(teamData.providers ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  function navigate(days: number) {
    router.push(`/supervisor/day-report/${offsetDate(date, days)}`);
  }

  async function handleReallocate(allocationId: string) {
    if (!selectedProvider) return;
    setSubmitting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/supervisor/jobs/${allocationId}/reallocate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider_id: selectedProvider }),
      });
      if (res.ok) {
        setReallocateId(null);
        setSelectedProvider("");
        load();
      } else {
        const d = await res.json();
        setActionError(d.error ?? "Reallocation failed.");
      }
    } catch {
      setActionError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(allocationId: string) {
    if (!confirm("Cancel this job allocation?")) return;
    try {
      await fetch(`/api/supervisor/jobs/${allocationId}/cancel`, { method: "PATCH" });
      load();
    } catch {
      // silently ignore
    }
  }

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col min-h-dvh pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1">Day Report</h1>
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

      <div className="px-4 mt-3 flex flex-col gap-4">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : !summary ? (
          <div className="py-16 text-center text-gray-400">No data for this day</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total", value: summary.total, color: "text-gray-800" },
                { label: "Completed", value: summary.completed, color: "text-green-700" },
                { label: "Delayed", value: summary.delayed, color: "text-orange-600" },
                { label: "Cancelled", value: summary.cancelled, color: "text-red-600" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center"
                >
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Allocations list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-50">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  All Allocations
                </h2>
              </div>
              {allocations.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-400">No allocations</p>
              ) : (
                allocations.map((alloc) => (
                  <div key={alloc.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {alloc.scheduled_start_time && (
                            <span className="text-xs font-bold text-[#004aad] flex-shrink-0">
                              {alloc.scheduled_start_time.slice(0, 5)}
                            </span>
                          )}
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {alloc.plan_request_items?.title ?? "—"}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {alloc.service_providers?.name ?? "Unassigned"}
                          {alloc.customers?.name && ` · ${alloc.customers.name}`}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          STATUS_COLORS[alloc.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {alloc.status.replace("_", " ")}
                      </span>
                    </div>

                    {/* Actions */}
                    {!["completed", "cancelled"].includes(alloc.status) && (
                      <>
                        {reallocateId === alloc.id ? (
                          <div className="mt-2 flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                              <select
                                className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                                value={selectedProvider}
                                onChange={(e) => setSelectedProvider(e.target.value)}
                              >
                                <option value="">Select provider</option>
                                {providers.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => setReallocateId(null)}
                                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            {actionError && (
                              <p className="text-xs text-red-600">{actionError}</p>
                            )}
                            <Button
                              size="sm"
                              loading={submitting}
                              disabled={!selectedProvider}
                              onClick={() => handleReallocate(alloc.id)}
                            >
                              Confirm Reallocation
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => {
                                setReallocateId(alloc.id);
                                setSelectedProvider("");
                                setActionError("");
                              }}
                              className="text-xs text-[#004aad] border border-[#004aad]/30 rounded-lg px-3 py-1.5 hover:bg-blue-50"
                            >
                              Reallocate
                            </button>
                            <button
                              onClick={() => handleCancel(alloc.id)}
                              className="text-xs text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
