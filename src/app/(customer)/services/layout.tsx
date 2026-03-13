"use client";

import { CartProvider } from "@/contexts/CartContext";

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CartProvider>{children}</CartProvider>;
}
