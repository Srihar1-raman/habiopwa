"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface PlanItem {
  id: string;
  title: string;
  frequency_label: string;
  minutes: number;
  price_monthly: number;
  service_categories?: { slug: string; name: string } | null;
}

interface PlanRequest {
  id: string;
  request_code: string;
  status: string;
  total_price_monthly: number;
  plan_request_items: PlanItem[];
}

export default function PlanActivePage() {
  const router = useRouter();
  const [planRequest, setPlanRequest] = useState<PlanRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plan/current")
      .then((r) => r.json())
      .then((d) => {
        setPlanRequest(d.planRequest);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (!planRequest || planRequest.status !== "paid") {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center px-8 text-center gap-4">
        <div className="text-5xl">🏠</div>
        <h2 className="text-xl font-bold text-gray-900">No active plan</h2>
        <Button onClick={() => router.push("/services")}>Browse Services</Button>
      </div>
    );
  }

  // Group items by category
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
    <div className="flex flex-col min-h-dvh pb-8">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 bg-[#004aad] text-white">
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle className="w-8 h-8 text-green-300" />
          <div>
            <h1 className="text-xl font-bold">Plan Active</h1>
            <p className="text-blue-200 text-sm">
              {planRequest.request_code}
            </p>
          </div>
        </div>
        <div className="bg-white/10 rounded-2xl p-4 text-center">
          <p className="text-blue-200 text-sm">Monthly Subscription</p>
          <p className="text-4xl font-bold mt-1">
            {formatCurrency(planRequest.total_price_monthly)}
          </p>
          <p className="text-blue-200 text-sm mt-1">/ month</p>
        </div>
      </div>

      {/* Services Summary */}
      <div className="px-4 mt-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Your Services
        </h2>
        {Object.entries(grouped).map(([catName, catItems]) => (
          <div
            key={catName}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3"
          >
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="font-semibold text-gray-900">{catName}</p>
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
                    <p className="text-xs text-gray-400">
                      {item.frequency_label} · {item.minutes} min
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
    </div>
  );
}
