"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, User, Home, LogOut, Pencil, Save, X } from "lucide-react";

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
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/customer/profile")
      .then((r) => r.json())
      .then((data) => {
        // API returns { customer: { id, phone, name, customer_profiles: {...} } }
        const customer = data.customer ?? null;
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
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
    document.cookie = "habio_session=; Max-Age=0; path=/";
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
