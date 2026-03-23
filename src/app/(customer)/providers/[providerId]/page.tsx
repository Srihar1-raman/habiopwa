"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled:            { label: "Scheduled",         color: "bg-blue-50 text-blue-700" },
  scheduled_delayed:    { label: "Delayed",            color: "bg-orange-50 text-orange-700" },
  in_progress:          { label: "In Progress",        color: "bg-amber-50 text-amber-700" },
  in_progress_delayed:  { label: "In Progress (Late)", color: "bg-orange-50 text-orange-700" },
  completed:            { label: "Done",               color: "bg-green-50 text-green-700" },
  completed_delayed:    { label: "Done (Late)",        color: "bg-green-50 text-green-700" },
  cancelled_by_customer:{ label: "Cancelled",          color: "bg-red-50 text-red-600" },
  service_on_pause:     { label: "Paused",             color: "bg-purple-50 text-purple-700" },
  incomplete:           { label: "Incomplete",         color: "bg-gray-100 text-gray-600" },
  cancelled:            { label: "Cancelled",          color: "bg-red-50 text-red-600" },
  missed:               { label: "Missed",             color: "bg-gray-100 text-gray-500" },
  status_not_marked:    { label: "Not Marked",         color: "bg-gray-100 text-gray-600" },
};

interface ProviderDetail {
  id: string;
  name: string;
  provider_type: string | null;
  status: string;
  phone: string | null;
}

interface Job {
  id: string;
  scheduled_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  status: string;
  plan_request_items: { title: string; frequency_label: string | null } | null;
}

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function subtractDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CustomerProviderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params.providerId as string;

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showAll, setShowAll] = useState(false);
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetch(`/api/customer/providers/${providerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok === false) {
          setLoading(false);
          return;
        }
        setProvider(d.provider ?? null);
        setAllJobs(d.allJobs ?? []);
        setTotalJobs(d.totalJobs ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [providerId]);

  const today = getLocalDateStr();
  const threeDaysAgo = subtractDays(today, 2);

  const recentJobs = allJobs.filter(
    (j) => j.scheduled_date >= threeDaysAgo && j.scheduled_date <= today
  );

  const filteredJobs = dateFilter
    ? allJobs.filter((j) => j.scheduled_date === dateFilter)
    : showAll
    ? allJobs
    : recentJobs;

  const scheduledJobs = allJobs.filter(
    (j) => j.scheduled_date >= today &&
      (j.status === "scheduled" || j.status === "scheduled_delayed")
  );

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
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">{provider.name}</h1>
          {provider.provider_type && (
            <p className="text-xs text-gray-400">{provider.provider_type.replace(/_/g, " ")}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${provider.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {provider.status}
        </span>
      </div>

      <div className="px-4 mt-3 flex flex-col gap-4">
        {/* Provider Info Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400">Type</p>
              <p className="text-sm font-medium text-gray-800">
                {provider.provider_type?.replace(/_/g, " ") ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Jobs With You</p>
              <p className="text-sm font-medium text-gray-800">{totalJobs}</p>
            </div>
            {scheduledJobs.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-1">Upcoming Scheduled</p>
                {scheduledJobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                    <Clock className="w-3 h-3 text-[#004aad] flex-shrink-0" />
                    <span>{job.plan_request_items?.title ?? "Service"}</span>
                    <span>·</span>
                    <span>{new Date(job.scheduled_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    <span>{formatTime(job.scheduled_start_time)}</span>
                  </div>
                ))}
                {scheduledJobs.length > 3 && (
                  <p className="text-xs text-gray-400 mt-1">+{scheduledJobs.length - 3} more</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Jobs History */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {dateFilter ? "Jobs on this date" : showAll ? "All Jobs" : "Recent Jobs (3 days)"}
              </h2>
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setShowAll(false); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#004aad]/30"
            />
          </div>

          {filteredJobs.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">
              {dateFilter ? "No jobs on this date." : "No jobs in the last 3 days."}
            </p>
          ) : (
            filteredJobs.map((job) => {
              const cfg = STATUS_CONFIG[job.status] ?? { label: job.status, color: "bg-gray-100 text-gray-600" };
              return (
                <div key={job.id} className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {job.plan_request_items?.title ?? "Service"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                      <span>
                        {new Date(job.scheduled_date + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                      {job.scheduled_start_time && (
                        <>
                          <span>·</span>
                          <span>{formatTime(job.scheduled_start_time)}</span>
                          {job.scheduled_end_time && (
                            <span>– {formatTime(job.scheduled_end_time)}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })
          )}

          {/* See more / show less */}
          {!dateFilter && (
            !showAll && allJobs.length > recentJobs.length ? (
              <button
                onClick={() => setShowAll(true)}
                className="w-full px-4 py-3 text-xs text-[#004aad] font-semibold text-center hover:bg-blue-50 flex items-center justify-center gap-1"
              >
                See all {allJobs.length} jobs <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : showAll && allJobs.length > recentJobs.length ? (
              <button
                onClick={() => setShowAll(false)}
                className="w-full px-4 py-3 text-xs text-gray-500 text-center hover:bg-gray-50"
              >
                Show less
              </button>
            ) : null
          )}
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="w-full px-4 py-3 text-xs text-gray-500 text-center hover:bg-gray-50"
            >
              Clear date filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
