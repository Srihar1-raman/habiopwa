"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  on_leave: "bg-yellow-100 text-yellow-700",
};

interface Provider {
  id: string;
  name: string;
  specialization: string | null;
  status: string;
  is_active: boolean;
  phone: string | null;
}

export default function TeamPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/supervisor/team")
      .then((r) => r.json())
      .then((d) => {
        setProviders(d.providers ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-dvh pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Team</h1>
        {!loading && (
          <span className="ml-auto text-xs text-gray-500">{providers.length} members</span>
        )}
      </div>

      <div className="px-4 mt-3 flex flex-col gap-3">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : providers.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <Users className="w-10 h-10 text-gray-300" />
            <p>No team members found</p>
          </div>
        ) : (
          providers.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/supervisor/team/${p.id}`)}
              className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-gray-900">{p.name}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.is_active
                      ? STATUS_COLORS["active"]
                      : STATUS_COLORS["inactive"]
                  }`}
                >
                  {p.is_active ? p.status ?? "active" : "inactive"}
                </span>
              </div>
              {p.specialization && (
                <p className="text-sm text-gray-500">{p.specialization}</p>
              )}
              {p.phone && <p className="text-xs text-gray-400 mt-1">{p.phone}</p>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
