"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ClipboardList } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  under_process: "bg-yellow-100 text-yellow-800",
  finalized: "bg-green-100 text-green-700",
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

interface NewRequest {
  id: string;
  request_code: string;
  status: string;
  total_price_monthly: number;
  created_at: string;
  customers: {
    name: string | null;
    phone: string;
    customer_profiles: {
      flat_no: string | null;
      society: string | null;
      sector: string | null;
      city: string | null;
    } | null;
  } | null;
}

export default function NewRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<NewRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/supervisor/new-requests")
      .then((r) => r.json())
      .then((d) => {
        setRequests(d.requests ?? []);
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
        <h1 className="text-base font-bold text-gray-900">New Requests</h1>
        {!loading && (
          <span className="ml-auto text-xs text-gray-500">{requests.length} pending</span>
        )}
      </div>

      <div className="px-4 mt-3 flex flex-col gap-3">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <ClipboardList className="w-10 h-10 text-gray-300" />
            <p>No new requests</p>
          </div>
        ) : (
          requests.map((req) => {
            const profile = req.customers?.customer_profiles;
            const location = [profile?.society, profile?.sector, profile?.city].filter(Boolean).join(", ");
            return (
              <button
                key={req.id}
                onClick={() => router.push(`/supervisor/new-requests/${req.id}`)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className="text-xs font-mono font-semibold text-[#004aad]">
                    {req.request_code}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {req.status.replace("_", " ")}
                  </span>
                </div>
                <p className="font-semibold text-gray-900">
                  {req.customers?.name ?? req.customers?.phone}
                </p>
                {req.customers?.name && (
                  <p className="text-sm text-gray-400">{req.customers.phone}</p>
                )}
                {location && <p className="text-xs text-gray-400 mt-1">{location}</p>}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold text-[#004aad]">
                    ₹{req.total_price_monthly?.toLocaleString("en-IN")} / m
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(req.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
