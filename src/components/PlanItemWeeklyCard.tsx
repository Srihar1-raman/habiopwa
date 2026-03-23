"use client";

/**
 * PlanItemWeeklyCard
 *
 * Shared component used by:
 * - Supervisor new-request allocation page
 * - Admin plan detail page (captain_review_pending status)
 *
 * Shows:
 * - Service title, frequency badge, unit stepper, start time
 * - 7-day week strip showing active days (daily = all 7, weekly = one day)
 * - Day-of-week picker for weekly items
 * - Primary provider dropdown with per-day availability badges (Lucide icons)
 * - Backup provider dropdown (always visible when primary is set; shows
 *   availability on the primary's actual day-off date)
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Minus,
  Plus,
  Moon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  HelpCircle,
  XCircle,
  ArrowLeftRight,
  User,
  Users,
} from "lucide-react";
import {
  calcJobPrices,
  getUnitDisplayName,
  formatUnitValue,
  type JobPricingParams,
} from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlanItemData {
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
  preferred_provider_id?: string | null;
  backup_provider_id?: string | null;
  scheduled_day_of_week?: number | null;
  service_jobs?: {
    min_unit?: number;
    max_unit?: number;
    unit_interval?: number;
  } | null;
  service_categories?: { name: string } | null;
}

export interface ProviderOption {
  id: string;
  name: string;
  provider_type: string | null;
}

export interface DayAvailability {
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

export interface WeekDayAvail {
  date: string;
  dayLabel: string;
  dayIndex: number;
  primaryAvail: DayAvailability | null;
  backupAvail: DayAvailability | null;
  /** Full availability list for every provider on this day. */
  allProviderAvails: DayAvailability[];
}

export interface AllocationUpdate {
  service_provider_id?: string;
  backup_provider_id?: string | null;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  unit_value?: number;
  scheduled_day_of_week?: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getDow(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`;
}

function computeMins(
  unitType: string,
  unitValue: number,
  timeMultiple: number | null
): number {
  if (unitType === "min") return unitValue;
  if (timeMultiple != null && timeMultiple > 0)
    return Math.round(unitValue * timeMultiple);
  return 30;
}

function computePrices(
  item: PlanItemData,
  uv: number
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
  return calcJobPrices(uv, params);
}

/** Text-only status suffix for use inside <option> (no JSX allowed). */
function availStatusText(avail: DayAvailability | null | undefined): string {
  if (!avail) return "";
  if (avail.on_leave) return " \u2014 on leave";
  if (avail.is_day_off)
    return ` \u2014 day off${avail.day_off_day ? ` (${avail.day_off_day})` : ""}`;
  if (avail.is_busy)
    return ` \u2014 busy (${avail.conflicts.length} job${
      avail.conflicts.length !== 1 ? "s" : ""
    })`;
  return " \u2014 free";
}

// ─── Availability badge (Lucide icons only, no emoji) ─────────────────────────

function AvailBadge({
  avail,
}: {
  avail: DayAvailability | null | undefined;
}) {
  if (!avail)
    return (
      <HelpCircle
        className="w-3 h-3 text-gray-300"
        aria-label="Unknown availability"
      />
    );
  if (avail.on_leave)
    return (
      <span title="On leave" className="inline-flex">
        <XCircle className="w-3 h-3 text-red-500" aria-label="On leave" />
      </span>
    );
  if (avail.is_day_off) {
    const dayOffLabel = `Day off${avail.day_off_day ? ` (${avail.day_off_day})` : ""}`;
    return (
      <span title={dayOffLabel} className="inline-flex">
        <Moon className="w-3 h-3 text-amber-500" aria-label={dayOffLabel} />
      </span>
    );
  }
  if (avail.is_busy) {
    const busyTitle = `Busy: ${avail.conflicts
      .map((c) => `${c.title} ${c.start}\u2013${c.end}`)
      .join(", ")}`;
    const busyLabel = `Busy (${avail.conflicts.length} conflict${avail.conflicts.length !== 1 ? "s" : ""})`;
    return (
      <span title={busyTitle} className="inline-flex">
        <AlertTriangle className="w-3 h-3 text-orange-500" aria-label={busyLabel} />
      </span>
    );
  }
  return (
    <span title="Free" className="inline-flex">
      <CheckCircle2 className="w-3 h-3 text-green-500" aria-label="Free" />
    </span>
  );
}

// ─── 7-day week strip ─────────────────────────────────────────────────────────

type LegendEntry = {
  Icon: LucideIcon;
  cls: string;
  label: string;
};

const STRIP_LEGEND: LegendEntry[] = [
  { Icon: CheckCircle2, cls: "text-green-500", label: "Free" },
  { Icon: AlertTriangle, cls: "text-orange-500", label: "Busy" },
  { Icon: Moon, cls: "text-amber-500", label: "Day off" },
  { Icon: XCircle, cls: "text-red-500", label: "On leave" },
  { Icon: ArrowLeftRight, cls: "text-amber-500", label: "Backup covering" },
];

function WeekStrip({
  planStartDate,
  frequencyLabel,
  selectedDow,
  primaryProviderId,
  weekDayAvails,
  loadingDays,
}: {
  planStartDate: string;
  frequencyLabel: string;
  selectedDow: number;
  primaryProviderId: string;
  weekDayAvails: WeekDayAvail[];
  loadingDays: boolean;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(planStartDate, i);
    const dow = getDow(date);
    return {
      date,
      dow,
      label: SHORT_DAYS[dow],
      dayNum: new Date(date + "T00:00:00Z").getUTCDate(),
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-medium text-gray-500">
          Week 1 \u2014 Schedule preview
        </p>
        {loadingDays && (
          <span className="text-xs text-gray-400 italic">checking\u2026</span>
        )}
      </div>

      <div className="flex gap-1">
        {days.map(({ date, dow, label, dayNum }) => {
          const isActive =
            frequencyLabel === "Daily" ? true : dow === selectedDow;
          const wd = weekDayAvails.find((w) => w.date === date);
          const primaryAvail = wd?.primaryAvail;
          const backupAvail = wd?.backupAvail;

          let bgClass =
            "bg-gray-50 text-gray-300 border border-gray-100";
          if (isActive) {
            if (!primaryProviderId || !primaryAvail) {
              bgClass =
                "bg-blue-50 text-blue-600 border border-blue-100";
            } else if (primaryAvail.on_leave) {
              bgClass = "bg-red-50 text-red-600 border border-red-100";
            } else if (primaryAvail.is_day_off) {
              bgClass = backupAvail
                ? "bg-amber-50 text-amber-600 border border-amber-200"
                : "bg-amber-100 text-amber-700 border border-amber-300";
            } else if (primaryAvail.is_busy) {
              bgClass =
                "bg-orange-50 text-orange-600 border border-orange-100";
            } else {
              bgClass =
                "bg-green-50 text-green-600 border border-green-100";
            }
          }

          return (
            <div
              key={date}
              className={`flex-1 rounded-lg px-0.5 py-1.5 text-center transition-colors ${bgClass} ${
                isActive ? "" : "opacity-40"
              }`}
              title={`${date}${primaryAvail ? ` \u2014 ${primaryAvail.name}` : ""}${
                primaryAvail?.is_day_off && backupAvail
                  ? ` (backup: ${backupAvail.name})`
                  : ""
              }`}
            >
              <p className="text-[10px] font-semibold leading-none">
                {label}
              </p>
              <p className="text-[10px] leading-none mt-0.5">{dayNum}</p>
              {isActive && primaryProviderId && (
                <div className="mt-1 flex justify-center">
                  {wd ? (
                    primaryAvail?.is_day_off && backupAvail ? (
                      <span
                        title={`Backup ${backupAvail.name} covers`}
                        className="inline-flex"
                      >
                        <ArrowLeftRight
                          className="w-3 h-3 text-amber-500"
                          aria-label="Backup provider covers this day"
                        />
                      </span>
                    ) : (
                      <AvailBadge avail={primaryAvail} />
                    )
                  ) : (
                    <HelpCircle className="w-3 h-3 text-gray-200" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
        {STRIP_LEGEND.map(({ Icon, cls, label }) => (
          <span
            key={label}
            className="flex items-center gap-1 text-[10px] text-gray-400"
          >
            <Icon className={`w-3 h-3 ${cls}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlanItemWeeklyCard({
  item,
  planStartDate,
  allProviders,
  availabilityApiBase,
  onUpdate,
  onDelete,
  readOnly = false,
}: {
  item: PlanItemData;
  planStartDate: string;
  allProviders: ProviderOption[];
  /** e.g. "/api/supervisor/providers/availability" or "/api/admin/providers/availability" */
  availabilityApiBase: string;
  onUpdate: (updates: AllocationUpdate) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}) {
  const minUnit =
    item.service_jobs?.min_unit ?? (item.unit_type === "min" ? 15 : 1);
  const maxUnit =
    item.service_jobs?.max_unit ?? (item.unit_type === "min" ? 480 : 20);
  const interval =
    item.service_jobs?.unit_interval ?? (item.unit_type === "min" ? 15 : 1);

  const [unitValue, setUnitValue] = useState(item.unit_value);
  const [startTime, setStartTime] = useState(
    item.preferred_start_time ?? "08:00"
  );
  const [primaryProviderId, setPrimaryProviderId] = useState(
    item.preferred_provider_id ?? ""
  );
  const [backupProviderId, setBackupProviderId] = useState(
    item.backup_provider_id ?? ""
  );
  const [selectedDow, setSelectedDow] = useState<number>(() => {
    if (
      item.scheduled_day_of_week !== null &&
      item.scheduled_day_of_week !== undefined
    ) {
      return item.scheduled_day_of_week;
    }
    return getDow(planStartDate);
  });

  const durationMins = computeMins(
    item.unit_type,
    unitValue,
    item.time_multiple != null ? Number(item.time_multiple) : null
  );
  const endTime = startTime ? addMinutes(startTime, durationMins) : "";

  const { base, effective } = useMemo(
    () => computePrices(item, unitValue),
    [item, unitValue]
  );
  const discountPct = item.discount_pct ? Number(item.discount_pct) : 0;

  const [weekDayAvails, setWeekDayAvails] = useState<WeekDayAvail[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);

  // Stable comma-separated list of all provider IDs visible in the dropdowns.
  // Passed to the availability API so it only evaluates those providers,
  // making the 7-day week-strip reflect the correct per-day availability.
  const allProviderIdsParam = useMemo(
    () => allProviders.map((p) => p.id).join(","),
    [allProviders]
  );

  const fetchWeekAvailability = useCallback(
    async (providerId: string, backupId: string, st: string, et: string) => {
      if (!providerId || !st || !et || !planStartDate) {
        setWeekDayAvails([]);
        return;
      }
      setLoadingDays(true);
      try {
        const dates = Array.from({ length: 7 }, (_, i) =>
          addDays(planStartDate, i)
        );
        const results = await Promise.all(
          dates.map(async (date) => {
            const params = new URLSearchParams({
              date,
              start_time: st,
              end_time: et,
            });
            // Scope the API call to only the providers visible in the dropdown.
            // The supervisor availability endpoint scopes to the team automatically
            // (ignores extra params). The admin endpoint uses provider_ids to filter.
            if (allProviderIdsParam) {
              params.set("provider_ids", allProviderIdsParam);
            }
            const res = await fetch(`${availabilityApiBase}?${params}`);
            if (!res.ok)
              return { date, providers: [] as DayAvailability[] };
            const d = await res.json();
            return {
              date,
              providers: (d.providers ?? []) as DayAvailability[],
            };
          })
        );

        setWeekDayAvails(
          results.map(({ date, providers }) => {
            const dow = getDow(date);
            return {
              date,
              dayLabel: SHORT_DAYS[dow],
              dayIndex: dow,
              primaryAvail:
                providers.find((p) => p.id === providerId) ?? null,
              backupAvail: backupId
                ? (providers.find((p) => p.id === backupId) ?? null)
                : null,
              allProviderAvails: providers,
            };
          })
        );
      } finally {
        setLoadingDays(false);
      }
    },
    [availabilityApiBase, planStartDate, allProviderIdsParam]
  );

  useEffect(() => {
    const et = startTime ? addMinutes(startTime, durationMins) : "";
    if (primaryProviderId && startTime && et) {
      fetchWeekAvailability(
        primaryProviderId,
        backupProviderId,
        startTime,
        et
      );
    } else {
      setWeekDayAvails([]);
    }
  }, [
    primaryProviderId,
    backupProviderId,
    startTime,
    durationMins,
    fetchWeekAvailability,
  ]);

  // ── Derived availability values ──────────────────────────────────────────────

  const planStartDayAvail = weekDayAvails.find((w) => w.date === planStartDate);
  const primaryAvailOnStart = planStartDayAvail?.primaryAvail ?? null;

  // Find the first day in the 7-day window where primary has their day off
  const primaryDayOffEntry = weekDayAvails.find(
    (w) => w.primaryAvail?.is_day_off === true
  );
  const primaryDayOffDate = primaryDayOffEntry?.date ?? null;
  const primaryDayOffLabel =
    primaryDayOffEntry?.primaryAvail?.day_off_day ?? null;

  // Backup provider availability on the primary's day-off date
  const backupOnDayOffDate =
    backupProviderId && primaryDayOffDate
      ? (weekDayAvails
          .find((w) => w.date === primaryDayOffDate)
          ?.allProviderAvails.find((p) => p.id === backupProviderId) ?? null)
      : null;

  // ── Provider label helpers (text-only, used inside <option>) ─────────────────

  function primaryProviderLabel(p: ProviderOption): string {
    const typeLabel = p.provider_type
      ? ` \u00b7 ${p.provider_type.replace(/_/g, " ")}`
      : "";
    const avail = planStartDayAvail?.allProviderAvails.find(
      (a) => a.id === p.id
    );
    return p.name + typeLabel + availStatusText(avail);
  }

  function backupProviderLabel(p: ProviderOption): string {
    const typeLabel = p.provider_type
      ? ` \u00b7 ${p.provider_type.replace(/_/g, " ")}`
      : "";
    // Use the primary's day-off date for availability; fall back to plan start date
    const targetDate = primaryDayOffDate ?? planStartDate;
    const dayAvails = weekDayAvails.find((w) => w.date === targetDate);
    const avail = dayAvails?.allProviderAvails.find((a) => a.id === p.id);
    return p.name + typeLabel + availStatusText(avail);
  }

  // ── Event handlers ────────────────────────────────────────────────────────────

  function stepUnit(dir: 1 | -1) {
    const next = Math.min(
      maxUnit,
      Math.max(minUnit, unitValue + dir * interval)
    );
    if (next === unitValue) return;
    setUnitValue(next);
    onUpdate({ unit_value: next });
  }

  function handleStartTimeChange(val: string) {
    setStartTime(val);
    const et = val ? addMinutes(val, durationMins) : "";
    onUpdate({ scheduled_start_time: val, scheduled_end_time: et });
  }

  function handlePrimaryChange(id: string) {
    setPrimaryProviderId(id);
    onUpdate({ service_provider_id: id });
  }

  function handleBackupChange(id: string) {
    setBackupProviderId(id);
    onUpdate({ backup_provider_id: id || null });
  }

  function handleDowChange(dow: number) {
    setSelectedDow(dow);
    onUpdate({ scheduled_day_of_week: dow });
  }

  const isWeekly = item.frequency_label === "Weekly";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* ── Header: title + price + delete ──────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {item.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                isWeekly
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {item.frequency_label}
            </span>
            {item.service_categories?.name && (
              <span className="text-[10px] text-gray-400">
                {item.service_categories.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-[#004aad]">
              {formatCurrency(effective)}
              <span className="text-xs font-normal text-gray-400">/m</span>
            </p>
            {base !== effective && (
              <p className="text-xs text-gray-400 line-through">
                {formatCurrency(base)}
              </p>
            )}
            {discountPct > 0 && base !== effective && (
              <p className="text-xs text-green-600">
                {Math.round(discountPct * 100)}% off
              </p>
            )}
          </div>
          {!readOnly && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-gray-300 hover:text-red-400 transition-colors mt-0.5"
              title="Remove service"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Unit stepper + Start time ────────────────────────────────────────── */}
      {!readOnly && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">
              {getUnitDisplayName(item.unit_type)}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stepUnit(-1)}
                disabled={unitValue <= minUnit}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="w-3 h-3 text-gray-700" />
              </button>
              <span className="text-sm font-semibold text-gray-900 min-w-[4rem] text-center">
                {formatUnitValue(unitValue, item.unit_type)}
              </span>
              <button
                type="button"
                onClick={() => stepUnit(1)}
                disabled={unitValue >= maxUnit}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3 text-gray-700" />
              </button>
              <span className="text-xs text-gray-400">{durationMins} min</span>
            </div>
          </div>

          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">
              Start Time
            </label>
            <input
              type="time"
              className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
            />
            {endTime && (
              <p className="text-[10px] text-gray-400 mt-0.5">ends {endTime}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Day-of-week picker (weekly items only) ───────────────────────────── */}
      {isWeekly && !readOnly && (
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">
            Runs every{" "}
            <span className="text-gray-800 font-medium">
              {LONG_DAYS[selectedDow]}
            </span>
          </label>
          <div className="flex gap-1">
            {SHORT_DAYS.map((label, dow) => (
              <button
                key={dow}
                type="button"
                onClick={() => handleDowChange(dow)}
                className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${
                  selectedDow === dow
                    ? "bg-[#004aad] text-white border-[#004aad] font-semibold"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 7-day week strip ─────────────────────────────────────────────────── */}
      <WeekStrip
        planStartDate={planStartDate}
        frequencyLabel={item.frequency_label}
        selectedDow={selectedDow}
        primaryProviderId={primaryProviderId}
        weekDayAvails={weekDayAvails}
        loadingDays={loadingDays}
      />

      {/* ── Primary Provider ─────────────────────────────────────────────────── */}
      {!readOnly && (
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-gray-400" />
            Primary Provider
          </label>
          <select
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
            value={primaryProviderId}
            onChange={(e) => handlePrimaryChange(e.target.value)}
          >
            <option value="">Select provider...</option>
            {allProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {primaryProviderLabel(p)}
              </option>
            ))}
          </select>

          {/* Primary status on plan start date */}
          {primaryProviderId && primaryAvailOnStart && (
            <div
              className={`mt-1.5 rounded-lg px-3 py-2 text-xs flex items-start gap-1.5 ${
                primaryAvailOnStart.is_available
                  ? "bg-green-50 text-green-700"
                  : primaryAvailOnStart.is_day_off ||
                    primaryAvailOnStart.on_leave
                  ? "bg-amber-50 text-amber-700"
                  : "bg-orange-50 text-orange-700"
              }`}
            >
              {primaryAvailOnStart.is_available ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Free on plan start date
                </>
              ) : primaryAvailOnStart.on_leave ? (
                <>
                  <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  On approved leave on plan start date
                </>
              ) : primaryAvailOnStart.is_day_off ? (
                <>
                  <Moon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Week-off day
                  {primaryDayOffLabel ? ` (${primaryDayOffLabel}s)` : ""}{" "}
                  \u2014 assign a backup below
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Busy:{" "}
                  {primaryAvailOnStart.conflicts
                    .map((c) => `${c.title} ${c.start}\u2013${c.end}`)
                    .join(", ")}
                </>
              )}
            </div>
          )}

          {/* Primary schedule on plan start date */}
          {primaryProviderId &&
            primaryAvailOnStart &&
            primaryAvailOnStart.all_allocations.length > 0 && (
              <div className="mt-1.5 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 space-y-0.5">
                <p className="font-medium text-gray-700 mb-0.5">
                  {primaryAvailOnStart.name}\u2019s schedule on {planStartDate}:
                </p>
                {primaryAvailOnStart.all_allocations.map((a) => (
                  <p key={a.id}>
                    {a.start}\u2013{a.end} \u00b7 {a.title}
                  </p>
                ))}
              </div>
            )}
        </div>
      )}

      {/* ── Backup Provider (always shown when primary is set) ───────────────── */}
      {!readOnly && !!primaryProviderId && (
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            Backup Provider
            {primaryDayOffLabel ? (
              <span className="ml-1 text-amber-600 font-normal">
                \u2014 covers {primaryDayOffLabel}s
              </span>
            ) : (
              <span className="ml-1 text-gray-400 font-normal text-[11px]">
                (optional \u2014 covers primary&apos;s day off)
              </span>
            )}
          </label>

          <select
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
            value={backupProviderId}
            onChange={(e) => handleBackupChange(e.target.value)}
          >
            <option value="">No backup assigned</option>
            {allProviders
              .filter((p) => p.id !== primaryProviderId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {backupProviderLabel(p)}
                </option>
              ))}
          </select>

          {/* Backup status on primary's day-off date */}
          {backupProviderId && primaryDayOffDate && backupOnDayOffDate && (
            <div
              className={`mt-1.5 rounded-lg px-3 py-2 text-xs flex items-start gap-1.5 ${
                backupOnDayOffDate.is_available
                  ? "bg-green-50 text-green-700"
                  : backupOnDayOffDate.on_leave ||
                    backupOnDayOffDate.is_day_off
                  ? "bg-red-50 text-red-700"
                  : "bg-orange-50 text-orange-700"
              }`}
            >
              {backupOnDayOffDate.is_available ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Free on {primaryDayOffDate}
                  {primaryDayOffLabel ? ` (${primaryDayOffLabel})` : ""}{" "}
                  \u2014 can cover
                </>
              ) : backupOnDayOffDate.on_leave ? (
                <>
                  <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  On leave on {primaryDayOffDate} \u2014 cannot cover
                </>
              ) : backupOnDayOffDate.is_day_off ? (
                <>
                  <Moon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Also has day off on {primaryDayOffDate} \u2014 pick another backup
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Busy on {primaryDayOffDate}:{" "}
                  {backupOnDayOffDate.conflicts
                    .map((c) => `${c.title} ${c.start}\u2013${c.end}`)
                    .join(", ")}
                </>
              )}
            </div>
          )}

          {/* No day-off detected yet */}
          {backupProviderId && !primaryDayOffDate && weekDayAvails.length > 0 && (
            <p className="mt-1.5 text-xs text-gray-400 pl-1">
              No day-off found for primary in the first 7 days. Backup assigned as a precaution.
            </p>
          )}
        </div>
      )}

      {/* ── Read-only provider summary ───────────────────────────────────────── */}
      {readOnly && (primaryProviderId || backupProviderId) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {primaryProviderId && (
            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
              <User className="w-3 h-3" />
              {allProviders.find((p) => p.id === primaryProviderId)?.name ??
                "Unknown"}
            </span>
          )}
          {backupProviderId && (
            <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
              <Users className="w-3 h-3" />
              {allProviders.find((p) => p.id === backupProviderId)?.name ??
                "Unknown"}
              {primaryDayOffLabel ? ` (covers ${primaryDayOffLabel}s)` : ""}
            </span>
          )}
          {isWeekly && (
            <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-lg">
              <Clock className="w-3 h-3" />
              Every {LONG_DAYS[selectedDow]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
