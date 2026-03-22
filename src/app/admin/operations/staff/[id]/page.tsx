"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Save } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaffDetail {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  location_id: string | null;
  reports_to: string | null;
  aadhaar: string | null;
  address: string | null;
  permanent_address: string | null;
  location_name: string | null;
  location_city: string | null;
  reports_to_name: string | null;
}

interface ProviderDetail {
  id: string;
  name: string;
  phone: string;
  provider_type: string;
  status: string;
  location_id: string | null;
  aadhaar: string | null;
  address: string | null;
  permanent_address: string | null;
  notes: string | null;
  location_name: string | null;
  location_city: string | null;
  supervisor_id: string | null;
  supervisor_name: string | null;
}

interface Location {
  id: string;
  name: string;
  city: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface WeekOff {
  id: string;
  day_of_week: string;
  effective_from: string;
  effective_to: string | null;
}

interface LeaveRequest {
  id: string;
  leave_start_date: string;
  leave_end_date: string;
  leave_type: string | null;
  status: string;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ops_lead: "bg-blue-100 text-blue-700",
  manager: "bg-green-100 text-green-700",
  supervisor: "bg-yellow-100 text-yellow-700",
};

const ROLE_LABELS: Record<string, string> = {
  ops_lead: "Operations Lead",
  manager: "Manager",
  supervisor: "Supervisor",
  housekeeping: "Housekeeping",
  kitchen: "Kitchen",
  car_care: "Car Care",
  garden_care: "Garden Care",
  technician_electrical: "Electrician",
  technician_plumber: "Plumber",
  technician_carpenter: "Carpenter",
  technician_ro: "RO Technician",
  technician_ac: "AC Technician",
};

function getProviderTypeColor(pt: string): string {
  if (pt.startsWith("technician_")) return "bg-red-100 text-red-700";
  const map: Record<string, string> = {
    housekeeping: "bg-purple-100 text-purple-700",
    kitchen: "bg-orange-100 text-orange-700",
    car_care: "bg-teal-100 text-teal-700",
    garden_care: "bg-emerald-100 text-emerald-700",
  };
  return map[pt] ?? "bg-gray-100 text-gray-500";
}

const LEAVE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

// ─── Shared field components ──────────────────────────────────────────────────

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]";
const selectCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]";
const textareaCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad] resize-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function LabelledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PersonnelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = searchParams.get("type") as "staff" | "provider" | null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Staff
  const [staffData, setStaffData] = useState<StaffDetail | null>(null);
  const [staffForm, setStaffForm] = useState<Partial<StaffDetail>>({});

  // Provider
  const [providerData, setProviderData] = useState<ProviderDetail | null>(null);
  const [providerForm, setProviderForm] = useState<Partial<ProviderDetail>>({});

  // Shared
  const [locations, setLocations] = useState<Location[]>([]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);

  // Leave management
  const [weekOffs, setWeekOffs] = useState<WeekOff[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

  // New week-off form
  const [showWoffForm, setShowWoffForm] = useState(false);
  const [woffForm, setWoffForm] = useState({
    day_of_week: "monday",
    effective_from: new Date().toISOString().split("T")[0],
    effective_to: "",
  });
  const [woffSaving, setWoffSaving] = useState(false);
  const [woffError, setWoffError] = useState<string | null>(null);

  // New leave form
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_start_date: "",
    leave_end_date: "",
    leave_type: "sick",
  });
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const loadWeekOffs = useCallback(async () => {
    const r = await fetch(`/api/admin/providers/${id}/week-offs`);
    const d = await r.json();
    if (!d.error) setWeekOffs(d.weekOffs ?? []);
  }, [id]);

  const loadLeaves = useCallback(async () => {
    const r = await fetch(`/api/admin/providers/${id}/leaves`);
    const d = await r.json();
    if (!d.error) setLeaves(d.leaves ?? []);
  }, [id]);

  useEffect(() => {
    if (!type) return;
    setLoading(true);

    const fetches: Promise<unknown>[] = [
      fetch("/api/admin/locations").then((r) => r.json()),
      fetch("/api/admin/staff").then((r) => r.json()),
    ];

    if (type === "staff") {
      fetches.push(fetch(`/api/admin/staff/${id}`).then((r) => r.json()));
    } else {
      fetches.push(fetch(`/api/admin/providers/${id}`).then((r) => r.json()));
    }

    Promise.all(fetches)
      .then(([locData, staffListData, detailData]) => {
        const locD = locData as { locations?: Location[]; error?: string };
        const sLD = staffListData as { staff?: StaffMember[]; error?: string };
        if (!locD.error) setLocations(locD.locations ?? []);
        if (!sLD.error) setAllStaff(sLD.staff ?? []);

        if (type === "staff") {
          const d = detailData as { staff?: StaffDetail; error?: string };
          if (d.error) { setError(d.error); return; }
          setStaffData(d.staff ?? null);
          setStaffForm(d.staff ?? {});
        } else {
          const d = detailData as { provider?: ProviderDetail; error?: string };
          if (d.error) { setError(d.error); return; }
          setProviderData(d.provider ?? null);
          setProviderForm(d.provider ?? {});
          // load leave data
          loadWeekOffs();
          loadLeaves();
        }
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, [id, type, loadWeekOffs, loadLeaves]);

  async function saveStaff() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: staffForm.name,
          email: staffForm.email,
          status: staffForm.status,
          location_id: staffForm.location_id,
          reports_to: staffForm.reports_to,
          aadhaar: staffForm.aadhaar,
          address: staffForm.address,
          permanent_address: staffForm.permanent_address,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Failed to save"); return; }
      setStaffData((prev) => (prev ? { ...prev, ...data.staff } : prev));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function saveProvider() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/admin/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: providerForm.name,
          status: providerForm.status,
          location_id: providerForm.location_id,
          aadhaar: providerForm.aadhaar,
          address: providerForm.address,
          permanent_address: providerForm.permanent_address,
          notes: providerForm.notes,
          supervisor_id: providerForm.supervisor_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Failed to save"); return; }
      setProviderData((prev) => (prev ? { ...prev, ...data.provider } : prev));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function addWeekOff() {
    setWoffSaving(true);
    setWoffError(null);
    try {
      const res = await fetch(`/api/admin/providers/${id}/week-offs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day_of_week: woffForm.day_of_week,
          effective_from: woffForm.effective_from,
          effective_to: woffForm.effective_to || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setWoffError(data.error ?? "Failed to add"); return; }
      setShowWoffForm(false);
      loadWeekOffs();
    } catch {
      setWoffError("Network error");
    } finally {
      setWoffSaving(false);
    }
  }

  async function endWeekOff(woffId: string) {
    const today = new Date().toISOString().split("T")[0];
    await fetch(`/api/admin/providers/${id}/week-offs/${woffId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ effective_to: today }),
    });
    loadWeekOffs();
  }

  async function addLeave() {
    setLeaveSaving(true);
    setLeaveError(null);
    try {
      const res = await fetch(`/api/admin/providers/${id}/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_start_date: leaveForm.leave_start_date,
          leave_end_date: leaveForm.leave_end_date,
          leave_type: leaveForm.leave_type,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setLeaveError(data.error ?? "Failed to add"); return; }
      setShowLeaveForm(false);
      loadLeaves();
    } catch {
      setLeaveError("Network error");
    } finally {
      setLeaveSaving(false);
    }
  }

  async function updateLeaveStatus(leaveId: string, status: "approved" | "rejected") {
    await fetch(`/api/admin/providers/${id}/leaves/${leaveId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadLeaves();
  }

  const supervisors = allStaff.filter((s) => s.role === "supervisor" && s.status === "active");
  const managers = allStaff.filter((s) => s.role === "manager" && s.status === "active");
  const opsLeads = allStaff.filter((s) => s.role === "ops_lead" && s.status === "active");

  function reportsToOptions() {
    if (staffData?.role === "supervisor") return managers;
    if (staffData?.role === "manager") return opsLeads;
    return [];
  }

  if (!type) {
    return (
      <div className="p-6 text-gray-500">Invalid URL — missing ?type=staff or ?type=provider</div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back nav */}
      <button
        onClick={() => router.push("/admin/operations/staff")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#004aad] transition-colors"
      >
        <ChevronLeft size={16} /> Back to Personnel
      </button>

      {type === "staff" && staffData && (
        <>
          <Section title="Staff Profile">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Name */}
              <LabelledField label="Full Name">
                <input
                  value={staffForm.name ?? ""}
                  onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                />
              </LabelledField>

              {/* Phone (read-only) */}
              <LabelledField label="Phone">
                <input value={staffData.phone} readOnly className={`${inputCls} bg-gray-50 text-gray-500`} />
              </LabelledField>

              {/* Email */}
              <LabelledField label="Email">
                <input
                  type="email"
                  value={staffForm.email ?? ""}
                  onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputCls}
                />
              </LabelledField>

              {/* Role badge */}
              <LabelledField label="Role">
                <div className="pt-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[staffData.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {ROLE_LABELS[staffData.role] ?? staffData.role}
                  </span>
                </div>
              </LabelledField>

              {/* Status */}
              <LabelledField label="Status">
                <select
                  value={staffForm.status ?? "active"}
                  onChange={(e) => setStaffForm((f) => ({ ...f, status: e.target.value }))}
                  className={selectCls}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </LabelledField>

              {/* Location */}
              <LabelledField label="Location">
                <select
                  value={staffForm.location_id ?? ""}
                  onChange={(e) => setStaffForm((f) => ({ ...f, location_id: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">— None —</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}, {l.city}</option>
                  ))}
                </select>
              </LabelledField>

              {/* Reports To */}
              {staffData.role !== "ops_lead" && (
                <LabelledField label={staffData.role === "supervisor" ? "Reports To (Manager)" : "Reports To (Ops Lead)"}>
                  <select
                    value={staffForm.reports_to ?? ""}
                    onChange={(e) => setStaffForm((f) => ({ ...f, reports_to: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">— None —</option>
                    {reportsToOptions().map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </LabelledField>
              )}

              {/* Aadhaar */}
              <LabelledField label="Aadhaar Number">
                <input
                  value={staffForm.aadhaar ?? ""}
                  onChange={(e) => setStaffForm((f) => ({ ...f, aadhaar: e.target.value }))}
                  placeholder="12-digit Aadhaar"
                  className={inputCls}
                />
              </LabelledField>
            </div>

            {/* Address fields */}
            <div className="space-y-4 mb-6">
              <LabelledField label="Address / Current Address">
                <textarea
                  rows={2}
                  value={staffForm.address ?? ""}
                  onChange={(e) => setStaffForm((f) => ({ ...f, address: e.target.value }))}
                  className={textareaCls}
                />
              </LabelledField>
              <LabelledField label="Permanent Address">
                <textarea
                  rows={2}
                  value={staffForm.permanent_address ?? ""}
                  onChange={(e) => setStaffForm((f) => ({ ...f, permanent_address: e.target.value }))}
                  className={textareaCls}
                />
              </LabelledField>
            </div>

            {saveError && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {saveError}
              </p>
            )}
            {saveSuccess && (
              <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                ✓ Saved successfully
              </p>
            )}

            <button
              onClick={saveStaff}
              disabled={saving}
              className="flex items-center gap-2 bg-[#004aad] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 hover:bg-[#003a8c] transition-colors"
            >
              <Save size={15} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </Section>
        </>
      )}

      {type === "provider" && providerData && (
        <>
          <Section title="Provider Profile">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Name */}
              <LabelledField label="Full Name">
                <input
                  value={providerForm.name ?? ""}
                  onChange={(e) => setProviderForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                />
              </LabelledField>

              {/* Phone (read-only) */}
              <LabelledField label="Phone">
                <input value={providerData.phone} readOnly className={`${inputCls} bg-gray-50 text-gray-500`} />
              </LabelledField>

              {/* Provider type badge (read-only) */}
              <LabelledField label="Provider Type">
                <div className="pt-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getProviderTypeColor(providerData.provider_type)}`}>
                    {ROLE_LABELS[providerData.provider_type] ?? providerData.provider_type}
                  </span>
                </div>
              </LabelledField>

              {/* Status */}
              <LabelledField label="Status">
                <select
                  value={providerForm.status ?? "available"}
                  onChange={(e) => setProviderForm((f) => ({ ...f, status: e.target.value }))}
                  className={selectCls}
                >
                  <option value="available">Available</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </LabelledField>

              {/* Location */}
              <LabelledField label="Location">
                <select
                  value={providerForm.location_id ?? ""}
                  onChange={(e) => setProviderForm((f) => ({ ...f, location_id: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">— None —</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}, {l.city}</option>
                  ))}
                </select>
              </LabelledField>

              {/* Supervisor */}
              <LabelledField label="Assigned Supervisor">
                <select
                  value={providerForm.supervisor_id ?? ""}
                  onChange={(e) => setProviderForm((f) => ({ ...f, supervisor_id: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">— None —</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </LabelledField>

              {/* Aadhaar */}
              <LabelledField label="Aadhaar Number">
                <input
                  value={providerForm.aadhaar ?? ""}
                  onChange={(e) => setProviderForm((f) => ({ ...f, aadhaar: e.target.value }))}
                  placeholder="12-digit Aadhaar"
                  className={inputCls}
                />
              </LabelledField>
            </div>

            {/* Address fields */}
            <div className="space-y-4 mb-4">
              <LabelledField label="Address / Current Address">
                <textarea
                  rows={2}
                  value={providerForm.address ?? ""}
                  onChange={(e) => setProviderForm((f) => ({ ...f, address: e.target.value }))}
                  className={textareaCls}
                />
              </LabelledField>
              <LabelledField label="Permanent Address">
                <textarea
                  rows={2}
                  value={providerForm.permanent_address ?? ""}
                  onChange={(e) => setProviderForm((f) => ({ ...f, permanent_address: e.target.value }))}
                  className={textareaCls}
                />
              </LabelledField>
              <LabelledField label="Notes / Specialization">
                <textarea
                  rows={3}
                  value={providerForm.notes ?? ""}
                  onChange={(e) => setProviderForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Any specialization or notes…"
                  className={textareaCls}
                />
              </LabelledField>
            </div>

            {saveError && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {saveError}
              </p>
            )}
            {saveSuccess && (
              <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                ✓ Saved successfully
              </p>
            )}

            <button
              onClick={saveProvider}
              disabled={saving}
              className="flex items-center gap-2 bg-[#004aad] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 hover:bg-[#003a8c] transition-colors"
            >
              <Save size={15} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </Section>

          {/* ── Weekly Offs ── */}
          <Section title="Weekly Offs">
            <div className="space-y-2 mb-4">
              {weekOffs.length === 0 && (
                <p className="text-sm text-gray-400">No weekly offs configured.</p>
              )}
              {weekOffs.map((wo) => (
                <div key={wo.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <span className="text-sm font-medium capitalize text-gray-800">{wo.day_of_week}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      from {wo.effective_from}
                      {wo.effective_to ? ` to ${wo.effective_to}` : " (ongoing)"}
                    </span>
                  </div>
                  {!wo.effective_to && (
                    <button
                      onClick={() => endWeekOff(wo.id)}
                      className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded-md transition-colors"
                    >
                      End
                    </button>
                  )}
                </div>
              ))}
            </div>

            {showWoffForm ? (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Day of Week</label>
                    <select
                      value={woffForm.day_of_week}
                      onChange={(e) => setWoffForm((f) => ({ ...f, day_of_week: e.target.value }))}
                      className={selectCls}
                    >
                      {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map((d) => (
                        <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Effective From</label>
                    <input
                      type="date"
                      value={woffForm.effective_from}
                      onChange={(e) => setWoffForm((f) => ({ ...f, effective_from: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Effective To (optional)</label>
                    <input
                      type="date"
                      value={woffForm.effective_to}
                      onChange={(e) => setWoffForm((f) => ({ ...f, effective_to: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>
                {woffError && (
                  <p className="text-red-600 text-xs">{woffError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={addWeekOff}
                    disabled={woffSaving}
                    className="px-4 py-1.5 bg-[#004aad] text-white text-sm rounded-lg disabled:opacity-60"
                  >
                    {woffSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => { setShowWoffForm(false); setWoffError(null); }}
                    className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowWoffForm(true)}
                className="text-sm text-[#004aad] hover:underline font-medium"
              >
                + Add Weekly Off
              </button>
            )}
          </Section>

          {/* ── Leave Requests ── */}
          <Section title="Leave Requests">
            <div className="space-y-2 mb-4">
              {leaves.length === 0 && (
                <p className="text-sm text-gray-400">No leave requests.</p>
              )}
              {leaves.map((lv) => (
                <div key={lv.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      {lv.leave_start_date} → {lv.leave_end_date}
                    </span>
                    {lv.leave_type && (
                      <span className="text-xs text-gray-500 ml-2">({lv.leave_type})</span>
                    )}
                    <div className="mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEAVE_STATUS_COLORS[lv.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {lv.status}
                      </span>
                    </div>
                  </div>
                  {lv.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateLeaveStatus(lv.id, "approved")}
                        className="text-xs text-green-600 hover:text-green-800 border border-green-200 px-2 py-1 rounded-md transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateLeaveStatus(lv.id, "rejected")}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded-md transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {showLeaveForm ? (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={leaveForm.leave_start_date}
                      onChange={(e) => setLeaveForm((f) => ({ ...f, leave_start_date: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={leaveForm.leave_end_date}
                      onChange={(e) => setLeaveForm((f) => ({ ...f, leave_end_date: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Leave Type</label>
                    <select
                      value={leaveForm.leave_type}
                      onChange={(e) => setLeaveForm((f) => ({ ...f, leave_type: e.target.value }))}
                      className={selectCls}
                    >
                      <option value="sick">Sick</option>
                      <option value="casual">Casual</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>
                </div>
                {leaveError && (
                  <p className="text-red-600 text-xs">{leaveError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={addLeave}
                    disabled={leaveSaving}
                    className="px-4 py-1.5 bg-[#004aad] text-white text-sm rounded-lg disabled:opacity-60"
                  >
                    {leaveSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => { setShowLeaveForm(false); setLeaveError(null); }}
                    className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowLeaveForm(true)}
                className="text-sm text-[#004aad] hover:underline font-medium"
              >
                + Add Leave Request
              </button>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
