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
 * - Primary provider dropdown with per-day availability badges
 * - Backup provider dropdown (for primary's day-off day)
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { Minus, Plus, Moon, AlertTriangle, CheckCheck, Clock, Trash2 } from "lucide-react";
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
  date: string;          // YYYY-MM-DD
  dayLabel: string;      // "Mon", "Tue" …
  dayIndex: number;      // 0=Sun … 6=Sat
  primaryAvail: DayAvailability | null;
  backupAvail: DayAvailability | null;
}

export interface AllocationUpdate {
  service_provider_id?: string;
  backup_provider_id?: string | null;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  unit_value?: number;
  scheduled_day_of_week?: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Returns YYYY-MM-DD of (dateStr + days). */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** UTC day-of-week (0=Sun…6=Sat) for a YYYY-MM-DD string. */
function getDow(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

/** Add minutes to a HH:MM string. */
function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Derive session duration in minutes. */
function computeMins(unitType: string, unitValue: number, timeMultiple: number | null): number {
  if (unitType === "min") return unitValue;
  if (timeMultiple != null && timeMultiple > 0) return Math.round(unitValue * timeMultiple);
  return 30;
}

/** Compute prices from item params. */
function computePrices(item: PlanItemData, uv: number): { base: number; effective: number } {
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
  return calcJobPrices(uv, params);
}

// ─── Availability badge ───────────────────────────────────────────────────────

function AvailBadge({ avail }: { avail: DayAvailability | null | undefined }) {
  if (!avail) return <span className="text-gray-300 text-xs" aria-label="Unknown availability">?</span>;
  if (avail.on_leave) return <span title="On leave" aria-label="On leave" className="text-red-500 text-xs">🛑</span>;
  if (avail.is_day_off) return <span title={`Day off (${avail.day_off_day ?? ""})`} aria-label={`Day off${avail.day_off_day ? ` (${avail.day_off_day})` : ""}`} className="text-amber-500 text-xs">🌙</span>;
  if (avail.is_busy) return <span title={`Busy: ${avail.conflicts.map((c) => `${c.title} ${c.start}-${c.end}`).join(", ")}`} aria-label={`Busy (${avail.conflicts.length} conflict${avail.conflicts.length !== 1 ? "s" : ""})`} className="text-orange-500 text-xs">⚠</span>;
  return <span title="Free" aria-label="Free" className="text-green-500 text-xs">✓</span>;
}

// ─── 7-day week strip ─────────────────────────────────────────────────────────

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
  // Build the 7-day strip from plan start date
  const startDow = getDow(planStartDate); // 0=Sun … 6=Sat
  // Align to Monday of that week (or just show 7 consecutive days starting from planStartDate)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(planStartDate, i);
    const dow = getDow(date);
    return { date, dow, label: SHORT_DAYS[dow], dayNum: new Date(date + "T00:00:00Z").getUTCDate() };
  });

  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <p className="text-xs text-gray-500 font-medium">Week 1 — Schedule Preview</p>
        {loadingDays && <span className="text-xs text-gray-400">checking…</span>}
      </div>
      <div className="flex gap-1">
        {days.map(({ date, dow, label, dayNum }) => {
          const isActive =
            frequencyLabel === "Daily" ? true : dow === selectedDow;
          const wd = weekDayAvails.find((w) => w.date === date);
          const primaryAvail = wd?.primaryAvail;

          let bgClass = "bg-gray-100 text-gray-400"; // inactive
          if (isActive) {
            if (!primaryProviderId || !primaryAvail) {
              bgClass = "bg-blue-100 text-blue-700"; // active but no provider yet
            } else if (primaryAvail.on_leave) {
              bgClass = "bg-red-100 text-red-700";
            } else if (primaryAvail.is_day_off) {
              bgClass = wd?.backupAvail ? "bg-amber-100 text-amber-700" : "bg-amber-200 text-amber-800";
            } else if (primaryAvail.is_busy) {
              bgClass = "bg-orange-100 text-orange-700";
            } else {
              bgClass = "bg-green-100 text-green-700";
            }
          }

          return (
            <div
              key={date}
              className={`flex-1 rounded-lg px-1 py-1.5 text-center ${bgClass} ${isActive ? "" : "opacity-50"}`}
              title={date}
            >
              <p className="text-[10px] font-medium">{label}</p>
              <p className="text-[10px]">{dayNum}</p>
              {isActive && primaryProviderId && wd && (
                <div className="mt-0.5 flex justify-center">
                  {primaryAvail?.is_day_off && wd.backupAvail ? (
                    <span title="Backup covers" className="text-[10px]">🔄</span>
                  ) : (
                    <AvailBadge avail={primaryAvail} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-1">
        ✓ free · ⚠ busy · 🌙 day-off (backup covers) · 🛑 on leave · 🔄 backup taking over
      </p>
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
  /** Base URL for availability API, e.g. "/api/supervisor/providers/availability" or "/api/admin/providers/availability" */
  availabilityApiBase: string;
  onUpdate: (updates: AllocationUpdate) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}) {
  const minUnit = item.service_jobs?.min_unit ?? (item.unit_type === "min" ? 15 : 1);
  const maxUnit = item.service_jobs?.max_unit ?? (item.unit_type === "min" ? 480 : 20);
  const interval = item.service_jobs?.unit_interval ?? (item.unit_type === "min" ? 15 : 1);

  const [unitValue, setUnitValue] = useState(item.unit_value);
  const [startTime, setStartTime] = useState(item.preferred_start_time ?? "08:00");
  const [primaryProviderId, setPrimaryProviderId] = useState(item.preferred_provider_id ?? "");
  const [backupProviderId, setBackupProviderId] = useState(item.backup_provider_id ?? "");
  const [selectedDow, setSelectedDow] = useState<number>(() => {
    if (item.scheduled_day_of_week !== null && item.scheduled_day_of_week !== undefined) {
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

  const { base, effective } = useMemo(() => computePrices(item, unitValue), [item, unitValue]);
  const discountPct = item.discount_pct ? Number(item.discount_pct) : 0;

  // Per-day availability for the 7-day strip
  const [weekDayAvails, setWeekDayAvails] = useState<WeekDayAvail[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);

  // Fetch availability for all 7 days when provider, time, or selectedDow changes
  const fetchWeekAvailability = useCallback(
    async (providerId: string, backupId: string, st: string, et: string) => {
      if (!providerId || !st || !et || !planStartDate) {
        setWeekDayAvails([]);
        return;
      }
      setLoadingDays(true);
      try {
        const dates = Array.from({ length: 7 }, (_, i) => addDays(planStartDate, i));
        const results = await Promise.all(
          dates.map(async (date) => {
            const params = new URLSearchParams({ date, start_time: st, end_time: et });
            const res = await fetch(`${availabilityApiBase}?${params}`);
            if (!res.ok) return { date, providers: [] as DayAvailability[] };
            const d = await res.json();
            return { date, providers: (d.providers ?? []) as DayAvailability[] };
          })
        );

        const avails: WeekDayAvail[] = results.map(({ date, providers }) => {
          const dow = getDow(date);
          const primaryAvail = providers.find((p) => p.id === providerId) ?? null;
          const backupAvail = backupId ? (providers.find((p) => p.id === backupId) ?? null) : null;
          return {
            date,
            dayLabel: SHORT_DAYS[dow],
            dayIndex: dow,
            primaryAvail,
            backupAvail,
          };
        });
        setWeekDayAvails(avails);
      } finally {
        setLoadingDays(false);
      }
    },
    [availabilityApiBase, planStartDate]
  );

  useEffect(() => {
    const et = startTime ? addMinutes(startTime, durationMins) : "";
    if (primaryProviderId && startTime && et) {
      fetchWeekAvailability(primaryProviderId, backupProviderId, startTime, et);
    } else {
      setWeekDayAvails([]);
    }
  }, [primaryProviderId, backupProviderId, startTime, durationMins, fetchWeekAvailability]);

  // Find primary provider's availability map (use the plan start date as reference)
  const planStartWeekDayAvail = weekDayAvails.find((w) => w.date === planStartDate);
  const primaryAvailOnStart = planStartWeekDayAvail?.primaryAvail ?? null;
  const primaryDayOff = primaryAvailOnStart?.day_off_day ?? null;
  const primaryHasDayOff = primaryAvailOnStart?.is_day_off ?? false;

  function stepUnit(dir: 1 | -1) {
    const next = Math.min(maxUnit, Math.max(minUnit, unitValue + dir * interval));
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

  // Build a provider label with availability for plan start date
  function providerLabel(p: ProviderOption): string {
    const planStartAvail = weekDayAvails.find((w) => w.date === planStartDate);
    const avail = planStartAvail?.primaryAvail?.id === p.id
      ? planStartAvail?.primaryAvail
      : planStartAvail?.backupAvail?.id === p.id
      ? planStartAvail?.backupAvail
      : null;
    const typeLabel = p.provider_type ? ` · ${p.provider_type.replace(/_/g, " ")}` : "";
    if (!avail) return p.name + typeLabel;
    const suffix = avail.on_leave
      ? " 🛑 on leave"
      : avail.is_day_off
      ? ` 🌙 day off (${avail.day_off_day ?? ""})`
      : avail.is_busy
      ? ` ⚠ busy (${avail.conflicts.length})`
      : " ✓";
    return p.name + typeLabel + suffix;
  }

  const isWeekly = item.frequency_label === "Weekly";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* Title + price + delete */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{item.title}</p>
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
              <span className="text-[10px] text-gray-400">{item.service_categories.name}</span>
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
              <p className="text-xs text-gray-400 line-through">{formatCurrency(base)}</p>
            )}
            {discountPct > 0 && base !== effective && (
              <p className="text-xs text-green-600">{Math.round(discountPct * 100)}% off</p>
            )}
          </div>
          {!readOnly && onDelete && (
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

      {/* Unit stepper + Start time */}
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
            <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
            <input
              type="time"
              className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
            />
            {endTime && (
              <p className="text-[10px] text-gray-400 mt-0.5">→ {endTime}</p>
            )}
          </div>
        </div>
      )}

      {/* Day-of-week picker for weekly items */}
      {isWeekly && !readOnly && (
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">
            Runs every <span className="text-gray-700 font-medium">{LONG_DAYS[selectedDow]}</span>
          </label>
          <div className="flex gap-1 flex-wrap">
            {SHORT_DAYS.map((label, dow) => (
              // Skip Sunday (0) optionally — show all 7 days
              <button
                key={dow}
                type="button"
                onClick={() => handleDowChange(dow)}
                className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                  selectedDow === dow
                    ? "bg-[#004aad] text-white border-[#004aad]"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 7-day week strip */}
      <WeekStrip
        planStartDate={planStartDate}
        frequencyLabel={item.frequency_label}
        selectedDow={selectedDow}
        primaryProviderId={primaryProviderId}
        weekDayAvails={weekDayAvails}
        loadingDays={loadingDays}
      />

      {/* Primary Provider */}
      {!readOnly && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Primary Provider</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
            value={primaryProviderId}
            onChange={(e) => handlePrimaryChange(e.target.value)}
          >
            <option value="">Select provider</option>
            {allProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {providerLabel(p)}
              </option>
            ))}
          </select>

          {/* Primary availability detail on plan start date */}
          {primaryProviderId && planStartWeekDayAvail?.primaryAvail && (
            <div
              className={`mt-1.5 rounded-lg px-3 py-2 text-xs flex items-start gap-1.5 ${
                planStartWeekDayAvail.primaryAvail.is_available
                  ? "bg-green-50 text-green-700"
                  : planStartWeekDayAvail.primaryAvail.is_day_off || planStartWeekDayAvail.primaryAvail.on_leave
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {planStartWeekDayAvail.primaryAvail.is_available ? (
                <><CheckCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Free on plan start date</>
              ) : planStartWeekDayAvail.primaryAvail.on_leave ? (
                <><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> On approved leave on plan start date</>
              ) : planStartWeekDayAvail.primaryAvail.is_day_off ? (
                <><Moon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Week-off ({primaryDayOff}s) — set a backup below</>
              ) : (
                <><Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Busy: {planStartWeekDayAvail.primaryAvail.conflicts.map((c) => `${c.title} ${c.start}–${c.end}`).join(", ")}</>
              )}
            </div>
          )}

          {/* Schedule on plan start date */}
          {primaryProviderId && planStartWeekDayAvail?.primaryAvail && planStartWeekDayAvail.primaryAvail.all_allocations.length > 0 && (
            <div className="mt-1.5 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 space-y-0.5">
              <p className="font-medium text-gray-700 mb-0.5">
                {planStartWeekDayAvail.primaryAvail.name}&apos;s schedule on {planStartDate}:
              </p>
              {planStartWeekDayAvail.primaryAvail.all_allocations.map((a) => (
                <p key={a.id}>{a.start}–{a.end} · {a.title}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Backup Provider — show when primary has a day-off (or one is already set) */}
      {!readOnly && primaryProviderId && (primaryHasDayOff || backupProviderId) && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            Backup Provider
            {primaryDayOff && (
              <span className="ml-1 text-amber-600 font-medium">(covers {primaryDayOff}s)</span>
            )}
          </label>
          <select
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
            value={backupProviderId}
            onChange={(e) => handleBackupChange(e.target.value)}
          >
            <option value="">No backup</option>
            {allProviders
              .filter((p) => p.id !== primaryProviderId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {providerLabel(p)}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Read-only provider info */}
      {readOnly && (primaryProviderId || backupProviderId) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {primaryProviderId && (
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
              Primary: {allProviders.find((p) => p.id === primaryProviderId)?.name ?? "Unknown"}
            </span>
          )}
          {backupProviderId && (
            <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
              Backup: {allProviders.find((p) => p.id === backupProviderId)?.name ?? "Unknown"}
            </span>
          )}
          {isWeekly && (
            <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-lg">
              Every {LONG_DAYS[selectedDow]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
