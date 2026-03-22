"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Briefcase, BadgeCheck, LogOut } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  phone: string;
  provider_type: string | null;
  status: string;
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProviderProfilePage() {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    fetch("/api/provider/me")
      .then((res) => {
        if (res.status === 401) { router.push("/provider/login"); return null; }
        return res.json();
      })
      .then((data) => { if (data?.provider) setProvider(data.provider); })
      .catch(() => router.push("/provider/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/provider/logout", { method: "POST" });
    } finally {
      router.push("/provider/login");
    }
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="bg-[#004aad] px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push("/provider/my-day-jobs")}
          className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-bold text-base">My Profile</h1>
      </div>

      <div className="flex-1 px-4 py-6 flex flex-col gap-5">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : provider ? (
          <>
            {/* Avatar + Name */}
            <div className="flex flex-col items-center py-6">
              <div className="w-20 h-20 rounded-full bg-[#004aad] flex items-center justify-center mb-3">
                <span className="text-white font-bold text-3xl">
                  {provider.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{provider.name}</h2>
              <span
                className={`mt-1.5 text-xs font-medium px-3 py-1 rounded-full ${
                  provider.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {formatStatus(provider.status)}
              </span>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-0">
              <div className="flex items-center gap-3 py-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-[#004aad]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-semibold text-gray-800">{provider.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Specialization</p>
                  <p className="text-sm font-semibold text-gray-800">{provider.provider_type?.replace(/_/g, ' ') || "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-semibold text-gray-800">{formatStatus(provider.status)}</p>
                </div>
              </div>
            </div>

            {/* Sign Out */}
            <div className="mt-auto pt-4">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 font-semibold rounded-xl py-3.5 text-base bg-red-50 hover:bg-red-100 disabled:opacity-60 active:scale-95 transition"
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
