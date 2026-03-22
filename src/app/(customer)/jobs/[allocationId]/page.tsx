"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ChevronLeft, CalendarDays, Clock, User } from "lucide-react";

interface Job {
  id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  status: string;
  is_locked: boolean;
  service_providers: { name: string; provider_type: string | null } | null;
  plan_request_items: { title: string; frequency_label: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  scheduled_delayed: "bg-orange-100 text-orange-800",
  in_progress: "bg-amber-100 text-amber-800",
  in_progress_delayed: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  completed_delayed: "bg-green-100 text-green-800",
  cancelled_by_customer: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
  service_on_pause: "bg-purple-100 text-purple-800",
  incomplete: "bg-gray-100 text-gray-700",
  status_not_marked: "bg-gray-100 text-gray-700",
};

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700";
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmt12(time: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const allocationId = params.allocationId as string;
  const date = searchParams.get("date");

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/customer/jobs/allocation/${allocationId}`)
      .then((r) => r.json())
      .then((data) => {
        setJob(data.job ?? null);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load job details.");
        setLoading(false);
      });
  }, [allocationId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-[480px] mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800 flex-1">Job Details</h1>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-600">{error}</div>
        )}

        {job && (
          <div className="space-y-4">
            {/* Title + Status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Service</p>
                  <p className="text-base font-semibold text-gray-800">
                    {job.plan_request_items?.title ?? "Service"}
                  </p>
                  {job.plan_request_items?.frequency_label && (
                    <p className="text-xs text-gray-500 mt-0.5">{job.plan_request_items.frequency_label}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${statusStyle(job.status)}`}>
                  {formatStatus(job.status)}
                </span>
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-4 h-4 text-[#004aad]" />
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Schedule</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Date</p>
                  <p className="text-sm font-medium text-gray-800">
                    {date ?? job.scheduled_date}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Scheduled Time</p>
                  <p className="text-sm font-medium text-gray-800">
                    {fmt12(job.scheduled_start_time)} – {fmt12(job.scheduled_end_time)}
                  </p>
                </div>
                {(job.actual_start_time || job.actual_end_time) && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-xs text-gray-500">Actual Time</p>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {fmt12(job.actual_start_time) ?? "—"} – {fmt12(job.actual_end_time) ?? "—"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Provider */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-[#004aad]" />
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Your Provider</h2>
              </div>
              <p className="text-sm font-medium text-gray-800">
                {job.service_providers?.name ?? "Your provider"}
              </p>
              {job.service_providers?.provider_type && (
                <p className="text-xs text-gray-500 mt-0.5">{job.service_providers.provider_type?.replace(/_/g, ' ')}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
