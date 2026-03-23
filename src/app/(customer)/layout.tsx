"use client";

import { CartProvider } from "@/contexts/CartContext";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="mobile-container">{children}</div>
    </CartProvider>
  );
}
