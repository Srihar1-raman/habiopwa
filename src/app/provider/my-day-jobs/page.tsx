"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import Link from "next/link";

interface PlanRequestItem {
  title: string;
  frequency_label: string;
  unit_type: string;
  unit_value: number;
}

interface CustomerProfile {
  flat_no: string;
  building: string;
  society: string;
  sector: string;
  city: string;
  pincode: string;
}

interface Customer {
  name: string;
  customer_profiles: CustomerProfile;
}

interface Job {
  id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  status: string;
  is_locked: boolean;
  supervisor_notes: string | null;
  plan_request_items: PlanRequestItem;
  customers: Customer;
}

interface Provider {
  id: string;
  name: string;
  phone: string;
  specialization: string;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-700 text-white",
  scheduled_delayed: "bg-orange-500 text-white",
  ongoing: "bg-amber-400 text-white",
  ongoing_delayed: "bg-orange-600 text-white",
  completed: "bg-green-600 text-white",
  completed_delayed: "bg-green-600 text-white",
  cancelled_by_customer: "bg-red-500 text-white",
  service_on_pause: "bg-purple-500 text-white",
  service_incomplete: "bg-gray-500 text-white",
  status_not_marked: "bg-gray-500 text-white",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(t: string | null) {
  if (!t) return "—";
  // Handle HH:MM:SS or HH:MM
  const parts = t.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m} ${suffix}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function MyDayJobsPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetch("/api/provider/me")
      .then((res) => {
        if (res.status === 401) { router.push("/provider/login"); return null; }
        return res.json();
      })
      .then((data) => { if (data?.provider) setProvider(data.provider); })
      .catch(() => router.push("/provider/login"));
  }, [router]);

  const fetchJobs = useCallback(async (d: string) => {
    setLoadingJobs(true);
    try {
      const endpoint = d === todayStr
        ? "/api/provider/jobs/today"
        : `/api/provider/jobs/by-date/${d}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => { fetchJobs(date); }, [date, fetchJobs]);

  async function handleStatusChange(allocationId: string, newStatus: string) {
    setActionLoading(allocationId);
    try {
      await fetch(`/api/provider/jobs/${allocationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchJobs(date);
    } finally {
      setActionLoading(null);
    }
  }

  const isToday = date === todayStr;

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="bg-[#004aad] px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">My Jobs</h1>
          {provider && (
            <p className="text-blue-200 text-xs mt-0.5">{provider.name}</p>
          )}
        </div>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button
          onClick={() => setDate((d) => addDays(d, -1))}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="text-center">
          <span className="text-sm font-semibold text-gray-800">{formatDate(date)}</span>
          {isToday && (
            <span className="ml-2 text-xs bg-[#004aad] text-white px-2 py-0.5 rounded-full">Today</span>
          )}
        </div>
        <button
          onClick={() => setDate((d) => addDays(d, 1))}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Jobs List */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3">
        {loadingJobs ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-gray-500 font-medium">No jobs for this date</p>
            <p className="text-gray-400 text-sm mt-1">Check another date using the arrows above</p>
          </div>
        ) : (
          jobs.map((job) => {
            const profile = job.customers.customer_profiles;
            const address = [profile.flat_no, profile.building, profile.society]
              .filter(Boolean)
              .join(", ");
            const statusStyle = STATUS_STYLES[job.status] ?? "bg-gray-500 text-white";
            const canStart = !job.is_locked && ["scheduled", "scheduled_delayed"].includes(job.status);
            const canEnd = !job.is_locked && ["ongoing", "ongoing_delayed"].includes(job.status);

            return (
              <div
                key={job.id}
                onClick={() => router.push(`/provider/jobs/${job.id}?date=${date}`)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-[0.99] transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-gray-900 text-sm leading-snug flex-1">
                    {job.plan_request_items.title}
                  </p>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusStyle}`}>
                    {formatStatus(job.status)}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-0.5">{job.customers.name}</p>
                <p className="text-xs text-gray-500 mb-3">{address}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                    {formatTime(job.scheduled_start_time)} – {formatTime(job.scheduled_end_time)}
                  </span>

                  {(canStart || canEnd) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(job.id, canStart ? "ongoing" : "completed");
                      }}
                      disabled={actionLoading === job.id}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition active:scale-95 disabled:opacity-60 ${
                        canStart
                          ? "bg-[#004aad] text-white"
                          : "bg-green-600 text-white"
                      }`}
                    >
                      {actionLoading === job.id
                        ? "…"
                        : canStart
                        ? "Start Job"
                        : "End Job"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-100 bg-white">
        <Link
          href="/provider/profile"
          className="flex items-center gap-1 text-sm text-[#004aad] font-medium"
        >
          <User className="w-4 h-4" />
          My Profile →
        </Link>
      </div>
    </div>
  );
}
