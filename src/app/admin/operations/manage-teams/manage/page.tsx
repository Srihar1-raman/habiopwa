"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  status: string;
  reports_to: string | null;
}

interface Provider {
  id: string;
  name: string;
  phone: string;
  specialization: string | null;
}

interface Assignment {
  id: string;
  supervisor_id: string;
  service_provider_id: string;
  assigned_at: string;
  service_providers: Provider | null;
}

interface SupervisorWithTeam {
  id: string;
  name: string;
  phone: string;
  status: string;
  assignments: { assignmentId: string; provider: Provider | null; assigned_at: string }[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  ops_lead: "Ops Lead",
  manager: "Manager",
  supervisor: "Supervisor",
};

export default function ManageAssignmentsPage() {
  const router = useRouter();
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [supervisorTeams, setSupervisorTeams] = useState<SupervisorWithTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Hierarchy assignment form
  const [hierStaffId, setHierStaffId] = useState("");
  const [hierReportsTo, setHierReportsTo] = useState("");

  // Provider assignment form
  const [pvSupervisorId, setPvSupervisorId] = useState("");
  const [pvProviderId, setPvProviderId] = useState("");

  async function loadData() {
    try {
      const [staffRes, provRes, teamsRes] = await Promise.all([
        fetch("/api/admin/staff"),
        fetch("/api/admin/providers"),
        fetch("/api/admin/provider-teams"),
      ]);
      const staffData = await staffRes.json();
      const provData = await provRes.json();
      const teamsData = await teamsRes.json();

      setAllStaff(staffData.staff ?? []);
      setProviders(provData.providers ?? []);
      setSupervisorTeams(
        (teamsData.supervisors ?? []).map((sv: {
          id: string; name: string; phone: string; status: string;
          assignments: { assignmentId: string; provider: Provider | null; assigned_at: string }[]
        }) => ({
          ...sv,
        }))
      );
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAssignHierarchy() {
    if (!hierStaffId || !hierReportsTo) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/teams/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: hierStaffId, reports_to: hierReportsTo }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuccessMsg("Hierarchy assignment saved");
        setHierStaffId("");
        setHierReportsTo("");
        await loadData();
      }
    } catch {
      setError("Failed to save assignment");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveHierarchy(staffId: string) {
    if (!confirm("Remove this staff member's reporting relationship?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/teams/assign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: staffId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuccessMsg("Reporting relationship removed");
        await loadData();
      }
    } catch {
      setError("Failed to remove assignment");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignProvider() {
    if (!pvSupervisorId || !pvProviderId) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/provider-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supervisor_id: pvSupervisorId, service_provider_id: pvProviderId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuccessMsg("Provider assigned to supervisor");
        setPvProviderId("");
        await loadData();
      }
    } catch {
      setError("Failed to assign provider");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnassignProvider(assignmentId: string) {
    if (!confirm("Remove this provider from the supervisor's team?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/provider-teams/${assignmentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuccessMsg("Provider removed from team");
        await loadData();
      }
    } catch {
      setError("Failed to remove provider");
    } finally {
      setSaving(false);
    }
  }

  // Determine valid "reports_to" targets for a selected staff member
  const validSuperiors = (staffId: string) => {
    const target = allStaff.find((s) => s.id === staffId);
    if (!target) return [];
    const roleMap: Record<string, string[]> = {
      ops_lead: ["admin"],
      manager: ["ops_lead"],
      supervisor: ["manager"],
    };
    const allowedRoles = roleMap[target.role] ?? [];
    return allStaff.filter((s) => allowedRoles.includes(s.role));
  };

  const assignableStaff = allStaff.filter((s) =>
    ["ops_lead", "manager", "supervisor"].includes(s.role)
  );
  const supervisorList = allStaff.filter((s) => s.role === "supervisor");

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Assignments</h1>
          <p className="text-gray-500 text-sm">Configure team hierarchy and provider assignments</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#004aad] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Section 1: Staff Hierarchy ── */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Staff Hierarchy (reports_to)</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Set who each staff member reports to. Ops Lead → Admin, Manager → Ops Lead, Supervisor → Manager.
              </p>
            </div>
            <div className="p-5 space-y-4">
              {/* Assign form */}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Staff Member</label>
                  <select
                    value={hierStaffId}
                    onChange={(e) => { setHierStaffId(e.target.value); setHierReportsTo(""); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                  >
                    <option value="">Select staff…</option>
                    {assignableStaff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({ROLE_LABELS[s.role] ?? s.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reports To</label>
                  <select
                    value={hierReportsTo}
                    onChange={(e) => setHierReportsTo(e.target.value)}
                    disabled={!hierStaffId}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad] disabled:bg-gray-100"
                  >
                    <option value="">Select superior…</option>
                    {validSuperiors(hierStaffId).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({ROLE_LABELS[s.role] ?? s.role})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAssignHierarchy}
                  disabled={!hierStaffId || !hierReportsTo || saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#004aad] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  Save
                </button>
              </div>

              {/* Current assignments table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Role</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Reports To</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {assignableStaff.map((s) => {
                    const superior = allStaff.find((x) => x.id === s.reports_to);
                    return (
                      <tr key={s.id} className="border-b border-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{s.name}</td>
                        <td className="px-3 py-2 text-gray-500">{ROLE_LABELS[s.role] ?? s.role}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {superior ? (
                            <span>
                              {superior.name}{" "}
                              <span className="text-gray-400 text-xs">({ROLE_LABELS[superior.role] ?? superior.role})</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {s.reports_to && (
                            <button
                              onClick={() => handleRemoveHierarchy(s.id)}
                              disabled={saving}
                              className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                              title="Remove reporting relationship"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Section 2: Supervisor ↔ Provider Mapping ── */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Supervisor ↔ Provider Mapping</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                One provider can be assigned to multiple supervisors (shared providers).
              </p>
            </div>
            <div className="p-5 space-y-4">
              {/* Assign form */}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Supervisor</label>
                  <select
                    value={pvSupervisorId}
                    onChange={(e) => setPvSupervisorId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                  >
                    <option value="">Select supervisor…</option>
                    {supervisorList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Provider</label>
                  <select
                    value={pvProviderId}
                    onChange={(e) => setPvProviderId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                  >
                    <option value="">Select provider…</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.specialization ? `(${p.specialization})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAssignProvider}
                  disabled={!pvSupervisorId || !pvProviderId || saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#004aad] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  Assign
                </button>
              </div>

              {/* Current teams */}
              <div className="space-y-3">
                {supervisorTeams.map((sv) => (
                  <div key={sv.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 text-sm">{sv.name}</span>
                        <span className="text-gray-400 text-xs">{sv.phone}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${sv.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {sv.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{sv.assignments.length} providers</span>
                    </div>
                    {sv.assignments.length > 0 && (
                      <div className="divide-y divide-gray-50">
                        {sv.assignments.map((a) =>
                          a.provider ? (
                            <div key={a.assignmentId} className="flex items-center justify-between px-4 py-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-700">{a.provider.name}</span>
                                {a.provider.specialization && (
                                  <span className="text-gray-400 text-xs">{a.provider.specialization}</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleUnassignProvider(a.assignmentId)}
                                disabled={saving}
                                className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                title="Remove from team"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
