"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ManifestHandler() {
  const pathname = usePathname();

  useEffect(() => {
    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = "/manifest.json";
  }, [pathname]);

  return null;
}