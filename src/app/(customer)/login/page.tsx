"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home } from "lucide-react";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-redirect if a valid session already exists (e.g. user reloads /login directly)
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated) return;
        if (!d.hasProfile) {
          router.replace("/onboarding");
        } else if (d.planStatus === "paid") {
          router.replace("/plan-active");
        } else {
          router.replace("/services");
        }
      })
      .catch(() => { /* session check failed -- stay on login */ });
  }, [router]);

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Something went wrong. Try again.");
      return;
    }
    setStep("otp");
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!otp) {
      setError("Enter the OTP");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Invalid OTP. Try again.");
      return;
    }
    if (data.hasProfile) {
      router.push("/services");
    } else {
      router.push("/onboarding");
    }
  }

  return (
    <div className="mobile-container flex flex-col">
      {/* Header */}
      <div className="px-6 pt-16 pb-8">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-lg bg-[#004aad] flex items-center justify-center">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          <span className="text-2xl font-bold text-[#004aad]">HABIO</span>
        </div>

        {step === "phone" ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back
            </h1>
            <p className="text-gray-500">
              Enter your mobile number to continue
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verify OTP
            </h1>
            <p className="text-gray-500">
              Enter the 6-digit code sent to{" "}
              <span className="font-medium text-gray-700">+91 {phone}</span>
            </p>
          </>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 px-6">
        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
            <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:border-[#004aad] focus-within:ring-2 focus-within:ring-[#004aad]/20">
              <span className="px-4 py-3 text-gray-500 bg-gray-50 border-r border-gray-300 text-base font-medium">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile number"
                className="flex-1 px-4 py-3 text-base outline-none bg-white"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" size="lg" loading={loading}>
              Get OTP
            </Button>
            <p className="text-xs text-center text-gray-400 mt-2">
              By continuing you agree to our Terms &amp; Privacy Policy
            </p>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              label="OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit OTP"
              helper="For MVP: use OTP 123456"
              error={error}
              autoFocus
            />
            <Button type="submit" size="lg" loading={loading}>
              Verify &amp; Continue
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
              }}
              className="text-sm text-[#004aad] font-medium text-center"
            >
              Change number
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-8">
        <div className="bg-[#ffbd59]/20 rounded-xl px-4 py-3 text-center flex items-center justify-center gap-2">
          <Home className="w-4 h-4 text-amber-800 flex-shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            Home services, scheduled your way
          </p>
        </div>
      </div>
    </div>
  );
}
