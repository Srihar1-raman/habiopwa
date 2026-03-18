"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Zap, CheckCircle2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  allocated: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const TIME_PREFERENCES = [
  "Morning (7 AM – 10 AM)",
  "Forenoon (10 AM – 1 PM)",
  "Afternoon (1 PM – 4 PM)",
  "Evening (4 PM – 7 PM)",
];

interface ServiceJob {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  unit_type: string;
  frequency_label: string;
  category_id: string;
}

interface PastRequest {
  id: string;
  status: string;
  request_date: string | null;
  request_time_preference: string | null;
  customer_notes: string | null;
  created_at: string;
  service_jobs: { name: string } | null;
}

function getMinDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function OnDemandPage() {
  const router = useRouter();
  const [available, setAvailable] = useState(false);
  const [planRequestId, setPlanRequestId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [pastRequests, setPastRequests] = useState<PastRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedJobId, setSelectedJobId] = useState("");
  const [requestDate, setRequestDate] = useState(getMinDate());
  const [timePreference, setTimePreference] = useState(TIME_PREFERENCES[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/customer/on-demand/available").then((r) => r.json()),
      fetch("/api/plan/current").then((r) => r.json()),
      fetch("/api/customer/on-demand/request").then((r) => r.json()),
    ]).then(([availData, planData, reqData]) => {
      setAvailable(availData.available ?? false);
      setJobs(availData.jobs ?? []);
      setPlanRequestId(planData.planRequest?.id ?? null);
      setPastRequests(reqData.requests ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJobId || !planRequestId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/on-demand/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_request_id: planRequestId,
          job_id: selectedJobId,
          request_date: requestDate,
          request_time_preference: timePreference,
          customer_notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit request. Please try again.");
        return;
      }
      setSuccess(true);
      setSelectedJobId("");
      setNotes("");
      // Refresh past requests
      fetch("/api/customer/on-demand/request")
        .then((r) => r.json())
        .then((d) => setPastRequests(d.requests ?? []))
        .catch(() => {});
    } catch {
      setError("Network error. Please try again.");
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
          <h1 className="text-lg font-semibold text-gray-800 flex-1">On-Demand Job</h1>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !available ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-3">
            <Zap className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-gray-600 text-sm">
              On-demand services are available after your plan is active. Complete payment to unlock.
            </p>
            <button
              onClick={() => router.push("/plan")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#004aad] text-white rounded-xl text-sm font-medium"
            >
              View Plan
            </button>
          </div>
        ) : (
          <>
            {/* Success banner */}
            {success && (
              <div className="bg-green-50 rounded-2xl border border-green-100 p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-700 font-medium">
                  Request submitted! Our team will confirm shortly.
                </p>
              </div>
            )}

            {/* Request form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
              <p className="text-sm font-semibold text-gray-700">New On-Demand Request</p>

              {/* Service selection */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Select Service</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30 focus:border-[#004aad]"
                >
                  <option value="">Choose a service…</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>{job.name}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Preferred Date</label>
                <input
                  type="date"
                  min={getMinDate()}
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30 focus:border-[#004aad]"
                />
              </div>

              {/* Time preference */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Time Preference</label>
                <select
                  value={timePreference}
                  onChange={(e) => setTimePreference(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30 focus:border-[#004aad]"
                >
                  {TIME_PREFERENCES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any specific requirements…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30 focus:border-[#004aad] resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedJobId || !planRequestId}
                className="w-full py-3 rounded-xl bg-[#004aad] text-white font-semibold text-sm disabled:opacity-50 transition-opacity"
              >
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </form>

            {/* Past requests */}
            {pastRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">My Requests</p>
                {pastRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-gray-900 text-sm flex-1">
                        {req.service_jobs?.name ?? "Service"}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {req.status}
                      </span>
                    </div>
                    {req.request_date && (
                      <p className="text-xs text-gray-400">
                        {new Date(req.request_date).toLocaleDateString("en-IN")}
                        {req.request_time_preference ? ` · ${req.request_time_preference}` : ""}
                      </p>
                    )}
                    {req.customer_notes && (
                      <p className="text-xs text-gray-500 mt-1">{req.customer_notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
