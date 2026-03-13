"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { CartCapsule } from "@/components/CartCapsule";
import { Plus, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Category {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

const BANNERS = [
  {
    bg: "bg-[#004aad]",
    title: "Subscription Home Services",
    sub: "Daily cleaning, cooking & more — on a schedule",
    emoji: "🏠",
  },
  {
    bg: "bg-[#1a5fc9]",
    title: "Flexible Plans",
    sub: "Choose exactly what you need — change anytime",
    emoji: "✨",
  },
  {
    bg: "bg-[#0057cc]",
    title: "Verified Professionals",
    sub: "Background-checked helpers for your home",
    emoji: "⭐",
  },
];

export default function ServicesHomePage() {
  const router = useRouter();
  const { items } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

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
        <h1 className="text-xl font-bold text-gray-900 mt-4">
          Build Your Plan
        </h1>
        <p className="text-sm text-gray-500">
          Pick services for your monthly subscription
        </p>
      </div>

      {/* Auto-swiping banner */}
      <div className="px-4 mt-2">
        <div
          className={`${BANNERS[activeBanner].bg} rounded-2xl px-5 py-5 text-white transition-all duration-500`}
        >
          <div className="text-4xl mb-2">{BANNERS[activeBanner].emoji}</div>
          <h2 className="text-lg font-bold leading-snug">
            {BANNERS[activeBanner].title}
          </h2>
          <p className="text-sm text-blue-100 mt-1">
            {BANNERS[activeBanner].sub}
          </p>
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
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Services
        </h2>
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
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
                    {getCategoryEmoji(cat.slug)}
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

function getCategoryEmoji(slug: string): string {
  const map: Record<string, string> = {
    housekeeping: "🧹",
    "kitchen-services": "🍳",
    "garden-care": "🌿",
    "car-care": "🚗",
    "on-demand": "⚡",
  };
  return map[slug] ?? "🔧";
}
