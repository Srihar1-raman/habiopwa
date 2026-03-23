import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import ManifestHandler from "@/components/ManifestHandler";

export const metadata: Metadata = {
  title: "HABIO — Home Services Subscription",
  description: "Scheduled home services, managed seamlessly.",
  manifest: "/manifest-customer.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "habio",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192-customer.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512-customer.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="habio" />
        <meta name="theme-color" content="#0d9488" />
        
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-192-customer.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-192-customer.png" />
        
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/icon-120.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192-customer.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512-customer.png" />
      </head>
      <body className="antialiased bg-gray-50">
        <ManifestHandler />
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}