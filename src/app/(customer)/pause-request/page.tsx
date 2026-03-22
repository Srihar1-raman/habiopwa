"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CalendarDays } from "lucide-react";

interface PauseRequest {
  id: string;
  pause_type: string;
  pause_start_date: string;
  pause_end_date: string;
  status: string;
  reason?: string;
}

interface JobAllocation {
  id: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  plan_request_items: { title: string } | null;
  service_providers: { name: string } | null;
}

const PAUSE_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  active: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  reinstated: "bg-gray-100 text-gray-700",
};

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default function PauseRequestPage() {
  const router = useRouter();
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);
  const [planRequestId, setPlanRequestId] = useState<string | null>(null);
  const [pauseType, setPauseType] = useState<"single_job" | "entire_service">("entire_service");

  // entire_service state
  const [startDate, setStartDate] = useState(tomorrow());
  const [endDate, setEndDate] = useState("");

  // single_job state
  const [selectedJobDate, setSelectedJobDate] = useState("");
  const [jobsForDate, setJobsForDate] = useState<JobAllocation[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<PauseRequest[]>([]);

  const durationDays = startDate && endDate ? daysBetween(startDate, endDate) : 0;

  useEffect(() => {
    fetch("/api/plan/current")
      .then((r) => r.json())
      .then((data) => {
        const pr = data.planRequest ?? null;
        const active = !!(pr && pr.status === "active");
        setHasPlan(active);
        if (active) setPlanRequestId(pr.id);
      })
      .catch(() => setHasPlan(false));

    fetch("/api/customer/pause-request")
      .then((r) => r.json())
      .then((data) => setRequests(data.pauseRequests ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (pauseType !== "single_job" || !selectedJobDate) {
      setJobsForDate([]);
      setSelectedJobId("");
      return;
    }
    setLoadingJobs(true);
    setSelectedJobId("");
    fetch(`/api/customer/jobs/${selectedJobDate}`)
      .then((r) => r.json())
      .then((d) => setJobsForDate(d.jobs ?? []))
      .catch(() => setJobsForDate([]))
      .finally(() => setLoadingJobs(false));
  }, [selectedJobDate, pauseType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!planRequestId) {
      setError("Could not find your active plan. Please refresh and try again.");
      return;
    }
    if (pauseType === "entire_service" && (!startDate || !endDate)) {
      setError("Please select both start and end dates.");
      return;
    }
    if (pauseType === "single_job" && !selectedJobId) {
      setError("Please select a job to pause.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        plan_request_id: planRequestId,
        pause_type: pauseType,
        notes: notes || undefined,
      };
      if (pauseType === "entire_service") {
        body.pause_start_date = startDate;
        body.pause_end_date = endDate;
      } else {
        body.pause_start_date = selectedJobDate;
        body.job_allocation_id = selectedJobId;
      }
      const res = await fetch("/api/customer/pause-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      setSuccess(true);
      const updated = await fetch("/api/customer/pause-request").then((r) => r.json());
      setRequests(updated.pauseRequests ?? []);
    } catch {
      setError("Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-[480px] mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800 flex-1">Pause Service</h1>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        {hasPlan === null && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {hasPlan === false && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-sm text-gray-600 mb-4">You don&apos;t have an active plan to pause.</p>
            <button
              onClick={() => router.push("/services")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#004aad] text-white rounded-xl text-sm font-medium"
            >
              Explore Services
            </button>
          </div>
        )}

        {hasPlan === true && (
          <>
            {success && (
              <div className="bg-green-50 rounded-2xl border border-green-100 p-4">
                <p className="text-sm text-green-700 font-medium">
                  Pause request submitted! We&apos;ll review and confirm shortly.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-600">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pause Type */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Pause Type</p>
                <div className="space-y-2">
                  {[
                    { value: "entire_service", label: "Entire Service", sub: "Pause all scheduled services for a date range" },
                    { value: "single_job", label: "Single Job", sub: "Pause one specific scheduled job" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        pauseType === opt.value
                          ? "border-[#004aad] bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="pauseType"
                        value={opt.value}
                        checked={pauseType === (opt.value as "single_job" | "entire_service")}
                        onChange={() => {
                          setPauseType(opt.value as "single_job" | "entire_service");
                          setError(null);
                        }}
                        className="mt-0.5 accent-[#004aad]"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.sub}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Entire Service: date range */}
              {pauseType === "entire_service" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#004aad]" />
                    <p className="text-sm font-semibold text-gray-700">Pause Period</p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                    <input
                      type="date"
                      min={tomorrow()}
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (endDate && e.target.value >= endDate) setEndDate("");
                      }}
                      required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                    <input
                      type="date"
                      min={startDate || tomorrow()}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                    />
                  </div>

                  {startDate && endDate && durationDays > 0 && (
                    <div className="bg-blue-50 rounded-xl px-3 py-2">
                      <p className="text-xs text-[#004aad] font-medium">
                        Duration: {durationDays} {durationDays === 1 ? "day" : "days"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Single Job: pick date then job */}
              {pauseType === "single_job" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#004aad]" />
                    <p className="text-sm font-semibold text-gray-700">Select Job Date</p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Date</label>
                    <input
                      type="date"
                      min={tomorrow()}
                      value={selectedJobDate}
                      onChange={(e) => setSelectedJobDate(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                    />
                  </div>

                  {selectedJobDate && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Select Job</label>
                      {loadingJobs ? (
                        <div className="flex items-center gap-2 py-2">
                          <div className="w-4 h-4 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-gray-400">Loading jobs…</span>
                        </div>
                      ) : jobsForDate.length === 0 ? (
                        <p className="text-xs text-gray-400 py-1">No jobs scheduled for this date.</p>
                      ) : (
                        <select
                          value={selectedJobId}
                          onChange={(e) => setSelectedJobId(e.target.value)}
                          required
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]/30 bg-white"
                        >
                          <option value="">Choose a job…</option>
                          {jobsForDate.map((job) => (
                            <option key={job.id} value={job.id}>
                              {job.plan_request_items?.title ?? "Job"} — {job.scheduled_start_time?.slice(0, 5)}
                              {job.service_providers?.name ? ` · ${job.service_providers.name}` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any reason or additional info…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]/30 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={
                  submitting ||
                  (pauseType === "entire_service" && (!startDate || !endDate || durationDays <= 0)) ||
                  (pauseType === "single_job" && (!selectedJobDate || !selectedJobId))
                }
                className="w-full py-3.5 rounded-2xl bg-[#004aad] text-white font-semibold text-sm disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit Pause Request"}
              </button>
            </form>
          </>
        )}

        {/* Existing Requests */}
        {requests.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold text-gray-700 px-1">Previous Requests</p>
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-800">
                    {req.pause_type === "single_job" ? "Single Job" : "Entire Service"}
                  </p>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      PAUSE_STATUS_STYLES[req.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {req.pause_start_date}
                  {req.pause_end_date && req.pause_end_date !== req.pause_start_date
                    ? ` → ${req.pause_end_date}`
                    : ""}
                </p>
                {req.reason && <p className="text-xs text-gray-500 mt-1 italic">{req.reason}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
