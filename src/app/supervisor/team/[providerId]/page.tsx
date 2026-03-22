"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  on_leave: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-600",
  cancelled: "bg-red-100 text-red-700",
};

const LEAVE_TYPES = ["sick_leave", "casual_leave", "emergency_leave", "other"];

interface Job {
  id: string;
  scheduled_date: string | null;
  status: string;
  plan_request_items: { title: string } | null;
  customers: { name: string | null } | null;
}

interface ProviderDetail {
  id: string;
  name: string;
  phone: string | null;
  provider_type: string | null;
  status: string;
}

export default function ProviderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params.providerId as string;

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaveForm, setLeaveForm] = useState({
    start_date: "",
    end_date: "",
    leave_type: "casual_leave",
  });
  const [submitting, setSubmitting] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  useEffect(() => {
    fetch(`/api/supervisor/team/${providerId}`)
      .then((r) => r.json())
      .then((d) => {
        setProvider(d.provider ?? null);
        setRecentJobs(d.recentJobs ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [providerId]);

  async function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setLeaveError("");
    try {
      const res = await fetch(`/api/supervisor/team/${providerId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaveForm),
      });
      if (res.ok) {
        setLeaveSuccess(true);
        setLeaveForm({ start_date: "", end_date: "", leave_type: "casual_leave" });
      } else {
        const d = await res.json();
        setLeaveError(d.error ?? "Failed to submit leave request.");
      }
    } catch {
      setLeaveError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

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
    <div className="flex flex-col min-h-dvh pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Provider Profile</h1>
      </div>

      <div className="px-4 mt-3 flex flex-col gap-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between mb-1">
            <p className="text-lg font-bold text-gray-900">{provider.name}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                STATUS_COLORS[provider.status] ?? STATUS_COLORS["inactive"]
              }`}
            >
              {provider.status}
            </span>
          </div>
          {provider.phone && <p className="text-sm text-gray-500">{provider.phone}</p>}
          {provider.provider_type && (
            <p className="text-sm text-gray-500 mt-1">{provider.provider_type.replace(/_/g, " ")}</p>
          )}
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Recent Jobs
            </h2>
          </div>
          {recentJobs.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">No recent jobs</p>
          ) : (
            recentJobs.map((job) => (
              <div
                key={job.id}
                className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {job.plan_request_items?.title ?? "—"}
                  </p>
                  {job.customers?.name && (
                    <p className="text-xs text-gray-400">{job.customers.name}</p>
                  )}
                  {job.scheduled_date && (
                    <p className="text-xs text-gray-400">
                      {new Date(job.scheduled_date).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    STATUS_COLORS[job.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {job.status.replace("_", " ")}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Request Leave */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Request Leave
          </h2>
          {leaveSuccess ? (
            <div className="flex items-center gap-2 text-green-700 py-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-sm font-medium">Leave request submitted!</p>
            </div>
          ) : (
            <form onSubmit={handleLeaveSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                <input
                  type="date"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                  value={leaveForm.start_date}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                <input
                  type="date"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                  value={leaveForm.end_date}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Leave Type</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, leave_type: e.target.value }))}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              {leaveError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                  {leaveError}
                </p>
              )}
              <Button type="submit" size="md" loading={submitting}>
                Submit Leave Request
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
