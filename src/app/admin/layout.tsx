"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Users,
  ClipboardList,
  UserCog,
  MapPin,
  UsersRound,
  AlertTriangle,
  FileText,
  LogOut,
  Menu,
  X,
  Network,
} from "lucide-react";

interface StaffInfo {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  section?: string;
  items: NavItem[];
}

const ADMIN_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: <BarChart3 size={16} /> },
    ],
  },
  {
    section: "Customers",
    items: [
      { label: "All Customers", href: "/admin/customers", icon: <Users size={16} /> },
      { label: "Plan Requests", href: "/admin/customers/plan-requests", icon: <ClipboardList size={16} /> },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Staff Management", href: "/admin/operations/staff", icon: <UserCog size={16} /> },
      { label: "Manage Teams", href: "/admin/operations/manage-teams", icon: <Network size={16} /> },
      { label: "Locations", href: "/admin/operations/locations", icon: <MapPin size={16} /> },
      { label: "Provider Teams", href: "/admin/operations/provider-teams", icon: <UsersRound size={16} /> },
      { label: "Issue Tickets", href: "/admin/operations/issues", icon: <AlertTriangle size={16} /> },
    ],
  },
  {
    section: "Reports",
    items: [
      { label: "Daily Reports", href: "/admin/reports/daily", icon: <FileText size={16} /> },
    ],
  },
];

const OPS_LEAD_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: <BarChart3 size={16} /> },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Staff Management", href: "/admin/operations/staff", icon: <UserCog size={16} /> },
      { label: "Manage Teams", href: "/admin/operations/manage-teams", icon: <Network size={16} /> },
      { label: "Locations", href: "/admin/operations/locations", icon: <MapPin size={16} /> },
      { label: "Provider Teams", href: "/admin/operations/provider-teams", icon: <UsersRound size={16} /> },
      { label: "Issue Tickets", href: "/admin/operations/issues", icon: <AlertTriangle size={16} /> },
    ],
  },
  {
    section: "Reports",
    items: [
      { label: "Daily Reports", href: "/admin/reports/daily", icon: <FileText size={16} /> },
    ],
  },
];

const MANAGER_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: <BarChart3 size={16} /> },
    ],
  },
  {
    section: "Customers",
    items: [
      { label: "All Customers", href: "/admin/customers", icon: <Users size={16} /> },
      { label: "Plan Requests", href: "/admin/customers/plan-requests", icon: <ClipboardList size={16} /> },
    ],
  },
];

function getNavForRole(role: string): NavSection[] {
  if (role === "admin") return ADMIN_NAV;
  if (role === "ops_lead") return OPS_LEAD_NAV;
  if (role === "manager") return MANAGER_NAV;
  return [];
}

function roleBadgeColor(role: string) {
  const map: Record<string, string> = {
    admin: "bg-red-700",
    ops_lead: "bg-blue-700",
    manager: "bg-green-700",
    supervisor: "bg-yellow-700",
  };
  return map[role] ?? "bg-gray-700";
}

function SidebarContent({
  staff,
  pathname,
  onLogout,
  onClose,
}: {
  staff: StaffInfo | null;
  pathname: string;
  onLogout: () => void;
  onClose?: () => void;
}) {
  const nav = staff ? getNavForRole(staff.role) : [];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-700">
        <div className="w-8 h-8 rounded-lg bg-[#004aad] flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">H</span>
        </div>
        <span className="text-white font-bold text-base tracking-tight">HABIO Admin</span>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {nav.map((section, si) => (
          <div key={si} className={si > 0 ? "pt-3" : ""}>
            {section.section && (
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">
                {section.section}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {staff && (
        <div className="border-t border-gray-700 px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">
                {staff.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-sm font-medium truncate">{staff.name}</p>
              <span
                className={`text-xs px-1.5 py-0.5 rounded text-white ${roleBadgeColor(staff.role)}`}
              >
                {staff.role}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
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
  const [loading, setLoading] = useState(!isLoginPage);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoginPage) return;

    fetch("/api/admin/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/admin/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.staff) setStaff(data.staff);
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => setLoading(false));
  }, [isLoginPage, router]);

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  if (isLoginPage) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 shrink-0 fixed h-full z-20">
        <SidebarContent
          staff={staff}
          pathname={pathname}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-900 z-40 md:hidden transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          staff={staff}
          pathname={pathname}
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-dvh">
        {/* Mobile topbar */}
        <div className="md:hidden bg-gray-900 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-300 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <div className="w-6 h-6 rounded bg-[#004aad] flex items-center justify-center">
            <span className="text-white font-bold text-xs">H</span>
          </div>
          <span className="text-white font-semibold text-sm">HABIO Admin</span>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
