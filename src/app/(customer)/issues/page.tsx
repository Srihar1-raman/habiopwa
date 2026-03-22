"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertTriangle, CheckCircle2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
}

export default function CustomerIssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/customer/issues")
      .then((r) => r.json())
      .then((d) => {
        setIssues(d.issues ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to raise issue. Please try again.");
        return;
      }
      setSuccess(true);
      setTitle("");
      setDescription("");
      // Prepend new issue
      if (data.issue) {
        setIssues((prev) => [data.issue, ...prev]);
      }
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
          <h1 className="text-lg font-semibold text-gray-800 flex-1">Raise an Issue</h1>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        {/* Success banner */}
        {success && (
          <div className="bg-green-50 rounded-2xl border border-green-100 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-700 font-medium">
              Issue raised! Our team will look into it shortly.
            </p>
          </div>
        )}

        {/* Raise issue form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Describe Your Issue</p>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Issue Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Helper did not arrive today"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30 focus:border-[#004aad]"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Details (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Please provide any additional details…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30 focus:border-[#004aad] resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="w-full py-3 rounded-xl bg-[#004aad] text-white font-semibold text-sm disabled:opacity-50 transition-opacity"
          >
            {submitting ? "Submitting…" : "Raise Issue"}
          </button>
        </form>

        {/* Past issues */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : issues.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">My Issues</p>
            {issues.map((issue) => (
              <div key={issue.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-medium text-gray-900 text-sm flex-1 leading-snug">{issue.title}</p>
                  <div className="flex gap-1.5 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[issue.priority] ?? "bg-gray-100 text-gray-600"}`}>
                      {issue.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[issue.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {issue.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
                {issue.description && (
                  <p className="text-xs text-gray-500 mb-1">{issue.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  {new Date(issue.created_at).toLocaleDateString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="py-8 flex flex-col items-center gap-3 text-gray-400">
              <AlertTriangle className="w-10 h-10 text-gray-300" />
              <p className="text-sm">No issues raised yet</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
