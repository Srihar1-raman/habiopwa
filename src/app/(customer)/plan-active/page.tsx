"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Calendar,
  ChevronRight,
  Clock,
  Zap,
  PauseCircle,
  AlertTriangle,
  Plus,
  Home,
  Sparkles,
  ShieldCheck,
  Users,
  History,
} from "lucide-react";

interface PlanItem {
  id: string;
  title: string;
  frequency_label: string;
  unit_type: string;
  unit_value: number;
  minutes: number;
  price_monthly: number;
  service_categories?: { slug: string; name: string } | null;
}

interface PlanRequest {
  id: string;
  request_code: string;
  status: string;
  total_price_monthly: number;
  plan_start_date: string | null;
  plan_request_items: PlanItem[];
}

interface Job {
  id: string;
  scheduled_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  status: string;
  plan_request_items: { title: string; frequency_label: string } | null;
  service_providers: { name: string; provider_type: string | null } | null;
}

interface HistoryJob {
  id: string;
  scheduled_date: string;
  scheduled_start_time: string | null;
  status: string;
  plan_request_items: { title: string } | null;
  service_providers: { name: string } | null;
}

interface Provider {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  scheduled:            { label: "Scheduled",          color: "bg-blue-50 text-blue-700",    dot: "bg-blue-500" },
  scheduled_delayed:    { label: "Delayed",             color: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  in_progress:          { label: "In Progress",         color: "bg-amber-50 text-amber-700",  dot: "bg-amber-500" },
  in_progress_delayed:  { label: "In Progress (Late)",  color: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  completed:            { label: "Done",                color: "bg-green-50 text-green-700",  dot: "bg-green-500" },
  completed_delayed:    { label: "Done (Late)",         color: "bg-green-50 text-green-700",  dot: "bg-green-400" },
  cancelled_by_customer:{ label: "Cancelled",           color: "bg-red-50 text-red-600",      dot: "bg-red-500" },
  service_on_pause:     { label: "Paused",              color: "bg-purple-50 text-purple-700",dot: "bg-purple-500" },
  incomplete:           { label: "Incomplete",          color: "bg-gray-100 text-gray-600",   dot: "bg-gray-400" },
  cancelled:            { label: "Cancelled",           color: "bg-red-50 text-red-600",      dot: "bg-red-500" },
  missed:               { label: "Missed",              color: "bg-gray-100 text-gray-500",   dot: "bg-gray-400" },
  status_not_marked:    { label: "Not Marked",          color: "bg-gray-100 text-gray-600",   dot: "bg-gray-400" },
};

const BANNERS = [
  {
    bg: "bg-[#004aad]",
    title: "Subscription Home Services",
    sub: "Daily cleaning, cooking & more — on a schedule",
    Icon: Home,
  },
  {
    bg: "bg-[#1a5fc9]",
    title: "Flexible Plans",
    sub: "Choose exactly what you need — change anytime",
    Icon: Sparkles,
  },
  {
    bg: "bg-[#0057cc]",
    title: "Verified Professionals",
    sub: "Background-checked helpers for your home",
    Icon: ShieldCheck,
  },
];

function formatTime(t: string | null) {
  if (!t) return "—";
  const parts = t.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m} ${suffix}`;
}

function getLocalDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function subtractDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string) {
  const today = getLocalDateStr();
  const tomorrow = (() => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();
  if (dateStr === today) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

export default function PlanActivePage() {
  const router = useRouter();
  const [planRequest, setPlanRequest] = useState<PlanRequest | null>(null);
  const [todayJobs, setTodayJobs] = useState<Job[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [historyJobs, setHistoryJobs] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBanner, setActiveBanner] = useState(0);
  const [historyDateFilter, setHistoryDateFilter] = useState("");
  const [historyLoadingAll, setHistoryLoadingAll] = useState(false);
  const [allHistoryFetched, setAllHistoryFetched] = useState(false);
  const bannerTimer = useRef<NodeJS.Timeout | null>(null);

  async function loadAllHistory() {
    setHistoryLoadingAll(true);
    try {
      const res = await fetch("/api/customer/jobs/history?all=true");
      const d = await res.json();
      setHistoryJobs(d.jobs ?? []);
      setAllHistoryFetched(true);
    } catch {
      // keep existing data
    } finally {
      setHistoryLoadingAll(false);
    }
  }

  // Auto-rotate banners every 4 seconds
  useEffect(() => {
    bannerTimer.current = setInterval(() => {
      setActiveBanner((b) => (b + 1) % BANNERS.length);
    }, 4000);
    return () => { if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, []);

  useEffect(() => {
    const today = getLocalDateStr();
    const threeDaysAgo = subtractDays(today, 2);
    const futureDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today + "T00:00:00");
      d.setDate(d.getDate() + i + 1);
      return d.toISOString().split("T")[0];
    });

    Promise.all([
      fetch("/api/plan/current").then((r) => r.json()),
      fetch(`/api/customer/jobs/${today}`).then((r) => r.json()),
      ...futureDates.map((d) => fetch(`/api/customer/jobs/${d}`).then((r) => r.json())),
      fetch("/api/customer/providers").then((r) => r.json()),
      // Fetch all jobs from last 3 days (all statuses, including incomplete/cancelled)
      fetch(`/api/customer/jobs/history?from=${threeDaysAgo}&to=${today}`).then((r) => r.json()),
    ]).then(([planData, todayData, ...rest]) => {
      const futureData = rest.slice(0, futureDates.length);
      const providersData = rest[futureDates.length];
      const historyData = rest[futureDates.length + 1];

      setPlanRequest(planData.planRequest ?? null);
      setTodayJobs(todayData.jobs ?? []);
      setUpcomingJobs(futureData.flatMap((d: { jobs?: Job[] }) => d.jobs ?? []));
      setProviders(providersData.providers ?? []);
      setHistoryJobs(historyData.jobs ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (!planRequest || planRequest.status !== "active") {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center px-8 text-center gap-4">
        <Calendar className="w-12 h-12 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-900">No active plan</h2>
        <button
          onClick={() => router.push("/services")}
          className="px-6 py-3 bg-[#004aad] text-white rounded-2xl text-sm font-semibold"
        >
          Browse Services
        </button>
      </div>
    );
  }

  const banner = BANNERS[activeBanner];
  const hasTodayJobs = todayJobs.length > 0;
  const activeJobs = todayJobs.filter((j) => ["scheduled", "scheduled_delayed", "in_progress", "in_progress_delayed"].includes(j.status));
  const completedJobs = todayJobs.filter((j) => j.status.startsWith("completed"));
  const cancelledJobs = todayJobs.filter((j) => ["cancelled_by_customer", "service_on_pause", "incomplete", "cancelled", "status_not_marked"].includes(j.status));

  // historyJobs already contains last 3 days (fetched with from/to params)
  // filteredHistory: if user picks a specific date, show only that day; otherwise show what was fetched (3 days)
  const filteredHistory = historyDateFilter
    ? historyJobs.filter((j) => j.scheduled_date === historyDateFilter)
    : historyJobs; // already scoped to 3 days by API, or all if showAllHistory was triggered via a separate fetch

  return (
    <div className="flex flex-col min-h-dvh pb-10">
      {/* App bar */}
      <div className="px-4 pt-12 pb-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#004aad] flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-xl font-bold text-[#004aad]">HABIO</span>
          </div>
          <button
            onClick={() => router.push("/profile")}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
            aria-label="My Profile"
          >
            <User className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Banner */}
      <div className="px-4 mt-2">
        <div
          className={`${banner.bg} rounded-2xl px-5 py-8 text-white transition-all duration-500`}
        >
          <div className="mb-3">
            <banner.Icon className="w-10 h-10 text-white/80" />
          </div>
          <h2 className="text-xl font-bold leading-snug">{banner.title}</h2>
          <p className="text-sm text-blue-100 mt-1.5">{banner.sub}</p>
        </div>
        <div className="flex justify-center gap-1.5 mt-3">
          {BANNERS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activeBanner ? "bg-[#004aad] w-5" : "bg-gray-300 w-1.5"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push("/on-demand")}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left flex flex-col gap-2 active:scale-[0.97] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-pink-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800">On-Demand Job</p>
          </button>
          <button
            onClick={() => router.push("/pause-request")}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left flex flex-col gap-2 active:scale-[0.97] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
              <PauseCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Pause Plan</p>
          </button>
          <button
            onClick={() => router.push("/add-service")}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left flex flex-col gap-2 active:scale-[0.97] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Add Service</p>
          </button>
          <button
            onClick={() => router.push("/issues")}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left flex flex-col gap-2 active:scale-[0.97] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Raise Issue</p>
          </button>
        </div>
      </div>

      {/* Today's Jobs */}
      <div className="px-4 mt-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Today&apos;s Jobs</h2>

        {!hasTodayJobs ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400 text-sm">
            No jobs scheduled for today
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todayJobs.map((job) => {
              const cfg = STATUS_CONFIG[job.status] ?? { label: job.status, color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
              return (
                <div key={job.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-medium text-gray-900 text-sm flex-1 leading-snug">
                      {job.plan_request_items?.title ?? "Service"}
                    </p>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    <span>{formatTime(job.scheduled_start_time)} – {formatTime(job.scheduled_end_time)}</span>
                    {job.service_providers?.name && (
                      <>
                        <span>·</span>
                        <span>{job.service_providers.name}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {(activeJobs.length > 0 || completedJobs.length > 0 || cancelledJobs.length > 0) && (
              <div className="flex gap-2 mt-1 flex-wrap">
                {activeJobs.length > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                    {activeJobs.length} active
                  </span>
                )}
                {completedJobs.length > 0 && (
                  <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                    {completedJobs.length} done
                  </span>
                )}
                {cancelledJobs.length > 0 && (
                  <span className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium">
                    {cancelledJobs.length} cancelled/paused
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card A — My Providers */}
      {providers.length > 0 && (
        <div className="px-4 mt-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[#004aad]" />
            <h2 className="text-base font-semibold text-gray-900">My Providers</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/providers/${p.id}`)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card B — Recent Jobs */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#004aad]" />
            <h2 className="text-base font-semibold text-gray-900">
              {historyDateFilter ? "Job History" : allHistoryFetched ? "All Past Jobs" : "Recent Jobs (3 days)"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={historyDateFilter}
              onChange={(e) => setHistoryDateFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#004aad]/30"
            />
            {historyDateFilter && (
              <button
                onClick={() => setHistoryDateFilter("")}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400 text-sm">
            {historyDateFilter ? "No jobs on this date." : "No jobs in the last 3 days."}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {filteredHistory.map((job) => {
              const cfg = STATUS_CONFIG[job.status] ?? { label: job.status, color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
              return (
                <div key={job.id} className="flex items-start justify-between px-4 py-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {job.plan_request_items?.title ?? "Service"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                      <span>
                        {new Date(job.scheduled_date + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "numeric", month: "short",
                        })}
                      </span>
                      {job.scheduled_start_time && (
                        <>
                          <span>·</span>
                          <span>{formatTime(job.scheduled_start_time)}</span>
                        </>
                      )}
                      {job.service_providers?.name && (
                        <>
                          <span>·</span>
                          <span className="truncate">{job.service_providers.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
            {!historyDateFilter && !allHistoryFetched && (
              <button
                onClick={loadAllHistory}
                disabled={historyLoadingAll}
                className="w-full px-4 py-3 text-xs text-[#004aad] font-semibold text-center hover:bg-blue-50 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {historyLoadingAll ? "Loading…" : (<>See more <ChevronRight className="w-3.5 h-3.5" /></>)}
              </button>
            )}
            {!historyDateFilter && allHistoryFetched && (
              <p className="w-full px-4 py-2 text-xs text-gray-400 text-center">All jobs loaded</p>
            )}
            {historyDateFilter && (
              <button
                onClick={() => setHistoryDateFilter("")}
                className="w-full px-4 py-3 text-xs text-gray-500 text-center hover:bg-gray-50"
              >
                Show last 3 days
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upcoming Schedule */}
      {upcomingJobs.length > 0 && (
        <div className="px-4 mt-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Upcoming Schedule</h2>
          <div className="flex flex-col gap-2">
            {upcomingJobs.slice(0, 8).map((job) => {
              const cfg = STATUS_CONFIG[job.status] ?? { label: job.status, color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
              return (
                <div key={job.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-gray-900 text-sm flex-1 leading-snug">
                      {job.plan_request_items?.title ?? "Service"}
                    </p>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateLabel(job.scheduled_date)} · {formatTime(job.scheduled_start_time)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

      {/* Upcoming Schedule */}