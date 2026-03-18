"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  ClipboardList,
  Users,
  Calendar,
  PauseCircle,
  Zap,
  AlertTriangle,
  BarChart3,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

function getLocalToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Tile {
  label: string;
  icon: React.ReactNode;
  href: string;
  countKey?: "households" | "newRequests";
  color: string;
}

const TILES: Tile[] = [
  {
    label: "Active Households",
    icon: <Home className="w-6 h-6" />,
    href: "/supervisor/households",
    countKey: "households",
    color: "text-blue-600 bg-blue-50",
  },
  {
    label: "New Requests",
    icon: <ClipboardList className="w-6 h-6" />,
    href: "/supervisor/new-requests",
    countKey: "newRequests",
    color: "text-orange-600 bg-orange-50",
  },
  {
    label: "Team",
    icon: <Users className="w-6 h-6" />,
    href: "/supervisor/team",
    color: "text-purple-600 bg-purple-50",
  },
  {
    label: "Schedule",
    icon: <Calendar className="w-6 h-6" />,
    href: "",
    color: "text-green-600 bg-green-50",
  },
  {
    label: "Pause Requests",
    icon: <PauseCircle className="w-6 h-6" />,
    href: "/supervisor/pause-requests",
    color: "text-yellow-600 bg-yellow-50",
  },
  {
    label: "On-Demand",
    icon: <Zap className="w-6 h-6" />,
    href: "/supervisor/on-demand-requests",
    color: "text-pink-600 bg-pink-50",
  },
  {
    label: "Issues",
    icon: <AlertTriangle className="w-6 h-6" />,
    href: "/supervisor/issues",
    color: "text-red-600 bg-red-50",
  },
  {
    label: "Day Report",
    icon: <BarChart3 className="w-6 h-6" />,
    href: "",
    color: "text-indigo-600 bg-indigo-50",
  },
];

const BANNERS = [
  {
    bg: "bg-[#004aad]",
    title: "Subscription Home Services",
    sub: "Daily cleaning, cooking & more — on a schedule",
    Icon: Home,
  },
  {
    bg: "bg-[#1a5fc9]",
    title: "Flexible Plans",
    sub: "Choose exactly what you need — change anytime",
    Icon: Sparkles,
  },
  {
    bg: "bg-[#0057cc]",
    title: "Verified Professionals",
    sub: "Background-checked helpers for your home",
    Icon: ShieldCheck,
  },
];

export default function SupervisorDashboardPage() {
  const router = useRouter();
  const [counts, setCounts] = useState<{ households?: number; newRequests?: number }>({});
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    bannerTimer.current = setInterval(() => {
      setActiveBanner((b) => (b + 1) % BANNERS.length);
    }, 4000);
    return () => { if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, []);

  useEffect(() => {
    fetch("/api/supervisor/households")
      .then((r) => r.json())
      .then((d) => setCounts((prev) => ({ ...prev, households: d.households?.length ?? d.count ?? 0 })))
      .catch(() => {});

    fetch("/api/supervisor/new-requests")
      .then((r) => r.json())
      .then((d) => setCounts((prev) => ({ ...prev, newRequests: d.requests?.length ?? d.count ?? 0 })))
      .catch(() => {});
  }, []);

  const displayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const banner = BANNERS[activeBanner];

  const tilesWithToday = TILES.map((t) => ({
    ...t,
    href:
      t.label === "Schedule" ? `/supervisor/schedule/${getLocalToday()}` :
      t.label === "Day Report" ? `/supervisor/day-report/${getLocalToday()}` :
      t.href,
  }));

  return (
    <div className="px-4 py-4 pb-8">
      {/* Auto-rotating banner */}
      <div className="mb-5">
        <div
          className={`${banner.bg} rounded-2xl px-5 py-8 text-white transition-all duration-500`}
        >
          <div className="mb-3">
            <banner.Icon className="w-10 h-10 text-white/80" />
          </div>
          <h2 className="text-xl font-bold leading-snug">{banner.title}</h2>
          <p className="text-sm text-blue-100 mt-1.5">{banner.sub}</p>
        </div>
        <div className="flex justify-center gap-1.5 mt-2">
          {BANNERS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activeBanner ? "bg-[#004aad] w-5" : "bg-gray-300 w-1.5"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Date banner */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{displayDate}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#004aad] flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Tile grid */}
      <div className="grid grid-cols-2 gap-3">
        {tilesWithToday.map((tile) => {
          const count = tile.countKey ? counts[tile.countKey] : undefined;
          return (
            <button
              key={tile.label}
              onClick={() => router.push(tile.href)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left active:scale-[0.97] transition-transform flex flex-col gap-2"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tile.color}`}>
                {tile.icon}
              </div>
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{tile.label}</p>
                {count !== undefined && count > 0 && (
                  <span className="flex-shrink-0 min-w-[22px] h-5 px-1.5 bg-[#004aad] text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
