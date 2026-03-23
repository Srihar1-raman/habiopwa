import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const pathname = new URL(request.url).pathname;
  
  const manifestMap: Record<string, object> = {
    "/provider": {
      name: "habioAssociate",
      short_name: "Associate",
      description: "HABIO Home Services - Provider App",
      start_url: "/provider",
      scope: "/provider",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0d9488",
      orientation: "portrait-primary",
      icons: [
        { src: "/icons/icon-192-provider.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512-provider.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512-provider-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    },
    "/supervisor": {
      name: "habioCaptain",
      short_name: "Captain",
      description: "HABIO Home Services - Supervisor App",
      start_url: "/supervisor",
      scope: "/supervisor",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0d9488",
      orientation: "portrait-primary",
      icons: [
        { src: "/icons/icon-192-supervisor.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512-supervisor.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512-supervisor-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    },
    "/admin": {
      name: "habio Admin",
      short_name: "Admin",
      description: "HABIO Home Services - Admin Portal",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0d9488",
      orientation: "portrait-primary",
      icons: [
        { src: "/icons/icon-192-admin.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512-admin.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512-admin-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    }
  };

  // Default customer manifest
  const defaultManifest = {
    name: "habio",
    short_name: "habio",
    description: "HABIO Home Services - Customer App",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192-customer.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-customer.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-customer-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };

  // Check if path starts with any known route
  for (const [route, manifest] of Object.entries(manifestMap)) {
    if (pathname.startsWith(route)) {
      return NextResponse.json(manifest, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }
  }

  return NextResponse.json(defaultManifest, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}