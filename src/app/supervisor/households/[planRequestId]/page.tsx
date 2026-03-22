"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
  payment_pending: "bg-blue-100 text-blue-700",
  captain_review_pending: "bg-orange-100 text-orange-700",
  captain_allocation_pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-200 text-gray-700",
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-600",
  submitted: "bg-blue-100 text-blue-800",
};

interface JobAllocation {
  id: string;
  provider_name: string | null;
  job_title: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  status: string;
}

interface PlanItem {
  id: string;
  title: string;
  frequency_label: string;
  price_monthly: number;
}

interface HouseholdDetail {
  request_code: string;
  status: string;
  total_price_monthly: number;
  plan_start_date: string | null;
  flat_no: string | null;
  society: string | null;
  sector: string | null;
  city: string | null;
  phone: string;
  name: string | null;
  home_type: string | null;
  bhk: number | null;
  job_allocations: JobAllocation[];
  plan_request_items: PlanItem[];
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

export default function HouseholdDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planRequestId = params.planRequestId as string;

  const [detail, setDetail] = useState<HouseholdDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/supervisor/households/${planRequestId}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail(d.household ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [planRequestId]);

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

  if (!detail) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center text-gray-400">
        Household not found
      </div>
    );
  }

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
        <div className="flex-1">
          <p className="text-xs font-mono text-[#004aad] font-semibold">{detail.request_code}</p>
          <h1 className="text-base font-bold text-gray-900">Household Detail</h1>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            STATUS_COLORS[detail.status] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {detail.status.replace("_", " ")}
        </span>
      </div>

      <div className="px-4 mt-3 flex flex-col gap-4">
        {/* Plan Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Plan Details
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Request Code" value={detail.request_code} />
            <InfoRow label="Status" value={detail.status.replace("_", " ")} />
            <InfoRow
              label="Monthly Price"
              value={`₹${detail.total_price_monthly?.toLocaleString("en-IN")}`}
            />
            <InfoRow
              label="Start Date"
              value={
                detail.plan_start_date
                  ? new Date(detail.plan_start_date).toLocaleDateString("en-IN")
                  : null
              }
            />
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Customer Info
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Name" value={detail.name} />
            <InfoRow label="Phone" value={detail.phone} />
            <InfoRow label="Flat No" value={detail.flat_no} />
            <InfoRow label="Society" value={detail.society} />
            <InfoRow label="Sector" value={detail.sector} />
            <InfoRow label="City" value={detail.city} />
            <InfoRow label="Home Type" value={detail.home_type} />
            <InfoRow label="BHK" value={detail.bhk ? String(detail.bhk) : null} />
          </div>
        </div>

        {/* Team Allocations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Team Allocations
            </h2>
          </div>
          {detail.job_allocations?.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">No allocations yet</p>
          ) : (
            detail.job_allocations?.map((alloc) => (
              <div key={alloc.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {alloc.provider_name ?? "Unassigned"}
                    </p>
                    <p className="text-xs text-gray-500">{alloc.job_title}</p>
                    {alloc.scheduled_date && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(alloc.scheduled_date).toLocaleDateString("en-IN")}
                        {alloc.scheduled_start_time && ` · ${alloc.scheduled_start_time}`}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      STATUS_COLORS[alloc.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {alloc.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Plan Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Plan Items
            </h2>
          </div>
          {detail.plan_request_items?.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">No items</p>
          ) : (
            detail.plan_request_items?.map((item) => (
              <div
                key={item.id}
                className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.frequency_label}</p>
                </div>
                <p className="text-sm font-bold text-[#004aad]">
                  ₹{item.price_monthly?.toLocaleString("en-IN")}/m
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
