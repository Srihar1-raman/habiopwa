"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { CartItem } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil, CheckCircle, ShoppingCart, Zap, Wrench, Hammer, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatUnitValue } from "@/lib/pricing";

interface SubmittedRequest {
  requestCode: string;
  requestId: string;
  status: string;
  total: number;
  planStartDate: string | null;
}

/** Formats a YYYY-MM-DD string as "21 March '26" */
function formatStartDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d
    .toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "2-digit",
    })
    .replace(/(\d+) (\w+) (\d+)/, "$1 $2 '$3");
}

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PlanPage() {
  const router = useRouter();
  const { items, total, preferredStartDate, loading: cartLoading } = useCart();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedRequest | null>(null);
  const [error, setError] = useState("");

  // Display date: use stored preferred date or default +3 days
  const displayStartDate = preferredStartDate ?? defaultStartDate();

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
      planStartDate: data.planStartDate ?? null,
    });
  }

  if (cartLoading) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center text-gray-400">
        Loading...
      </div>
    );
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
          <div className="mt-3 pt-3 border-t border-blue-100 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <p className="text-xs text-gray-500">
              Plan Start Date:{" "}
              <span className="font-medium text-gray-700">
                {formatStartDate(submitted?.planStartDate ?? displayStartDate)}
              </span>
            </p>
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
            {submitted.planStartDate && (
              <p className="text-sm text-green-700 mt-1">
                Start Date:{" "}
                <span className="font-semibold">{formatStartDate(submitted.planStartDate)}</span>
              </p>
            )}
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

        {/* Technician Services — always shown, free 2x/month */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <div>
              <p className="font-semibold text-gray-900">Technician Services</p>
              <p className="text-xs text-gray-500">Included with your plan · Free</p>
            </div>
            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full">
              Free
            </span>
          </div>
          <div className="px-4 py-2">
            {[
              { name: "Electrician", Icon: Zap },
              { name: "Plumber", Icon: Wrench },
              { name: "Carpenter", Icon: Hammer },
            ].map(({ name, Icon }) => (
              <div
                key={name}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#004aad]" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{name}</p>
                    <p className="text-xs text-gray-500">Free · 2 times / month</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-green-600">₹0 / m</p>
              </div>
            ))}
          </div>
        </div>

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
