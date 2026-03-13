"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Trash2, Save, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PlanItem {
  id?: string;
  category_id: string;
  job_id: string | null;
  title: string;
  frequency_label: string;
  minutes: number;
  price_monthly: number;
  mrp_monthly: number | null;
  service_categories?: { slug: string; name: string } | null;
}

interface CustomerProfile {
  flat_no: string;
  building?: string;
  society?: string;
  sector?: string;
  city?: string;
  pincode?: string;
  home_type?: string;
  bhk?: number;
  bathrooms?: number;
  diet_pref?: string;
  people_count?: number;
  cook_window_morning?: boolean;
  cook_window_evening?: boolean;
  kitchen_notes?: string;
}

interface RequestDetail {
  id: string;
  request_code: string;
  status: string;
  total_price_monthly: number;
  customers: {
    phone: string;
    name: string | null;
    customer_profiles: CustomerProfile | null;
  } | null;
  plan_request_items: PlanItem[];
}

export default function SupervisorRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    fetch(`/api/supervisor/requests/${requestId}`)
      .then((r) => r.json())
      .then((d) => {
        setRequest(d.request);
        setItems(d.request?.plan_request_items ?? []);
        setLoading(false);
      });
  }, [requestId]);

  function updateItem(
    index: number,
    field: keyof PlanItem,
    value: string | number | null
  ) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addCustomItem() {
    if (!request) return;
    const firstCatId = items[0]?.category_id ?? "";
    setItems((prev) => [
      ...prev,
      {
        category_id: firstCatId,
        job_id: null,
        title: "Custom Service",
        frequency_label: "Daily",
        minutes: 30,
        price_monthly: 0,
        mrp_monthly: null,
      },
    ]);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    const res = await fetch(`/api/supervisor/requests/${requestId}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setSaveMsg(`Saved! New total: ${formatCurrency(data.total)} / m`);
      // Refresh
      fetch(`/api/supervisor/requests/${requestId}`)
        .then((r) => r.json())
        .then((d) => setRequest(d.request));
    } else {
      setSaveMsg("Save failed. Try again.");
    }
  }

  async function handleFinalize() {
    if (!confirm("Finalize this plan? The customer will be able to pay."))
      return;
    setFinalizing(true);
    const res = await fetch(
      `/api/supervisor/requests/${requestId}/finalize`,
      { method: "POST" }
    );
    setFinalizing(false);
    if (res.ok) {
      setRequest((prev) => (prev ? { ...prev, status: "finalized" } : prev));
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
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Loading…
        </div>
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
  const canEdit = !["paid", "cancelled"].includes(request.status);
  const canFinalize = ["submitted", "under_process"].includes(request.status);

  const total = items.reduce((s, i) => s + Number(i.price_monthly), 0);

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      {/* App bar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <p className="text-xs font-mono text-[#004aad] font-semibold">
            {request.request_code}
          </p>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-900">
              Request Detail
            </h1>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {request.status.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-4">
        {/* Customer Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Customer
          </h2>
          <p className="font-semibold text-gray-900">
            {request.customers?.name ?? "—"}
          </p>
          <p className="text-sm text-gray-500">{request.customers?.phone}</p>

          {profile && (
            <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Address</p>
                <p className="text-gray-700">
                  {[
                    profile.flat_no,
                    profile.building,
                    profile.society,
                    profile.sector,
                    profile.city,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              {profile.home_type && (
                <div>
                  <p className="text-xs text-gray-400">Home</p>
                  <p className="text-gray-700">
                    {profile.home_type} {profile.bhk && `· ${profile.bhk} BHK`}
                  </p>
                </div>
              )}
              {profile.diet_pref && (
                <div>
                  <p className="text-xs text-gray-400">Diet</p>
                  <p className="text-gray-700 capitalize">{profile.diet_pref}</p>
                </div>
              )}
              {profile.people_count && (
                <div>
                  <p className="text-xs text-gray-400">People</p>
                  <p className="text-gray-700">{profile.people_count}</p>
                </div>
              )}
              {profile.kitchen_notes && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Notes</p>
                  <p className="text-gray-700">{profile.kitchen_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Plan Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Plan Items
            </h2>
            <p className="text-sm font-bold text-[#004aad]">
              {formatCurrency(total)} / m
            </p>
          </div>

          {items.map((item, idx) => (
            <div
              key={idx}
              className="px-4 py-3 border-b border-gray-50 last:border-0"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <input
                  className="flex-1 text-sm font-medium text-gray-900 border-b border-dashed border-gray-300 outline-none bg-transparent disabled:border-transparent"
                  value={item.title}
                  disabled={!canEdit}
                  onChange={(e) => updateItem(idx, "title", e.target.value)}
                />
                {canEdit && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 rounded-full hover:bg-red-50 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>Mins:</span>
                  <input
                    type="number"
                    className="w-14 border rounded px-1.5 py-0.5 text-xs text-gray-700 disabled:border-transparent bg-white"
                    value={item.minutes}
                    disabled={!canEdit}
                    onChange={(e) =>
                      updateItem(idx, "minutes", Number(e.target.value))
                    }
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>₹ / m:</span>
                  <input
                    type="number"
                    className="w-20 border rounded px-1.5 py-0.5 text-xs text-gray-700 disabled:border-transparent bg-white"
                    value={item.price_monthly}
                    disabled={!canEdit}
                    onChange={(e) =>
                      updateItem(idx, "price_monthly", Number(e.target.value))
                    }
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>MRP:</span>
                  <input
                    type="number"
                    className="w-20 border rounded px-1.5 py-0.5 text-xs text-gray-400 disabled:border-transparent bg-white"
                    value={item.mrp_monthly ?? ""}
                    disabled={!canEdit}
                    onChange={(e) =>
                      updateItem(
                        idx,
                        "mrp_monthly",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    placeholder="optional"
                  />
                </div>
              </div>
            </div>
          ))}

          {canEdit && (
            <button
              onClick={addCustomItem}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-[#004aad] font-medium hover:bg-blue-50 rounded-b-2xl"
            >
              <Plus className="w-4 h-4" />
              Add Custom Item
            </button>
          )}
        </div>

        {saveMsg && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4" />
            {saveMsg}
          </div>
        )}
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 py-4 bg-white border-t border-gray-100 flex gap-3">
          <Button
            variant="outline"
            size="md"
            loading={saving}
            onClick={handleSave}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save
          </Button>
          {canFinalize && (
            <Button
              size="md"
              loading={finalizing}
              onClick={handleFinalize}
              className="flex-1"
            >
              Finalize Plan
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
