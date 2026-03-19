"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil } from "lucide-react";

interface Location {
  id: string;
  name: string;
  city: string;
  state: string | null;
  pincode: string | null;
  is_active: boolean;
}

const emptyForm = {
  name: "",
  city: "",
  state: "",
  pincode: "",
};

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function loadLocations() {
    fetch("/api/admin/locations")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setLocations(data.locations ?? []);
      })
      .catch(() => setError("Failed to load locations"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadLocations();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(loc: Location) {
    setEditingId(loc.id);
    setForm({
      name: loc.name,
      city: loc.city,
      state: loc.state ?? "",
      pincode: loc.pincode ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function toggleActive(loc: Location) {
    await fetch(`/api/admin/locations/${loc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !loc.is_active }),
    });
    loadLocations();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const url = editingId ? `/api/admin/locations/${editingId}` : "/api/admin/locations";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to save");
        return;
      }
      setDialogOpen(false);
      loadLocations();
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-gray-500 text-sm">{locations.length} locations</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#004aad] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#003a8c] transition-colors"
        >
          <Plus size={16} /> Create Location
        </button>
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">State</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Pincode</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Active</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && locations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No locations found
                </td>
              </tr>
            )}
            {!loading &&
              locations.map((loc) => (
                <tr key={loc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{loc.name}</td>
                  <td className="px-4 py-3 text-gray-700">{loc.city}</td>
                  <td className="px-4 py-3 text-gray-500">{loc.state ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{loc.pincode ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(loc)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                        loc.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {loc.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(loc)}
                      className="flex items-center gap-1 text-gray-500 hover:text-[#004aad] transition-colors text-xs"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingId ? "Edit Location" : "Create Location"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                <input
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                <input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pincode</label>
                <input
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                />
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
                  {saving ? "Saving…" : editingId ? "Update" : "Create"}
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
