"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, MapPin, FileText, Info } from "lucide-react";

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
  const parts = t.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m} ${suffix}`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right">{value}</span>
    </div>
  );
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const allocationId = params.allocationId as string;
  const dateParam = searchParams.get("date");

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadJob() {
      setLoading(true);
      setError("");
      const today = new Date().toISOString().split("T")[0];

      // Determine dates to search: prefer dateParam, else today ± 1
      const datesToTry = dateParam
        ? [dateParam]
        : [today, addDays(today, -1), addDays(today, 1)];

      for (const d of datesToTry) {
        const endpoint = d === today ? "/api/provider/jobs/today" : `/api/provider/jobs/by-date/${d}`;
        try {
          const res = await fetch(endpoint);
          if (!res.ok) {
            if (res.status === 401) { router.push("/provider/login"); return; }
            continue;
          }
          const data = await res.json();
          const found = (data.jobs ?? []).find((j: Job) => j.id === allocationId);
          if (found) { setJob(found); setLoading(false); return; }
        } catch {
          // try next date
        }
      }

      setError("Job not found.");
      setLoading(false);
    }
    loadJob();
  }, [allocationId, dateParam, router]);

  async function handleStatusChange(newStatus: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/provider/jobs/${allocationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.job && job) {
        // The API returns the raw job row without nested relations.
        // Merge the updated fields while preserving the nested data already loaded.
        setJob({
          ...job,
          status: data.job.status ?? newStatus,
          actual_start_time: data.job.actual_start_time ?? job.actual_start_time,
          actual_end_time: data.job.actual_end_time ?? job.actual_end_time,
          is_locked: data.job.is_locked ?? job.is_locked,
        });
      } else if (job) {
        setJob({ ...job, status: newStatus });
      }
    } finally {
      setActionLoading(false);
    }
  }

  function addDays(dateStr: string, days: number) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  const backHref = "/provider/my-day-jobs";

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="bg-[#004aad] px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push(backHref)}
          className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-bold text-base">Job Detail</h1>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-gray-500">{error}</p>
            <button
              onClick={() => router.push("/provider/my-day-jobs")}
              className="mt-4 text-[#004aad] text-sm font-medium"
            >
              ← Back to My Jobs
            </button>
          </div>
        ) : job ? (
          <>
            {/* Title + Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2 className="text-base font-bold text-gray-900 flex-1">
                  {job.plan_request_items?.title ?? "Service"}
                </h2>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[job.status] ?? "bg-gray-500 text-white"}`}
                >
                  {formatStatus(job.status)}
                </span>
              </div>
              {job.is_locked && (
                <span className="text-xs text-gray-400 italic">🔒 Locked</span>
              )}
            </div>

            {/* Customer & Address */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-[#004aad]" />
                <span className="text-sm font-semibold text-gray-700">Customer & Address</span>
              </div>
              <Row label="Customer" value={job.customers.name} />
              <Row
                label="Flat / Building"
                value={[job.customers.customer_profiles.flat_no, job.customers.customer_profiles.building].filter(Boolean).join(", ")}
              />
              <Row label="Society" value={job.customers.customer_profiles.society} />
              {job.customers.customer_profiles.sector && (
                <Row label="Sector" value={job.customers.customer_profiles.sector} />
              )}
              <Row
                label="City"
                value={`${job.customers.customer_profiles.city} – ${job.customers.customer_profiles.pincode}`}
              />
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[#004aad]" />
                <span className="text-sm font-semibold text-gray-700">Schedule</span>
              </div>
              <Row
                label="Scheduled"
                value={`${formatTime(job.scheduled_start_time)} → ${formatTime(job.scheduled_end_time)}`}
              />
              {job.actual_start_time && (
                <Row label="Actual Start" value={formatTime(job.actual_start_time)} />
              )}
              {job.actual_end_time && (
                <Row label="Actual End" value={formatTime(job.actual_end_time)} />
              )}
            </div>

            {/* Job Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[#004aad]" />
                <span className="text-sm font-semibold text-gray-700">Job Info</span>
              </div>
              <Row label="Frequency" value={job.plan_request_items?.frequency_label ?? "—"} />
              <Row
                label="Quantity"
                value={`${job.plan_request_items?.unit_value ?? "—"} ${job.plan_request_items?.unit_type ?? ""}`}
              />
            </div>

            {/* Supervisor Notes */}
            {job.supervisor_notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">Supervisor Notes</span>
                </div>
                <p className="text-sm text-amber-800">{job.supervisor_notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            {!job.is_locked && (
              <div className="mt-auto pt-2">
                {["scheduled", "scheduled_delayed"].includes(job.status) && (
                  <button
                    onClick={() => handleStatusChange("ongoing")}
                    disabled={actionLoading}
                    className="w-full bg-[#004aad] text-white font-semibold rounded-xl py-3.5 text-base disabled:opacity-60 active:scale-95 transition"
                  >
                    {actionLoading ? "Updating…" : "▶ Start Job"}
                  </button>
                )}
                {["ongoing", "ongoing_delayed"].includes(job.status) && (
                  <button
                    onClick={() => handleStatusChange("completed")}
                    disabled={actionLoading}
                    className="w-full bg-green-600 text-white font-semibold rounded-xl py-3.5 text-base disabled:opacity-60 active:scale-95 transition"
                  >
                    {actionLoading ? "Updating…" : "✓ End Job"}
                  </button>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
