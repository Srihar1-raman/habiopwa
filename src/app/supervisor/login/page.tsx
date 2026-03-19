"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SupervisorLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/supervisor/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      router.push("/supervisor/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mobile-container min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#004aad] flex items-center justify-center">
          <span className="text-white font-bold text-sm">H</span>
        </div>
        <span className="text-white font-bold">HABIO Supervisor</span>
      </div>

      {/* Login Card */}
      <div className="p-6 flex flex-col gap-6">
        <div className="text-center mt-4">
          <h1 className="text-2xl font-bold text-gray-900">Supervisor Login</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Enter your phone number and OTP to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="phone"
              className="text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={13}
              placeholder="e.g. 9100000001"
              value={phone}
              onChange={(e) => setPhone(e.target.value.trim())}
              required
              className="border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#004aad]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="otp" className="text-sm font-medium text-gray-700">
              OTP (last 4 digits of phone)
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="e.g. 0001"
              value={otp}
              onChange={(e) => setOtp(e.target.value.trim())}
              required
              className="border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#004aad]"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#004aad] text-white font-semibold rounded-lg py-3 mt-2 disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
