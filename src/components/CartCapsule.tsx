"use client";

import { useCart } from "@/contexts/CartContext";
import { useRouter } from "next/navigation";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function CartCapsule() {
  const { items, total } = useCart();
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[448px] z-50">
      <button
        onClick={() => router.push("/plan")}
        className="w-full flex items-center justify-between bg-[#004aad] text-white px-4 py-3.5 rounded-2xl shadow-xl"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-lg p-1.5">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold leading-none">
              {items.length} job{items.length !== 1 ? "s" : ""} in plan
            </p>
            <p className="text-xs text-blue-100 mt-0.5">
              {formatCurrency(total)} / month
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/20 rounded-lg px-3 py-1.5">
          <span className="text-sm font-semibold">Finalize plan</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
}
