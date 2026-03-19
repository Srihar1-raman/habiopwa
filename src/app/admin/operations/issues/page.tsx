"use client";

import { useEffect, useState } from "react";

interface IssueTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  description: string | null;
  supervisor_response: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_id: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const STATUSES = ["open", "in_progress", "resolved", "closed"];

export default function IssuesPage() {
  const [issues, setIssues] = useState<IssueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<IssueTicket | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editResponse, setEditResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function loadIssues(status: string) {
    setLoading(true);
    const url = status ? `/api/admin/issues?status=${status}` : "/api/admin/issues";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setIssues(data.issues ?? []);
      })
      .catch(() => setError("Failed to load issues"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadIssues(statusFilter);
  }, [statusFilter]);

  function openDetail(issue: IssueTicket) {
    setSelected(issue);
    setEditStatus(issue.status);
    setEditResponse(issue.supervisor_response ?? "");
    setSaveError(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/issues/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus, supervisor_response: editResponse }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to update");
        return;
      }
      setSelected(null);
      loadIssues(statusFilter);
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issue Tickets</h1>
          <p className="text-gray-500 text-sm">{issues.length} tickets shown</p>
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && issues.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No issues found
                </td>
              </tr>
            )}
            {!loading &&
              issues.map((issue) => (
                <tr
                  key={issue.id}
                  onClick={() => openDetail(issue)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{issue.title}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{issue.customer_name ?? "—"}</p>
                    <p className="text-gray-400 text-xs">{issue.customer_phone ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[issue.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[issue.priority] ?? "bg-gray-100 text-gray-600"}`}>
                      {issue.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(issue.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Detail dialog */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">{selected.title}</h2>
            <div className="flex gap-2 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[selected.priority] ?? ""}`}>
                {selected.priority}
              </span>
              <span className="text-xs text-gray-400">
                {selected.customer_name ?? "Unknown customer"}
              </span>
            </div>
            {selected.description && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-4">
                {selected.description}
              </p>
            )}
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Supervisor Response</label>
                <textarea
                  rows={3}
                  value={editResponse}
                  onChange={(e) => setEditResponse(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad] resize-none"
                  placeholder="Add a response…"
                />
              </div>

              {saveError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {saveError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#004aad] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Update"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
