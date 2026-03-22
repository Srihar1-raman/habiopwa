"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  User,
  Users,
  CalendarDays,
  AlertCircle,
  PauseCircle,
  ChevronRight,
} from "lucide-react";

const PLAN_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
  payment_pending: "bg-blue-100 text-blue-700",
  captain_review_pending: "bg-orange-100 text-orange-700",
  captain_allocation_pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-200 text-gray-700",
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-600",
  submitted: "bg-blue-100 text-blue-800",
};

const JOB_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-600",
  scheduled_delayed: "bg-orange-100 text-orange-600",
  in_progress: "bg-blue-100 text-blue-700",
  in_progress_delayed: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  completed_delayed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  cancelled_by_customer: "bg-red-100 text-red-600",
  service_on_pause: "bg-yellow-100 text-yellow-700",
  incomplete: "bg-red-200 text-red-800",
  status_not_marked: "bg-gray-100 text-gray-600",
};

interface PlanItem {
  id: string;
  title: string;
  frequency_label: string;
  price_monthly: number;
}

interface Provider {
  id: string;
  name: string;
  provider_type: string | null;
  recent_date: string | null;
  recent_status: string;
}

interface RecentJob {
  id: string;
  provider_name: string | null;
  provider_id: string | null;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  status: string;
}

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  created_at: string;
}

interface Pause {
  id: string;
  status: string;
  pause_start_date: string | null;
  pause_end_date: string | null;
  pause_days: number | null;
  reason: string | null;
  created_at: string;
}

interface HouseholdDetail {
  request_code: string;
  status: string;
  total_price_monthly: number;
  plan_start_date: string | null;
  flat_no: string | null;
  building: string | null;
  society: string | null;
  sector: string | null;
  city: string | null;
  pincode: string | null;
  phone: string;
  name: string | null;
  home_type: string | null;
  bhk: number | null;
  plan_request_items: PlanItem[];
  providers: Provider[];
  recentJobs: RecentJob[];
  tickets: Ticket[];
  pauses: Pause[];
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function subtractDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HouseholdDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planRequestId = params.planRequestId as string;

  const [detail, setDetail] = useState<HouseholdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [jobDateFilter, setJobDateFilter] = useState("");

  const load = useCallback(() => {
    fetch(`/api/supervisor/households/${planRequestId}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail(d.household ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [planRequestId]);

  useEffect(() => {
    load();
  }, [load]);

  const today = getToday();
  const threeDaysAgo = subtractDays(today, 2);

  const allJobsByDate = useMemo(
    () =>
      detail
        ? [...detail.recentJobs].sort(
            (a, b) => (b.scheduled_date ?? "").localeCompare(a.scheduled_date ?? "")
          )
        : [],
    [detail]
  );
  const past3DaysJobs = useMemo(
    () =>
      allJobsByDate.filter(
        (j) => j.scheduled_date && j.scheduled_date >= threeDaysAgo && j.scheduled_date <= today
      ),
    [allJobsByDate, threeDaysAgo, today]
  );

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="flex items-center px-4 pt-4 pb-2">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center text-gray-400">
        Household not found
      </div>
    );
  }
  const filteredJobs = jobDateFilter
    ? allJobsByDate.filter((j) => j.scheduled_date === jobDateFilter)
    : showAllJobs
    ? allJobsByDate
    : past3DaysJobs;

  return (
    <div className="flex flex-col min-h-dvh pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <p className="text-xs font-mono text-[#004aad] font-semibold">{detail.request_code}</p>
          <h1 className="text-base font-bold text-gray-900">
            {detail.name ?? "Household Detail"}
          </h1>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            PLAN_STATUS_COLORS[detail.status] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {detail.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="px-4 mt-3 flex flex-col gap-4">

        {/* Card 1 — Plan Overview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Plan Overview
            </h2>
            <span className="text-sm font-bold text-[#004aad]">
              ₹{detail.total_price_monthly?.toLocaleString("en-IN")}/m
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <InfoRow label="Request Code" value={detail.request_code} />
            <InfoRow
              label="Start Date"
              value={
                detail.plan_start_date
                  ? new Date(detail.plan_start_date).toLocaleDateString("en-IN")
                  : null
              }
            />
          </div>

          {/* Plan items table */}
          {detail.plan_request_items?.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 grid grid-cols-[1fr_auto_auto] gap-2 text-xs font-semibold text-gray-500">
                <span>Service</span>
                <span className="text-center">Freq.</span>
                <span className="text-right">Price</span>
              </div>
              {detail.plan_request_items.map((item) => (
                <div
                  key={item.id}
                  className="px-3 py-2.5 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-gray-50 items-start"
                >
                  <p className="text-sm font-medium text-gray-800 leading-snug">{item.title}</p>
                  <p className="text-xs text-gray-400 text-center whitespace-nowrap">
                    {item.frequency_label}
                  </p>
                  <p className="text-sm font-semibold text-gray-700 text-right whitespace-nowrap">
                    ₹{item.price_monthly?.toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
              <div className="px-3 py-2.5 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500">Total / month</span>
                <span className="text-sm font-bold text-[#004aad]">
                  ₹{detail.total_price_monthly?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Card 2 — Customer Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-[#004aad]" />
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Customer Info
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Name" value={detail.name} />
            <InfoRow label="Phone" value={detail.phone} />
            <InfoRow label="Flat No" value={detail.flat_no} />
            <InfoRow label="Building" value={detail.building} />
            <InfoRow label="Society" value={detail.society} />
            <InfoRow label="Sector" value={detail.sector} />
            <InfoRow label="City" value={detail.city} />
            <InfoRow label="Pincode" value={detail.pincode} />
            <InfoRow label="Home Type" value={detail.home_type} />
            <InfoRow label="BHK" value={detail.bhk ? String(detail.bhk) : null} />
          </div>
        </div>

        {/* Card 3 — Providers */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#004aad]" />
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1">
              Providers
            </h2>
            <span className="text-xs text-gray-400">{detail.providers.length} total</span>
          </div>
          {detail.providers.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">No providers assigned yet</p>
          ) : (
            detail.providers.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/supervisor/team/${p.id}`)}
                className="w-full px-4 py-3 border-b border-gray-50 last:border-0 flex items-center justify-between hover:bg-gray-50 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-[#004aad]">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.provider_type && (
                      <span className="text-xs text-gray-400">{p.provider_type}</span>
                    )}
                    {p.recent_date && (
                      <span className="text-xs text-gray-400">
                        · Last:{" "}
                        {new Date(p.recent_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      JOB_STATUS_COLORS[p.recent_status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {p.recent_status.replace(/_/g, " ")}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Card 4 — Past Jobs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#004aad]" />
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1">
              {showAllJobs || jobDateFilter ? "All Jobs" : "Past 3 Days Jobs"}
            </h2>
            <input
              type="date"
              value={jobDateFilter}
              onChange={(e) => { setJobDateFilter(e.target.value); setShowAllJobs(false); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#004aad]/30"
            />
          </div>
          {filteredJobs.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">No jobs in this period</p>
          ) : (
            <>
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {job.scheduled_start_time && (
                        <span className="text-xs font-bold text-[#004aad] flex-shrink-0">
                          {job.scheduled_start_time.slice(0, 5)}
                        </span>
                      )}
                      {job.scheduled_date && (
                        <span className="text-xs text-gray-500">
                          {new Date(job.scheduled_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {job.provider_name ?? "Unassigned"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      JOB_STATUS_COLORS[job.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {job.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
              {!showAllJobs && !jobDateFilter && detail.recentJobs.length > past3DaysJobs.length && (
                <button
                  onClick={() => setShowAllJobs(true)}
                  className="w-full px-4 py-3 text-xs text-[#004aad] font-semibold text-center border-t border-gray-50 hover:bg-blue-50"
                >
                  See all {detail.recentJobs.length} jobs
                </button>
              )}
              {(showAllJobs || jobDateFilter) && (
                <button
                  onClick={() => { setShowAllJobs(false); setJobDateFilter(""); }}
                  className="w-full px-4 py-3 text-xs text-gray-500 text-center border-t border-gray-50 hover:bg-gray-50"
                >
                  Show less
                </button>
              )}
            </>
          )}
        </div>

        {/* Card 5 — Tickets & Pauses */}
        {(detail.tickets.length > 0 || detail.pauses.length > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#004aad]" />
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Tickets &amp; Pauses
              </h2>
            </div>

            {detail.tickets.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Issue Tickets
                </p>
                {detail.tickets.map((t) => (
                  <div
                    key={t.id}
                    className="px-4 py-3 border-b border-gray-50 flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(t.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                        {t.priority && ` · ${t.priority}`}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        t.status === "open"
                          ? "bg-red-50 text-red-600"
                          : "bg-orange-50 text-orange-600"
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {detail.pauses.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <PauseCircle className="w-3.5 h-3.5" /> Pause Requests
                </p>
                {detail.pauses.map((p) => (
                  <div
                    key={p.id}
                    className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {p.pause_start_date && p.pause_end_date
                          ? `${new Date(p.pause_start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — ${new Date(p.pause_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                          : p.pause_days
                          ? `${p.pause_days} day${p.pause_days > 1 ? "s" : ""}`
                          : "Pause"}
                      </p>
                      {p.reason && (
                        <p className="text-xs text-gray-400 mt-0.5">{p.reason}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        p.status === "approved"
                          ? "bg-green-50 text-green-600"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
