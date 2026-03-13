"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

type Status = "submitted" | "under_process" | "finalized" | "paid";

const TABS: { value: Status | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "under_process", label: "In Review" },
  { value: "finalized", label: "Finalized" },
  { value: "paid", label: "Paid" },
];

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  under_process: "bg-yellow-100 text-yellow-800",
  finalized: "bg-green-100 text-green-700",
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

interface RequestRow {
  id: string;
  request_code: string;
  status: string;
  total_price_monthly: number;
  created_at: string;
  customers: {
    phone: string;
    name: string | null;
    customer_profiles: {
      flat_no: string | null;
      society: string | null;
      sector: string | null;
      city: string | null;
    } | null;
  } | null;
}

export default function SupervisorPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Status | "all">("all");
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url =
      activeTab === "all"
        ? "/api/supervisor/requests"
        : `/api/supervisor/requests?status=${activeTab}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setRequests(d.requests ?? []);
        setLoading(false);
      });
  }, [activeTab]);

  return (
    <div className="flex flex-col">
      {/* Title */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Plan Requests</h1>
        <p className="text-sm text-gray-500">{requests.length} total</p>
      </div>

      {/* Tabs */}
      <div className="px-4 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.value
                  ? "bg-[#004aad] text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Request List */}
      <div className="px-4 mt-2 flex flex-col gap-3">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            No requests found
          </div>
        ) : (
          requests.map((req) => {
            const profile = req.customers?.customer_profiles;
            const location = [profile?.society, profile?.sector, profile?.city]
              .filter(Boolean)
              .join(", ");

            return (
              <button
                key={req.id}
                onClick={() => router.push(`/supervisor/requests/${req.id}`)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between mb-2">
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
                  {req.customers?.name ?? req.customers?.phone ?? "Unknown"}
                </p>
                {req.customers?.phone && req.customers?.name && (
                  <p className="text-sm text-gray-400">{req.customers.phone}</p>
                )}
                {location && (
                  <p className="text-xs text-gray-400 mt-1">📍 {location}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-base font-bold text-[#004aad]">
                    {formatCurrency(req.total_price_monthly)} / m
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
