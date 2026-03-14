"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export interface CartItem {
  id: string;
  category_id: string;
  job_id: string | null;
  job_code: string | null;
  custom_title: string | null;
  frequency_label: string;
  // unit snapshot
  unit_type: string;
  unit_value: number;
  minutes: number;
  // pricing snapshot
  base_rate_per_unit: number | null;
  instances_per_month: number | null;
  discount_pct: number | null;
  time_multiple: number | null;
  formula_type: string | null;
  base_price_monthly: number | null;
  unit_price_monthly: number;
  mrp_monthly: number | null;
  expectations_snapshot: string[] | null;
  sort_order: number;
  service_categories?: { slug: string; name: string } | null;
  service_jobs?: {
    slug: string;
    name: string;
    code: string | null;
    is_on_demand: boolean | null;
  } | null;
}

interface CartContextValue {
  items: CartItem[];
  total: number;
  loading: boolean;
  addItem: (
    item: Omit<CartItem, "id" | "sort_order">
  ) => Promise<{ ok: boolean; error?: string }>;
  removeItem: (id: string) => Promise<void>;
  updateItem: (
    id: string,
    data: Partial<
      Pick<
        CartItem,
        | "unit_type"
        | "unit_value"
        | "minutes"
        | "base_price_monthly"
        | "unit_price_monthly"
        | "mrp_monthly"
      >
    >
  ) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (
      item: Omit<CartItem, "id" | "sort_order">
    ): Promise<{ ok: boolean; error?: string }> => {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        await refresh();
        return { ok: true };
      }
      const data = await res.json().catch(() => ({ error: "Server error" }));
      return { ok: false, error: data.error ?? "Failed to add item" };
    },
    [refresh]
  );

  const removeItem = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/cart/items/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setTotal((prev) => {
          const item = items.find((i) => i.id === id);
          return item ? prev - item.unit_price_monthly : prev;
        });
      }
    },
    [items]
  );

  const updateItem = useCallback(
    async (
      id: string,
      data: Partial<
        Pick<
          CartItem,
          | "unit_type"
          | "unit_value"
          | "minutes"
          | "base_price_monthly"
          | "unit_price_monthly"
          | "mrp_monthly"
        >
      >
    ) => {
      const res = await fetch(`/api/cart/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await refresh();
      }
    },
    [refresh]
  );

  return (
    <CartContext.Provider
      value={{ items, total, loading, addItem, removeItem, updateItem, refresh }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
