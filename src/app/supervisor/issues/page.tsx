"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertTriangle } from "lucide-react";

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
  critical: "bg-red-100 text-red-700",
};

interface Issue {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
}

export default function IssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/supervisor/issues")
      .then((r) => r.json())
      .then((d) => {
        setIssues(d.issues ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-dvh pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Issues</h1>
        {!loading && (
          <span className="ml-auto text-xs text-gray-500">{issues.length} total</span>
        )}
      </div>

      <div className="px-4 mt-3 flex flex-col gap-3">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : issues.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <AlertTriangle className="w-10 h-10 text-gray-300" />
            <p>No issues found</p>
          </div>
        ) : (
          issues.map((issue) => (
            <button
              key={issue.id}
              onClick={() => router.push(`/supervisor/issues/${issue.id}`)}
              className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="font-semibold text-gray-900 text-sm flex-1 min-w-0 truncate">
                  {issue.title}
                </p>
                <div className="flex gap-1.5 flex-shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      PRIORITY_COLORS[issue.priority] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {issue.priority}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      STATUS_COLORS[issue.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {issue.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              {(issue.customer_name ?? issue.customer_phone) && (
                <p className="text-sm text-gray-500">
                  {issue.customer_name ?? issue.customer_phone}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1.5">
                {new Date(issue.created_at).toLocaleDateString("en-IN")}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
