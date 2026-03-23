"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  User,
  Home,
  LogOut,
  Pencil,
  Save,
  X,
  CreditCard,
} from "lucide-react";
import { DOW_FULL_NAMES } from "@/lib/utils";

interface Profile {
  name: string;
  phone: string;
  flat_no: string;
  building: string;
  society: string;
  sector: string;
  city: string;
  pincode: string;
  home_type: string;
  bhk: string | number;
  bathrooms: string | number;
  people_count: string | number;
  diet_pref: string;
}

interface PlanItem {
  id: string;
  title: string;
  frequency_label: string;
  price_monthly: number;
  unit_type: string;
  unit_value: number;
  instances_per_month: number | null;
  preferred_start_time: string | null;
  scheduled_day_of_week: number | null;
  primary_provider: { id: string; name: string; provider_type: string | null } | null;
  backup_provider: { id: string; name: string; provider_type: string | null } | null;
}

interface PlanRequest {
  id: string;
  request_code: string;
  status: string;
  total_price_monthly: number;
  plan_start_date: string | null;
  plan_active_start_date: string | null;
  plan_active_end_date: string | null;
  plan_request_items: PlanItem[];
}

const FIELD_LABEL: Record<string, string> = {
  flat_no: "Flat No.",
  building: "Building",
  society: "Society",
  sector: "Sector",
  city: "City",
  pincode: "Pincode",
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [planRequest, setPlanRequest] = useState<PlanRequest | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/customer/profile").then((r) => r.json()),
      fetch("/api/plan/current").then((r) => r.json()),
    ]).then(([profileData, planData]) => {
      const customer = profileData.customer ?? null;
      if (customer) {
        const cp = customer.customer_profiles ?? {};
        setProfile({
          name: customer.name ?? "",
          phone: customer.phone ?? "",
          flat_no: cp.flat_no ?? "",
          building: cp.building ?? "",
          society: cp.society ?? "",
          sector: cp.sector ?? "",
          city: cp.city ?? "",
          pincode: cp.pincode ?? "",
          home_type: cp.home_type ?? "",
          bhk: cp.bhk ?? "",
          bathrooms: cp.bathrooms ?? "",
          diet_pref: cp.diet_pref ?? "",
          people_count: cp.people_count ?? "",
        });
      }
      const pr = planData.planRequest ?? null;
      if (pr?.status === "active") setPlanRequest(pr);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function startEdit() {
    if (!profile) return;
    setForm({
      name: profile.name,
      flat_no: profile.flat_no,
      building: profile.building,
      society: profile.society,
      sector: profile.sector,
      city: profile.city,
    });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setProfile((prev) => ({ ...prev!, ...(data.profile ?? data) }));
      setEditing(false);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-[480px] mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800 flex-1">My Profile</h1>
          {!editing && (
            <button onClick={startEdit} className="flex items-center gap-1 text-sm text-[#004aad] font-medium">
              <Pencil className="w-4 h-4" /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#004aad]" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Personal Info</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Name</p>
              {editing ? (
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                  value={form.name ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              ) : (
                <p className="text-sm font-medium text-gray-800">{profile?.name || "—"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Phone</p>
              <p className="text-sm font-medium text-gray-800">{profile?.phone || "—"}</p>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <Home className="w-4 h-4 text-[#004aad]" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Address</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["flat_no", "building", "society", "sector", "city"] as const).map((field) => (
              <div key={field}>
                <p className="text-xs text-gray-500 mb-1">{FIELD_LABEL[field]}</p>
                {editing ? (
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
                    value={(form as Record<string, string>)[field] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-800">{(profile as Record<string, string> | null)?.[field] || "—"}</p>
                )}
              </div>
            ))}
            <div>
              <p className="text-xs text-gray-500 mb-1">Pincode</p>
              <p className="text-sm font-medium text-gray-800">{profile?.pincode || "—"}</p>
            </div>
          </div>
        </div>

        {/* Home Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <Home className="w-4 h-4 text-[#004aad]" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Home Details</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Home Type", value: profile?.home_type },
              { label: "BHK", value: profile?.bhk },
              { label: "Bathrooms", value: profile?.bathrooms },
              { label: "People Count", value: profile?.people_count },
              { label: "Diet Preference", value: profile?.diet_pref },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-sm font-medium text-gray-800">{value ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Edit action buttons */}
        {editing && (
          <div className="space-y-2">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#004aad] text-white text-sm font-medium disabled:opacity-60"
              >
                <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Plan Details — only for active plans */}
        {planRequest && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-[#004aad]" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex-1">
                Plan Details
              </h2>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Plan Code</p>
                <p className="text-sm font-mono font-semibold text-[#004aad]">
                  {planRequest.request_code}
                </p>
              </div>
              {planRequest.plan_start_date && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Start Date</p>
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(planRequest.plan_start_date).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
              )}
              {planRequest.plan_active_end_date && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Active Until</p>
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(planRequest.plan_active_end_date).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Plan items */}
            <div className="space-y-2">
              {planRequest.plan_request_items.map((item) => {
                const scheduleText = item.frequency_label === "Daily"
                  ? `Daily${item.instances_per_month ? ` · ~${item.instances_per_month} visits/mo` : ""}${item.preferred_start_time ? ` · ${item.preferred_start_time}` : ""}`
                  : item.scheduled_day_of_week != null
                  ? `Weekly on ${DOW_FULL_NAMES[item.scheduled_day_of_week]}${item.preferred_start_time ? ` · ${item.preferred_start_time}` : ""}`
                  : `Weekly${item.preferred_start_time ? ` · ${item.preferred_start_time}` : ""}`;

                return (
                  <div
                    key={item.id}
                    className="border border-gray-100 rounded-xl p-3"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-medium text-gray-800">{item.title}</p>
                      <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                        ₹{item.price_monthly?.toLocaleString("en-IN")}
                        <span className="text-xs font-normal text-gray-400">/mo</span>
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">{scheduleText}</p>
                    {item.primary_provider && (
                      <p className="text-xs text-gray-500 mt-1">
                        Provider: <span className="font-medium text-gray-700">{item.primary_provider.name}</span>
                        {item.backup_provider && (
                          <span className="text-gray-400"> · Backup: {item.backup_provider.name}</span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
              <div className="px-3 py-2.5 border border-gray-100 rounded-xl bg-gray-50 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500">Total / month</span>
                <span className="text-sm font-bold text-[#004aad]">
                  ₹{planRequest.total_price_monthly?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 text-red-600 text-sm font-medium"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
