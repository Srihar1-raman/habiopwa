"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Sparkles, UtensilsCrossed, Leaf, Car, Zap, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

interface PlanItem {
  id: string;
  job_id: string;
  category_id: string;
  title: string;
  price_monthly: number;
}

interface CurrentPlan {
  id: string;
  status: string;
  plan_request_items: PlanItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getCategoryIcon(slug: string) {
  const map: Record<string, React.ReactNode> = {
    housekeeping: <Sparkles className="w-6 h-6 text-[#004aad]" />,
    "kitchen-services": <UtensilsCrossed className="w-6 h-6 text-[#004aad]" />,
    "garden-care": <Leaf className="w-6 h-6 text-[#004aad]" />,
    "car-care": <Car className="w-6 h-6 text-[#004aad]" />,
    "technician-services": <Zap className="w-6 h-6 text-[#004aad]" />,
  };
  return map[slug] ?? <Wrench className="w-6 h-6 text-[#004aad]" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AddServicePage() {
  const router = useRouter();
  const [plan, setPlan] = useState<CurrentPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/plan/current")
      .then((r) => r.json())
      .then((data) => {
        const planRequest = data.planRequest ?? null;
        if (planRequest && (planRequest.status === "paid" || planRequest.status === "finalized")) {
          setPlan({
            id: planRequest.id,
            status: planRequest.status,
            plan_request_items: planRequest.plan_request_items ?? [],
          });
        }
        setPlanLoading(false);
      })
      .catch(() => setPlanLoading(false));

    fetch("/api/catalog")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {});
  }, []);

  if (planLoading) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-gray-100">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 flex-1">Add Service</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-gray-100">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 flex-1">Add Service</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <p className="text-gray-600 text-sm">
            Additional services are available after you complete payment for your plan.
          </p>
          <button
            onClick={() => router.push("/plan")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#004aad] text-white rounded-xl text-sm font-medium"
          >
            View Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800 flex-1">Add Service</h1>
        </div>
      </div>

      {/* Category cards */}
      <div className="px-4 mt-4 flex flex-col gap-3">
        <p className="text-sm text-gray-500 mb-1">
          Select a category to browse and add services to your plan.
        </p>
        {categories.map((cat) => {
          const activeItems = plan.plan_request_items.filter(
            (i) => i.category_id === cat.id
          );
          const count = activeItems.length;
          const monthlyTotal = activeItems.reduce((s, i) => s + i.price_monthly, 0);
          return (
            <button
              key={cat.id}
              onClick={() =>
                router.push(`/add-service/${cat.slug}?plan=${plan.id}`)
              }
              className="w-full flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  {getCategoryIcon(cat.slug)}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{cat.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {count === 0
                      ? "No active services"
                      : `${count} service${count !== 1 ? "s" : ""} active`}
                  </p>
                  {monthlyTotal > 0 && (
                    <p className="text-xs text-[#004aad] font-medium mt-0.5">
                      {formatCurrency(monthlyTotal)} / m
                    </p>
                  )}
                </div>
              </div>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  count > 0 ? "bg-[#004aad] text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {count > 0 ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
