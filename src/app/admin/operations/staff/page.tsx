"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronDown, X, ChevronLeft, UserCog, Wrench } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Personnel {
  person_type: "staff" | "provider";
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string | null;
  status: string;
  location_id: string | null;
  location_name: string | null;
  reports_to_name: string | null;
  provider_type: string | null;
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

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ops_lead: "bg-blue-100 text-blue-700",
  manager: "bg-green-100 text-green-700",
  supervisor: "bg-yellow-100 text-yellow-700",
  housekeeping: "bg-purple-100 text-purple-700",
  kitchen: "bg-orange-100 text-orange-700",
  car_care: "bg-teal-100 text-teal-700",
  garden_care: "bg-emerald-100 text-emerald-700",
};

function getRoleColor(key: string | null): string {
  if (!key) return "bg-gray-100 text-gray-500";
  if (key.startsWith("technician_")) return "bg-red-100 text-red-700";
  return ROLE_COLORS[key] ?? "bg-gray-100 text-gray-500";
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  available: "bg-green-100 text-green-700",
  on_leave: "bg-amber-100 text-amber-700",
  inactive: "bg-gray-100 text-gray-500",
};

const ROLE_LABELS: Record<string, string> = {
  ops_lead: "Ops Lead",
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

const PROVIDER_TYPES = [
  { value: "housekeeping", label: "Housekeeping" },
  { value: "kitchen", label: "Kitchen" },
  { value: "car_care", label: "Car Care" },
  { value: "garden_care", label: "Garden Care" },
  { value: "technician_electrical", label: "Electrician" },
  { value: "technician_plumber", label: "Plumber" },
  { value: "technician_carpenter", label: "Carpenter" },
  { value: "technician_ro", label: "RO Technician" },
  { value: "technician_ac", label: "AC Technician" },
];

const FILTER_OPTIONS = [
  { value: "", label: "All Personnel" },
  { value: "ops_lead", label: "Ops Lead" },
  { value: "manager", label: "Manager" },
  { value: "supervisor", label: "Supervisor" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "kitchen", label: "Kitchen" },
  { value: "car_care", label: "Car Care" },
  { value: "garden_care", label: "Garden Care" },
  { value: "technician_electrical", label: "Electrician" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// TODO: Replace with real OTP generation/delivery before production.
const HARDCODED_OTP = "1234";

// ─── Input helper ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]";
const selectCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]";
const textareaCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad] resize-none";

// ─── Multi-step modal ─────────────────────────────────────────────────────────

type ModalFlow = "staff" | "provider";

interface ModalState {
  flow: ModalFlow | null;
  step: number;
  // shared
  phone: string;
  otpDigits: string[];
  otpSent: boolean;
  otpVerified: boolean;
  // staff
  role: string;
  name: string;
  email: string;
  password: string;
  aadhaar: string;
  address: string;
  permanentAddress: string;
  locationId: string;
  reportsTo: string;
  // provider
  providerType: string;
  supervisorId: string;
  notes: string;
}

const initialModal: ModalState = {
  flow: null,
  step: 0,
  phone: "",
  otpDigits: ["", "", "", ""],
  otpSent: false,
  otpVerified: false,
  role: "supervisor",
  name: "",
  email: "",
  password: "",
  aadhaar: "",
  address: "",
  permanentAddress: "",
  locationId: "",
  reportsTo: "",
  providerType: "housekeeping",
  supervisorId: "",
  notes: "",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function StaffManagementPage() {
  const router = useRouter();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(initialModal);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  function loadData() {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/all-personnel").then((r) => r.json()),
      fetch("/api/admin/locations").then((r) => r.json()),
      fetch("/api/admin/staff").then((r) => r.json()),
    ])
      .then(([pData, locData, staffData]) => {
        if (pData.error) setError(pData.error);
        else setPersonnel(pData.personnel ?? []);
        if (!locData.error) setLocations(locData.locations ?? []);
        if (!staffData.error) setAllStaff(staffData.staff ?? []);
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = personnel.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(search);

    if (!matchSearch) return false;

    if (!filter) return true;
    if (filter === "active" || filter === "inactive") return p.status === filter;
    if (p.person_type === "staff") return p.role === filter;
    return p.provider_type === filter;
  });

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openModal() {
    setModal(initialModal);
    setModalError(null);
    setSaving(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModal(initialModal);
    setModalError(null);
    setModalOpen(false);
  }

  function totalSteps() {
    return modal.flow === "provider" ? 6 : 5;
  }

  function handleOtpInput(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...modal.otpDigits];
    next[idx] = val;
    setModal((m) => ({ ...m, otpDigits: next }));
    if (val && idx < 3) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !modal.otpDigits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  function sendOtp() {
    if (!modal.phone || modal.phone.length < 10) {
      setModalError("Enter a valid 10-digit phone number");
      return;
    }
    setModalError(null);
    setModal((m) => ({ ...m, otpSent: true, otpDigits: ["", "", "", ""] }));
  }

  function verifyOtp() {
    const entered = modal.otpDigits.join("");
    if (entered !== HARDCODED_OTP) {
      setModalError("Invalid OTP. (Hint: use 1234)");
      return;
    }
    setModalError(null);
    setModal((m) => ({ ...m, otpVerified: true, step: m.step + 1 }));
  }

  function nextStep() {
    setModalError(null);
    setModal((m) => ({ ...m, step: m.step + 1 }));
  }

  function prevStep() {
    setModalError(null);
    setModal((m) => ({ ...m, step: m.step - 1 }));
  }

  // Supervisors filtered for reports-to
  const supervisors = allStaff.filter((s) => s.role === "supervisor" && s.status === "active");
  const managers = allStaff.filter((s) => s.role === "manager" && s.status === "active");
  const opsLeads = allStaff.filter((s) => s.role === "ops_lead" && s.status === "active");
  const admins = allStaff.filter((s) => s.role === "admin" && s.status === "active");

  function reportsToOptions() {
    if (modal.role === "ops_lead") return admins;
    if (modal.role === "supervisor") return managers;
    if (modal.role === "manager") return opsLeads;
    return [];
  }

  async function handleSubmit() {
    setSaving(true);
    setModalError(null);
    try {
      if (modal.flow === "staff") {
        const body: Record<string, string> = {
          name: modal.name,
          phone: modal.phone,
          role: modal.role,
          location_id: modal.locationId,
          reports_to: modal.reportsTo,
          aadhaar: modal.aadhaar,
          address: modal.address,
          permanent_address: modal.permanentAddress,
        };
        if (modal.role !== "supervisor") {
          body.email = modal.email;
          body.password = modal.password;
        }
        const res = await fetch("/api/admin/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setModalError(data.error ?? "Failed to create staff"); return; }
      } else {
        const body = {
          name: modal.name,
          phone: modal.phone,
          provider_type: modal.providerType,
          location_id: modal.locationId || null,
          aadhaar: modal.aadhaar || null,
          address: modal.address || null,
          permanent_address: modal.permanentAddress || null,
          notes: modal.notes || null,
          supervisor_id: modal.supervisorId || null,
        };
        const res = await fetch("/api/admin/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setModalError(data.error ?? "Failed to create provider"); return; }
      }
      closeModal();
      loadData();
    } catch {
      setModalError("Network error");
    } finally {
      setSaving(false);
    }
  }

  // ── Step validation ───────────────────────────────────────────────────────

  function canProceed(): boolean {
    if (modal.flow === null) return false;
    if (modal.step === 0) return modal.otpVerified;
    if (modal.flow === "staff") {
      if (modal.step === 1) return !!modal.role;
      if (modal.step === 2) {
        if (!modal.name) return false;
        if (modal.role !== "supervisor" && (!modal.email || !modal.password)) return false;
        return true;
      }
      return true;
    } else {
      if (modal.step === 1) return !!modal.providerType;
      if (modal.step === 2) return !!modal.name;
      return true;
    }
  }

  const isLastStep = modal.step === totalSteps() - 1;

  // ─── Render modal step content ────────────────────────────────────────────

  function renderStep() {
    if (modal.flow === null) {
      return (
        <div className="space-y-2.5">
          <p className="text-sm text-gray-500 mb-3">Select the type of person you are adding.</p>
          <button
            onClick={() => setModal((m) => ({ ...m, flow: "staff", step: 0 }))}
            className="w-full flex items-center gap-4 px-4 py-4 border border-gray-200 rounded-xl bg-white hover:border-[#004aad] hover:bg-blue-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <UserCog className="w-5 h-5 text-[#004aad]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Staff Member</p>
              <p className="text-xs text-gray-500 mt-0.5">Ops Lead, Manager, or Supervisor</p>
            </div>
          </button>
          <button
            onClick={() => setModal((m) => ({ ...m, flow: "provider", step: 0 }))}
            className="w-full flex items-center gap-4 px-4 py-4 border border-gray-200 rounded-xl bg-white hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Service Provider</p>
              <p className="text-xs text-gray-500 mt-0.5">Housekeeping, Kitchen, Technician, etc.</p>
            </div>
          </button>
        </div>
      );
    }

    const steps = modal.flow === "staff" ? renderStaffStep : renderProviderStep;
    return steps();
  }

  function renderStaffStep() {
    switch (modal.step) {
      case 0: return renderPhoneOtpStep();
      case 1:
        return (
          <Field label="Role" required>
            <select
              value={modal.role}
              onChange={(e) => setModal((m) => ({ ...m, role: e.target.value }))}
              className={selectCls}
            >
              <option value="ops_lead">Operations Lead</option>
              <option value="manager">Manager</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </Field>
        );
      case 2:
        return (
          <div className="space-y-3">
            <Field label="Full Name" required>
              <input
                value={modal.name}
                onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))}
                placeholder="e.g. Ravi Kumar"
                className={inputCls}
              />
            </Field>
            {modal.role !== "supervisor" && (
              <>
                <Field label="Email" required>
                  <input
                    type="email"
                    value={modal.email}
                    onChange={(e) => setModal((m) => ({ ...m, email: e.target.value }))}
                    placeholder="email@example.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Password" required>
                  <input
                    type="password"
                    value={modal.password}
                    onChange={(e) => setModal((m) => ({ ...m, password: e.target.value }))}
                    placeholder="Set a strong password"
                    className={inputCls}
                  />
                </Field>
              </>
            )}
            {modal.role === "supervisor" && (
              <p className="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2">
                Supervisors log in using phone + OTP — no password needed.
              </p>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            <Field label="Address / Current Address">
              <textarea
                rows={2}
                value={modal.address}
                onChange={(e) => setModal((m) => ({ ...m, address: e.target.value }))}
                className={textareaCls}
              />
            </Field>
            <Field label="Permanent Address">
              <textarea
                rows={2}
                value={modal.permanentAddress}
                onChange={(e) => setModal((m) => ({ ...m, permanentAddress: e.target.value }))}
                className={textareaCls}
              />
            </Field>
            <Field label="Aadhaar Number">
              <input
                value={modal.aadhaar}
                onChange={(e) => setModal((m) => ({ ...m, aadhaar: e.target.value }))}
                placeholder="12-digit Aadhaar"
                className={inputCls}
              />
            </Field>
          </div>
        );
      case 4: {
        const reportOptions = reportsToOptions();
        // Ops Lead → reports to Admin only, no location
        if (modal.role === "ops_lead") {
          return (
            <Field label="Reports To (Admin)">
              <select
                value={modal.reportsTo}
                onChange={(e) => setModal((m) => ({ ...m, reportsTo: e.target.value }))}
                className={selectCls}
              >
                <option value="">— None —</option>
                {reportOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          );
        }
        // Manager → reports to Ops Lead only, no location
        if (modal.role === "manager") {
          return (
            <Field label="Reports To (Ops Lead)">
              <select
                value={modal.reportsTo}
                onChange={(e) => setModal((m) => ({ ...m, reportsTo: e.target.value }))}
                className={selectCls}
              >
                <option value="">— None —</option>
                {reportOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          );
        }
        // Supervisor → location + reports to Manager
        return (
          <div className="space-y-3">
            <Field label="Location">
              <select
                value={modal.locationId}
                onChange={(e) => setModal((m) => ({ ...m, locationId: e.target.value }))}
                className={selectCls}
              >
                <option value="">— None —</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}, {l.city}</option>
                ))}
              </select>
            </Field>
            <Field label="Reports To (Manager)">
              <select
                value={modal.reportsTo}
                onChange={(e) => setModal((m) => ({ ...m, reportsTo: e.target.value }))}
                className={selectCls}
              >
                <option value="">— None —</option>
                {reportOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>
        );
      }
      default: return null;
    }
  }

  function renderProviderStep() {
    switch (modal.step) {
      case 0: return renderPhoneOtpStep();
      case 1:
        return (
          <Field label="Provider Type" required>
            <select
              value={modal.providerType}
              onChange={(e) => setModal((m) => ({ ...m, providerType: e.target.value }))}
              className={selectCls}
            >
              {PROVIDER_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
          </Field>
        );
      case 2:
        return (
          <Field label="Full Name" required>
            <input
              value={modal.name}
              onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))}
              placeholder="e.g. Suresh Kumar"
              className={inputCls}
            />
          </Field>
        );
      case 3:
        return (
          <div className="space-y-3">
            <Field label="Address / Current Address">
              <textarea
                rows={2}
                value={modal.address}
                onChange={(e) => setModal((m) => ({ ...m, address: e.target.value }))}
                className={textareaCls}
              />
            </Field>
            <Field label="Permanent Address">
              <textarea
                rows={2}
                value={modal.permanentAddress}
                onChange={(e) => setModal((m) => ({ ...m, permanentAddress: e.target.value }))}
                className={textareaCls}
              />
            </Field>
            <Field label="Aadhaar Number">
              <input
                value={modal.aadhaar}
                onChange={(e) => setModal((m) => ({ ...m, aadhaar: e.target.value }))}
                placeholder="12-digit Aadhaar"
                className={inputCls}
              />
            </Field>
          </div>
        );
      case 4:
        return (
          <div className="space-y-3">
            <Field label="Location">
              <select
                value={modal.locationId}
                onChange={(e) => setModal((m) => ({ ...m, locationId: e.target.value }))}
                className={selectCls}
              >
                <option value="">— None —</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}, {l.city}</option>
                ))}
              </select>
            </Field>
            <Field label="Assign Supervisor">
              <select
                value={modal.supervisorId}
                onChange={(e) => setModal((m) => ({ ...m, supervisorId: e.target.value }))}
                className={selectCls}
              >
                <option value="">— None —</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>
        );
      case 5:
        return (
          <Field label="Notes / Specialization">
            <textarea
              rows={4}
              value={modal.notes}
              onChange={(e) => setModal((m) => ({ ...m, notes: e.target.value }))}
              placeholder="Any specialization or notes…"
              className={textareaCls}
            />
          </Field>
        );
      default: return null;
    }
  }

  function renderPhoneOtpStep() {
    return (
      <div className="space-y-4">
        <Field label="Mobile Number" required>
          <div className="flex gap-2">
            <input
              value={modal.phone}
              onChange={(e) => setModal((m) => ({ ...m, phone: e.target.value }))}
              placeholder="10-digit phone"
              maxLength={10}
              className={`${inputCls} flex-1`}
              disabled={modal.otpSent}
            />
            <button
              type="button"
              onClick={sendOtp}
              disabled={modal.otpSent}
              className="px-3 py-2 text-sm bg-[#004aad] text-white rounded-lg disabled:opacity-50 whitespace-nowrap"
            >
              {modal.otpSent ? "Sent ✓" : "Send OTP"}
            </button>
          </div>
        </Field>
        {modal.otpSent && !modal.otpVerified && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Enter OTP <span className="text-gray-400">(Hint: use 1234)</span>
            </label>
            <div className="flex gap-2 mb-3">
              {modal.otpDigits.map((d, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpInput(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-12 h-12 text-center text-lg font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={verifyOtp}
              className="w-full py-2 text-sm bg-[#004aad] text-white rounded-lg font-medium"
            >
              Verify OTP
            </button>
          </div>
        )}
        {modal.otpVerified && (
          <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            ✓ Phone verified — {modal.phone}
          </p>
        )}
      </div>
    );
  }

  function stepLabel() {
    if (modal.flow === null) return "Create Personnel";
    const total = totalSteps();
    const flowName = modal.flow === "staff" ? "Staff" : "Provider";
    return `Create ${flowName} — Step ${modal.step + 1} of ${total}`;
  }

  // ─── Page render ──────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personnel</h1>
          <p className="text-gray-500 text-sm">{personnel.length} total</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-[#004aad] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#003a8c] transition-colors"
        >
          <Plus size={16} /> Create Personnel
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
          />
        </div>
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad] cursor-pointer"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role / Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reports To / Supervisor</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No personnel found
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((p) => {
                const typeKey = p.person_type === "staff" ? p.role : p.provider_type;
                const typeLabel = typeKey ? (ROLE_LABELS[typeKey] ?? typeKey) : "—";
                const typeColor = getRoleColor(typeKey);
                const statusColor = STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-500";
                const reportsTo =
                  p.person_type === "staff" ? p.reports_to_name : p.supervisor_name;

                return (
                  <tr
                    key={`${p.person_type}-${p.id}`}
                    onClick={() =>
                      router.push(
                        `/admin/operations/staff/${p.id}?type=${p.person_type}`
                      )
                    }
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor}`}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.location_name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{reportsTo ?? "—"}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Create Personnel Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {modal.flow !== null && modal.step > 0 && (
                  <button
                    onClick={prevStep}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <h2 className="text-base font-bold text-gray-900">{stepLabel()}</h2>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {renderStep()}

              {modalError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {modalError}
                </p>
              )}

              {/* Footer buttons */}
              {modal.flow !== null && (
                <div className="flex gap-2 pt-1">
                  {isLastStep ? (
                    <button
                      onClick={handleSubmit}
                      disabled={saving || !canProceed()}
                      className="flex-1 bg-[#004aad] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
                    >
                      {saving ? "Creating…" : "Create"}
                    </button>
                  ) : (
                    <button
                      onClick={nextStep}
                      disabled={!canProceed()}
                      className="flex-1 bg-[#004aad] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
                    >
                      Next →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
