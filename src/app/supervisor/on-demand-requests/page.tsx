"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  allocated: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

interface OnDemandRequest {
  id: string;
  status: string;
  request_date: string | null;
  request_time_preference: string | null;
  customer_notes: string | null;
  customers: { name: string | null; phone: string } | null;
  service_jobs: { name: string } | null;
}

interface Provider {
  id: string;
  name: string;
  provider_type: string | null;
}

interface AvailabilityResult {
  is_available: boolean;
  conflicts: { start: string; end: string; title: string }[];
}

interface AllocationFormState {
  service_provider_id: string;
  allocated_date: string;
  allocated_start_time: string;
  allocated_end_time: string;
}

/** Parses a time preference string like "10:00-11:00" into start/end times. Returns null for named preferences (morning/afternoon/etc). */
function parseTimePreference(pref: string | null): { start: string; end: string } | null {
  if (!pref) return null;
  const match = pref.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (match) return { start: match[1].padStart(5, "0"), end: match[2].padStart(5, "0") };
  return null;
}

export default function OnDemandRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<OnDemandRequest[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [formState, setFormState] = useState<AllocationFormState>({
    service_provider_id: "",
    allocated_date: "",
    allocated_start_time: "",
    allocated_end_time: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/supervisor/on-demand-requests").then((r) => r.json()),
      fetch("/api/supervisor/team").then((r) => r.json()),
    ]).then(([reqData, teamData]) => {
      setRequests(reqData.requests ?? []);
      setProviders(teamData.providers ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-check availability when provider + date + times are filled
  useEffect(() => {
    const { service_provider_id, allocated_date, allocated_start_time, allocated_end_time } = formState;
    if (!service_provider_id || !allocated_date || !allocated_start_time || !allocated_end_time) {
      setAvailability(null);
      return;
    }
    setCheckingAvail(true);
    const params = new URLSearchParams({
      date: allocated_date,
      start_time: allocated_start_time,
      end_time: allocated_end_time,
    });
    fetch(`/api/supervisor/providers/availability?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const p = (d.providers ?? []).find((p: { id: string }) => p.id === service_provider_id);
        if (p) {
          setAvailability({ is_available: p.is_available, conflicts: p.conflicts ?? [] });
        } else {
          setAvailability(null);
        }
      })
      .catch(() => setAvailability(null))
      .finally(() => setCheckingAvail(false));
  }, [formState]);

  function openAllocationForm(req: OnDemandRequest) {
    const timeParsed = parseTimePreference(req.request_time_preference);
    setFormState({
      service_provider_id: "",
      allocated_date: req.request_date ?? "",
      allocated_start_time: timeParsed?.start ?? "",
      allocated_end_time: timeParsed?.end ?? "",
    });
    setAvailability(null);
    setSubmitError("");
    setOpenForm(req.id);
  }

  async function handleAllocate(id: string) {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/supervisor/on-demand-requests/${id}/allocate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      if (res.ok) {
        setOpenForm(null);
        load();
      } else {
        const d = await res.json();
        setSubmitError(d.error ?? "Allocation failed.");
      }
    } catch {
      setSubmitError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-dvh pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900">On-Demand Requests</h1>
        {!loading && (
          <span className="ml-auto text-xs text-gray-500">{requests.length} total</span>
        )}
      </div>

      <div className="px-4 mt-3 flex flex-col gap-3">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <Zap className="w-10 h-10 text-gray-300" />
            <p>No on-demand requests</p>
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
            >
              <div className="flex items-start justify-between mb-1.5">
                <p className="font-semibold text-gray-900 text-sm">
                  {req.service_jobs?.name ?? "—"}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${
                    STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {req.status}
                </span>
              </div>
              <p className="text-sm text-gray-700">
                {req.customers?.name ?? req.customers?.phone}
              </p>
              {req.customers?.name && (
                <p className="text-xs text-gray-400">{req.customers.phone}</p>
              )}

              {/* Request date + time preference */}
              <div className="flex flex-wrap gap-2 mt-2">
                {req.request_date && (
                  <span className="text-xs bg-blue-50 text-[#004aad] px-2 py-0.5 rounded-full font-medium">
                    {new Date(req.request_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                )}
                {req.request_time_preference && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {req.request_time_preference}
                  </span>
                )}
              </div>

              {req.customer_notes && (
                <p className="text-xs text-gray-500 mt-2 italic border-l-2 border-gray-200 pl-2">
                  &ldquo;{req.customer_notes}&rdquo;
                </p>
              )}

              {req.status === "pending" && (
                <>
                  {openForm === req.id ? (
                    <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
                      <select
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                        value={formState.service_provider_id}
                        onChange={(e) =>
                          setFormState((f) => ({ ...f, service_provider_id: e.target.value }))
                        }
                      >
                        <option value="">Select provider</option>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.provider_type ? ` · ${p.provider_type.replace(/_/g, " ")}` : ""}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                        value={formState.allocated_date}
                        onChange={(e) =>
                          setFormState((f) => ({ ...f, allocated_date: e.target.value }))
                        }
                      />
                      <div className="flex gap-2">
                        <input
                          type="time"
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                          value={formState.allocated_start_time}
                          onChange={(e) =>
                            setFormState((f) => ({ ...f, allocated_start_time: e.target.value }))
                          }
                        />
                        <input
                          type="time"
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                          value={formState.allocated_end_time}
                          onChange={(e) =>
                            setFormState((f) => ({ ...f, allocated_end_time: e.target.value }))
                          }
                        />
                      </div>

                      {/* Availability status */}
                      {checkingAvail && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                          Checking availability…
                        </div>
                      )}
                      {!checkingAvail && availability !== null && (
                        availability.is_available ? (
                          <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                            <span className="text-xs text-green-700 font-medium">Provider is available</span>
                          </div>
                        ) : (
                          <div className="bg-red-50 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                              <span className="text-xs text-red-700 font-medium">
                                Has {availability.conflicts.length} conflict{availability.conflicts.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            {availability.conflicts.slice(0, 2).map((c, i) => (
                              <p key={i} className="text-xs text-red-600 ml-6">
                                {c.title} · {c.start?.slice(0, 5)}–{c.end?.slice(0, 5)}
                              </p>
                            ))}
                          </div>
                        )
                      )}

                      {submitError && (
                        <p className="text-xs text-red-600">{submitError}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOpenForm(null)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          loading={submitting}
                          onClick={() => handleAllocate(req.id)}
                          className="flex-1"
                        >
                          Allocate
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => openAllocationForm(req)}
                      className="mt-3 w-full text-sm text-[#004aad] font-medium border border-[#004aad]/30 rounded-xl py-2 hover:bg-blue-50"
                    >
                      Allocate Provider
                    </button>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
