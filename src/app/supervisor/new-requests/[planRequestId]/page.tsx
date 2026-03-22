"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, CheckCircle, Minus, Plus, Clock, AlertTriangle, CheckCheck, Moon, Search, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calcJobPrices,
  getUnitDisplayName,
  formatUnitValue,
  type JobPricingParams,
} from "@/lib/pricing";
import { formatCurrency, defaultPlusDate } from "@/lib/utils";

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

interface ProviderAvailability {
  id: string;
  name: string;
  provider_type: string | null;
  is_available: boolean;
  is_busy: boolean;
  is_day_off: boolean;
  on_leave: boolean;
  day_off_day: string | null;
  conflicts: { id: string; start: string; end: string; title: string }[];
  all_allocations: { id: string; start: string; end: string; title: string }[];
}

interface AllocationRow {
  plan_request_item_id: string;
  service_provider_id: string;
  backup_provider_id: string;
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

/** Guess the provider_type cluster from a job title / frequency_label */
function guessProviderTypeFromItem(item: PlanItem): string | null {
  const text = item.title.toLowerCase();
  if (/clean|mop|sweep|dust|wipe|floor|toilet|bathroom|kitchen/.test(text)) return "cleaning";
  if (/cook|meal|food|breakfast|lunch|dinner/.test(text)) return "cooking";
  if (/laundry|wash|cloth|iron/.test(text)) return "laundry";
  if (/plant|garden|water/.test(text)) return "gardening";
  if (/car|vehicle|bike/.test(text)) return "driver";
  return null;
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

// ── Allocation item card ──────────────────────────────────────────────────────

function AllocationCard({
  item,
  alloc,
  allProviders,
  availability,
  availLoading,
  onChange,
  onFetchAvailability,
  onDelete,
}: {
  item: PlanItem;
  alloc: AllocationRow;
  allProviders: Provider[];
  availability: ProviderAvailability[];
  availLoading: boolean;
  onChange: (field: keyof AllocationRow, value: string | number) => void;
  onFetchAvailability: (date: string, start: string, end: string) => void;
  onDelete?: () => void;
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

  const computedEndTime =
    alloc.scheduled_start_time
      ? addMinutesToTime(alloc.scheduled_start_time, durationMins)
      : alloc.scheduled_end_time;

  const discountPct = item.discount_pct ? Number(item.discount_pct) : 0;

  function stepUnit(dir: 1 | -1) {
    const next = Math.min(maxUnit, Math.max(minUnit, alloc.unit_value + dir * interval));
    if (next !== alloc.unit_value) onChange("unit_value", next);
  }

  // Build availability map
  const availMap = new Map(availability.map((p) => [p.id, p]));

  const selectedProviderAvail = alloc.service_provider_id
    ? availMap.get(alloc.service_provider_id)
    : null;

  const primaryHasDayOff = selectedProviderAvail?.is_day_off ?? false;
  const primaryDayOffDay = selectedProviderAvail?.day_off_day ?? null;

  // Guess relevant provider type for this item
  const guessedType = guessProviderTypeFromItem(item);

  // Providers relevant to this job type
  const relevantProviders = guessedType
    ? allProviders.filter(
        (p) =>
          p.provider_type?.toLowerCase().includes(guessedType) ||
          guessedType.includes(p.provider_type?.toLowerCase() ?? "")
      )
    : allProviders;

  // Providers available at the time window (for the smart hint panel)
  const availableProviders = availability.filter(
    (p) => p.is_available && p.id !== alloc.service_provider_id
  );

  function providerOptionLabel(p: Provider): string {
    const avail = availMap.get(p.id);
    const typeLabel = p.provider_type ? ` · ${p.provider_type.replace(/_/g, " ")}` : "";
    if (!avail) return p.name + typeLabel;
    const suffix = avail.on_leave
      ? " 🛑 on leave"
      : avail.is_day_off
      ? ` 🌙 day off (${avail.day_off_day})`
      : avail.is_busy
      ? ` ⚠ busy (${avail.conflicts.length})`
      : " ✓";
    return p.name + typeLabel + suffix;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* Title + price + delete */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
          <p className="text-xs text-gray-400">{item.frequency_label}</p>
        </div>
        <div className="flex items-start gap-2">
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
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-gray-300 hover:text-red-500 transition-colors mt-0.5"
              title="Remove service"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

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
          <span className="text-xs text-gray-400 ml-1">{durationMins} min session</span>
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Date</label>
        <input
          type="date"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
          value={alloc.scheduled_date}
          onChange={(e) => {
            onChange("scheduled_date", e.target.value);
            if (e.target.value && alloc.scheduled_start_time && alloc.scheduled_end_time) {
              onFetchAvailability(
                e.target.value,
                alloc.scheduled_start_time,
                alloc.scheduled_end_time
              );
            }
          }}
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
              if (e.target.value) {
                const et = addMinutesToTime(e.target.value, durationMins);
                onChange("scheduled_end_time", et);
                if (alloc.scheduled_date) {
                  onFetchAvailability(alloc.scheduled_date, e.target.value, et);
                }
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

      {/* Smart availability panel */}
      {alloc.scheduled_date && availability.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-600">
            Team Availability on {alloc.scheduled_date}
            {alloc.scheduled_start_time && (
              <span className="font-normal text-gray-400">
                {" "}· {alloc.scheduled_start_time}–{computedEndTime}
              </span>
            )}
            {availLoading && (
              <span className="ml-2 text-gray-400 font-normal">checking…</span>
            )}
          </p>
          {/* Available providers for this job type */}
          {guessedType && relevantProviders.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-500 mb-1">
                {guessedType.charAt(0).toUpperCase() + guessedType.slice(1)} staff
                {alloc.scheduled_start_time ? " — free at this time:" : ":"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {relevantProviders.map((p) => {
                  const avail = availMap.get(p.id);
                  return (
                    <span
                      key={p.id}
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        !avail
                          ? "bg-gray-100 text-gray-500"
                          : avail.is_available
                          ? "bg-green-100 text-green-700"
                          : avail.is_day_off
                          ? "bg-amber-100 text-amber-700"
                          : avail.on_leave
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {p.name}
                      {avail
                        ? avail.is_available
                          ? " ✓"
                          : avail.is_day_off
                          ? " 🌙"
                          : avail.on_leave
                          ? " 🛑"
                          : " ⚠"
                        : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Free providers outside the guessed type */}
          {availableProviders.filter(
            (p) =>
              !guessedType ||
              !relevantProviders.some((r) => r.id === p.id)
          ).length > 0 && (
            <div>
              <p className="text-[11px] text-gray-500 mb-1">Other free team members:</p>
              <div className="flex flex-wrap gap-1.5">
                {availableProviders
                  .filter(
                    (p) =>
                      !guessedType ||
                      !relevantProviders.some((r) => r.id === p.id)
                  )
                  .map((p) => (
                    <span
                      key={p.id}
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-600"
                    >
                      {p.name}
                      {p.provider_type ? ` · ${p.provider_type.replace(/_/g, " ")}` : ""}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Primary Provider */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Primary Provider</label>
        <select
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
          value={alloc.service_provider_id}
          onChange={(e) => onChange("service_provider_id", e.target.value)}
        >
          <option value="">Select provider</option>
          {allProviders.map((p) => (
            <option key={p.id} value={p.id}>
              {providerOptionLabel(p)}
            </option>
          ))}
        </select>

        {/* Provider availability detail */}
        {selectedProviderAvail && alloc.scheduled_date && (
          <div
            className={`mt-1.5 rounded-lg px-3 py-2 text-xs flex items-start gap-1.5 ${
              selectedProviderAvail.is_available
                ? "bg-green-50 text-green-700"
                : selectedProviderAvail.is_day_off || selectedProviderAvail.on_leave
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {selectedProviderAvail.is_available ? (
              <><CheckCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Free on {alloc.scheduled_date}</>
            ) : selectedProviderAvail.on_leave ? (
              <><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> On approved leave</>
            ) : selectedProviderAvail.is_day_off ? (
              <><Moon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Week-off day ({primaryDayOffDay}) — set a backup below</>
            ) : (
              <><Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Busy: {selectedProviderAvail.conflicts.map((c) => `${c.title} ${c.start}–${c.end}`).join(", ")}</>
            )}
          </div>
        )}

        {/* Existing schedule for selected provider */}
        {selectedProviderAvail && selectedProviderAvail.all_allocations.length > 0 && (
          <div className="mt-1.5 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-700 mb-0.5">
              {selectedProviderAvail.name}&apos;s full schedule on {alloc.scheduled_date}:
            </p>
            {selectedProviderAvail.all_allocations.map((a) => (
              <p key={a.id}>{a.start}–{a.end} · {a.title}</p>
            ))}
          </div>
        )}
      </div>

      {/* Backup Provider — show when primary is selected and has day-off */}
      {alloc.service_provider_id && (primaryHasDayOff || alloc.backup_provider_id) && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            Backup Provider
            {primaryDayOffDay && (
              <span className="ml-1 text-amber-600">(covers {primaryDayOffDay}s)</span>
            )}
          </label>
          <select
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
            value={alloc.backup_provider_id}
            onChange={(e) => onChange("backup_provider_id", e.target.value)}
          >
            <option value="">No backup</option>
            {allProviders
              .filter((p) => p.id !== alloc.service_provider_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {providerOptionLabel(p)}
                </option>
              ))}
          </select>
        </div>
      )}
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
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
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

      setAllocations(
        itemsToAllocate.map((item) => ({
          plan_request_item_id: item.id,
          service_provider_id: "",
          backup_provider_id: "",
          scheduled_date: defaultPlusDate(3),
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

  const fetchAvailability = useCallback(
    async (date: string, startTime: string, endTime: string) => {
      if (!date) return;
      setAvailLoading(true);
      try {
        const p = new URLSearchParams({ date });
        if (startTime) p.set("start_time", startTime);
        if (endTime) p.set("end_time", endTime);
        const res = await fetch(`/api/supervisor/providers/availability?${p}`);
        if (res.ok) {
          const d = await res.json();
          setAvailability(d.providers ?? []);
        }
      } finally {
        setAvailLoading(false);
      }
    },
    []
  );

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
      setAllocations((prev) => [
        ...prev,
        {
          plan_request_item_id: newItem.id,
          service_provider_id: "",
          backup_provider_id: "",
          scheduled_date: defaultPlusDate(3),
          scheduled_start_time: newItem.preferred_start_time ?? "",
          scheduled_end_time: newItem.preferred_start_time
            ? addMinutesToTime(
                newItem.preferred_start_time,
                computeMinutes(
                  newItem.unit_type,
                  newItem.unit_value,
                  newItem.time_multiple != null
                    ? Number(newItem.time_multiple)
                    : null
                )
              )
            : "",
          unit_value: newItem.unit_value,
        },
      ]);

      setShowCatalog(false);
    } catch {
      setError("Failed to add service");
    } finally {
      setCatalogLoading(false);
    }
  }

  async function handleDeleteItem(itemId: string, allocIdx: number) {
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
      // Update local state
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
      setAllocations((prev) => prev.filter((_, i) => i !== allocIdx));
    } catch {
      setError("Failed to delete item");
    }
  }

  async function handleAllocate() {
    setSubmitting(true);
    setError("");
    try {
      // Build payload — include backup_provider_id and update item pricing if unit_value changed
      const payload = allocations.map((a) => ({
        plan_request_item_id: a.plan_request_item_id,
        service_provider_id: a.service_provider_id,
        backup_provider_id: a.backup_provider_id || null,
        scheduled_date: a.scheduled_date,
        scheduled_start_time: a.scheduled_start_time,
        scheduled_end_time: a.scheduled_end_time,
        unit_value: a.unit_value,
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
          {/* Live total price */}
          {itemsToAllocate.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Estimated Total</span>
              <span className="text-sm font-bold text-[#004aad]">
                {formatCurrency(
                  itemsToAllocate.reduce((s, item) => {
                    const allocIdx = allocations.findIndex(
                      (a) => a.plan_request_item_id === item.id
                    );
                    const uv =
                      allocIdx >= 0
                        ? allocations[allocIdx].unit_value
                        : item.unit_value;
                    const { effective } = computePlanItemPrices(item, uv);
                    return s + effective;
                  }, 0)
                )}{" "}
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
            No services added yet — click &quot;Add Service&quot; to begin.
          </div>
        ) : (
          itemsToAllocate.map((item, idx) => (
            <AllocationCard
              key={item.id}
              item={item}
              alloc={allocations.find((a) => a.plan_request_item_id === item.id) ?? {
                plan_request_item_id: item.id,
                service_provider_id: "",
                backup_provider_id: "",
                scheduled_date: defaultPlusDate(3),
                scheduled_start_time: "",
                scheduled_end_time: "",
                unit_value: item.unit_value,
              }}
              allProviders={allProviders}
              availability={availability}
              availLoading={availLoading}
              onChange={(field, value) => updateAllocation(idx, field, value)}
              onFetchAvailability={fetchAvailability}
              onDelete={() => handleDeleteItem(item.id, idx)}
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

      {showCatalog && (
        <ServiceCatalogModal
          onClose={() => setShowCatalog(false)}
          onSelect={handleAddService}
        />
      )}
    </div>
  );
}
