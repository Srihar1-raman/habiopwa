"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Search, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CustomerProfile {
  flat_no: string | null;
  building: string | null;
  society: string | null;
  sector: string | null;
  city: string | null;
  pincode: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  customer_profiles: CustomerProfile[] | CustomerProfile | null;
}

interface Supervisor {
  id: string;
  name: string;
  phone: string;
}

interface PlanItem {
  id: string;
  plan_request_id: string;
  category_id: string;
  job_id: string | null;
  job_code: string | null;
  title: string;
  frequency_label: string;
  unit_type: string;
  unit_value: number;
  price_monthly: number;
  formula_type: string | null;
  service_categories: { slug: string; name: string } | null;
  service_jobs: { slug: string; name: string; code: string } | null;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface PlanRequest {
  id: string;
  request_code: string;
  status: string;
  total_price_monthly: number;
  plan_start_date: string | null;
  plan_active_start_date: string | null;
  plan_active_end_date: string | null;
  is_recurring: boolean;
  assigned_supervisor_id: string | null;
  admin_remarks: string | null;
  created_at: string;
  customers: Customer | Customer[] | null;
  assigned_supervisor: Supervisor | Supervisor[] | null;
  payments: Payment[] | null;
  plan_request_items: PlanItem[] | null;
}

interface ServiceJob {
  id: string;
  name: string;
  code: string | null;
  category_id: string;
  slug: string;
  frequency_label: string;
  unit_type: string;
  default_unit: number;
  formula_type: string;
  service_categories: { id: string; slug: string; name: string } | null;
  category_name: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  cart_in_progress: "bg-gray-100 text-gray-600",
  submitted: "bg-yellow-100 text-yellow-700",
  captain_allocation_pending: "bg-orange-100 text-orange-700",
  captain_review_pending: "bg-blue-100 text-blue-700",
  payment_pending: "bg-purple-100 text-purple-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-gray-100 text-gray-600",
  completed: "bg-teal-100 text-teal-700",
  cancelled: "bg-gray-100 text-gray-500",
  closed: "bg-gray-200 text-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  cart_in_progress: "Cart In Progress",
  submitted: "Submitted",
  captain_allocation_pending: "Allocation Pending",
  captain_review_pending: "Review Pending",
  payment_pending: "Payment Pending",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  closed: "Closed",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  succeeded: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unwrap<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function formatAddress(profile: CustomerProfile | null): string {
  if (!profile) return "—";
  return [profile.flat_no, profile.building, profile.society, profile.sector, profile.city, profile.pincode]
    .filter(Boolean)
    .join(", ");
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ServiceCatalogModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (job: ServiceJob) => void;
}) {
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/service-catalog")
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter(
    (j) =>
      j.name.toLowerCase().includes(search.toLowerCase()) ||
      (j.category_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (j.code ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Add Service</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No services found</p>
          ) : (
            <ul>
              {filtered.map((job) => (
                <li key={job.id}>
                  <button
                    onClick={() => onSelect(job)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800">{job.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {job.category_name ?? "—"} {job.code ? `· ${job.code}` : ""}
                      {" · "}{job.frequency_label}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EditableItemRow({
  item,
  onUpdate,
  onDelete,
}: {
  item: PlanItem;
  onUpdate: (id: string, field: string, value: string | number) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [unitValue, setUnitValue] = useState(String(item.unit_value));
  const [price, setPrice] = useState(String(item.price_monthly));
  const [saving, setSaving] = useState(false);

  async function save(field: string, value: string | number) {
    setSaving(true);
    await onUpdate(item.id, field, value);
    setSaving(false);
  }

  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== item.title && save("title", title)}
          className="w-full text-sm border border-transparent hover:border-gray-200 focus:border-[#004aad] rounded px-2 py-1 focus:outline-none"
        />
      </td>
      <td className="px-4 py-2 text-xs text-gray-500">
        {item.service_categories?.name ?? "—"}
      </td>
      <td className="px-4 py-2 text-xs text-gray-500">{item.frequency_label}</td>
      <td className="px-4 py-2">
        <input
          type="number"
          value={unitValue}
          onChange={(e) => setUnitValue(e.target.value)}
          onBlur={() => unitValue !== String(item.unit_value) && save("unit_value", Number(unitValue))}
          className="w-20 text-sm border border-transparent hover:border-gray-200 focus:border-[#004aad] rounded px-2 py-1 focus:outline-none text-right"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => price !== String(item.price_monthly) && save("price_monthly", Number(price))}
          className="w-24 text-sm border border-transparent hover:border-gray-200 focus:border-[#004aad] rounded px-2 py-1 focus:outline-none text-right"
        />
      </td>
      <td className="px-4 py-2">
        {saving && (
          <span className="text-xs text-gray-400">saving…</span>
        )}
        <button
          onClick={() => onDelete(item.id)}
          className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

function ReadOnlyItemRow({ item }: { item: PlanItem }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-2.5 text-sm text-gray-800">{item.title}</td>
      <td className="px-4 py-2.5 text-xs text-gray-500">{item.service_categories?.name ?? "—"}</td>
      <td className="px-4 py-2.5 text-xs text-gray-500">{item.frequency_label}</td>
      <td className="px-4 py-2.5 text-sm text-gray-700 text-right">{item.unit_value}</td>
      <td className="px-4 py-2.5 text-sm text-gray-700 text-right">₹{item.price_monthly}</td>
    </tr>
  );
}

function ItemsTable({
  items,
  editable = false,
  onUpdate,
  onDelete,
}: {
  items: PlanItem[];
  editable?: boolean;
  onUpdate?: (id: string, field: string, value: string | number) => void;
  onDelete?: (id: string) => void;
}) {
  const total = items.reduce((s, i) => s + (i.price_monthly ?? 0), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">Service</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">Category</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">Frequency</th>
            <th className="text-right px-4 py-2.5 font-medium text-gray-600">Units</th>
            <th className="text-right px-4 py-2.5 font-medium text-gray-600">Price/mo</th>
            {editable && <th className="px-4 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={editable ? 6 : 5} className="px-4 py-6 text-center text-gray-500">
                No items added yet
              </td>
            </tr>
          ) : (
            items.map((item) =>
              editable && onUpdate && onDelete ? (
                <EditableItemRow key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
              ) : (
                <ReadOnlyItemRow key={item.id} item={item} />
              )
            )
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200">
            <td colSpan={editable ? 4 : 4} className="px-4 py-2.5 text-sm font-medium text-gray-700">
              Total
            </td>
            <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">
              ₹{total.toFixed(2)}
            </td>
            {editable && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlanDetailPage() {
  const router = useRouter();
  const { customerId, planId } = useParams<{ customerId: string; planId: string }>();

  const [plan, setPlan] = useState<PlanRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);

  // Panel-specific state
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPlan = useCallback(async () => {
    if (!planId) return;
    try {
      const res = await fetch(`/api/admin/plan-requests/${planId}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setPlan(data.planRequest);
        setAdminRemarks(data.planRequest.admin_remarks ?? "");
        setPreferredDate(data.planRequest.plan_start_date ?? "");
        setSelectedSupervisor(data.planRequest.assigned_supervisor_id ?? "");
      }
    } catch {
      setError("Failed to load plan");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadPlan();
    fetch("/api/admin/staff?role=supervisor&status=active")
      .then((r) => r.json())
      .then((d) => setSupervisors(d.staff ?? []))
      .catch(() => {});
  }, [loadPlan]);

  async function patchPlan(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/plan-requests/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function handleAddService(job: ServiceJob) {
    setShowCatalog(false);
    const res = await fetch(`/api/admin/plan-requests/${planId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: job.category_id,
        job_id: job.id,
        job_code: job.code,
        title: job.name,
        unit_value: job.default_unit,
        price_monthly: 0,
        frequency_label: job.frequency_label,
        unit_type: job.unit_type,
        formula_type: job.formula_type,
      }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else loadPlan();
  }

  async function handleUpdateItem(id: string, field: string, value: string | number) {
    const res = await fetch(`/api/admin/plan-requests/${planId}/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else loadPlan();
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Remove this service?")) return;
    const res = await fetch(`/api/admin/plan-requests/${planId}/items/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else loadPlan();
  }

  async function handleSubmitPlan() {
    setActionLoading(true);
    // Save date first if set
    if (preferredDate) {
      await patchPlan({ preferred_start_date: preferredDate });
    }
    const data = await patchPlan({ status: "submitted" });
    setActionLoading(false);
    if (data.error) alert(data.error);
    else loadPlan();
  }

  async function handleAllocateSupervisor() {
    if (!selectedSupervisor) return;
    setAllocating(true);
    const data = await patchPlan({ assigned_supervisor_id: selectedSupervisor });
    setAllocating(false);
    if (data.error) alert(data.error);
    else loadPlan();
  }

  async function handleSaveRemarks() {
    setSavingRemarks(true);
    const data = await patchPlan({ admin_remarks: adminRemarks });
    setSavingRemarks(false);
    if (data.error) alert(data.error);
    else loadPlan();
  }

  async function handleFinalize() {
    if (!confirm("Finalize plan and move to payment pending?")) return;
    setActionLoading(true);
    const res = await fetch(`/api/admin/plan-requests/${planId}/finalize`, {
      method: "POST",
    });
    const data = await res.json();
    setActionLoading(false);
    if (data.error) alert(data.error);
    else loadPlan();
  }

  async function handleMarkPaymentReceived() {
    if (!confirm("Mark this plan as active and payment as received?")) return;
    setActionLoading(true);
    const payment = unwrap(plan?.payments ?? null) ?? (plan?.payments ?? [])[0];
    try {
      // Mark plan active
      await patchPlan({ status: "active" });
      // Mark payment succeeded
      if (payment) {
        await fetch(`/api/admin/payments/${payment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "succeeded" }),
        });
      }
      loadPlan();
    } catch {
      alert("Failed to update");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveDate() {
    setSavingDate(true);
    const data = await patchPlan({ preferred_start_date: preferredDate });
    setSavingDate(false);
    if (data.error) alert(data.error);
    else loadPlan();
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error ?? "Plan not found"}</p>
      </div>
    );
  }

  const customer = unwrap(plan.customers);
  const profile = unwrap(
    customer
      ? Array.isArray(customer.customer_profiles)
        ? customer.customer_profiles
        : customer.customer_profiles
        ? [customer.customer_profiles]
        : null
      : null
  );
  const supervisor = unwrap(plan.assigned_supervisor);
  const items = plan.plan_request_items ?? [];
  const payments = plan.payments ?? [];
  const payment = payments[0] ?? null;
  const status = plan.status;
  const isReadOnly = ["paused", "completed", "cancelled", "closed"].includes(status);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => router.push(`/admin/customers/${customerId}`)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={15} /> Back to customer
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900 font-mono">{plan.request_code}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Created {new Date(plan.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Customer Info */}
        {customer && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Customer</p>
              <p className="font-medium text-gray-800">{customer.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <p className="text-gray-700">{customer.phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Address</p>
              <p className="text-gray-700">{formatAddress(profile)}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── cart_in_progress ─────────────────────────────────────────────── */}
      {status === "cart_in_progress" && (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Plan Items</h2>
              <button
                onClick={() => setShowCatalog(true)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#004aad] text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} /> Add Service
              </button>
            </div>
            <ItemsTable
              items={items}
              editable
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Preferred Start Date
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                />
                <button
                  onClick={handleSaveDate}
                  disabled={savingDate}
                  className="text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {savingDate ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSubmitPlan}
                disabled={actionLoading || items.length === 0}
                className="px-5 py-2.5 bg-[#004aad] text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Submitting…" : "Submit Plan"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── submitted / captain_allocation_pending ───────────────────────── */}
      {(status === "submitted" || status === "captain_allocation_pending") && (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Plan Items</h2>
            </div>
            <ItemsTable items={items} />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Allocate Supervisor</h2>
            <select
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
            >
              <option value="">— Choose supervisor —</option>
              {supervisors.map((sv) => (
                <option key={sv.id} value={sv.id}>
                  {sv.name} ({sv.phone})
                </option>
              ))}
            </select>
            <div className="flex justify-end">
              <button
                onClick={handleAllocateSupervisor}
                disabled={!selectedSupervisor || allocating}
                className="px-4 py-2 bg-[#004aad] text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {allocating ? "Allocating…" : "Allocate"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Admin Remarks
            </label>
            <textarea
              value={adminRemarks}
              onChange={(e) => setAdminRemarks(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
              placeholder="Internal notes…"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSaveRemarks}
                disabled={savingRemarks}
                className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {savingRemarks ? "Saving…" : "Save Remarks"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── captain_review_pending ───────────────────────────────────────── */}
      {status === "captain_review_pending" && (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Plan Items</h2>
            </div>
            <ItemsTable items={items} />
          </div>

          {supervisor && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Assigned Supervisor</h2>
              <p className="text-sm text-gray-800 font-medium">{supervisor.name}</p>
              <p className="text-sm text-gray-500">{supervisor.phone}</p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Admin Remarks
            </label>
            <textarea
              value={adminRemarks}
              onChange={(e) => setAdminRemarks(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
              placeholder="Internal notes…"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSaveRemarks}
                disabled={savingRemarks}
                className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {savingRemarks ? "Saving…" : "Save Remarks"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Reassign Supervisor</h2>
            <select
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
            >
              <option value="">— Choose supervisor —</option>
              {supervisors.map((sv) => (
                <option key={sv.id} value={sv.id}>
                  {sv.name} ({sv.phone})
                </option>
              ))}
            </select>
            <div className="flex justify-end mt-3">
              <button
                onClick={handleAllocateSupervisor}
                disabled={!selectedSupervisor || allocating}
                className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {allocating ? "Reassigning…" : "Reassign"}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleFinalize}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-[#004aad] text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? "Finalizing…" : "Finalize Plan"}
            </button>
          </div>
        </>
      )}

      {/* ── payment_pending ──────────────────────────────────────────────── */}
      {status === "payment_pending" && (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Plan Items</h2>
            </div>
            <ItemsTable items={items} />
          </div>

          {payment && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Payment</h2>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-900">₹{payment.amount}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[payment.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {payment.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Created {new Date(payment.created_at).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleMarkPaymentReceived}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? "Processing…" : "Mark as Payment Received"}
            </button>
          </div>
        </>
      )}

      {/* ── active ──────────────────────────────────────────────────────── */}
      {status === "active" && (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Plan Items</h2>
            </div>
            <ItemsTable items={items} />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {supervisor && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Assigned Supervisor</p>
                <p className="font-medium text-gray-800">{supervisor.name}</p>
              </div>
            )}
            {plan.plan_active_start_date && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Active From</p>
                <p className="text-gray-700">{plan.plan_active_start_date}</p>
              </div>
            )}
            {plan.plan_active_end_date && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Active Until</p>
                <p className="text-gray-700">{plan.plan_active_end_date}</p>
              </div>
            )}
            {payment && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Payment</p>
                <p className="text-gray-700">
                  ₹{payment.amount}{" "}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[payment.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {payment.status}
                  </span>
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── read-only statuses ───────────────────────────────────────────── */}
      {isReadOnly && (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Plan Items</h2>
            </div>
            <ItemsTable items={items} />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {supervisor && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Supervisor</p>
                <p className="font-medium text-gray-800">{supervisor.name}</p>
              </div>
            )}
            {plan.plan_start_date && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Start Date</p>
                <p className="text-gray-700">{plan.plan_start_date}</p>
              </div>
            )}
            {plan.admin_remarks && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Admin Remarks</p>
                <p className="text-gray-700 whitespace-pre-wrap">{plan.admin_remarks}</p>
              </div>
            )}
            {payment && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Payment</p>
                <p className="text-gray-700">
                  ₹{payment.amount}{" "}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[payment.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {payment.status}
                  </span>
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Service Catalog Modal */}
      {showCatalog && (
        <ServiceCatalogModal
          onClose={() => setShowCatalog(false)}
          onSelect={handleAddService}
        />
      )}
    </div>
  );
}
