"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { CartCapsule } from "@/components/CartCapsule";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Minus,
  Plus,
  Lock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  calcJobPrices,
  getUnitDisplayName,
  getUnitLabel,
  formatUnitValue,
  type JobPricingParams,
  type CompoundChildParams,
} from "@/lib/pricing";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface CompoundChild {
  code: string;
  base_rate_per_unit: number;
  instances_per_month: number;
  time_multiple: number | null;
}

interface JobExpectation {
  id: string;
  sort_order: number;
  text: string;
}

interface Job {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  code: string | null;
  class: string | null;
  service_type: string | null;
  primary_card: string | null;
  sub_card: string | null;
  frequency_label: string;
  unit_type: string;
  unit_interval: number;
  min_unit: number;
  max_unit: number;
  default_unit: number;
  time_multiple: number | null;
  base_rate_per_unit: number;
  instances_per_month: number;
  discount_pct: number;
  is_on_demand: boolean;
  formula_type: string;
  compound_child: CompoundChild | null;
  sort_order: number;
  job_expectations: JobExpectation[];
}

interface Category {
  id: string;
  slug: string;
  name: string;
  code: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function computePrices(job: Job, inputValue: number) {
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
  return calcJobPrices(inputValue, params, child);
}

function formulaInsightText(job: Job, inputValue: number): string {
  const rate = Number(job.base_rate_per_unit).toFixed(2);
  const inst = `${job.instances_per_month} visits/mo`;
  if (job.unit_type === "min") {
    return `${inputValue} min \u00d7 \u20b9${rate}/min \u00d7 ${inst}`;
  }
  const unitLabel = getUnitLabel(job.unit_type);
  const tmPart = job.time_multiple ? ` \u00d7 ${job.time_multiple} min/${unitLabel.replace(/s$/, "")}` : "";
  const suffix =
    job.formula_type === "compound_head" && job.compound_child
      ? " (includes deep-clean component)"
      : "";
  return `${inputValue} ${unitLabel}${tmPart} \u00d7 \u20b9${rate}/min \u00d7 ${inst}${suffix}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export default function CategoryPlanPage() {
  const router = useRouter();
  const params = useParams();
  const categorySlug = params.categorySlug as string;
  const { items, addItem, removeItem, updateItem } = useCart();

  const [category, setCategory] = useState<Category | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [unitValues, setUnitValues] = useState<Record<string, number>>({});
  const [hasBasePlan, setHasBasePlan] = useState(false);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => {
        const cat = d.categories?.find(
          (c: Category) => c.slug === categorySlug
        );
        setCategory(cat ?? null);

        // Filter: exclude compound_child rows (hidden from user)
        const catJobs = (d.jobs ?? []).filter(
          (j: Job) =>
            j.category_id === cat?.id && j.formula_type !== "compound_child"
        );
        setJobs(catJobs);

        // Init unit values from catalog defaults
        const initial: Record<string, number> = {};
        catJobs.forEach((j: Job) => {
          initial[j.id] = j.default_unit;
        });
        setUnitValues(initial);
      });
  }, [categorySlug]);

  // Detect whether customer has at least one non-on-demand job in the cart (base plan check).
  // On-demand sub-card codes all contain "-OD-OD-" (e.g. HKP1-OD-OD-12A, KCH-OD-OD-2A, HMT-OD-OD-1A).
  // Any cart item whose job_code does NOT contain "-OD-OD-" is a base plan (subscription) job.
  useEffect(() => {
    setHasBasePlan(
      items.some((i) => !i.job_code?.includes("-OD-OD-"))
    );
  }, [items]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isInCart(jobId: string) {
    return items.some((i) => i.job_id === jobId);
  }

  function getCartItem(jobId: string) {
    return items.find((i) => i.job_id === jobId);
  }

  async function toggleJob(job: Job) {
    const cartItem = getCartItem(job.id);
    if (cartItem) {
      await removeItem(cartItem.id);
      return;
    }

    if (!category) return;

    // On-demand jobs require an active base plan
    if (job.is_on_demand && !hasBasePlan) return;

    const inputValue = unitValues[job.id] ?? job.default_unit;
    const { base, effective } = computePrices(job, inputValue);

    await addItem({
      category_id: category.id,
      job_id: job.id,
      job_code: job.code,
      custom_title: null,
      frequency_label: job.frequency_label,
      unit_type: job.unit_type,
      unit_value: inputValue,
      minutes: job.unit_type === "min" ? inputValue : job.default_unit,
      base_rate_per_unit: Number(job.base_rate_per_unit),
      instances_per_month: job.instances_per_month,
      discount_pct: Number(job.discount_pct),
      time_multiple: job.time_multiple ? Number(job.time_multiple) : null,
      formula_type: job.formula_type,
      base_price_monthly: base,
      unit_price_monthly: effective,
      mrp_monthly: base,
      expectations_snapshot: job.job_expectations.map((e) => e.text),
      service_categories: { slug: category.slug, name: category.name },
      service_jobs: { slug: job.slug, name: job.name, code: job.code },
    });

    // Expand card after adding
    setExpanded((prev) => new Set([...prev, job.id]));
  }

  async function changeUnit(job: Job, delta: number) {
    const current = unitValues[job.id] ?? job.default_unit;
    const next = Math.min(
      job.max_unit,
      Math.max(job.min_unit, current + delta * job.unit_interval)
    );
    setUnitValues((prev) => ({ ...prev, [job.id]: next }));

    const cartItem = getCartItem(job.id);
    if (cartItem) {
      const { base, effective } = computePrices(job, next);
      await updateItem(cartItem.id, {
        unit_value: next,
        minutes: job.unit_type === "min" ? next : cartItem.minutes,
        base_price_monthly: base,
        unit_price_monthly: effective,
        mrp_monthly: base,
      });
    }
  }

  if (!category) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  // Group jobs by primary_card for display
  const groups = jobs.reduce<Record<string, Job[]>>((acc, job) => {
    const key = job.primary_card ?? "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(job);
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-dvh pb-28">
      {/* App bar */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900 pr-8">
          {category.name}
        </h1>
      </div>

      {/* Job Cards grouped by primary_card */}
      <div className="px-4 mt-4 flex flex-col gap-6">
        {Object.entries(groups).map(([groupName, groupJobs]) => (
          <div key={groupName}>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
              {groupName}
            </p>
            <div className="flex flex-col gap-3">
              {groupJobs.map((job) => {
                const inCart = isInCart(job.id);
                const isOpen = expanded.has(job.id);
                const inputValue = unitValues[job.id] ?? job.default_unit;
                const { base, effective } = computePrices(job, inputValue);
                const isLocked = job.is_on_demand && !hasBasePlan;

                return (
                  <div
                    key={job.id}
                    className={`bg-white rounded-2xl border transition-all ${
                      inCart
                        ? "border-[#004aad] shadow-sm"
                        : isLocked
                        ? "border-gray-100 opacity-60"
                        : "border-gray-100 shadow-sm"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center gap-3 p-4">
                      <button
                        onClick={() => !isLocked && toggleJob(job)}
                        disabled={isLocked}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          inCart
                            ? "bg-[#004aad] border-[#004aad]"
                            : isLocked
                            ? "border-gray-200 bg-gray-50"
                            : "border-gray-300"
                        }`}
                      >
                        {inCart && <Check className="w-3.5 h-3.5 text-white" />}
                        {isLocked && !inCart && (
                          <Lock className="w-3 h-3 text-gray-300" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-900 leading-tight">
                            {job.name}
                          </p>
                          {job.service_type && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                job.service_type === "Core - Routine"
                                  ? "bg-blue-50 text-blue-600"
                                  : job.service_type === "On Demand"
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {job.service_type === "Core - Routine"
                                ? "Core"
                                : job.service_type === "Add on - Routine"
                                ? "Add-on"
                                : "On Demand"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {job.frequency_label}
                          {inCart && (
                            <span className="ml-2 text-[#004aad] font-medium">
                              · {formatCurrency(effective)} / mo
                            </span>
                          )}
                          {isLocked && (
                            <span className="ml-2 text-orange-500 font-medium">
                              · Requires active plan
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleExpanded(job.id)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>

                    {/* Expanded Content */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                        {/* Unit Selector */}
                        <div className="flex items-center justify-between mt-3 mb-3">
                          <span className="text-sm text-gray-600 font-medium">
                            {getUnitDisplayName(job.unit_type)}
                          </span>
                          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-1 py-1">
                            <button
                              onClick={() => changeUnit(job, -1)}
                              disabled={inputValue <= job.min_unit}
                              className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center disabled:opacity-30"
                            >
                              <Minus className="w-4 h-4 text-gray-700" />
                            </button>
                            <span className="text-sm font-semibold text-gray-900 w-20 text-center">
                              {formatUnitValue(inputValue, job.unit_type)}
                            </span>
                            <button
                              onClick={() => changeUnit(job, 1)}
                              disabled={inputValue >= job.max_unit}
                              className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center disabled:opacity-30"
                            >
                              <Plus className="w-4 h-4 text-gray-700" />
                            </button>
                          </div>
                        </div>

                        {/* Pricing info row */}
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xl font-bold text-gray-900">
                            {formatCurrency(effective)}
                          </span>
                          {base !== effective && (
                            <span className="text-sm text-gray-400 line-through">
                              {formatCurrency(base)}
                            </span>
                          )}
                          <span className="text-sm text-gray-500">/ month</span>
                          {base !== effective && (
                            <span className="text-xs text-green-600 font-medium">
                              {Math.round(Number(job.discount_pct) * 100)}% off
                            </span>
                          )}
                        </div>

                        {/* Formula insight */}
                        <p className="text-xs text-gray-400 mb-3">
                          {formulaInsightText(job, inputValue)}
                        </p>

                        {/* Expectations */}
                        {job.job_expectations.length > 0 && (
                          <div className="bg-gray-50 rounded-xl p-3 mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              What to expect
                            </p>
                            <ul className="flex flex-col gap-1.5">
                              {job.job_expectations.map((exp) => (
                                <li
                                  key={exp.id}
                                  className="flex items-start gap-2 text-sm text-gray-700"
                                >
                                  <span className="text-[#004aad] mt-0.5 flex-shrink-0">
                                    •
                                  </span>
                                  {exp.text}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Sub-card & code chips */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {job.sub_card && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              {job.sub_card}
                            </span>
                          )}
                          {job.code && (
                            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-mono">
                              {job.code}
                            </span>
                          )}
                        </div>

                        {!inCart && !isLocked && (
                          <button
                            onClick={() => toggleJob(job)}
                            className="w-full py-3 rounded-xl bg-[#004aad] text-white font-semibold text-sm"
                          >
                            Add to Plan
                          </button>
                        )}

                        {isLocked && (
                          <div className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-medium text-sm text-center">
                            Subscribe to a base plan to unlock
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <CartCapsule />
    </div>
  );
}
