"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanItem {
  id: string;
  title: string;
  frequency_label: string;
  price_monthly: number;
}

interface RequestDetail {
  id: string;
  request_code: string;
  status: string;
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
  plan_request_items: PlanItem[];
}

interface Provider {
  id: string;
  name: string;
  specialization: string | null;
}

interface AllocationRow {
  plan_request_item_id: string;
  service_provider_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
}

export default function NewRequestAllocatePage() {
  const router = useRouter();
  const params = useParams();
  const planRequestId = params.planRequestId as string;

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/supervisor/requests/${planRequestId}`).then((r) => r.json()),
      fetch("/api/supervisor/team").then((r) => r.json()),
    ]).then(([reqData, teamData]) => {
      const req: RequestDetail = reqData.request;
      setRequest(req);
      setProviders(teamData.providers ?? []);
      setAllocations(
        (req?.plan_request_items ?? []).map((item) => ({
          plan_request_item_id: item.id,
          service_provider_id: "",
          scheduled_date: "",
          scheduled_start_time: "",
          scheduled_end_time: "",
        }))
      );
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [planRequestId]);

  function updateAllocation(index: number, field: keyof AllocationRow, value: string) {
    setAllocations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleAllocate() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/supervisor/new-requests/${planRequestId}/allocate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocations }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const d = await res.json();
        setError(d.error ?? "Allocation failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
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

  if (!request) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center text-gray-400">
        Request not found
      </div>
    );
  }

  const profile = request.customers?.customer_profiles;

  return (
    <div className="flex flex-col min-h-dvh pb-32">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <p className="text-xs font-mono text-[#004aad] font-semibold">{request.request_code}</p>
          <h1 className="text-base font-bold text-gray-900">Allocate Team</h1>
        </div>
      </div>

      <div className="px-4 mt-3 flex flex-col gap-4">
        {/* Customer Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Customer
          </h2>
          <p className="font-semibold text-gray-900">
            {request.customers?.name ?? request.customers?.phone}
          </p>
          {request.customers?.name && (
            <p className="text-sm text-gray-400">{request.customers.phone}</p>
          )}
          {profile && (
            <p className="text-xs text-gray-400 mt-1">
              {[profile.flat_no, profile.society, profile.sector, profile.city]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>

        {/* Allocation forms */}
        {success ? (
          <div className="flex flex-col items-center gap-3 py-10 text-green-700">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-lg font-bold">Allocations saved!</p>
            <button
              onClick={() => router.push("/supervisor/new-requests")}
              className="text-sm text-[#004aad] underline"
            >
              Back to New Requests
            </button>
          </div>
        ) : (
          request.plan_request_items.map((item, idx) => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.frequency_label}</p>
                </div>
                <p className="text-sm font-bold text-[#004aad]">
                  ₹{item.price_monthly?.toLocaleString("en-IN")}/m
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Provider</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                    value={allocations[idx]?.service_provider_id ?? ""}
                    onChange={(e) => updateAllocation(idx, "service_provider_id", e.target.value)}
                  >
                    <option value="">Select provider</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.specialization ? ` · ${p.specialization}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                    value={allocations[idx]?.scheduled_date ?? ""}
                    onChange={(e) => updateAllocation(idx, "scheduled_date", e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
                    <input
                      type="time"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                      value={allocations[idx]?.scheduled_start_time ?? ""}
                      onChange={(e) => updateAllocation(idx, "scheduled_start_time", e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">End Time</label>
                    <input
                      type="time"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                      value={allocations[idx]?.scheduled_end_time ?? ""}
                      onChange={(e) => updateAllocation(idx, "scheduled_end_time", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>
        )}
      </div>

      {!success && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 py-4 bg-white border-t border-gray-100">
          <Button
            size="lg"
            loading={submitting}
            onClick={handleAllocate}
            className="w-full"
          >
            Allocate All
          </Button>
        </div>
      )}
    </div>
  );
}
