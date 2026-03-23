"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";

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
  assigned_supervisor?: { id: string; name: string; phone: string } | null;
}

interface IssueTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  description: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-700",
  captain_allocation_pending: "bg-yellow-100 text-yellow-700",
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
  captain_allocation_pending: "Submitted",
  captain_review_pending: "Review Pending",
  payment_pending: "Payment Pending",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  closed: "Closed",
  cart_in_progress: "Cart (Draft)",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function CustomerDetailPage() {
  const router = useRouter();
  const { customerId } = useParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [planRequests, setPlanRequests] = useState<PlanRequest[]>([]);
  const [issueTickets, setIssueTickets] = useState<IssueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);

  async function handleCreatePlan() {
    if (creatingPlan) return;
    setCreatingPlan(true);
    try {
      const res = await fetch("/api/admin/plan-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        router.push(`/admin/customers/${customerId}/plans/${data.planRequest.id}`);
      }
    } catch {
      alert("Failed to create plan");
    } finally {
      setCreatingPlan(false);
    }
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const profile = customer
    ? Array.isArray(customer.customer_profiles)
      ? customer.customer_profiles[0]
      : customer.customer_profiles
    : null;

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
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Plan Requests ({planRequests.length})
          </h2>
          <button
            onClick={handleCreatePlan}
            disabled={creatingPlan}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#004aad] text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            {creatingPlan ? "Creating…" : "Create Plan"}
          </button>
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
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Supervisor</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody>
              {planRequests.map((pr) => (
                <tr
                  key={pr.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/admin/customers/${customerId}/plans/${pr.id}`)}
                >
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
                  <td className="px-4 py-2.5">
                    {pr.assigned_supervisor ? (
                      <span className="text-xs text-gray-700">{pr.assigned_supervisor.name}</span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">— Unassigned —</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {new Date(pr.created_at).toLocaleDateString()}
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
    </div>
  );
}
