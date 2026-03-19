/**
 * @fileoverview Admin layout — PR2 will add:
 * - Persistent left sidebar with navigation: Dashboard, Customers, Operations, Support
 * - Role-scoped sidebar items (admin sees all, ops_lead/manager see subset)
 * - Staff name + role badge in header
 * - Logout button
 * For now this is a minimal auth-guarded wrapper.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface StaffInfo {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  // Only show loading spinner when not on login page
  const [loading, setLoading] = useState(!isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    fetch("/api/admin/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/admin/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.staff) {
          setStaff(data.staff);
        }
      })
      .catch(() => {
        router.push("/admin/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isLoginPage, router]);

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  // On login page, render children directly
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 px-6 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#004aad] flex items-center justify-center">
          <span className="text-white font-bold text-sm">H</span>
        </div>
        <span className="text-white font-bold">HABIO Admin</span>
        {staff && (
          <span className="ml-2 text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
            {staff.name}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="ml-auto text-xs text-gray-400 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>

      <main>{children}</main>
    </div>
  );
}
