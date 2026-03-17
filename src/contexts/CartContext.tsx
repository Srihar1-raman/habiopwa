"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
  cartId: string | null;
  preferredStartDate: string | null;
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
  updatePreferredStartDate: (date: string | null) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);
  const [preferredStartDate, setPreferredStartDate] = useState<string | null>(null);

  // Derived from items — always in sync, no separate state to manage or race conditions
  const total = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.unit_price_monthly), 0),
    [items]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setCartId(data.cartId ?? null);
        setPreferredStartDate(data.preferred_start_date ?? null);
        // total is derived from items via useMemo — no setTotal needed
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Optimistically adds an item to the cart.
   * The item appears instantly in the UI via a temporary ID; the temp ID is
   * replaced with the real server ID once the POST succeeds.  If the request
   * fails the optimistic item is rolled back and an error is returned.
   */
  const addItem = useCallback(
    async (
      item: Omit<CartItem, "id" | "sort_order">
    ): Promise<{ ok: boolean; error?: string }> => {
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticItem: CartItem = { ...item, id: optimisticId, sort_order: 9999 };

      // Show the item immediately — total updates automatically via useMemo
      setItems((prev) => [...prev, optimisticItem]);

      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });

        const data = await res.json();

        if (res.ok) {
          const serverItem = data.item as { id: string; sort_order: number };
          // Swap the temp ID for the real server ID
          setItems((prev) =>
            prev.map((i) =>
              i.id === optimisticId
                ? { ...optimisticItem, id: serverItem.id, sort_order: serverItem.sort_order ?? 9999 }
                : i
            )
          );
          return { ok: true };
        }

        // Server rejected — roll back
        setItems((prev) => prev.filter((i) => i.id !== optimisticId));
        return { ok: false, error: data.error ?? "Failed to add item" };
      } catch {
        // Network error — roll back
        setItems((prev) => prev.filter((i) => i.id !== optimisticId));
        return { ok: false, error: "Network error. Please try again." };
      }
    },
    []
  );

  /**
   * Optimistically removes an item.  The item disappears instantly; the DELETE
   * fires in the background.  Total updates automatically via useMemo.
   */
  const removeItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/cart/items/${id}`, { method: "DELETE" });
  }, []);

  /**
   * Optimistically updates an item's unit/pricing fields.
   * Local state is updated immediately; the PATCH fires in the background.
   * Total updates automatically via useMemo.
   */
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
      // Apply update locally — total recomputes via useMemo
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));

      await fetch(`/api/cart/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    []
  );

  /**
   * Updates the preferred plan start date on the active cart.
   * Optimistically updates local state; reverts if the PATCH fails.
   */
  const updatePreferredStartDate = useCallback(async (date: string | null) => {
    const previousDate = preferredStartDate;
    setPreferredStartDate(date);
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferred_start_date: date }),
      });
      if (!res.ok) {
        setPreferredStartDate(previousDate);
      }
    } catch {
      setPreferredStartDate(previousDate);
    }
  }, [preferredStartDate]);

  return (
    <CartContext.Provider
      value={{ items, total, loading, cartId, preferredStartDate, addItem, removeItem, updateItem, updatePreferredStartDate, refresh }}
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
