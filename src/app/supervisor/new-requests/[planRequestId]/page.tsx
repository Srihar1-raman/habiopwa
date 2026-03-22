"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, CheckCircle, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calcJobPrices,
  getUnitDisplayName,
  formatUnitValue,
  type JobPricingParams,
} from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

interface PlanItem {
  id: string;
  title: string;
  frequency_label: string;
  unit_type: string;
  unit_value: number;
  minutes: number;
  base_rate_per_unit: number | null;
  instances_per_month: number | null;
  discount_pct: number | null;
  time_multiple: number | null;
  formula_type: string | null;
  base_price_monthly: number | null;
  price_monthly: number;
  preferred_start_time: string | null;
  is_addon?: boolean;
  service_jobs?: {
    slug: string;
    name: string;
    code: string | null;
    min_unit?: number;
    max_unit?: number;
    unit_interval?: number;
  } | null;
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
  provider_type: string | null;
}

interface AllocationRow {
  plan_request_item_id: string;
  service_provider_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  unit_value: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function computeMinutes(
  unitType: string,
  unitValue: number,
  timeMultiple: number | null
): number {
  if (unitType === "min") return unitValue;
  if (timeMultiple != null && timeMultiple > 0)
    return Math.round(unitValue * timeMultiple);
  return 30;
}

function computePlanItemPrices(
  item: PlanItem,
  unitValue: number
): { base: number; effective: number } {
  if (item.base_rate_per_unit == null || item.instances_per_month == null) {
    return { base: item.base_price_monthly ?? item.price_monthly, effective: item.price_monthly };
  }
  const params: JobPricingParams = {
    formula_type: item.formula_type ?? "standard",
    unit_type: item.unit_type,
    base_rate_per_unit: Number(item.base_rate_per_unit),
    instances_per_month: Number(item.instances_per_month),
    discount_pct: Number(item.discount_pct ?? 0),
    time_multiple: item.time_multiple != null ? Number(item.time_multiple) : null,
  };
  return calcJobPrices(unitValue, params);
}

// ── Allocation item card ──────────────────────────────────────────────────────

function AllocationCard({
  item,
  alloc,
  providers,
  onChange,
}: {
  item: PlanItem;
  alloc: AllocationRow;
  providers: Provider[];
  onChange: (field: keyof AllocationRow, value: string | number) => void;
}) {
  const minUnit = item.service_jobs?.min_unit ?? (item.unit_type === "min" ? 15 : 1);
  const maxUnit = item.service_jobs?.max_unit ?? (item.unit_type === "min" ? 480 : 20);
  const interval =
    item.service_jobs?.unit_interval ?? (item.unit_type === "min" ? 15 : 1);

  const { base, effective } = useMemo(
    () => computePlanItemPrices(item, alloc.unit_value),
    [item, alloc.unit_value]
  );

  const durationMins = computeMinutes(
    item.unit_type,
    alloc.unit_value,
    item.time_multiple != null ? Number(item.time_multiple) : null
  );

  // Auto-compute end time when start time changes
  const computedEndTime =
    alloc.scheduled_start_time
      ? addMinutesToTime(alloc.scheduled_start_time, durationMins)
      : alloc.scheduled_end_time;

  const discountPct = item.discount_pct ? Number(item.discount_pct) : 0;

  function stepUnit(dir: 1 | -1) {
    const next = Math.min(maxUnit, Math.max(minUnit, alloc.unit_value + dir * interval));
    if (next !== alloc.unit_value) onChange("unit_value", next);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* Title + price */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
          <p className="text-xs text-gray-400">{item.frequency_label}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-[#004aad]">
            {formatCurrency(effective)}
            <span className="text-xs font-normal text-gray-400">/m</span>
          </p>
          {base !== effective && (
            <p className="text-xs text-gray-400 line-through">{formatCurrency(base)}</p>
          )}
          {discountPct > 0 && base !== effective && (
            <p className="text-xs text-green-600">{Math.round(discountPct * 100)}% off</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* Unit stepper */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            {getUnitDisplayName(item.unit_type)}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stepUnit(-1)}
              disabled={alloc.unit_value <= minUnit}
              className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="w-3.5 h-3.5 text-gray-700" />
            </button>
            <span className="text-sm font-semibold text-gray-900 min-w-[4.5rem] text-center">
              {formatUnitValue(alloc.unit_value, item.unit_type)}
            </span>
            <button
              type="button"
              onClick={() => stepUnit(1)}
              disabled={alloc.unit_value >= maxUnit}
              className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Provider */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Provider</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
            value={alloc.service_provider_id}
            onChange={(e) => onChange("service_provider_id", e.target.value)}
          >
            <option value="">Select provider</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.provider_type ? ` · ${p.provider_type.replace(/_/g, " ")}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Date</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
            value={alloc.scheduled_date}
            onChange={(e) => onChange("scheduled_date", e.target.value)}
          />
        </div>

        {/* Start / End time */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
            <input
              type="time"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
              value={alloc.scheduled_start_time}
              onChange={(e) => {
                onChange("scheduled_start_time", e.target.value);
                // Auto-set end time from start + duration
                if (e.target.value) {
                  onChange(
                    "scheduled_end_time",
                    addMinutesToTime(e.target.value, durationMins)
                  );
                }
              }}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">
              End Time
              <span className="text-gray-400 ml-1">(auto)</span>
            </label>
            <input
              type="time"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
              value={computedEndTime}
              onChange={(e) => onChange("scheduled_end_time", e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

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

      const isPaidPlan = req?.status === "active";
      const itemsToAllocate = isPaidPlan
        ? (req?.plan_request_items ?? []).filter((i) => i.is_addon)
        : (req?.plan_request_items ?? []);

      setAllocations(
        itemsToAllocate.map((item) => ({
          plan_request_item_id: item.id,
          service_provider_id: "",
          scheduled_date: "",
          // Pre-populate start time from item's preferred schedule
          scheduled_start_time: item.preferred_start_time ?? "",
          scheduled_end_time: item.preferred_start_time
            ? addMinutesToTime(
                item.preferred_start_time,
                computeMinutes(
                  item.unit_type,
                  item.unit_value,
                  item.time_multiple != null ? Number(item.time_multiple) : null
                )
              )
            : "",
          unit_value: item.unit_value,
        }))
      );
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [planRequestId]);

  function updateAllocation(
    index: number,
    field: keyof AllocationRow,
    value: string | number
  ) {
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
      const res = await fetch(
        `/api/supervisor/new-requests/${planRequestId}/allocate`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allocations }),
        }
      );
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
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
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
  const isPaidPlan = request.status === "active";
  const itemsToAllocate = isPaidPlan
    ? request.plan_request_items.filter((i) => i.is_addon)
    : request.plan_request_items;

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
          <p className="text-xs font-mono text-[#004aad] font-semibold">
            {request.request_code}
          </p>
          <h1 className="text-base font-bold text-gray-900">
            {isPaidPlan ? "Allocate Add-on Services" : "Allocate Team"}
          </h1>
        </div>
        {isPaidPlan && (
          <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
            Active Plan
          </span>
        )}
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
              {[
                profile.flat_no,
                profile.society,
                profile.sector,
                profile.city,
              ]
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
        ) : itemsToAllocate.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            No pending items to allocate.
          </div>
        ) : (
          itemsToAllocate.map((item, idx) => (
            <AllocationCard
              key={item.id}
              item={item}
              alloc={allocations[idx] ?? {
                plan_request_item_id: item.id,
                service_provider_id: "",
                scheduled_date: "",
                scheduled_start_time: "",
                scheduled_end_time: "",
                unit_value: item.unit_value,
              }}
              providers={providers}
              onChange={(field, value) => updateAllocation(idx, field, value)}
            />
          ))
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {!success && itemsToAllocate.length > 0 && (
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
