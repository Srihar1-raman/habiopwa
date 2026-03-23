"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, RefreshCw,
  CalendarDays, Users, Briefcase, Clock, BriefcaseMedical,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProviderDetail {
  id: string; name: string; phone: string | null;
  provider_type: string | null; status: string;
}

interface Stats { total: number; completed: number; scheduled: number; on_leave: boolean; }

interface Job {
  id: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  status: string;
  plan_request_items: { id: string; title: string; plan_request_id: string | null } | null;
  customers: { name: string | null } | null;
}

interface Leave {
  id: string; leave_start_date: string; leave_end_date: string;
  leave_type: string; status: string; created_at: string;
}

interface Customer {
  name: string; count: number; scheduled: number; plan_request_id: string | null;
}

interface AvailableProvider {
  id: string; name: string; provider_type: string | null;
  status: string; is_available: boolean; on_leave: boolean; is_day_off: boolean;
  conflicts: { id: string; start: string; end: string; title: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  active:      "bg-green-100 text-green-700",
  inactive:    "bg-gray-100 text-gray-500",
  on_leave:    "bg-yellow-100 text-yellow-700",
  scheduled:   "bg-blue-100 text-blue-700",
  completed:   "bg-green-100 text-green-700",
  in_progress: "bg-amber-100 text-amber-700",
  cancelled:   "bg-red-100 text-red-600",
  cancelled_by_customer: "bg-red-100 text-red-600",
  delayed:     "bg-orange-100 text-orange-600",
  approved:    "bg-green-100 text-green-700",
  pending:     "bg-gray-100 text-gray-600",
  rejected:    "bg-red-100 text-red-600",
};

const LEAVE_TYPES = ["casual_leave", "sick_leave", "emergency_leave", "other"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const JOB_PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function statusPill(status: string) {
  return STATUS_PILL[status] ?? "bg-gray-100 text-gray-600";
}

// Maps JS getDay() (0=Sun) to our day_of_week string
const JS_DOW_MAP: Record<number, string> = {
  0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday",
  4: "thursday", 5: "friday", 6: "saturday",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProviderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params.providerId as string;

  // ── Data ──
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [weekOffs, setWeekOffs] = useState<string[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<Job[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Leave form ──
  const [leaveForm, setLeaveForm] = useState({ start_date: "", end_date: "", leave_type: "casual_leave" });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [leaveSuccess, setLeaveSuccess] = useState(false);

  // ── Affected jobs / resolution ──
  const [resolvedJobs, setResolvedJobs] = useState<Record<string, "cancelled" | "reallocated">>({});
  const [reallocationJobId, setReallocationJobId] = useState<string | null>(null);
  const [availProviders, setAvailProviders] = useState<AvailableProvider[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState("");
  const [reallocationError, setReallocationError] = useState("");

  // ── Calendar ──
  const [calDate, setCalDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // ── Past jobs ──
  const [jobPage, setJobPage] = useState(1);
  const [jobDateFilter, setJobDateFilter] = useState("");

  // ── Fetch ──
  useEffect(() => {
    fetch(`/api/supervisor/team/${providerId}`)
      .then((r) => r.json())
      .then((d) => {
        setProvider(d.provider ?? null);
        setStats(d.stats ?? null);
        setWeekOffs(d.weekOffs ?? []);
        setRecentJobs(d.recentJobs ?? []);
        setScheduledJobs(d.scheduledJobs ?? []);
        setLeaves(d.leaves ?? []);
        setCustomers(d.customers ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [providerId]);

  // ── Affected jobs (derived) ──
  const affectedJobs = useMemo(() => {
    if (!leaveForm.start_date || !leaveForm.end_date) return [];
    return scheduledJobs.filter(
      (j) =>
        j.scheduled_date &&
        j.scheduled_date >= leaveForm.start_date &&
        j.scheduled_date <= leaveForm.end_date
    );
  }, [leaveForm.start_date, leaveForm.end_date, scheduledJobs]);

  // Reset resolutions when affected jobs change
  useEffect(() => { setResolvedJobs({}); setReallocationJobId(null); }, [affectedJobs]);

  const allAffectedResolved =
    affectedJobs.length === 0 ||
    affectedJobs.every((j) => resolvedJobs[j.id]);

  const canCreateLeave =
    !!leaveForm.start_date && !!leaveForm.end_date && !!leaveForm.leave_type && allAffectedResolved;

  // ── Calendar data ──
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDowMon = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;

  const jobsByDate = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of recentJobs) {
      if (!job.scheduled_date) continue;
      const d = new Date(job.scheduled_date + "T00:00:00");
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const arr = map.get(job.scheduled_date) ?? [];
        arr.push(job);
        map.set(job.scheduled_date, arr);
      }
    }
    return map;
  }, [recentJobs, calYear, calMonth]);

  function isLeaveDay(dateStr: string) {
    return leaves.some(
      (l) => l.status === "approved" && l.leave_start_date <= dateStr && l.leave_end_date >= dateStr
    );
  }

  function isWeekOffDay(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const dow = JS_DOW_MAP[d.getDay()];
    return weekOffs.includes(dow);
  }

  // ── Cancel job ──
  async function handleCancel(jobId: string) {
    const res = await fetch(`/api/supervisor/jobs/${jobId}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancellation_reason: "Provider leave management" }),
    });
    if (res.ok) {
      setResolvedJobs((prev) => ({ ...prev, [jobId]: "cancelled" }));
    }
  }

  // ── Reallocate: fetch providers ──
  async function handleReallocationOpen(job: Job) {
    setReallocationJobId(job.id);
    setAvailProviders([]);
    setAvailError("");
    setReallocationError("");
    if (!job.scheduled_date || !job.scheduled_start_time || !job.scheduled_end_time) return;
    setAvailLoading(true);
    try {
      const res = await fetch(
        `/api/supervisor/providers/availability?date=${job.scheduled_date}&start_time=${job.scheduled_start_time}&end_time=${job.scheduled_end_time}`
      );
      const d = await res.json();
      setAvailProviders((d.providers ?? []).filter((p: AvailableProvider) => p.id !== providerId));
    } catch {
      setAvailError("Failed to load providers.");
    } finally {
      setAvailLoading(false);
    }
  }

  // ── Reallocate: confirm ──
  async function handleReallocationConfirm(jobId: string, newProviderId: string) {
    setReallocationError("");
    const res = await fetch(`/api/supervisor/jobs/${jobId}/reallocate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_provider_id: newProviderId }),
    });
    if (res.ok) {
      setResolvedJobs((prev) => ({ ...prev, [jobId]: "reallocated" }));
      setReallocationJobId(null);
    } else {
      const d = await res.json();
      setReallocationError(d.error ?? "Reallocation failed.");
    }
  }

  // ── Submit leave ──
  async function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreateLeave) return;
    setLeaveSubmitting(true);
    setLeaveError("");
    try {
      const res = await fetch(`/api/supervisor/team/${providerId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leaveForm, status: "approved" }),
      });
      if (res.ok) {
        const d = await res.json();
        setLeaves((prev) => [d.leave, ...prev]);
        setLeaveSuccess(true);
        setLeaveForm({ start_date: "", end_date: "", leave_type: "casual_leave" });
        setResolvedJobs({});
        // Refresh stats
        fetch(`/api/supervisor/team/${providerId}`)
          .then((r) => r.json())
          .then((d) => { setStats(d.stats ?? null); setScheduledJobs(d.scheduledJobs ?? []); });
      } else {
        const d = await res.json();
        setLeaveError(d.error ?? "Failed to create leave.");
      }
    } catch {
      setLeaveError("Network error.");
    } finally {
      setLeaveSubmitting(false);
    }
  }

  // ── Past jobs (filtered + paginated) ──
  const filteredJobs = useMemo(() => {
    if (!jobDateFilter) return recentJobs;
    return recentJobs.filter((j) => j.scheduled_date === jobDateFilter);
  }, [recentJobs, jobDateFilter]);

  const visibleJobs = filteredJobs.slice(0, jobPage * JOB_PAGE_SIZE);
  const hasMore = visibleJobs.length < filteredJobs.length;

  // ── Day jobs (calendar) ──
  const selectedDayJobs = selectedDay ? (jobsByDate.get(selectedDay) ?? []) : [];

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="flex items-center px-4 pt-4 pb-2">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center text-gray-400">
        Provider not found
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Provider Profile</h1>
      </div>

      <div className="px-4 mt-3 flex flex-col gap-4">

        {/* ── Card 1: Overview ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-lg font-bold text-gray-900">{provider.name}</p>
              {provider.provider_type && (
                <p className="text-sm text-gray-500">{provider.provider_type.replace(/_/g, " ")}</p>
              )}
              {provider.phone && <p className="text-sm text-gray-400">{provider.phone}</p>}
              {weekOffs.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Week off:{" "}
                  <span className="font-medium text-gray-600">
                    {weekOffs.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}
                  </span>
                </p>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPill(provider.status)}`}>
              {provider.status.replace(/_/g, " ")}
            </span>
          </div>
          {stats && (
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-50">
              {[
                { label: "This Month", sub: "Total", value: stats.total, icon: <Briefcase className="w-3.5 h-3.5" /> },
                { label: "This Month", sub: "Done", value: stats.completed, icon: <CheckCircle className="w-3.5 h-3.5 text-green-500" /> },
                { label: "Upcoming", sub: "Scheduled", value: stats.scheduled, icon: <Clock className="w-3.5 h-3.5 text-blue-500" /> },
                { label: "Today", sub: "On Leave", value: stats.on_leave ? "Yes" : "No", icon: <BriefcaseMedical className="w-3.5 h-3.5 text-yellow-500" /> },
              ].map((s) => (
                <div key={s.sub} className="flex flex-col items-center gap-0.5">
                  <div className="text-gray-400">{s.icon}</div>
                  <p className="text-base font-bold text-gray-800">{s.value}</p>
                  <p className="text-[10px] font-medium text-gray-600">{s.sub}</p>
                  <p className="text-[9px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Card 2: Leave Management ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leave Management</h2>
          </div>
          <div className="p-4">
            {leaveSuccess && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-3 py-2 mb-3">
                <CheckCircle className="w-4 h-4" />
                <p className="text-sm font-medium">Leave approved and created.</p>
                <button className="ml-auto text-xs text-green-600 underline" onClick={() => setLeaveSuccess(false)}>New</button>
              </div>
            )}
            <form onSubmit={handleLeaveSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                  <input type="date" required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                  <input type="date" required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Leave Type</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, leave_type: e.target.value }))}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>

              {/* Affected jobs */}
              {affectedJobs.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
                  <p className="px-3 py-2 text-xs font-semibold text-amber-700 border-b border-amber-200">
                    {affectedJobs.length} scheduled job{affectedJobs.length !== 1 ? "s" : ""} in this period — resolve each before approving
                  </p>
                  {affectedJobs.map((job) => {
                    const resolved = resolvedJobs[job.id];
                    const isExpanded = reallocationJobId === job.id;
                    return (
                      <div key={job.id} className="px-3 py-2.5 border-b border-amber-100 last:border-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {job.plan_request_items?.title ?? "—"}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {job.scheduled_date ? fmt(job.scheduled_date) : "—"}
                              {job.scheduled_start_time && ` · ${job.scheduled_start_time.slice(0, 5)}`}
                              {job.customers?.name && ` · ${job.customers.name}`}
                            </p>
                          </div>
                          {resolved ? (
                            <span className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${resolved === "cancelled" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                              <CheckCircle className="w-3 h-3" />
                              {resolved === "cancelled" ? "Cancelled" : "Reallocated"}
                            </span>
                          ) : (
                            <div className="flex-shrink-0 flex gap-1">
                              <button type="button"
                                onClick={() => handleReallocationOpen(job)}
                                className="flex items-center gap-1 text-[11px] font-medium text-[#004aad] bg-blue-50 border border-blue-200 rounded-lg px-2 py-1"
                              >
                                <RefreshCw className="w-3 h-3" /> Reallocate
                              </button>
                              <button type="button"
                                onClick={() => handleCancel(job.id)}
                                className="flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1"
                              >
                                <XCircle className="w-3 h-3" /> Cancel
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Reallocation provider picker */}
                        {isExpanded && !resolved && (
                          <div className="mt-2 bg-white rounded-xl border border-blue-100 overflow-hidden">
                            {availLoading && (
                              <p className="px-3 py-2 text-xs text-gray-400">Loading providers…</p>
                            )}
                            {availError && (
                              <p className="px-3 py-2 text-xs text-red-500">{availError}</p>
                            )}
                            {reallocationError && (
                              <p className="px-3 py-2 text-xs text-red-500">{reallocationError}</p>
                            )}
                            {!availLoading && availProviders.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                disabled={!p.is_available}
                                onClick={() => handleReallocationConfirm(job.id, p.id)}
                                className={`w-full text-left px-3 py-2 border-b border-gray-50 last:border-0 flex items-center justify-between ${
                                  p.is_available ? "hover:bg-blue-50 cursor-pointer" : "opacity-40 cursor-not-allowed"
                                }`}
                              >
                                <span className="text-xs font-medium text-gray-700">{p.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  p.is_available ? "bg-green-100 text-green-700" :
                                  p.on_leave ? "bg-yellow-100 text-yellow-700" :
                                  p.is_day_off ? "bg-gray-100 text-gray-500" :
                                  "bg-red-50 text-red-500"
                                }`}>
                                  {p.is_available ? "Available" : p.on_leave ? "On leave" : p.is_day_off ? "Day off" : "Busy"}
                                </span>
                              </button>
                            ))}
                            <button type="button" onClick={() => setReallocationJobId(null)}
                              className="w-full text-center text-xs text-gray-400 py-2">
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {leaveError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{leaveError}</p>
              )}
              <Button type="submit" size="md" loading={leaveSubmitting} disabled={!canCreateLeave}>
                Create &amp; Approve Leave
              </Button>
            </form>

            {/* Existing leaves */}
            {leaves.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Existing Leaves</p>
                <div className="flex flex-col gap-2">
                  {leaves.map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-gray-700">
                          {fmt(leave.leave_start_date)} – {fmt(leave.leave_end_date)}
                        </p>
                        <p className="text-[11px] text-gray-400">{leave.leave_type.replace(/_/g, " ")}</p>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusPill(leave.status)}`}>
                        {leave.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Card 3: Calendar ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Calendar</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))} className="p-1 rounded-full hover:bg-gray-100">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-xs font-semibold text-gray-700 min-w-[80px] text-center">
                {calDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </span>
              <button onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))} className="p-1 rounded-full hover:bg-gray-100">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="px-3 pt-2 pb-3">
            {/* DOW headers */}
            <div className="grid grid-cols-7 mb-1">
              {DOW.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-1">
              {Array.from({ length: firstDowMon }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const hasJobs = (jobsByDate.get(dateStr)?.length ?? 0) > 0;
                const onLeave = isLeaveDay(dateStr);
                const onWeekOff = isWeekOffDay(dateStr);
                const isSelected = selectedDay === dateStr;
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={`flex flex-col items-center justify-center rounded-xl py-1.5 transition-colors ${
                      isSelected ? "bg-[#004aad] text-white" :
                      isToday ? "bg-blue-50 text-[#004aad] font-bold" :
                      onWeekOff ? "bg-gray-50" :
                      "hover:bg-gray-50"
                    }`}
                  >
                    <span className={`text-xs ${isSelected ? "text-white font-bold" : onWeekOff ? "text-gray-400" : "text-gray-700"}`}>{day}</span>
                    <div className="flex gap-0.5 mt-0.5 h-1.5">
                      {hasJobs && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-[#004aad]"}`} />}
                      {onLeave && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-yellow-200" : "bg-yellow-400"}`} />}
                      {onWeekOff && !onLeave && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-gray-300" : "bg-gray-400"}`} />}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Selected day jobs */}
            {selectedDay && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">{fmt(selectedDay)}</p>
                {isLeaveDay(selectedDay) && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-2 py-1 mb-2">
                    Provider on approved leave
                  </p>
                )}
                {isWeekOffDay(selectedDay) && !isLeaveDay(selectedDay) && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1 mb-2">
                    Scheduled weekly day off
                  </p>
                )}
                {selectedDayJobs.length === 0 ? (
                  <p className="text-xs text-gray-400">No jobs this day</p>
                ) : (
                  selectedDayJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-gray-700">{job.plan_request_items?.title ?? "—"}</p>
                        {job.customers?.name && <p className="text-[11px] text-gray-400">{job.customers.name}</p>}
                        {job.scheduled_start_time && (
                          <p className="text-[11px] text-gray-400">{job.scheduled_start_time.slice(0, 5)}</p>
                        )}
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusPill(job.status)}`}>
                        {job.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="px-3 pb-2 flex gap-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#004aad] inline-block" /> Jobs</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Leave</span>
            {weekOffs.length > 0 && (
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Week off</span>
            )}
          </div>
        </div>

        {/* ── Card 4: Customers Served ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customers Served</h2>
            <span className="ml-auto text-xs text-gray-400">{customers.length}</span>
          </div>
          {customers.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">No customers</p>
          ) : (
            customers.map((customer) => (
              <div key={customer.name} className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  {customer.plan_request_id ? (
                    <button
                      onClick={() => router.push(`/supervisor/households/${customer.plan_request_id}`)}
                      className="text-sm font-medium text-[#004aad] text-left truncate"
                    >
                      {customer.name}
                    </button>
                  ) : (
                    <p className="text-sm font-medium text-gray-800 truncate">{customer.name}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {customer.count} job{customer.count !== 1 ? "s" : ""}
                    {customer.scheduled > 0 && ` · ${customer.scheduled} upcoming`}
                  </p>
                </div>
                {customer.scheduled > 0 && (
                  <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {customer.scheduled} scheduled
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── Card 5: Past Jobs ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Jobs</h2>
          </div>
          <div className="px-4 py-3 border-b border-gray-50">
            <input
              type="date"
              value={jobDateFilter}
              onChange={(e) => { setJobDateFilter(e.target.value); setJobPage(1); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
            />
          </div>
          {visibleJobs.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">No jobs found</p>
          ) : (
            visibleJobs.map((job) => (
              <div key={job.id} className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {job.plan_request_items?.title ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {job.customers?.name ?? ""}
                    {job.scheduled_date ? ` · ${fmt(job.scheduled_date)}` : ""}
                  </p>
                </div>
                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusPill(job.status)}`}>
                  {job.status.replace(/_/g, " ")}
                </span>
              </div>
            ))
          )}
          {hasMore && (
            <div className="px-4 py-3">
              <button
                onClick={() => setJobPage((p) => p + 1)}
                className="w-full text-sm text-[#004aad] font-medium py-2 rounded-xl border border-blue-100 hover:bg-blue-50"
              >
                See more
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

