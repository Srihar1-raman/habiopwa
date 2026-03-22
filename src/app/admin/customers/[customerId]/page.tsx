"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, UserCheck, RefreshCw } from "lucide-react";

interface CustomerProfile {
  flat_no: string | null;
  building: string | null;
  society: string | null;
  sector: string | null;
  city: string | null;
  pincode: string | null;
  home_type: string | null;
  bhk: number | null;
  bathrooms: number | null;
  balconies: number | null;
}

interface Customer {
  id: string;
  phone: string;
  name: string;
  customer_profiles: CustomerProfile[] | CustomerProfile | null;
}

interface PlanRequest {
  id: string;
  request_code: string;
  status: string;
  total_price_monthly: number | null;
  plan_start_date: string | null;
  plan_active_start_date: string | null;
  plan_active_end_date: string | null;
  created_at: string;
  is_recurring: boolean;
  assigned_supervisor_id: string | null;
}

interface IssueTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  description: string | null;
}

interface Supervisor {
  id: string;
  name: string;
  phone: string;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-700",
  captain_allocation_pending: "bg-orange-100 text-orange-700",
  captain_review_pending: "bg-blue-100 text-blue-700",
  payment_pending: "bg-purple-100 text-purple-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-gray-100 text-gray-600",
  completed: "bg-teal-100 text-teal-700",
  cancelled: "bg-gray-100 text-gray-500",
  closed: "bg-gray-200 text-gray-700",
  open: "bg-red-100 text-red-700",
  in_progress: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
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

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function SupervisorAllocateModal({
  planRequest,
  supervisors,
  onClose,
  onSuccess,
}: {
  planRequest: PlanRequest;
  supervisors: Supervisor[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedSupervisor, setSelectedSupervisor] = useState(
    planRequest.assigned_supervisor_id ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReassign = !!planRequest.assigned_supervisor_id;

  async function handleSubmit() {
    if (!selectedSupervisor) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/plan-requests/${planRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_supervisor_id: selectedSupervisor }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onSuccess();
        onClose();
      }
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {isReassign ? "Reassign Supervisor" : "Allocate Supervisor"}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Plan: <span className="font-mono">{planRequest.request_code}</span>
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Select Supervisor
          </label>
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
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-3">{error}</p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedSupervisor || saving}
            className="px-4 py-2 text-sm bg-[#004aad] text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : isReassign ? "Reassign" : "Allocate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const { customerId } = useParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [planRequests, setPlanRequests] = useState<PlanRequest[]>([]);
  const [issueTickets, setIssueTickets] = useState<IssueTicket[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allocateModal, setAllocateModal] = useState<PlanRequest | null>(null);

  function loadData() {
    if (!customerId) return;
    fetch(`/api/admin/customers/${customerId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setCustomer(data.customer);
          setPlanRequests(data.planRequests ?? []);
          setIssueTickets(data.issueTickets ?? []);
        }
      })
      .catch(() => setError("Failed to load customer"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
    // Load active supervisors for the allocation modal
    fetch("/api/admin/staff?role=supervisor&status=active")
      .then((r) => r.json())
      .then((data) => setSupervisors(data.staff ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const profile = customer
    ? Array.isArray(customer.customer_profiles)
      ? customer.customer_profiles[0]
      : customer.customer_profiles
    : null;

  function canAllocateSupervisor(pr: PlanRequest) {
    return (
      pr.status === "submitted" ||
      pr.status === "captain_allocation_pending"
    );
  }

  function canReassignSupervisor(pr: PlanRequest) {
    return pr.status === "captain_review_pending";
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error ?? "Customer not found"}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* Customer info */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{customer.phone}</p>
        {profile && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {profile.flat_no && (
              <div>
                <p className="text-gray-400 text-xs">Flat</p>
                <p className="text-gray-700">{profile.flat_no}</p>
              </div>
            )}
            {profile.building && (
              <div>
                <p className="text-gray-400 text-xs">Building</p>
                <p className="text-gray-700">{profile.building}</p>
              </div>
            )}
            {profile.society && (
              <div>
                <p className="text-gray-400 text-xs">Society</p>
                <p className="text-gray-700">{profile.society}</p>
              </div>
            )}
            {profile.city && (
              <div>
                <p className="text-gray-400 text-xs">City</p>
                <p className="text-gray-700">{profile.city}</p>
              </div>
            )}
            {profile.home_type && (
              <div>
                <p className="text-gray-400 text-xs">Home Type</p>
                <p className="text-gray-700">{profile.home_type}</p>
              </div>
            )}
            {profile.bhk != null && (
              <div>
                <p className="text-gray-400 text-xs">BHK</p>
                <p className="text-gray-700">{profile.bhk}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plan Requests */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Plan Requests ({planRequests.length})
          </h2>
        </div>
        {planRequests.length === 0 ? (
          <p className="px-5 py-6 text-gray-500 text-sm">No plan requests</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Monthly Price</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Start Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Created</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {planRequests.map((pr) => (
                <tr key={pr.id} className="border-b border-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{pr.request_code}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[pr.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[pr.status] ?? pr.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {pr.total_price_monthly != null ? `₹${pr.total_price_monthly}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {pr.plan_start_date ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {new Date(pr.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    {canAllocateSupervisor(pr) && (
                      <button
                        onClick={() => setAllocateModal(pr)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-[#004aad] text-white hover:bg-blue-700 transition-colors"
                      >
                        <UserCheck size={12} />
                        Allocate Supervisor
                      </button>
                    )}
                    {canReassignSupervisor(pr) && (
                      <button
                        onClick={() => setAllocateModal(pr)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <RefreshCw size={12} />
                        Reassign Supervisor
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Issue Tickets */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Issue Tickets ({issueTickets.length})
          </h2>
        </div>
        {issueTickets.length === 0 ? (
          <p className="px-5 py-6 text-gray-500 text-sm">No issue tickets</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Priority</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody>
              {issueTickets.map((t) => (
                <tr key={t.id} className="border-b border-gray-50">
                  <td className="px-4 py-2.5 text-gray-800">{t.title}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[t.priority] ?? "bg-gray-100 text-gray-600"}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Supervisor Allocation Modal */}
      {allocateModal && (
        <SupervisorAllocateModal
          planRequest={allocateModal}
          supervisors={supervisors}
          onClose={() => setAllocateModal(null)}
          onSuccess={() => {
            setLoading(true);
            loadData();
          }}
        />
      )}
    </div>
  );
}
