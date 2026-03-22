"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Phone, User, Home } from "lucide-react";

type Step = 1 | 2 | 3;

const STEPS = [
  { id: 1, label: "Phone & OTP", icon: Phone },
  { id: 2, label: "Basic Info", icon: User },
  { id: 3, label: "Home Profile", icon: Home },
];

const HARDCODED_OTP = "1234";

export default function NewCustomerPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 2
  const [name, setName] = useState("");

  // Step 3
  const [profile, setProfile] = useState({
    flat_no: "",
    building: "",
    society: "",
    sector: "",
    city: "",
    pincode: "",
    home_type: "",
    bhk: "",
    bathrooms: "",
    balconies: "0",
    cars: "0",
    plants: "0",
    diet_pref: "",
    people_count: "",
  });

  // --- OTP helpers ---

  function handleOtpDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length > 0) {
      const next = ["", "", "", ""];
      for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
      setOtpDigits(next);
      otpRefs.current[Math.min(pasted.length, 3)]?.focus();
    }
  }

  // --- Step 1: Send OTP ---

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    // Check if customer already exists before showing OTP
    const res = await fetch(`/api/admin/customers`);
    const data = await res.json();
    setLoading(false);
    if (data.customers?.some((c: { phone: string }) => c.phone === phone)) {
      setError("Customer already exists");
      return;
    }
    setOtpSent(true);
    setOtpDigits(["", "", "", ""]);
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const otp = otpDigits.join("");
    if (otp.length < 4) {
      setError("Enter the 4-digit OTP");
      return;
    }
    if (otp !== HARDCODED_OTP) {
      setError("Invalid OTP. Try again.");
      return;
    }
    setStep(2);
  }

  // --- Step 2: Basic Info ---

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setStep(3);
  }

  // --- Step 3: Submit ---

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!profile.flat_no.trim()) {
      setError("Flat / Unit No. is required");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        name,
        ...profile,
        bhk: profile.bhk !== "" ? Number(profile.bhk) : undefined,
        bathrooms: profile.bathrooms !== "" ? Number(profile.bathrooms) : undefined,
        balconies: Number(profile.balconies),
        cars: Number(profile.cars),
        plants: Number(profile.plants),
        people_count: profile.people_count !== "" ? Number(profile.people_count) : undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push(`/admin/customers/${data.customerId}`);
  }

  function profileField(key: keyof typeof profile, value: string) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  // --- UI ---

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => {
            if (step === 1) router.push("/admin/customers");
            else setStep((s) => (s - 1) as Step);
          }}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Customer</h1>
          <p className="text-sm text-gray-500">Step {step} of 3</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, idx) => {
          const isCompleted = step > s.id;
          const isActive = step === s.id;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    isCompleted
                      ? "bg-[#004aad] text-white"
                      : isActive
                      ? "bg-[#004aad] text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isCompleted ? <Check size={14} /> : s.id}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block ${
                    isActive ? "text-[#004aad]" : isCompleted ? "text-gray-700" : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    step > s.id ? "bg-[#004aad]" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Phone Verification</h2>
            <p className="text-sm text-gray-500 mb-6">Enter the customer's mobile number to get started</p>

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mobile Number
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#004aad] focus-within:ring-2 focus-within:ring-[#004aad]/20">
                    <span className="px-3 py-2.5 text-gray-500 bg-gray-50 border-r border-gray-300 text-sm font-medium">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="10-digit mobile number"
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                      autoFocus
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#004aad] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {loading ? "Checking…" : "Send OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    OTP sent to{" "}
                    <span className="font-medium text-gray-900">+91 {phone}</span>
                  </p>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Enter 4-digit OTP
                  </label>
                  <div className="flex gap-3">
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="tel"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        aria-label={`OTP digit ${i + 1}`}
                        className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all bg-white text-gray-900 border-gray-300 focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 caret-transparent"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">For MVP: use OTP 1234</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#004aad] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {loading ? "Verifying…" : "Verify OTP"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpDigits(["", "", "", ""]);
                    setError("");
                  }}
                  className="text-sm text-[#004aad] font-medium text-center"
                >
                  Change number
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Basic Information</h2>
              <p className="text-sm text-gray-500 mb-6">Enter the customer's name</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer's full name"
                autoFocus
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#004aad] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Next →
            </button>
          </form>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Home Profile</h2>
              <p className="text-sm text-gray-500 mb-2">Fill in the home details</p>
            </div>

            {/* Address fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Flat / Unit No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.flat_no}
                  onChange={(e) => profileField("flat_no", e.target.value)}
                  placeholder="e.g. A-204"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Building</label>
                <input
                  type="text"
                  value={profile.building}
                  onChange={(e) => profileField("building", e.target.value)}
                  placeholder="Building name"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Society</label>
                <input
                  type="text"
                  value={profile.society}
                  onChange={(e) => profileField("society", e.target.value)}
                  placeholder="Society / Complex name"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sector</label>
                <input
                  type="text"
                  value={profile.sector}
                  onChange={(e) => profileField("sector", e.target.value)}
                  placeholder="Sector / Area"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => profileField("city", e.target.value)}
                  placeholder="City"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Pincode</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={profile.pincode}
                  onChange={(e) => profileField("pincode", e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit pincode"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20"
                />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Home details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Home Type</label>
                <select
                  value={profile.home_type}
                  onChange={(e) => profileField("home_type", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 bg-white"
                >
                  <option value="">Select…</option>
                  <option value="apartment">Apartment</option>
                  <option value="villa">Villa</option>
                  <option value="independent_house">Independent House</option>
                  <option value="penthouse">Penthouse</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">BHK</label>
                <select
                  value={profile.bhk}
                  onChange={(e) => profileField("bhk", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 bg-white"
                >
                  <option value="">Select…</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} BHK</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bathrooms</label>
                <select
                  value={profile.bathrooms}
                  onChange={(e) => profileField("bathrooms", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 bg-white"
                >
                  <option value="">Select…</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Balconies</label>
                <select
                  value={profile.balconies}
                  onChange={(e) => profileField("balconies", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 bg-white"
                >
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cars</label>
                <select
                  value={profile.cars}
                  onChange={(e) => profileField("cars", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 bg-white"
                >
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plants</label>
                <select
                  value={profile.plants}
                  onChange={(e) => profileField("plants", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 bg-white"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Diet Preference</label>
                <select
                  value={profile.diet_pref}
                  onChange={(e) => profileField("diet_pref", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 bg-white"
                >
                  <option value="">Select…</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="non_vegetarian">Non-Vegetarian</option>
                  <option value="eggetarian">Eggetarian</option>
                  <option value="vegan">Vegan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">No. of People</label>
                <select
                  value={profile.people_count}
                  onChange={(e) => profileField("people_count", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 bg-white"
                >
                  <option value="">Select…</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#004aad] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? "Creating Customer…" : "Create Customer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
