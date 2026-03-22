"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, ChevronDown } from "lucide-react";

interface Customer {
  id: string;
  phone: string;
  name: string;
  flat_no: string | null;
  building: string | null;
  society: string | null;
  city: string | null;
  plan_count: number;
  latest_plan_id: string | null;
  latest_plan_status: string | null;
  cart_id: string | null;
}

const PLAN_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-700",
  captain_allocation_pending: "bg-yellow-100 text-yellow-700",
  captain_review_pending: "bg-blue-100 text-blue-700",
  payment_pending: "bg-purple-100 text-purple-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-gray-100 text-gray-600",
  completed: "bg-teal-100 text-teal-700",
  cancelled: "bg-red-100 text-red-600",
  closed: "bg-gray-200 text-gray-700",
  cart_in_progress: "bg-amber-100 text-amber-700",
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

const FILTER_OPTIONS = [
  { value: "", label: "All Customers" },
  { value: "active", label: "Active Plans" },
  { value: "submitted", label: "Submitted (Awaiting Supervisor)" },
  { value: "captain_review_pending", label: "Review Pending" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "has_cart", label: "Has Cart (Not Submitted)" },
  { value: "no_plan", label: "No Plan / No Cart" },
];

function PlanActionButton({ customer }: { customer: Customer }) {
  const router = useRouter();

  if (customer.latest_plan_status) {
    const draftStatuses = ["cart_in_progress"];
    if (draftStatuses.includes(customer.latest_plan_status)) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/customers/${customer.id}`);
          }}
          className="text-xs px-2.5 py-1 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors"
        >
          Edit Draft
        </button>
      );
    }
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/admin/customers/${customer.id}`);
        }}
        className="text-xs px-2.5 py-1 rounded-md bg-[#004aad] text-white hover:bg-blue-700 transition-colors"
      >
        View Plan
      </button>
    );
  }

  if (customer.cart_id) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/admin/customers/${customer.id}`);
        }}
        className="text-xs px-2.5 py-1 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors"
      >
        View Cart
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/admin/customers/${customer.id}`);
      }}
      className="text-xs px-2.5 py-1 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
    >
      Create Plan
    </button>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [planStatusFilter, setPlanStatusFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = planStatusFilter ? `?plan_status=${planStatusFilter}` : "";
    fetch(`/api/admin/customers${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setCustomers(data.customers ?? []);
      })
      .catch(() => setError("Failed to load customers"))
      .finally(() => setLoading(false));
  }, [planStatusFilter]);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm">{customers.length} total customers</p>
        </div>
        <button
          onClick={() => router.push("/admin/customers/new")}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#004aad] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Create New
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
            value={planStatusFilter}
            onChange={(e) => setPlanStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad] cursor-pointer"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">Address</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Plans</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Plan Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
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
                  No customers found
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/admin/customers/${c.id}`)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {[c.flat_no, c.building, c.society, c.city]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-medium">
                      {c.plan_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.latest_plan_status ? (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          PLAN_STATUS_COLORS[c.latest_plan_status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_LABELS[c.latest_plan_status] ?? c.latest_plan_status}
                      </span>
                    ) : c.cart_id ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                        Has Cart
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <PlanActionButton customer={c} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
