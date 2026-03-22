"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProviderLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/provider/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
      } else {
        router.push("/provider/my-day-jobs");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 px-6 py-10">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-[#004aad] flex items-center justify-center mb-3">
          <span className="text-white font-extrabold text-2xl tracking-tight">H</span>
        </div>
        <span className="text-[#004aad] font-extrabold text-2xl tracking-wide">HABIO</span>
      </div>

      <h1 className="text-xl font-bold text-gray-800 mb-1 text-center">Service Provider Login</h1>
      <p className="text-sm text-gray-500 mb-8 text-center">Enter your phone and OTP to continue</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            required
            maxLength={10}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#004aad] focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            OTP
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            placeholder="4-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            required
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-[#004aad] focus:border-transparent transition"
          />
          <p className="text-xs text-gray-400 mt-1">For MVP: use OTP 1234</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#004aad] text-white font-semibold rounded-xl py-3.5 text-base mt-2 disabled:opacity-60 active:scale-95 transition"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
