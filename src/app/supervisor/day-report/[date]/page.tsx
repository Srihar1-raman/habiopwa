"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-600",
  scheduled_delayed: "bg-orange-100 text-orange-600",
  in_progress: "bg-blue-100 text-blue-700",
  in_progress_delayed: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  completed_delayed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  cancelled_by_customer: "bg-red-100 text-red-600",
  service_on_pause: "bg-yellow-100 text-yellow-700",
  incomplete: "bg-red-200 text-red-800",
  status_not_marked: "bg-gray-100 text-gray-600",
};

const ACTIONABLE_STATUSES = new Set([
  "scheduled",
  "scheduled_delayed",
  "in_progress",
  "in_progress_delayed",
]);

interface Allocation {
  id: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  status: string;
  cancellation_reason: string | null;
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

interface ProviderAvailability {
  id: string;
  name: string;
  provider_type: string | null;
  is_available: boolean;
  is_day_off: boolean;
  on_leave: boolean;
  is_busy: boolean;
  conflicts: { id: string; start: string; end: string; title: string }[];
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DayReportPage() {
  const router = useRouter();
  const params = useParams();
  const date = params.date as string;

  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reallocateId, setReallocateId] = useState<string | null>(null);
  const [availabilityProviders, setAvailabilityProviders] = useState<ProviderAvailability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedProviderAvail, setSelectedProviderAvail] = useState<ProviderAvailability | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const isPast = date < getToday();

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/supervisor/day-report/${date}`)
      .then((r) => r.json())
      .then((reportData) => {
        setSummary(reportData.summary ?? null);
        setAllocations(reportData.allocations ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  function navigate(days: number) {
    router.push(`/supervisor/day-report/${offsetDate(date, days)}`);
  }

  function openReallocate(alloc: Allocation) {
    setReallocateId(alloc.id);
    setSelectedProvider("");
    setSelectedProviderAvail(null);
    setActionError("");
    setAvailabilityProviders([]);
    setAvailabilityLoading(true);

    const qs = new URLSearchParams({ date });
    if (alloc.scheduled_start_time) qs.set("start_time", alloc.scheduled_start_time.slice(0, 5));
    if (alloc.scheduled_end_time) qs.set("end_time", alloc.scheduled_end_time.slice(0, 5));

    fetch(`/api/supervisor/providers/availability?${qs}`)
      .then((r) => r.json())
      .then((d) => setAvailabilityProviders(d.providers ?? []))
      .catch(() => {})
      .finally(() => setAvailabilityLoading(false));
  }

  function handleProviderSelect(providerId: string) {
    setSelectedProvider(providerId);
    setSelectedProviderAvail(availabilityProviders.find((p) => p.id === providerId) ?? null);
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
        setAvailabilityProviders([]);
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
          onClick={() => router.push("/supervisor/dashboard")}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1">Day Report</h1>
        {isPast && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Past</span>
        )}
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#004aad]" />
          <span className="text-sm font-semibold text-gray-700">{displayDate}</span>
        </div>
        <button onClick={() => navigate(1)} className="p-2 rounded-full hover:bg-gray-100">
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
                        {alloc.cancellation_reason && (
                          <p className="text-xs text-red-500 mt-0.5">
                            Reason: {alloc.cancellation_reason}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          STATUS_COLORS[alloc.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {alloc.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Actions — only for actionable statuses and non-past dates */}
                    {!isPast && ACTIONABLE_STATUSES.has(alloc.status) && (
                      <>
                        {reallocateId === alloc.id ? (
                          <div className="mt-2 flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                              <select
                                className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                                value={selectedProvider}
                                onChange={(e) => handleProviderSelect(e.target.value)}
                                disabled={availabilityLoading}
                              >
                                <option value="">
                                  {availabilityLoading ? "Loading providers…" : "Select provider"}
                                </option>
                                {availabilityProviders.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}{p.is_available ? " ✓" : " ✗"}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  setReallocateId(null);
                                  setAvailabilityProviders([]);
                                }}
                                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Availability badge */}
                            {selectedProviderAvail && (
                              <div
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
                                  selectedProviderAvail.is_available
                                    ? "bg-green-50 text-green-700"
                                    : "bg-orange-50 text-orange-700"
                                }`}
                              >
                                {selectedProviderAvail.is_available ? (
                                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                )}
                                <span>
                                  {selectedProviderAvail.is_available
                                    ? "Available"
                                    : selectedProviderAvail.on_leave
                                    ? "Unavailable — On leave"
                                    : selectedProviderAvail.is_day_off
                                    ? "Unavailable — Day off"
                                    : selectedProviderAvail.is_busy
                                    ? `Unavailable — Busy: ${selectedProviderAvail.conflicts.map((c) => c.title).join(", ")}`
                                    : "Unavailable"}
                                </span>
                              </div>
                            )}

                            {actionError && (
                              <p className="text-xs text-red-600">{actionError}</p>
                            )}
                            <Button
                              size="sm"
                              loading={submitting}
                              disabled={!selectedProvider || submitting}
                              onClick={() => handleReallocate(alloc.id)}
                            >
                              Confirm Reallocation
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => openReallocate(alloc)}
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
