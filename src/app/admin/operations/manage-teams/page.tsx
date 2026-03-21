"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings, ChevronDown, ChevronRight, Users, User } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  phone: string;
  provider_type: string | null;
  status: string;
}

interface ProviderAssignment {
  assignmentId: string;
  assignedAt: string;
  provider: Provider | null;
}

interface Supervisor {
  id: string;
  name: string;
  phone: string;
  status: string;
  location: { id: string; name: string; city: string; sector: string } | null;
  providers: ProviderAssignment[];
}

interface Manager {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  supervisors: Supervisor[];
}

interface OpsLead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  managers: Manager[];
}

interface Admin {
  id: string;
  name: string;
  email: string | null;
  status: string;
}

interface HierarchyData {
  admins: Admin[];
  opsLeads: OpsLead[];
  unassignedSupervisors: Supervisor[];
}

function statusBadge(status: string) {
  return status === "active"
    ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-500";
}

function SupervisorCard({ sv }: { sv: Supervisor }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <User size={14} className="text-blue-500" />
          <span className="font-medium text-gray-800 text-sm">{sv.name}</span>
          <span className="text-gray-400 text-xs">{sv.phone}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusBadge(sv.status)}`}>
            {sv.status}
          </span>
          {sv.location && (
            <span className="text-xs text-gray-400">{sv.location.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{sv.providers.length} providers</span>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 py-3 space-y-1.5">
          {sv.providers.length === 0 ? (
            <p className="text-xs text-gray-400">No providers assigned</p>
          ) : (
            sv.providers.map((pa) =>
              pa.provider ? (
                <div key={pa.assignmentId} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-blue-300 shrink-0" />
                  <span className="font-medium">{pa.provider.name}</span>
                  <span className="text-gray-400">{pa.provider.phone}</span>
                  {pa.provider.provider_type && (
                    <span className="text-gray-400 italic">{pa.provider.provider_type.replace(/_/g, " ")}</span>
                  )}
                  {pa.provider.status !== "available" && (
                    <span className="bg-red-100 text-red-600 px-1 rounded">{pa.provider.status}</span>
                  )}
                </div>
              ) : null
            )
          )}
        </div>
      )}
    </div>
  );
}

function ManagerCard({ mgr }: { mgr: Manager }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Users size={14} className="text-blue-600" />
          <span className="font-medium text-gray-800 text-sm">{mgr.name}</span>
          <span className="text-gray-400 text-xs">{mgr.email ?? mgr.phone}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusBadge(mgr.status)}`}>
            {mgr.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{mgr.supervisors.length} supervisors</span>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 py-3 space-y-2">
          {mgr.supervisors.length === 0 ? (
            <p className="text-xs text-gray-400">No supervisors assigned</p>
          ) : (
            mgr.supervisors.map((sv) => <SupervisorCard key={sv.id} sv={sv} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function ManageTeamsPage() {
  const router = useRouter();
  const [data, setData] = useState<HierarchyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/teams")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load team hierarchy"))
      .finally(() => setLoading(false));
  }, []);

  const filterBySearch = (name: string) =>
    !search || name.toLowerCase().includes(search.toLowerCase());

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Teams</h1>
          <p className="text-gray-500 text-sm">Team hierarchy: Ops Lead → Managers → Supervisors → Providers</p>
        </div>
        <button
          onClick={() => router.push("/admin/operations/manage-teams/manage")}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#004aad] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Settings size={16} />
          Manage Assignments
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, role, or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          {data.opsLeads.filter((ol) => filterBySearch(ol.name)).map((ol) => (
            <div key={ol.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-indigo-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Ops Lead</span>
                  <span className="font-bold text-gray-900">{ol.name}</span>
                  <span className="text-gray-400 text-sm">{ol.email ?? ol.phone}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusBadge(ol.status)}`}>
                    {ol.status}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {ol.managers.filter((m) => filterBySearch(m.name)).length === 0 ? (
                  <p className="text-sm text-gray-400">No managers assigned</p>
                ) : (
                  ol.managers
                    .filter((m) => filterBySearch(m.name))
                    .map((mgr) => <ManagerCard key={mgr.id} mgr={mgr} />)
                )}
              </div>
            </div>
          ))}

          {data.unassignedSupervisors.filter((sv) => filterBySearch(sv.name)).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-yellow-50">
                <span className="text-xs font-semibold uppercase tracking-wider text-yellow-700">
                  Unassigned Supervisors
                </span>
              </div>
              <div className="p-4 space-y-2">
                {data.unassignedSupervisors
                  .filter((sv) => filterBySearch(sv.name))
                  .map((sv) => <SupervisorCard key={sv.id} sv={sv} />)}
              </div>
            </div>
          )}

          {data.opsLeads.length === 0 && data.unassignedSupervisors.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No team hierarchy data found. Use &quot;Manage Assignments&quot; to set up teams.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
