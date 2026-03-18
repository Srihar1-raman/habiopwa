"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, CheckCircle2 } from "lucide-react";
import { calcJobPrices, type JobPricingParams, type CompoundChildParams } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CatalogJob {
  id: string;
  category_id: string;
  name: string;
  frequency_label: string;
  unit_type: string;
  default_unit: number;
  base_rate_per_unit: number;
  instances_per_month: number;
  discount_pct: number;
  time_multiple: number | null;
  formula_type: string;
  compound_child: {
    base_rate_per_unit: number;
    instances_per_month: number;
    time_multiple: number | null;
  } | null;
}

interface DisplayItem {
  id: string;
  category_id: string;
  category_name: string;
  title: string;
  frequency_label: string;
  unit_type: string;
  unit_value: number;
  price_monthly: number;
}

interface CurrentPlan {
  id: string;
  status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function computePrice(job: CatalogJob): number {
  const params: JobPricingParams = {
    formula_type: job.formula_type,
    unit_type: job.unit_type,
    base_rate_per_unit: Number(job.base_rate_per_unit),
    instances_per_month: job.instances_per_month,
    discount_pct: Number(job.discount_pct),
    time_multiple: job.time_multiple ? Number(job.time_multiple) : null,
  };
  const child: CompoundChildParams | undefined = job.compound_child
    ? {
        base_rate_per_unit: Number(job.compound_child.base_rate_per_unit),
        instances_per_month: job.compound_child.instances_per_month,
        time_multiple: job.compound_child.time_multiple
          ? Number(job.compound_child.time_multiple)
          : null,
      }
    : undefined;
  return calcJobPrices(job.default_unit, params, child).effective;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AddServicePage() {
  const router = useRouter();
  const [plan, setPlan] = useState<CurrentPlan | null>(null);
  const [planRequestId, setPlanRequestId] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [catalog, setCatalog] = useState<DisplayItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plan/current")
      .then((r) => r.json())
      .then((data) => {
        // API returns { planRequest: { id, status, ... } }
        const planRequest = data.planRequest ?? null;
        if (planRequest && (planRequest.status === "paid" || planRequest.status === "finalized")) {
          setPlan({ id: planRequest.id, status: planRequest.status });
          setPlanRequestId(planRequest.id);
        }
        setPlanLoading(false);
      })
      .catch(() => setPlanLoading(false));

    fetch("/api/catalog")
      .then((r) => r.json())
      .then((data) => {
        const jobs: CatalogJob[] = data.jobs ?? [];
        const categories: { id: string; name: string }[] = data.categories ?? [];

        // Build a category name lookup
        const catNameById: Record<string, string> = {};
        categories.forEach((c) => { catNameById[c.id] = c.name; });

        // Map jobs to display items, skipping compound_child rows (they are
        // priced as part of their compound_head parent and not shown separately)
        const items: DisplayItem[] = jobs
          .filter((j) => j.formula_type !== "compound_child")
          .map((j) => ({
            id: j.id,
            category_id: j.category_id,
            category_name: catNameById[j.category_id] ?? "Other",
            title: j.name,
            frequency_label: j.frequency_label,
            unit_type: j.unit_type,
            unit_value: j.default_unit,
            price_monthly: computePrice(j),
          }));

        setCatalog(items);
      })
      .catch(() => {});
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0 || !planRequestId) return;
    setSubmitting(true);
    setError(null);
    try {
      // Build the items array matching what /api/customer/add-service expects
      const items = Array.from(selected)
        .map((id) => catalog.find((c) => c.id === id))
        .filter((item): item is DisplayItem => item !== undefined)
        .map((item) => ({
          job_id: item.id,
          category_id: item.category_id,
          title: item.title,
          frequency_label: item.frequency_label,
          unit_type: item.unit_type,
          unit_value: item.unit_value,
          price_monthly: item.price_monthly,
        }));

      const res = await fetch("/api/customer/add-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_request_id: planRequestId, items }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed");
      }
      setSuccess(true);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Group catalog items by category name
  const grouped = catalog.reduce<Record<string, DisplayItem[]>>((acc, item) => {
    const cat = item.category_name;
    (acc[cat] = acc[cat] ?? []).push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-[480px] mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800 flex-1">Add Service</h1>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        {planLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!planLoading && !plan && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-gray-600 text-sm mb-4">
              Additional services are available after you complete payment for your plan.
            </p>
            <button
              onClick={() => router.push("/plan")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#004aad] text-white rounded-xl text-sm font-medium"
            >
              View Plan
            </button>
          </div>
        )}

        {!planLoading && plan && (
          <>
            {success && (
              <div className="bg-green-50 rounded-2xl border border-green-100 p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-700 font-medium">
                  Your request has been submitted! We&apos;ll get back to you shortly.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-600">{error}</div>
            )}

            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{category}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map((item) => {
                    const isSelected = selected.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggle(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "border-[#004aad] bg-[#004aad]" : "border-gray-300"
                          }`}
                        >
                          {isSelected && <Plus className="w-3 h-3 text-white rotate-45" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.frequency_label}</p>
                        </div>
                        {item.price_monthly > 0 && (
                          <p className="text-sm font-semibold text-[#004aad] shrink-0">
                            {formatCurrency(item.price_monthly)}/mo
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {catalog.length === 0 && !planLoading && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <p className="text-sm text-gray-500">No additional services available right now.</p>
              </div>
            )}

            {catalog.length > 0 && (
              <button
                onClick={handleSubmit}
                disabled={selected.size === 0 || submitting}
                className="w-full py-3.5 rounded-2xl bg-[#004aad] text-white font-semibold text-sm disabled:opacity-50 transition-opacity"
              >
                {submitting
                  ? "Submitting…"
                  : selected.size > 0
                  ? `Request ${selected.size} Service${selected.size > 1 ? "s" : ""}`
                  : "Select Services to Request"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
