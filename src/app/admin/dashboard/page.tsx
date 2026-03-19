"use client";

import { useEffect, useState } from "react";
import {
  Users,
  ClipboardList,
  Clock,
  AlertTriangle,
  UserCog,
  Wrench,
} from "lucide-react";

interface DashboardStats {
  activeCustomers: number;
  activePlans: number;
  pendingRequests: number;
  openIssues: number;
  activeStaff: number;
  activeProviders: number;
}

const STAT_CARDS = [
  {
    key: "activeCustomers" as keyof DashboardStats,
    label: "Active Customers",
    icon: Users,
    accent: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    key: "activePlans" as keyof DashboardStats,
    label: "Active Plans",
    icon: ClipboardList,
    accent: "text-green-600",
    bg: "bg-green-50",
  },
  {
    key: "pendingRequests" as keyof DashboardStats,
    label: "Pending Requests",
    icon: Clock,
    accent: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  {
    key: "openIssues" as keyof DashboardStats,
    label: "Open Issues",
    icon: AlertTriangle,
    accent: "text-red-600",
    bg: "bg-red-50",
  },
  {
    key: "activeStaff" as keyof DashboardStats,
    label: "Active Staff",
    icon: UserCog,
    accent: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    key: "activeProviders" as keyof DashboardStats,
    label: "Active Providers",
    icon: Wrench,
    accent: "text-indigo-600",
    bg: "bg-indigo-50",
  },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Overview of HABIO operations</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, accent, bg }) => (
          <div key={key} className="rounded-xl shadow-sm bg-white p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={22} className={accent} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-3xl font-bold text-gray-900">
                  {stats ? stats[key].toLocaleString() : "—"}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
