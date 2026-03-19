"use client";

import { useEffect, useState } from "react";

interface PlanRequest {
  id: string;
  request_code: string;
  status: string;
  total_price_monthly: number | null;
  created_at: string;
  plan_start_date: string | null;
  is_recurring: boolean;
  customer_name: string | null;
  customer_phone: string | null;
  customer_id: string | null;
  supervisor_name: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-700",
  under_process: "bg-blue-100 text-blue-700",
  finalized: "bg-purple-100 text-purple-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUSES = ["submitted", "under_process", "finalized", "paid", "cancelled"];

export default function PlanRequestsPage() {
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  function load(status: string) {
    setLoading(true);
    const url = status
      ? `/api/admin/plan-requests?status=${status}`
      : "/api/admin/plan-requests";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setRequests(data.planRequests ?? []);
      })
      .catch(() => setError("Failed to load plan requests"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan Requests</h1>
          <p className="text-gray-500 text-sm">{requests.length} requests shown</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Monthly Price</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Supervisor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No plan requests found
                </td>
              </tr>
            )}
            {!loading &&
              requests.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.request_code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.customer_name ?? "—"}</p>
                    <p className="text-gray-400 text-xs">{r.customer_phone ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {r.total_price_monthly != null ? `₹${r.total_price_monthly}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.supervisor_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
