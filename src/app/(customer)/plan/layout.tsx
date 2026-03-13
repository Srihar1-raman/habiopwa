"use client";

import { CartProvider } from "@/contexts/CartContext";

export default function PlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CartProvider>{children}</CartProvider>;
}
