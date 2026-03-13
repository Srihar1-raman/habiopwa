"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { CartCapsule } from "@/components/CartCapsule";
import { ChevronLeft, ChevronDown, ChevronUp, Check, Minus, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface JobPricing {
  mrp_monthly: number | null;
  price_monthly: number;
  default_minutes: number;
  min_minutes: number;
  max_minutes: number;
  step_minutes: number;
  currency: string;
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
  frequency_label: string;
  sort_order: number;
  job_pricing: JobPricing | null;
  job_expectations: JobExpectation[];
}

interface Category {
  id: string;
  slug: string;
  name: string;
}

// Scale price proportionally to duration change
function scaledPrice(pricing: JobPricing, minutes: number): number {
  const ratio = minutes / pricing.default_minutes;
  return Math.round(pricing.price_monthly * ratio);
}

export default function CategoryPlanPage() {
  const router = useRouter();
  const params = useParams();
  const categorySlug = params.categorySlug as string;
  const { items, addItem, removeItem, updateItem } = useCart();

  const [category, setCategory] = useState<Category | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [durations, setDurations] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => {
        const cat = d.categories?.find(
          (c: Category) => c.slug === categorySlug
        );
        setCategory(cat ?? null);
        const catJobs = (d.jobs ?? []).filter(
          (j: Job) => j.category_id === cat?.id
        );
        setJobs(catJobs);
        // Init durations from pricing defaults
        const initialDurations: Record<string, number> = {};
        catJobs.forEach((j: Job) => {
          initialDurations[j.id] = j.job_pricing?.default_minutes ?? 30;
        });
        setDurations(initialDurations);
      });
  }, [categorySlug]);

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
    } else {
      if (!job.job_pricing || !category) return;
      const mins = durations[job.id] ?? job.job_pricing.default_minutes;
      const price = scaledPrice(job.job_pricing, mins);
      await addItem({
        category_id: category.id,
        job_id: job.id,
        custom_title: null,
        frequency_label: job.frequency_label,
        minutes: mins,
        unit_price_monthly: price,
        mrp_monthly: job.job_pricing.mrp_monthly,
        expectations_snapshot: job.job_expectations.map((e) => e.text),
        service_categories: { slug: category.slug, name: category.name },
        service_jobs: { slug: job.slug, name: job.name },
      });
      // Expand card after adding
      setExpanded((prev) => new Set([...prev, job.id]));
    }
  }

  async function changeDuration(job: Job, delta: number) {
    if (!job.job_pricing) return;
    const { min_minutes, max_minutes, step_minutes } = job.job_pricing;
    const current = durations[job.id] ?? job.job_pricing.default_minutes;
    const next = Math.min(max_minutes, Math.max(min_minutes, current + delta * step_minutes));
    setDurations((prev) => ({ ...prev, [job.id]: next }));

    const cartItem = getCartItem(job.id);
    if (cartItem) {
      const newPrice = scaledPrice(job.job_pricing, next);
      await updateItem(cartItem.id, {
        minutes: next,
        unit_price_monthly: newPrice,
      });
    }
  }

  if (!category) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
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
          {category.name} Plan
        </h1>
      </div>

      {/* Job Cards */}
      <div className="px-4 mt-4 flex flex-col gap-3">
        {jobs.map((job) => {
          const inCart = isInCart(job.id);
          const isOpen = expanded.has(job.id);
          const pricing = job.job_pricing;
          const mins = durations[job.id] ?? pricing?.default_minutes ?? 30;
          const price = pricing ? scaledPrice(pricing, mins) : 0;

          return (
            <div
              key={job.id}
              className={`bg-white rounded-2xl border transition-all ${
                inCart ? "border-[#004aad] shadow-sm" : "border-gray-100 shadow-sm"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => toggleJob(job)}
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    inCart
                      ? "bg-[#004aad] border-[#004aad]"
                      : "border-gray-300"
                  }`}
                >
                  {inCart && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{job.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {job.frequency_label}
                    {inCart && pricing && (
                      <span className="ml-2 text-[#004aad] font-medium">
                        · {formatCurrency(price)} / m
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
              {isOpen && pricing && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                  {/* Duration Selector */}
                  <div className="flex items-center justify-between mt-3 mb-3">
                    <span className="text-sm text-gray-600 font-medium">
                      Duration
                    </span>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-1 py-1">
                      <button
                        onClick={() => changeDuration(job, -1)}
                        disabled={mins <= pricing.min_minutes}
                        className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center disabled:opacity-30"
                      >
                        <Minus className="w-4 h-4 text-gray-700" />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 w-14 text-center">
                        {mins} min
                      </span>
                      <button
                        onClick={() => changeDuration(job, 1)}
                        disabled={mins >= pricing.max_minutes}
                        className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center disabled:opacity-30"
                      >
                        <Plus className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  </div>

                  {/* Price Block */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(price)}
                      <span className="text-sm font-normal text-gray-500"> / month</span>
                    </span>
                    {pricing.mrp_monthly && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency(
                          Math.round(
                            pricing.mrp_monthly * (mins / pricing.default_minutes)
                          )
                        )}
                      </span>
                    )}
                  </div>

                  {/* Expectations */}
                  {job.job_expectations.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        What to expect
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {job.job_expectations.map((exp) => (
                          <li
                            key={exp.id}
                            className="flex items-start gap-2 text-sm text-gray-700"
                          >
                            <span className="text-[#004aad] mt-0.5">•</span>
                            {exp.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!inCart && (
                    <button
                      onClick={() => toggleJob(job)}
                      className="mt-3 w-full py-3 rounded-xl bg-[#004aad] text-white font-semibold text-sm"
                    >
                      Add to Plan
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CartCapsule />
    </div>
  );
}
