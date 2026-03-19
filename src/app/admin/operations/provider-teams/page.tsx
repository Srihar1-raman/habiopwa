"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  phone: string;
  specialization: string | null;
  is_active: boolean;
}

interface AssignmentEntry {
  assignmentId: string;
  provider: Provider;
  assigned_at: string;
}

interface SupervisorWithTeam {
  id: string;
  name: string;
  phone: string;
  status: string;
  assignments: AssignmentEntry[];
}

interface ServiceProvider {
  id: string;
  name: string;
  phone: string;
  specialization: string | null;
}

export default function ProviderTeamsPage() {
  const [supervisors, setSupervisors] = useState<SupervisorWithTeam[]>([]);
  const [allProviders, setAllProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignSupervisorId, setAssignSupervisorId] = useState("");
  const [assignProviderId, setAssignProviderId] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function loadData() {
    Promise.all([
      fetch("/api/admin/provider-teams").then((r) => r.json()),
      fetch("/api/admin/providers").then((r) => r.json()).catch(() => ({ providers: [] })),
    ])
      .then(([teamData, provData]) => {
        if (teamData.error) setError(teamData.error);
        else setSupervisors(teamData.supervisors ?? []);
        if (!provData.error) setAllProviders(provData.providers ?? []);
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleUnassign(assignmentId: string) {
    if (!confirm("Remove this provider from the team?")) return;
    await fetch(`/api/admin/provider-teams/${assignmentId}`, { method: "DELETE" });
    loadData();
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/provider-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supervisor_id: assignSupervisorId,
          service_provider_id: assignProviderId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to assign");
        return;
      }
      setDialogOpen(false);
      loadData();
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function openDialog() {
    setAssignSupervisorId(supervisors[0]?.id ?? "");
    setAssignProviderId("");
    setFormError(null);
    setDialogOpen(true);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Provider Teams</h1>
          <p className="text-gray-500 text-sm">Supervisors and their assigned providers</p>
        </div>
        <button
          onClick={openDialog}
          className="flex items-center gap-2 bg-[#004aad] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#003a8c] transition-colors"
        >
          <Plus size={16} /> Assign Provider
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5 animate-pulse">
              <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : supervisors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          No supervisors found
        </div>
      ) : (
        <div className="space-y-4">
          {supervisors.map((sup) => (
            <div key={sup.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{sup.name}</p>
                  <p className="text-gray-400 text-xs">{sup.phone}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sup.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {sup.status}
                </span>
              </div>
              {sup.assignments.length === 0 ? (
                <p className="px-5 py-4 text-gray-400 text-sm italic">No providers assigned</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {sup.assignments.map((a) => (
                    <li key={a.assignmentId} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.provider.name}</p>
                        <p className="text-xs text-gray-400">
                          {a.provider.phone}
                          {a.provider.specialization ? ` · ${a.provider.specialization}` : ""}
                          {!a.provider.is_active && (
                            <span className="ml-1 text-red-500">(inactive)</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnassign(a.assignmentId)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Unassign"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Assign Provider to Supervisor</h2>
            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Supervisor *</label>
                <select
                  required
                  value={assignSupervisorId}
                  onChange={(e) => setAssignSupervisorId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                >
                  <option value="">Select supervisor…</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Provider *</label>
                <select
                  required
                  value={assignProviderId}
                  onChange={(e) => setAssignProviderId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                >
                  <option value="">Select provider…</option>
                  {allProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.specialization ? ` (${p.specialization})` : ""}
                    </option>
                  ))}
                </select>
                {allProviders.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    No providers available. Add providers via Supabase.
                  </p>
                )}
              </div>

              {formError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#004aad] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
                >
                  {saving ? "Assigning…" : "Assign"}
                </button>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
