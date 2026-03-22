"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Home } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-700",
  captain_allocation_pending: "bg-orange-100 text-orange-800",
  captain_review_pending: "bg-orange-100 text-orange-700",
  payment_pending: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  closed: "bg-gray-200 text-gray-700",
};

interface Household {
  plan_request_id: string;
  request_code: string;
  status: string;
  total_price_monthly: number;
  plan_start_date: string | null;
  customer_name: string | null;
  customer_phone: string;
  flat_no: string | null;
  society: string | null;
  sector: string | null;
  city: string | null;
}

export default function HouseholdsPage() {
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/supervisor/households")
      .then((r) => r.json())
      .then((d) => {
        setHouseholds(d.households ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-dvh pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Active Households</h1>
        {!loading && (
          <span className="ml-auto text-xs text-gray-500">{households.length} total</span>
        )}
      </div>

      <div className="px-4 mt-3 flex flex-col gap-3">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : households.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <Home className="w-10 h-10 text-gray-300" />
            <p>No active households</p>
          </div>
        ) : (
          households.map((h) => {
            const location = [h.flat_no, h.society, h.sector, h.city]
              .filter(Boolean)
              .join(", ");
            return (
              <button
                key={h.plan_request_id}
                onClick={() => router.push(`/supervisor/households/${h.plan_request_id}`)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className="text-xs font-mono font-semibold text-[#004aad]">
                    {h.request_code}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      STATUS_COLORS[h.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {h.status.replace("_", " ")}
                  </span>
                </div>
                <p className="font-semibold text-gray-900">
                  {h.customer_name ?? h.customer_phone}
                </p>
                {h.customer_name && (
                  <p className="text-sm text-gray-400">{h.customer_phone}</p>
                )}
                {location && (
                  <p className="text-xs text-gray-400 mt-1">{location}</p>
                )}
                <p className="text-sm font-bold text-[#004aad] mt-2">
                  ₹{h.total_price_monthly?.toLocaleString("en-IN")} / m
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
