"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Search, X, Minus } from "lucide-react";
import {
  calcJobPrices,
  getUnitLabel,
  getUnitDisplayName,
  formatUnitValue,
  type JobPricingParams,
} from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CustomerProfile {
  flat_no: string | null;
  building: string | null;
  society: string | null;
  sector: string | null;
  city: string | null;
  pincode: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  customer_profiles: CustomerProfile[] | CustomerProfile | null;
}

interface Supervisor {
  id: string;
  name: string;
  phone: string;
}

interface PlanItem {
  id: string;
  plan_request_id: string;
  category_id: string;
  job_id: string | null;
  job_code: string | null;
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
  mrp_monthly: number | null;
  preferred_start_time: string | null;
  preferred_provider_id: string | null;
  backup_provider_id: string | null;
  service_categories: { slug: string; name: string } | null;
  service_jobs: {
    slug: string;
    name: string;
    code: string;
    min_unit?: number;
    max_unit?: number;
    unit_interval?: number;
  } | null;
}

interface ServiceProvider {
  id: string;
  name: string;
  provider_type: string | null;
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

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface PlanRequest {
  id: string;
  request_code: string;
  status: string;
  total_price_monthly: number;
  plan_start_date: string | null;
  plan_active_start_date: string | null;
  plan_active_end_date: string | null;
  is_recurring: boolean;
  assigned_supervisor_id: string | null;
  admin_remarks: string | null;
  created_at: string;
  customers: Customer | Customer[] | null;
  assigned_supervisor: Supervisor | Supervisor[] | null;
  payments: Payment[] | null;
  plan_request_items: PlanItem[] | null;
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

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  cart_in_progress: "bg-amber-100 text-amber-700",
  submitted: "bg-yellow-100 text-yellow-700",
  captain_allocation_pending: "bg-yellow-100 text-yellow-700",
  captain_review_pending: "bg-blue-100 text-blue-700",
  payment_pending: "bg-purple-100 text-purple-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-gray-100 text-gray-600",
  completed: "bg-teal-100 text-teal-700",
  cancelled: "bg-gray-100 text-gray-500",
  closed: "bg-gray-200 text-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  cart_in_progress: "Cart (Draft)",
  submitted: "Submitted",
  captain_allocation_pending: "Submitted",
  captain_review_pending: "Review Pending",
  payment_pending: "Payment Pending",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  closed: "Closed",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  succeeded: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unwrap<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function formatAddress(profile: CustomerProfile | null): string {
  if (!profile) return "—";
  return [profile.flat_no, profile.building, profile.society, profile.sector, profile.city, profile.pincode]
    .filter(Boolean)
    .join(", ");
}

/** Add minutes to a HH:MM time string, returns HH:MM. */
function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/** Compute session duration in minutes from an item's unit_type/value/time_multiple. */
function computeItemMinutes(
  unitType: string,
  unitValue: number,
  timeMultiple: number | null
): number {
  if (unitType === "min") return unitValue;
  if (timeMultiple != null && timeMultiple > 0)
    return Math.round(unitValue * timeMultiple);
  return 30;
}

/** Live formula-based price computation from item pricing params. */
function computeItemPrices(
  item: PlanItem,
  unitValue: number
): { base: number; effective: number } {
  if (item.base_rate_per_unit == null || item.instances_per_month == null) {
    return {
      base: item.base_price_monthly ?? item.price_monthly,
      effective: item.price_monthly,
    };
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

/** Formula insight string for display. */
function itemFormulaInsight(item: PlanItem, unitValue: number): string {
  if (item.base_rate_per_unit == null || item.instances_per_month == null)
    return "";
  const rate = Number(item.base_rate_per_unit).toFixed(2);
  const inst = `${item.instances_per_month} visits/mo`;
  if (item.unit_type === "min") return `${unitValue} min × ₹${rate}/min × ${inst}`;
  const unitLabel = getUnitLabel(item.unit_type);
  const tmPart = item.time_multiple
    ? ` × ${item.time_multiple} min/${unitLabel.replace(/s$/, "")}`
    : "";
  return `${unitValue} ${unitLabel}${tmPart} × ₹${rate}/min × ${inst}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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
    fetch("/api/admin/service-catalog")
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Add Service</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
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

/** Card-based editable item — shows unit stepper, start time, availability-aware provider, backup provider. */
function EditableItemCard({
  item,
  providers,
  planId,
  onUpdate,
  onDelete,
}: {
  item: PlanItem;
  providers: ServiceProvider[];
  planId: string;
  onUpdate: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [unitValue, setUnitValue] = useState(item.unit_value);
  const [startTime, setStartTime] = useState(item.preferred_start_time ?? "");
  const [providerId, setProviderId] = useState(item.preferred_provider_id ?? "");
  const [backupProviderId, setBackupProviderId] = useState(
    item.backup_provider_id ?? ""
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [availDate, setAvailDate] = useState(""); // date chosen for this item's allocation

  const minUnit = item.service_jobs?.min_unit ?? (item.unit_type === "min" ? 15 : 1);
  const maxUnit = item.service_jobs?.max_unit ?? (item.unit_type === "min" ? 480 : 20);
  const interval =
    item.service_jobs?.unit_interval ?? (item.unit_type === "min" ? 15 : 1);

  const { base, effective } = useMemo(
    () => computeItemPrices(item, unitValue),
    [item, unitValue]
  );
  const discountPct = item.discount_pct ? Number(item.discount_pct) : 0;
  const durationMins = computeItemMinutes(
    item.unit_type,
    unitValue,
    item.time_multiple != null ? Number(item.time_multiple) : null
  );
  const endTime = startTime ? addMinutesToTime(startTime, durationMins) : "";
  const insight = itemFormulaInsight(item, unitValue);

  // Fetch availability whenever date or time window changes
  const fetchAvailability = useCallback(
    async (date: string, st: string, et: string) => {
      if (!date) return;
      setAvailLoading(true);
      try {
        const params = new URLSearchParams({ date });
        if (st) params.set("start_time", st);
        if (et) params.set("end_time", et);
        const res = await fetch(
          `/api/admin/providers/availability?${params}`
        );
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

  // Trigger availability fetch when date/time changes
  useEffect(() => {
    if (availDate && startTime && endTime) {
      fetchAvailability(availDate, startTime, endTime);
    } else if (availDate) {
      fetchAvailability(availDate, "", "");
    }
  }, [availDate, startTime, endTime, fetchAvailability]);

  async function save(updates: Record<string, unknown>) {
    setSaving(Object.keys(updates)[0]);
    await onUpdate(item.id, updates);
    setSaving(null);
  }

  function stepUnit(dir: 1 | -1) {
    const next = Math.min(maxUnit, Math.max(minUnit, unitValue + dir * interval));
    if (next === unitValue) return;
    setUnitValue(next);
    save({ unit_value: next });
  }

  // Provider availability map
  const availMap = new Map(availability.map((p) => [p.id, p]));
  const selectedProviderAvail = providerId ? availMap.get(providerId) : null;
  const primaryHasDayOff =
    selectedProviderAvail?.is_day_off ?? false;
  const primaryDayOffDay = selectedProviderAvail?.day_off_day ?? null;

  function providerOptionLabel(p: ServiceProvider): string {
    const avail = availMap.get(p.id);
    if (!avail) return p.name + (p.provider_type ? ` · ${p.provider_type.replace(/_/g, " ")}` : "");
    const suffix = avail.on_leave
      ? " 🛑 on leave"
      : avail.is_day_off
      ? ` 🌙 day off (${avail.day_off_day})`
      : avail.is_busy
      ? ` ⚠ busy (${avail.conflicts.length} job${avail.conflicts.length > 1 ? "s" : ""})`
      : " ✓ available";
    return (
      p.name +
      (p.provider_type ? ` · ${p.provider_type.replace(/_/g, " ")}` : "") +
      suffix
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== item.title && save({ title })}
            className="w-full font-medium text-sm text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-[#004aad] bg-transparent focus:outline-none pb-0.5"
          />
          <p className="text-xs text-gray-400 mt-0.5">
            {item.service_categories?.name ?? "—"} · {item.frequency_label}
          </p>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="text-gray-300 hover:text-red-500 transition-colors mt-0.5 flex-shrink-0"
          title="Remove service"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Fields row 1: unit stepper + start time + schedule date */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* Unit stepper */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">
            {getUnitDisplayName(item.unit_type)}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => stepUnit(-1)}
              disabled={unitValue <= minUnit}
              className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus size={12} className="text-gray-700" />
            </button>
            <span className="text-sm font-semibold text-gray-900 min-w-[4rem] text-center">
              {formatUnitValue(unitValue, item.unit_type)}
            </span>
            <button
              onClick={() => stepUnit(1)}
              disabled={unitValue >= maxUnit}
              className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus size={12} className="text-gray-700" />
            </button>
          </div>
        </div>

        {/* Start time */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Start Time</p>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            onBlur={() =>
              startTime !== (item.preferred_start_time ?? "") &&
              save({ preferred_start_time: startTime || null })
            }
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
          />
          {endTime && (
            <p className="text-xs text-gray-400 mt-0.5">
              → {endTime} · {durationMins} min
            </p>
          )}
        </div>

        {/* Schedule date (for availability check) */}
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 mb-1.5">
            Schedule Date
            <span className="text-gray-400 ml-1">(for availability)</span>
          </p>
          <input
            type="date"
            value={availDate}
            onChange={(e) => setAvailDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
          />
        </div>
      </div>

      {/* Provider selection */}
      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-500">Primary Provider</p>
            {availLoading && (
              <span className="text-xs text-gray-400">checking availability…</span>
            )}
          </div>
          <select
            value={providerId}
            onChange={(e) => {
              const val = e.target.value;
              setProviderId(val);
              save({ preferred_provider_id: val || null });
            }}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
          >
            <option value="">— None —</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {providerOptionLabel(p)}
              </option>
            ))}
          </select>

          {/* Provider availability detail */}
          {selectedProviderAvail && availDate && (
            <div
              className={`mt-1.5 rounded-lg px-3 py-2 text-xs ${
                selectedProviderAvail.is_available
                  ? "bg-green-50 text-green-700"
                  : selectedProviderAvail.is_day_off || selectedProviderAvail.on_leave
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {selectedProviderAvail.on_leave ? (
                <span>🛑 On approved leave on {availDate}</span>
              ) : selectedProviderAvail.is_day_off ? (
                <span>
                  🌙 Week-off day ({primaryDayOffDay}) — select a backup provider
                  below
                </span>
              ) : selectedProviderAvail.is_busy ? (
                <span>
                  ⚠ Has {selectedProviderAvail.conflicts.length} conflicting job
                  {selectedProviderAvail.conflicts.length > 1 ? "s" : ""}:{" "}
                  {selectedProviderAvail.conflicts
                    .map((c) => `${c.title} (${c.start}–${c.end})`)
                    .join(", ")}
                </span>
              ) : (
                <span>✓ Free on {availDate} at the selected time</span>
              )}
            </div>
          )}
        </div>

        {/* Backup provider — only show when primary is selected and has a day-off */}
        {providerId && (primaryHasDayOff || item.backup_provider_id) && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">
              Backup Provider
              {primaryDayOffDay && (
                <span className="ml-1 text-amber-600">
                  (covers {primaryDayOffDay}s)
                </span>
              )}
            </p>
            <select
              value={backupProviderId}
              onChange={(e) => {
                const val = e.target.value;
                setBackupProviderId(val);
                save({ backup_provider_id: val || null });
              }}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
            >
              <option value="">— None —</option>
              {providers
                .filter((p) => p.id !== providerId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {providerOptionLabel(p)}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Existing daily schedule for date */}
        {availDate && selectedProviderAvail && selectedProviderAvail.all_allocations.length > 0 && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-700 mb-1">
              {selectedProviderAvail.name}&apos;s schedule on {availDate}:
            </p>
            {selectedProviderAvail.all_allocations.map((a) => (
              <p key={a.id}>
                {a.start}–{a.end} · {a.title}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Computed price */}
      <div className="pt-2 border-t border-gray-50 flex flex-wrap items-baseline gap-2">
        <span className="text-base font-bold text-gray-900">
          {formatCurrency(effective)}
        </span>
        {base !== effective && (
          <span className="text-sm text-gray-400 line-through">
            {formatCurrency(base)}
          </span>
        )}
        <span className="text-xs text-gray-500">/ month</span>
        {discountPct > 0 && base !== effective && (
          <span className="text-xs text-green-600 font-medium">
            {Math.round(discountPct * 100)}% off
          </span>
        )}
        {saving && (
          <span className="text-xs text-gray-400 ml-auto">saving…</span>
        )}
      </div>
      {insight && <p className="text-xs text-gray-400">{insight}</p>}
    </div>
  );
}

/** Compact read-only table row. */
function ReadOnlyItemRow({ item }: { item: PlanItem }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-2.5 text-sm text-gray-800">{item.title}</td>
      <td className="px-4 py-2.5 text-xs text-gray-500">
        {item.service_categories?.name ?? "—"}
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-500">{item.frequency_label}</td>
      <td className="px-4 py-2.5 text-sm text-gray-700 text-right">
        {formatUnitValue(item.unit_value, item.unit_type)}
      </td>
      <td className="px-4 py-2.5 text-sm text-gray-700 text-right">
        {formatCurrency(item.price_monthly)}
      </td>
    </tr>
  );
}

/** Compact read-only table (for non-editable statuses). */
function ItemsTable({ items }: { items: PlanItem[] }) {
  const total = items.reduce((s, i) => s + (i.price_monthly ?? 0), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">
              Service
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">
              Category
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">
              Frequency
            </th>
            <th className="text-right px-4 py-2.5 font-medium text-gray-600">
              Units
            </th>
            <th className="text-right px-4 py-2.5 font-medium text-gray-600">
              Price/mo
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                No items
              </td>
            </tr>
          ) : (
            items.map((item) => <ReadOnlyItemRow key={item.id} item={item} />)
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200">
            <td colSpan={4} className="px-4 py-2.5 text-sm font-medium text-gray-700">
              Total
            </td>
            <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">
              {formatCurrency(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlanDetailPage() {
  const router = useRouter();
  const { customerId, planId } = useParams<{ customerId: string; planId: string }>();

  const [plan, setPlan] = useState<PlanRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);

  // Panel-specific state
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    if (!planId) return;
    try {
      const res = await fetch(`/api/admin/plan-requests/${planId}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setPlan(data.planRequest);
        setAdminRemarks(data.planRequest.admin_remarks ?? "");
        setPreferredDate(data.planRequest.plan_start_date ?? "");
        setSelectedSupervisor(data.planRequest.assigned_supervisor_id ?? "");
      }
    } catch {
      setError("Failed to load plan");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadPlan();
    fetch("/api/admin/staff?role=supervisor&status=active")
      .then((r) => r.json())
      .then((d) => setSupervisors(d.staff ?? []))
      .catch(() => {});
    fetch("/api/admin/providers")
      .then((r) => r.json())
      .then((d) => setProviders(d.providers ?? []))
      .catch(() => {});
  }, [loadPlan]);

  async function patchPlan(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/plan-requests/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function handleAddService(job: ServiceJob) {
    setShowCatalog(false);
    setActionError(null);
    const res = await fetch(`/api/admin/plan-requests/${planId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: job.category_id,
        job_id: job.id,
        job_code: job.code,
        title: job.name,
        unit_value: job.default_unit,
        frequency_label: job.frequency_label,
        unit_type: job.unit_type,
        formula_type: job.formula_type,
        // Pricing params — server computes price_monthly from formula
        base_rate_per_unit: job.base_rate_per_unit,
        instances_per_month: job.instances_per_month,
        discount_pct: job.discount_pct,
        time_multiple: job.time_multiple ?? null,
      }),
    });
    const data = await res.json();
    if (data.error) setActionError(data.error);
    else loadPlan();
  }

  async function handleUpdateItem(id: string, updates: Record<string, unknown>) {
    const res = await fetch(`/api/admin/plan-requests/${planId}/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.error) setActionError(data.error);
    // Reload to sync total and reflect server-computed prices
    else loadPlan();
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Remove this service?")) return;
    const res = await fetch(`/api/admin/plan-requests/${planId}/items/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.error) setActionError(data.error);
    else loadPlan();
  }

  async function handleSubmitPlan() {
    setActionLoading(true);
    setActionError(null);
    // Save date first if set
    if (preferredDate) {
      await patchPlan({ preferred_start_date: preferredDate });
    }
    const data = await patchPlan({ status: "submitted" });
    setActionLoading(false);
    if (data.error) setActionError(data.error);
    else loadPlan();
  }

  async function handleAllocateSupervisor() {
    if (!selectedSupervisor) return;
    setAllocating(true);
    setActionError(null);
    const data = await patchPlan({ assigned_supervisor_id: selectedSupervisor });
    setAllocating(false);
    if (data.error) setActionError(data.error);
    else loadPlan();
  }

  async function handleSaveRemarks() {
    setSavingRemarks(true);
    setActionError(null);
    const data = await patchPlan({ admin_remarks: adminRemarks });
    setSavingRemarks(false);
    if (data.error) setActionError(data.error);
    else loadPlan();
  }

  async function handleFinalize() {
    if (!confirm("Finalize plan and move to payment pending?")) return;
    setActionLoading(true);
    setActionError(null);
    const res = await fetch(`/api/admin/plan-requests/${planId}/finalize`, {
      method: "POST",
    });
    const data = await res.json();
    setActionLoading(false);
    if (data.error) setActionError(data.error);
    else loadPlan();
  }

  async function handleMarkPaymentReceived() {
    if (!confirm("Mark this plan as active and payment as received?")) return;
    setActionLoading(true);
    setActionError(null);
    const payment = unwrap(plan?.payments ?? null) ?? (plan?.payments ?? [])[0];
    try {
      // Mark plan active
      await patchPlan({ status: "active" });
      // Mark payment succeeded
      if (payment) {
        await fetch(`/api/admin/payments/${payment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "succeeded" }),
        });
      }
      loadPlan();
    } catch {
      setActionError("Failed to update");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveDate() {
    setSavingDate(true);
    setActionError(null);
    const data = await patchPlan({ preferred_start_date: preferredDate });
    setSavingDate(false);
    if (data.error) setActionError(data.error);
    else loadPlan();
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error ?? "Plan not found"}</p>
      </div>
    );
  }

  const customer = unwrap(plan.customers);
  const profile = unwrap(
    customer
      ? Array.isArray(customer.customer_profiles)
        ? customer.customer_profiles
        : customer.customer_profiles
        ? [customer.customer_profiles]
        : null
      : null
  );
  const supervisor = unwrap(plan.assigned_supervisor);
  const items = plan.plan_request_items ?? [];
  const payments = plan.payments ?? [];
  const payment = payments[0] ?? null;
  const status = plan.status;

  // Admin can edit items for any non-terminal status
  const isTerminal = ["cancelled", "closed"].includes(status);
  const canAddItems = ["cart_in_progress"].includes(status);

  // Helper: shared editable items panel (used across all non-terminal statuses)
  function EditableItemsPanel() {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Plan Items</h2>
          {canAddItems && (
            <button
              onClick={() => setShowCatalog(true)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#004aad] text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} /> Add Service
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No items added yet
              {canAddItems ? " — click \"Add Service\" to begin." : "."}
            </p>
          ) : (
            items.map((item) => (
              <EditableItemCard
                key={item.id}
                item={item}
                providers={providers}
                planId={planId}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
              />
            ))
          )}
          {items.length > 0 && (
            <div className="pt-2 flex justify-between items-center text-sm font-semibold text-gray-800 border-t border-gray-100">
              <span>Total</span>
              <span>
                {formatCurrency(
                  items.reduce((s, i) => s + (i.price_monthly ?? 0), 0)
                )}{" "}
                / mo
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => router.push(`/admin/customers/${customerId}`)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={15} /> Back to customer
      </button>

      {/* Inline action error banner */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 ml-3">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900 font-mono">{plan.request_code}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Created {new Date(plan.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Customer Info */}
        {customer && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Customer</p>
              <p className="font-medium text-gray-800">{customer.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <p className="text-gray-700">{customer.phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Address</p>
              <p className="text-gray-700">{formatAddress(profile)}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Non-terminal: editable items + status-specific panels ────────── */}
      {!isTerminal && (
        <>
          {/* Editable item cards — always shown for non-terminal plans */}
          <EditableItemsPanel />

          {/* ── cart_in_progress: preferred date + submit ── */}
          {status === "cart_in_progress" && (
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Preferred Start Date
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                  />
                  <button
                    onClick={handleSaveDate}
                    disabled={savingDate}
                    className="text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {savingDate ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSubmitPlan}
                  disabled={actionLoading || items.length === 0}
                  className="px-5 py-2.5 bg-[#004aad] text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Submitting…" : "Submit Plan"}
                </button>
              </div>
            </div>
          )}

          {/* ── submitted / captain_allocation_pending: allocate supervisor ── */}
          {(status === "submitted" || status === "captain_allocation_pending") && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
                <h2 className="font-semibold text-gray-900">Allocate Supervisor</h2>
                <select
                  value={selectedSupervisor}
                  onChange={(e) => setSelectedSupervisor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                >
                  <option value="">— Choose supervisor —</option>
                  {supervisors.map((sv) => (
                    <option key={sv.id} value={sv.id}>
                      {sv.name} ({sv.phone})
                    </option>
                  ))}
                </select>
                <div className="flex justify-end">
                  <button
                    onClick={handleAllocateSupervisor}
                    disabled={!selectedSupervisor || allocating}
                    className="px-4 py-2 bg-[#004aad] text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {allocating ? "Allocating…" : "Allocate"}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Admin Remarks
                </label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                  placeholder="Internal notes…"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSaveRemarks}
                    disabled={savingRemarks}
                    className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {savingRemarks ? "Saving…" : "Save Remarks"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── captain_review_pending: supervisor info + reassign + finalize ── */}
          {status === "captain_review_pending" && (
            <>
              {supervisor && (
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h2 className="font-semibold text-gray-900 mb-3">Assigned Supervisor</h2>
                  <p className="text-sm text-gray-800 font-medium">{supervisor.name}</p>
                  <p className="text-sm text-gray-500">{supervisor.phone}</p>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm p-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Admin Remarks
                </label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                  placeholder="Internal notes…"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSaveRemarks}
                    disabled={savingRemarks}
                    className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {savingRemarks ? "Saving…" : "Save Remarks"}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Reassign Supervisor</h2>
                <select
                  value={selectedSupervisor}
                  onChange={(e) => setSelectedSupervisor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                >
                  <option value="">— Choose supervisor —</option>
                  {supervisors.map((sv) => (
                    <option key={sv.id} value={sv.id}>
                      {sv.name} ({sv.phone})
                    </option>
                  ))}
                </select>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleAllocateSupervisor}
                    disabled={!selectedSupervisor || allocating}
                    className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {allocating ? "Reassigning…" : "Reassign"}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleFinalize}
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-[#004aad] text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Finalizing…" : "Finalize Plan"}
                </button>
              </div>
            </>
          )}

          {/* ── payment_pending: payment status + mark received ── */}
          {status === "payment_pending" && (
            <>
              {payment && (
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h2 className="font-semibold text-gray-900 mb-3">Payment</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">₹{payment.amount}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[payment.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {payment.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Created {new Date(payment.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleMarkPaymentReceived}
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Processing…" : "Mark as Payment Received"}
                </button>
              </div>
            </>
          )}

          {/* ── active / paused / completed: plan details ── */}
          {["active", "paused", "completed"].includes(status) && (
            <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {supervisor && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Assigned Supervisor</p>
                  <p className="font-medium text-gray-800">{supervisor.name}</p>
                </div>
              )}
              {plan.plan_active_start_date && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Active From</p>
                  <p className="text-gray-700">{plan.plan_active_start_date}</p>
                </div>
              )}
              {plan.plan_active_end_date && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Active Until</p>
                  <p className="text-gray-700">{plan.plan_active_end_date}</p>
                </div>
              )}
              {payment && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Payment</p>
                  <p className="text-gray-700">
                    ₹{payment.amount}{" "}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[payment.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {payment.status}
                    </span>
                  </p>
                </div>
              )}
              {plan.admin_remarks && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Admin Remarks</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{plan.admin_remarks}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Terminal statuses (cancelled / closed): read-only ─────────────── */}
      {isTerminal && (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Plan Items</h2>
            </div>
            <ItemsTable items={items} />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {supervisor && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Supervisor</p>
                <p className="font-medium text-gray-800">{supervisor.name}</p>
              </div>
            )}
            {plan.plan_start_date && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Start Date</p>
                <p className="text-gray-700">{plan.plan_start_date}</p>
              </div>
            )}
            {plan.admin_remarks && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Admin Remarks</p>
                <p className="text-gray-700 whitespace-pre-wrap">{plan.admin_remarks}</p>
              </div>
            )}
            {payment && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Payment</p>
                <p className="text-gray-700">
                  ₹{payment.amount}{" "}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[payment.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {payment.status}
                  </span>
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Service Catalog Modal */}
      {showCatalog && (
        <ServiceCatalogModal
          onClose={() => setShowCatalog(false)}
          onSelect={handleAddService}
        />
      )}
    </div>
  );
}
