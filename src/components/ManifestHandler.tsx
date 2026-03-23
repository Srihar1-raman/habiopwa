"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ManifestHandler() {
  const pathname = usePathname();

  useEffect(() => {
    const getManifestUrl = () => {
      if (pathname.startsWith("/provider")) return "/manifest.json?role=provider";
      if (pathname.startsWith("/supervisor")) return "/manifest.json?role=supervisor";
      if (pathname.startsWith("/admin")) return "/manifest.json?role=admin";
      return "/manifest.json";
    };

    const manifestPath = getManifestUrl();
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