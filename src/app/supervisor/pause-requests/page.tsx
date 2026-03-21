"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const APPROVAL_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

interface PauseRequest {
  id: string;
  plan_request_id: string;
  pause_type: string;
  pause_start_date: string | null;
  pause_end_date: string | null;
  status: string;
  reason: string | null;
  customers: { name: string | null; phone: string } | null;
  plan_requests: { request_code: string } | null;
}

export default function PauseRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PauseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/supervisor/pause-requests")
      .then((r) => r.json())
      .then((d) => {
        setRequests(d.pauseRequests ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActioning(id + action);
    try {
      await fetch(`/api/supervisor/pause-requests/${id}/${action}`, {
        method: "PATCH",
      });
      load();
    } finally {
      setActioning(null);
    }
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
        <h1 className="text-base font-bold text-gray-900">Pause Requests</h1>
        {!loading && (
          <span className="ml-auto text-xs text-gray-500">{requests.length} total</span>
        )}
      </div>

      <div className="px-4 mt-3 flex flex-col gap-3">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <PauseCircle className="w-10 h-10 text-gray-300" />
            <p>No pause requests</p>
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
            >
              <div className="flex items-start justify-between mb-2">
                {req.plan_requests?.request_code && (
                  <span className="text-xs font-mono font-semibold text-[#004aad]">
                    {req.plan_requests.request_code}
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    APPROVAL_COLORS[req.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {req.status}
                </span>
              </div>
              <p className="font-semibold text-gray-900">
                {req.customers?.name ?? req.customers?.phone}
              </p>
              {req.customers?.name && (
                <p className="text-sm text-gray-400">{req.customers.phone}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {req.pause_type.replace("_", " ")}
                </span>
                {req.pause_start_date && (
                  <span className="text-xs text-gray-400">
                    {new Date(req.pause_start_date).toLocaleDateString("en-IN")}
                    {req.pause_end_date &&
                      ` → ${new Date(req.pause_end_date).toLocaleDateString("en-IN")}`}
                  </span>
                )}
              </div>
              {req.reason && (
                <p className="text-xs text-gray-500 mt-2 italic">{req.reason}</p>
              )}
              {req.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={actioning === req.id + "approve"}
                    onClick={() => handleAction(req.id, "approve")}
                    className="flex-1 text-green-700 border-green-300 hover:bg-green-50"
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={actioning === req.id + "reject"}
                    onClick={() => handleAction(req.id, "reject")}
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
