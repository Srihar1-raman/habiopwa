"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { CartCapsule } from "@/components/CartCapsule";
import {
  Plus,
  ChevronRight,
  Home,
  Sparkles,
  ShieldCheck,
  Clock,
  CheckCircle2,
  CreditCard,
  UtensilsCrossed,
  Leaf,
  Car,
  Zap,
  Wrench,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatUnitValue } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

interface PlanItem {
  id: string;
  title: string;
  frequency_label: string;
  unit_type: string;
  unit_value: number;
  minutes: number;
  price_monthly: number;
  mrp_monthly: number | null;
  job_code: string | null;
  category_id: string;
  service_categories?: { slug: string; name: string } | null;
}

interface PlanRequest {
  id: string;
  request_code: string;
  status: string;
  total_price_monthly: number;
  plan_request_items: PlanItem[];
}

const BANNERS = [
  {
    bg: "bg-[#004aad]",
    title: "Subscription Home Services",
    sub: "Daily cleaning, cooking & more — on a schedule",
    Icon: Home,
  },
  {
    bg: "bg-[#1a5fc9]",
    title: "Flexible Plans",
    sub: "Choose exactly what you need — change anytime",
    Icon: Sparkles,
  },
  {
    bg: "bg-[#0057cc]",
    title: "Verified Professionals",
    sub: "Background-checked helpers for your home",
    Icon: ShieldCheck,
  },
];

/** Returns a Lucide icon element for the given category slug. */
function getCategoryIcon(slug: string) {
  const map: Record<string, React.ReactNode> = {
    housekeeping: <Sparkles className="w-6 h-6 text-[#004aad]" />,
    "kitchen-services": <UtensilsCrossed className="w-6 h-6 text-[#004aad]" />,
    "garden-care": <Leaf className="w-6 h-6 text-[#004aad]" />,
    "car-care": <Car className="w-6 h-6 text-[#004aad]" />,
    "on-demand": <Zap className="w-6 h-6 text-[#004aad]" />,
  };
  return map[slug] ?? <Wrench className="w-6 h-6 text-[#004aad]" />;
}

/**
 * Shown when user has an existing plan request.
 * Displays a read-only summary grouped by category.
 * When status is "finalized", a sticky "Proceed to Payment" CTA is shown.
 */
function PlanSummaryView({
  planRequest,
  onPay,
}: {
  planRequest: PlanRequest;
  onPay: () => void;
}) {
  const isFinalized = planRequest.status === "finalized";

  const grouped = planRequest.plan_request_items.reduce(
    (acc, item) => {
      const key = item.service_categories?.name ?? "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, PlanItem[]>
  );

  return (
    <div className="flex flex-col min-h-dvh pb-28">
      {/* App bar */}
      <div className="px-4 pt-12 pb-4 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#004aad] flex items-center justify-center">
            <span className="text-white font-bold">H</span>
          </div>
          <span className="text-xl font-bold text-[#004aad]">HABIO</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mt-4">Your Plan</h1>
        <p className="text-sm text-gray-500 font-mono">{planRequest.request_code}</p>
      </div>

      {/* Status banner */}
      {isFinalized ? (
        <div className="mx-4 mt-2 mb-4 bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800 text-sm">Plan Finalized</p>
            <p className="text-xs text-green-600">
              Your plan is ready — tap below to complete payment
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-2 mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Plan Under Review</p>
            <p className="text-xs text-amber-600">
              Our team is reviewing your plan request
            </p>
          </div>
        </div>
      )}

      {/* Summary card */}
      <div className="px-4 mb-4">
        <div className="bg-blue-50 rounded-2xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Job cards</p>
              <p className="text-2xl font-bold text-gray-900">
                {planRequest.plan_request_items.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Plan value</p>
              <p className="text-2xl font-bold text-[#004aad]">
                {formatCurrency(planRequest.total_price_monthly)}
                <span className="text-sm font-normal text-gray-500"> / m</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Items grouped by category */}
      <div className="px-4">
        {Object.entries(grouped).map(([catName, catItems]) => (
          <div
            key={catName}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3"
          >
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="font-semibold text-gray-900">{catName}</p>
              <p className="text-xs text-gray-500">
                {formatCurrency(
                  catItems.reduce((s, i) => s + i.price_monthly, 0)
                )}{" "}
                / m
              </p>
            </div>
            <div className="px-4 py-2">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.frequency_label} ·{" "}
                      {formatUnitValue(
                        item.unit_value ?? item.minutes,
                        item.unit_type ?? "min"
                      )}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(item.price_monthly)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky "Proceed to Payment" — only when finalized */}
      {isFinalized && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 py-4 bg-white border-t border-gray-100 z-50">
          <Button
            size="lg"
            onClick={onPay}
            className="w-full flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Proceed to Payment
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ServicesHomePage() {
  const router = useRouter();
  const { items } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerRef = useRef<NodeJS.Timeout | null>(null);
  // undefined = loading, null = no active plan, PlanRequest = plan exists
  const [planRequest, setPlanRequest] = useState<PlanRequest | null | undefined>(
    undefined
  );

  useEffect(() => {
    // Check for an existing plan request first
    fetch("/api/plan/current")
      .then((r) => r.json())
      .then((d) => {
        const plan: PlanRequest | null = d.planRequest ?? null;
        setPlanRequest(plan);
        if (plan?.status === "paid") {
          router.replace("/plan-active");
        }
      })
      .catch(() => setPlanRequest(null));

    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, [router]);

  // Auto-rotate banners
  useEffect(() => {
    bannerRef.current = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % BANNERS.length);
    }, 3500);
    return () => {
      if (bannerRef.current) clearInterval(bannerRef.current);
    };
  }, []);

  function getCartCountForCategory(categoryId: string) {
    return items.filter((i) => i.category_id === categoryId).length;
  }

  // Loading state
  if (planRequest === undefined) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  // Active plan (not paid) — show plan summary
  if (planRequest !== null) {
    return (
      <PlanSummaryView
        planRequest={planRequest}
        onPay={() => router.push("/payment")}
      />
    );
  }

  // No plan — show service selection UI
  const banner = BANNERS[activeBanner];
  const { Icon: BannerIcon } = banner;

  return (
    <div className="flex flex-col min-h-dvh pb-28">
      {/* App bar */}
      <div className="px-4 pt-12 pb-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#004aad] flex items-center justify-center">
              <span className="text-white font-bold">H</span>
            </div>
            <span className="text-xl font-bold text-[#004aad]">HABIO</span>
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mt-4">Build Your Plan</h1>
        <p className="text-sm text-gray-500">
          Pick services for your monthly subscription
        </p>
      </div>

      {/* Auto-swiping banner */}
      <div className="px-4 mt-2">
        <div
          className={`${banner.bg} rounded-2xl px-5 py-5 text-white transition-all duration-500`}
        >
          <div className="mb-2">
            <BannerIcon className="w-8 h-8 text-white/80" />
          </div>
          <h2 className="text-lg font-bold leading-snug">{banner.title}</h2>
          <p className="text-sm text-blue-100 mt-1">{banner.sub}</p>
        </div>
        {/* Banner dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {BANNERS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activeBanner ? "bg-[#004aad] w-5" : "bg-gray-300 w-1.5"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Category Cards */}
      <div className="px-4 mt-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Services</h2>
        <div className="flex flex-col gap-3">
          {categories.map((cat) => {
            const count = getCartCountForCategory(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => router.push(`/services/${cat.slug}`)}
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
                        ? "0 services added"
                        : `${count} job${count !== 1 ? "s" : ""} in cart`}
                    </p>
                    {count > 0 && (
                      <p className="text-xs text-[#004aad] font-medium mt-0.5">
                        {formatCurrency(
                          items
                            .filter((i) => i.category_id === cat.id)
                            .reduce((s, i) => s + i.unit_price_monthly, 0)
                        )}{" "}
                        / m
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    count > 0
                      ? "bg-[#004aad] text-white"
                      : "bg-gray-100 text-gray-500"
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

      <CartCapsule />
    </div>
  );
}

