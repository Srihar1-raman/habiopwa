"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const STATUS_TRANSITIONS = ["in_progress", "resolved", "closed"] as const;

interface Comment {
  id: string;
  comment: string;
  author_type: string;
  created_at: string;
}

interface IssueDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  comments: Comment[];
}

export default function IssueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.ticketId as string;

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [commentError, setCommentError] = useState("");

  const load = useCallback(() => {
    fetch(`/api/supervisor/issues/${ticketId}`)
      .then((r) => r.json())
      .then((d) => {
        setIssue(d.issue ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    setCommentError("");
    try {
      const res = await fetch(`/api/supervisor/issues/${ticketId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      if (res.ok) {
        setComment("");
        load();
      } else {
        setCommentError("Failed to post comment.");
      }
    } catch {
      setCommentError("Network error.");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleStatusUpdate(newStatus: string) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/supervisor/issues/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        load();
      }
    } finally {
      setUpdatingStatus(false);
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

  if (!issue) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center text-gray-400">
        Issue not found
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh pb-32">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1 truncate">Issue Detail</h1>
      </div>

      <div className="px-4 mt-3 flex flex-col gap-4">
        {/* Issue info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-2 mb-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                STATUS_COLORS[issue.status] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {issue.status.replace("_", " ")}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                PRIORITY_COLORS[issue.priority] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {issue.priority}
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-1">{issue.title}</h2>
          {issue.description && (
            <p className="text-sm text-gray-600">{issue.description}</p>
          )}
          {(issue.customer_name ?? issue.customer_phone) && (
            <p className="text-xs text-gray-400 mt-2">
              Customer: {issue.customer_name ?? issue.customer_phone}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {new Date(issue.created_at).toLocaleDateString("en-IN")}
          </p>
        </div>

        {/* Status actions */}
        {issue.status !== "closed" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Update Status
            </h2>
            <div className="flex flex-wrap gap-2">
              {STATUS_TRANSITIONS.filter((s) => s !== issue.status).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  loading={updatingStatus}
                  onClick={() => handleStatusUpdate(s)}
                >
                  Mark {s.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Comments ({issue.comments?.length ?? 0})
            </h2>
          </div>
          {issue.comments?.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">No comments yet</p>
          ) : (
            issue.comments?.map((c) => (
              <div key={c.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#004aad] capitalize">
                    {c.author_type.replace("_", " ")}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{c.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comment form */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 py-4 bg-white border-t border-gray-100">
        <form onSubmit={handleCommentSubmit} className="flex flex-col gap-2">
          <textarea
            rows={2}
            placeholder="Add a supervisor comment…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30 resize-none"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {commentError && (
            <p className="text-xs text-red-600">{commentError}</p>
          )}
          <Button
            type="submit"
            size="sm"
            loading={submittingComment}
            disabled={!comment.trim()}
            className="self-end"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Post Comment
          </Button>
        </form>
      </div>
    </div>
  );
}
