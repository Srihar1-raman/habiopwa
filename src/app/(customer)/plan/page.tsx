"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { CartItem } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil, CheckCircle, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatUnitValue } from "@/lib/pricing";

interface SubmittedRequest {
  requestCode: string;
  requestId: string;
  status: string;
  total: number;
}

export default function PlanPage() {
  const router = useRouter();
  const { items, total } = useCart();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedRequest | null>(null);
  const [error, setError] = useState("");

  // Group items by category
  const grouped = items.reduce(
    (acc, item) => {
      const key = item.category_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, CartItem[]>
  );

  async function handleSubmit() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/plan/submit", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to submit. Try again.");
      return;
    }
    setSubmitted({
      requestCode: data.requestCode,
      requestId: data.requestId,
      status: data.status,
      total: data.total,
    });
  }

  if (items.length === 0 && !submitted) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="flex-1 text-center text-lg font-bold text-gray-900 pr-8">
            Your Overall Plan
          </h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <ShoppingCart className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500">Your cart is empty.</p>
          <Button onClick={() => router.push("/services")} variant="outline">
            Browse Services
          </Button>
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
          Your Overall Plan
        </h1>
      </div>

      <div className="px-4 mt-4">
        {/* Summary Header */}
        <div className="bg-blue-50 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Job cards</p>
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Plan value</p>
              <p className="text-2xl font-bold text-[#004aad]">
                {formatCurrency(total)}
                <span className="text-sm font-normal text-gray-500"> / m</span>
              </p>
            </div>
          </div>
        </div>

        {/* Submitted Confirmation */}
        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-800">Plan Submitted!</p>
            </div>
            <p className="text-sm text-green-700">
              Request ID:{" "}
              <span className="font-mono font-semibold">{submitted.requestCode}</span>
            </p>
            <p className="text-sm text-green-600 mt-1">
              Status: Under review by our team. We&apos;ll notify you once
              finalized.
            </p>
          </div>
        )}

        {/* Grouped Category Cards */}
        {Object.entries(grouped).map(([, catItems]) => {
          const categoryName =
            catItems[0]?.service_categories?.name ?? "Services";
          const catTotal = catItems.reduce(
            (s, i) => s + i.unit_price_monthly,
            0
          );
          const catSlug = catItems[0]?.service_categories?.slug ?? "";

          return (
            <div
              key={catItems[0].category_id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <div>
                  <p className="font-semibold text-gray-900">{categoryName}</p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(catTotal)} / m
                  </p>
                </div>
                {!submitted && (
                  <button
                    onClick={() => router.push(`/services/${catSlug}`)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <Pencil className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              <div className="px-4 py-2">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.service_jobs?.name ?? item.custom_title ?? "Custom"}
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
                      {formatCurrency(item.unit_price_monthly)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 py-4 bg-white border-t border-gray-100">
        {submitted ? (
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/services")}
            className="w-full"
          >
            Edit Plan
          </Button>
        ) : (
          <Button
            size="lg"
            loading={loading}
            onClick={handleSubmit}
            className="w-full"
          >
            Submit Plan
          </Button>
        )}
      </div>
    </div>
  );
}
