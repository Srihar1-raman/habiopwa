"use client";

import { useEffect, useState } from "react";

interface DailyReport {
  id: string;
  report_date: string;
  total_jobs_scheduled: number;
  total_jobs_completed: number;
  total_jobs_delayed: number;
  total_jobs_cancelled: number;
  breakage_count: number;
  summary_notes: string | null;
}

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

export default function DailyReportsPage() {
  const [date, setDate] = useState(todayDate());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setReport(null);
    setError(null);
    fetch(`/api/admin/reports/daily?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setReport(data.report);
      })
      .catch(() => setError("Failed to load report"))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Daily Reports</h1>
        <p className="text-gray-500 text-sm">View operational summaries by date</p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-700">Select Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={todayDate()}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 bg-gray-200 rounded" />
          ))}
        </div>
      )}

      {!loading && !error && report === null && date && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-gray-400">No data for {date}</p>
        </div>
      )}

      {!loading && report && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              Report for {new Date(report.report_date + "T00:00:00").toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-gray-100">
            {[
              { label: "Scheduled", value: report.total_jobs_scheduled, color: "text-blue-600" },
              { label: "Completed", value: report.total_jobs_completed, color: "text-green-600" },
              { label: "Delayed", value: report.total_jobs_delayed, color: "text-yellow-600" },
              { label: "Cancelled", value: report.total_jobs_cancelled, color: "text-red-600" },
              { label: "Breakages", value: report.breakage_count, color: "text-orange-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-5 py-5">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {report.summary_notes && (
            <div className="px-5 py-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Summary Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.summary_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
