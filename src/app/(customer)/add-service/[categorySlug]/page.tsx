"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  Lock,
  Minus,
  Plus,
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
  primary_card: string | null;
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
}

interface ActivePlanItem {
  job_id: string;
  title: string;
  unit_type: string;
  unit_value: number;
  price_monthly: number;
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
    return `${inputValue} min × ₹${rate}/min × ${inst}`;
  }
  const unitLabel = getUnitLabel(job.unit_type);
  const tmPart = job.time_multiple ? ` × ${job.time_multiple} min/${unitLabel.replace(/s$/, "")}` : "";
  const suffix =
    job.formula_type === "compound_head" && job.compound_child
      ? " (includes deep-clean component)"
      : "";
  return `${inputValue} ${unitLabel}${tmPart} × ₹${rate}/min × ${inst}${suffix}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export default function AddServiceCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const categorySlug = params.categorySlug as string;
  const planRequestId = searchParams.get("plan");

  const [category, setCategory] = useState<Category | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobIds, setActiveJobIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unitValues, setUnitValues] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load catalog
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => {
        const cat = d.categories?.find((c: Category) => c.slug === categorySlug);
        setCategory(cat ?? null);
        const catJobs = (d.jobs ?? []).filter(
          (j: Job) => j.category_id === cat?.id && j.formula_type !== "compound_child"
        );
        setJobs(catJobs);
        const initial: Record<string, number> = {};
        catJobs.forEach((j: Job) => { initial[j.id] = j.default_unit; });
        setUnitValues(initial);
      });

    // Load current plan to know which jobs are already active
    fetch("/api/plan/current")
      .then((r) => r.json())
      .then((d) => {
        const items: ActivePlanItem[] = d.planRequest?.plan_request_items ?? [];
        setActiveJobIds(new Set(items.map((i) => i.job_id)));
      })
      .catch(() => {});
  }, [categorySlug]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelected(jobId: string) {
    if (activeJobIds.has(jobId)) return; // locked — cannot deselect active jobs
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(jobId) ? next.delete(jobId) : next.add(jobId);
      return next;
    });
  }

  function changeUnit(job: Job, delta: number) {
    const current = unitValues[job.id] ?? job.default_unit;
    const next = Math.min(
      job.max_unit,
      Math.max(job.min_unit, current + delta * job.unit_interval)
    );
    setUnitValues((prev) => ({ ...prev, [job.id]: next }));
  }

  async function handleSubmit() {
    if (selected.size === 0 || !planRequestId || !category) return;
    setSubmitting(true);
    setError(null);
    try {
      const items = Array.from(selected)
        .map((id) => jobs.find((j) => j.id === id))
        .filter((job): job is Job => job !== undefined)
        .map((job) => {
          const inputValue = unitValues[job.id] ?? job.default_unit;
          const { effective } = computePrices(job, inputValue);
          return {
            job_id: job.id,
            category_id: category.id,
            title: job.name,
            frequency_label: job.frequency_label,
            unit_type: job.unit_type,
            unit_value: inputValue,
            price_monthly: effective,
          };
        });

      const res = await fetch("/api/customer/add-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_request_id: planRequestId, items }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit");
      }
      setSuccess(true);
      setSelected(new Set());
      // Re-fetch active job IDs so newly added jobs become locked
      fetch("/api/plan/current")
        .then((r) => r.json())
        .then((d) => {
          const planItems: ActivePlanItem[] = d.planRequest?.plan_request_items ?? [];
          setActiveJobIds(new Set(planItems.map((i) => i.job_id)));
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!category) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="flex items-center gap-3 px-4 pt-12 pb-4 bg-white border-b border-gray-100">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>
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

  const newSelected = Array.from(selected).filter((id) => !activeJobIds.has(id));

  return (
    <div className="flex flex-col min-h-dvh pb-32">
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

      {/* Success banner */}
      {success && (
        <div className="mx-4 mt-4 bg-green-50 rounded-2xl border border-green-100 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 font-medium">
            Service request submitted! We&apos;ll review and confirm shortly.
          </p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-4 bg-red-50 rounded-2xl p-4 text-sm text-red-600">{error}</div>
      )}

      {/* Job cards grouped by primary_card */}
      <div className="px-4 mt-4 flex flex-col gap-6">
        {Object.entries(groups).map(([groupName, groupJobs]) => (
          <div key={groupName}>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
              {groupName}
            </p>
            <div className="flex flex-col gap-3">
              {groupJobs.map((job) => {
                const isActive = activeJobIds.has(job.id);
                const isSelected = isActive || selected.has(job.id);
                const isOpen = expanded.has(job.id);
                const inputValue = unitValues[job.id] ?? job.default_unit;
                const { base, effective } = computePrices(job, inputValue);

                return (
                  <div
                    key={job.id}
                    className={`bg-white rounded-2xl border transition-all ${
                      isActive
                        ? "border-gray-300 opacity-75"
                        : isSelected
                        ? "border-[#004aad] shadow-sm"
                        : "border-gray-100 shadow-sm"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center gap-3 p-4">
                      <button
                        onClick={() => toggleSelected(job.id)}
                        disabled={isActive}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isActive
                            ? "bg-gray-200 border-gray-300 cursor-not-allowed"
                            : isSelected
                            ? "bg-[#004aad] border-[#004aad]"
                            : "border-gray-300"
                        }`}
                      >
                        {isActive && <Lock className="w-3 h-3 text-gray-400" />}
                        {!isActive && isSelected && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 leading-tight">{job.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {job.frequency_label}
                          {isActive && (
                            <span className="ml-2 text-gray-400 font-medium">· Already active</span>
                          )}
                          {!isActive && isSelected && (
                            <span className="ml-2 text-[#004aad] font-medium">
                              · {formatCurrency(effective)} / mo
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
                        {/* Unit Selector — only for new (non-active) jobs */}
                        {!isActive && (
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
                        )}

                        {/* Pricing info */}
                        <div className="flex items-baseline gap-2 mb-1 mt-3">
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
                                  <span className="text-[#004aad] mt-0.5 flex-shrink-0">•</span>
                                  {exp.text}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* CTA */}
                        {isActive ? (
                          <div className="w-full py-3 rounded-xl bg-gray-100 text-gray-500 font-medium text-sm text-center flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4" />
                            Already in your plan
                          </div>
                        ) : !isSelected ? (
                          <button
                            onClick={() => toggleSelected(job.id)}
                            className="w-full py-3 rounded-xl bg-[#004aad] text-white font-semibold text-sm"
                          >
                            Add to Request
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleSelected(job.id)}
                            className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm border border-red-200"
                          >
                            Remove from Request
                          </button>
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

      {/* Sticky submit bar */}
      {newSelected.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 py-4 bg-white border-t border-gray-100 z-50">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-[#004aad] text-white font-semibold text-sm disabled:opacity-50"
          >
            {submitting
              ? "Submitting…"
              : `Request ${newSelected.length} New Service${newSelected.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}
