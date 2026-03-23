"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, CheckCircle, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calcJobPrices,
  type JobPricingParams,
} from "@/lib/pricing";
import { formatCurrency, defaultPlusDate } from "@/lib/utils";
import { PlanItemWeeklyCard, type AllocationUpdate } from "@/components/PlanItemWeeklyCard";

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
  preferred_provider_id: string | null;
  backup_provider_id: string | null;
  scheduled_day_of_week: number | null;
  is_addon?: boolean;
  service_jobs?: {
    slug: string;
    name: string;
    code: string | null;
    min_unit?: number;
    max_unit?: number;
    unit_interval?: number;
  } | null;
  service_categories?: { slug: string; name: string } | null;
}

interface RequestDetail {
  id: string;
  request_code: string;
  status: string;
  plan_start_date: string | null;
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

interface ServiceJob {
  id: string;
  name: string;
  code: string | null;
  category_id: string;
  slug: string;
  frequency_label: string;
  unit_type: string;
  default_unit: number;
  min_unit: number;
  max_unit: number;
  unit_interval: number;
  formula_type: string;
  base_rate_per_unit: number;
  instances_per_month: number;
  discount_pct: number;
  time_multiple: number | null;
  service_categories: { id: string; slug: string; name: string } | null;
  category_name: string | null;
}

interface AllocationRow {
  plan_request_item_id: string;
  service_provider_id: string;
  backup_provider_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  unit_value: number;
  scheduled_day_of_week: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/** UTC day-of-week (0=Sun … 6=Sat) for YYYY-MM-DD. */
function getDow(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

// ── Service Catalog Modal ─────────────────────────────────────────────────────

function ServiceCatalogModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (job: ServiceJob) => void;
}) {
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/supervisor/service-catalog")
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter(
    (j) =>
      j.name.toLowerCase().includes(search.toLowerCase()) ||
      (j.category_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (j.code ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Add Service</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No services found</p>
          ) : (
            <ul>
              {filtered.map((job) => (
                <li key={job.id}>
                  <button
                    onClick={() => onSelect(job)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800">{job.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {job.category_name ?? "—"} {job.code ? `· ${job.code}` : ""}
                      {" · "}{job.frequency_label}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
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
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/supervisor/requests/${planRequestId}`).then((r) => r.json()),
      fetch("/api/supervisor/team").then((r) => r.json()),
    ]).then(([reqData, teamData]) => {
      const req: RequestDetail = reqData.request;
      setRequest(req);
      const providers: Provider[] = teamData.providers ?? [];
      setAllProviders(providers);

      const isPaidPlan = req?.status === "active";
      const itemsToAllocate = isPaidPlan
        ? (req?.plan_request_items ?? []).filter((i) => i.is_addon)
        : (req?.plan_request_items ?? []);

      const planStartDate = req?.plan_start_date ?? defaultPlusDate(3);

      setAllocations(
        itemsToAllocate.map((item) => {
          const startTime = item.preferred_start_time ?? "08:00";
          const mins = computeMinutes(
            item.unit_type,
            item.unit_value,
            item.time_multiple != null ? Number(item.time_multiple) : null
          );
          return {
            plan_request_item_id: item.id,
            service_provider_id: item.preferred_provider_id ?? "",
            backup_provider_id: item.backup_provider_id ?? "",
            scheduled_date: planStartDate,
            scheduled_start_time: startTime,
            scheduled_end_time: addMinutesToTime(startTime, mins),
            unit_value: item.unit_value,
            scheduled_day_of_week:
              item.scheduled_day_of_week !== null && item.scheduled_day_of_week !== undefined
                ? item.scheduled_day_of_week
                : getDow(planStartDate),
          };
        })
      );
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [planRequestId]);

  function updateAllocation(itemId: string, updates: AllocationUpdate) {
    setAllocations((prev) =>
      prev.map((a) =>
        a.plan_request_item_id === itemId
          ? {
              ...a,
              ...(updates.service_provider_id !== undefined && { service_provider_id: updates.service_provider_id }),
              ...(updates.backup_provider_id !== undefined && { backup_provider_id: updates.backup_provider_id ?? "" }),
              ...(updates.scheduled_start_time !== undefined && { scheduled_start_time: updates.scheduled_start_time }),
              ...(updates.scheduled_end_time !== undefined && { scheduled_end_time: updates.scheduled_end_time }),
              ...(updates.unit_value !== undefined && { unit_value: updates.unit_value }),
              ...(updates.scheduled_day_of_week !== undefined && { scheduled_day_of_week: updates.scheduled_day_of_week ?? null }),
            }
          : a
      )
    );
  }

  async function handleAddService(job: ServiceJob) {
    if (!request) return;
    setCatalogLoading(true);
    setError("");
    try {
      const categoryId = job.service_categories?.id ?? job.category_id;
      if (!categoryId) {
        setError("Service is missing a category — cannot add.");
        return;
      }

      const { base, effective } = calcJobPrices(job.default_unit, {
        formula_type: job.formula_type,
        unit_type: job.unit_type,
        base_rate_per_unit: job.base_rate_per_unit,
        instances_per_month: job.instances_per_month,
        discount_pct: job.discount_pct,
        time_multiple: job.time_multiple,
      });

      const itemPayload = {
        category_id: categoryId,
        job_id: job.id,
        job_code: job.code,
        title: job.name,
        frequency_label: job.frequency_label,
        unit_type: job.unit_type,
        unit_value: job.default_unit,
        minutes:
          job.unit_type === "min"
            ? job.default_unit
            : job.time_multiple
            ? Math.round(job.default_unit * job.time_multiple)
            : job.default_unit,
        base_rate_per_unit: job.base_rate_per_unit,
        instances_per_month: job.instances_per_month,
        discount_pct: job.discount_pct,
        time_multiple: job.time_multiple,
        formula_type: job.formula_type,
        base_price_monthly: base,
        price_monthly: effective,
        mrp_monthly: base,
      };

      const res = await fetch(
        `/api/supervisor/requests/${planRequestId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemPayload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add service");
        return;
      }

      // Re-fetch request to get updated items
      const reqRes = await fetch(
        `/api/supervisor/requests/${planRequestId}`
      ).then((r) => r.json());
      const updatedReq: RequestDetail = reqRes.request;
      setRequest(updatedReq);

      // Add allocation row for the new item
      const newItem: PlanItem = data.item;
      const planStartDate = request.plan_start_date ?? defaultPlusDate(3);
      const startTime = newItem.preferred_start_time ?? "08:00";
      const mins = computeMinutes(
        newItem.unit_type,
        newItem.unit_value,
        newItem.time_multiple != null ? Number(newItem.time_multiple) : null
      );
      setAllocations((prev) => [
        ...prev,
        {
          plan_request_item_id: newItem.id,
          service_provider_id: "",
          backup_provider_id: "",
          scheduled_date: planStartDate,
          scheduled_start_time: startTime,
          scheduled_end_time: addMinutesToTime(startTime, mins),
          unit_value: newItem.unit_value,
          scheduled_day_of_week: getDow(planStartDate),
        },
      ]);

      setShowCatalog(false);
    } catch {
      setError("Failed to add service");
    } finally {
      setCatalogLoading(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Remove this service?")) return;
    setError("");
    try {
      const res = await fetch(
        `/api/supervisor/requests/${planRequestId}/items?itemId=${itemId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to delete item");
        return;
      }
      setRequest((prev) =>
        prev
          ? {
              ...prev,
              plan_request_items: prev.plan_request_items.filter(
                (i) => i.id !== itemId
              ),
            }
          : prev
      );
      setAllocations((prev) => prev.filter((a) => a.plan_request_item_id !== itemId));
    } catch {
      setError("Failed to delete item");
    }
  }

  async function handleAllocate() {
    setSubmitting(true);
    setError("");
    try {
      const payload = allocations.map((a) => ({
        plan_request_item_id: a.plan_request_item_id,
        service_provider_id: a.service_provider_id,
        backup_provider_id: a.backup_provider_id || null,
        scheduled_date: a.scheduled_date,
        scheduled_start_time: a.scheduled_start_time,
        scheduled_end_time: a.scheduled_end_time,
        unit_value: a.unit_value,
        scheduled_day_of_week: a.scheduled_day_of_week ?? null,
      }));

      const res = await fetch(
        `/api/supervisor/new-requests/${planRequestId}/allocate`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allocations: payload }),
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

  // Live total price calculation
  const liveTotal = useMemo(() => {
    if (!request) return 0;
    const isPaidPlan = request.status === "active";
    const itemsToAllocate = isPaidPlan
      ? request.plan_request_items.filter((i) => i.is_addon)
      : request.plan_request_items;
    return itemsToAllocate.reduce((s, item) => {
      const alloc = allocations.find((a) => a.plan_request_item_id === item.id);
      const uv = alloc?.unit_value ?? item.unit_value;
      const { effective } = computePlanItemPrices(item, uv);
      return s + effective;
    }, 0);
  }, [request, allocations]);

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
  const planStartDate = request.plan_start_date ?? defaultPlusDate(3);

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
        {/* Customer Info + live total */}
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
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <span>Plan starts:</span>
            <span className="font-medium text-gray-700">{planStartDate}</span>
          </div>
          {itemsToAllocate.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Estimated Total</span>
              <span className="text-sm font-bold text-[#004aad]">
                {formatCurrency(liveTotal)}{" "}
                <span className="text-xs font-normal text-gray-400">/ month</span>
              </span>
            </div>
          )}
        </div>

        {/* Services header + add button */}
        {!success && (
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              Services ({itemsToAllocate.length})
            </p>
            <button
              type="button"
              onClick={() => setShowCatalog(true)}
              disabled={catalogLoading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#004aad] text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Service
            </button>
          </div>
        )}

        {/* Allocation cards */}
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
            No services added yet — click &quot;Add Service&quot; to begin.
          </div>
        ) : (
          itemsToAllocate.map((item) => {
            const alloc = allocations.find((a) => a.plan_request_item_id === item.id);
            return (
              <PlanItemWeeklyCard
                key={item.id}
                item={{
                  ...item,
                  preferred_provider_id: alloc?.service_provider_id || item.preferred_provider_id,
                  backup_provider_id: alloc?.backup_provider_id || item.backup_provider_id,
                  preferred_start_time: alloc?.scheduled_start_time || item.preferred_start_time,
                  unit_value: alloc?.unit_value ?? item.unit_value,
                  scheduled_day_of_week: alloc?.scheduled_day_of_week ?? item.scheduled_day_of_week,
                }}
                planStartDate={planStartDate}
                allProviders={allProviders}
                availabilityApiBase="/api/supervisor/providers/availability"
                onUpdate={(updates) => updateAllocation(item.id, updates)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            );
          })
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

      {showCatalog && (
        <ServiceCatalogModal
          onClose={() => setShowCatalog(false)}
          onSelect={handleAddService}
        />
      )}
    </div>
  );
}
