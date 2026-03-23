"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const manifestMap: Record<string, string> = {
  "/provider": "/manifest-provider.json",
  "/supervisor": "/manifest-supervisor.json",
  "/admin": "/manifest-admin.json",
  "/": "/manifest-customer.json",
};

export default function PWAHandler() {
  const pathname = usePathname();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("PWA Service Worker registered:", registration.scope);
        })
        .catch((error) => {
          console.error("PWA Service Worker registration failed:", error);
        });
    }
  }, []);

  useEffect(() => {
    const manifestPath = pathname === "/" 
      ? "/manifest-customer.json"
      : manifestMap[pathname] || "/manifest-customer.json";

    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = manifestPath;
  }, [pathname]);

  return null;
}