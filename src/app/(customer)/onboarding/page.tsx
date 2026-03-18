"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "lucide-react";

type Step = "name" | "address" | "home";

interface FormData {
  // Name
  name: string;
  // Address
  flat_no: string;
  building: string;
  society: string;
  pincode: string;
  // Home + Kitchen (merged)
  home_type: string;
  bhk: string;
  bathrooms: string;
  diet_pref: string;
  people_count: string;
}

const STEPS: Step[] = ["name", "address", "home"];
const STEP_LABELS: Record<Step, string> = {
  name: "Your Name",
  address: "Your Address",
  home: "Home & Kitchen",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormData>({
    name: "",
    flat_no: "",
    building: "",
    society: "",
    pincode: "",
    home_type: "",
    bhk: "",
    bathrooms: "",
    diet_pref: "veg",
    people_count: "",
  });

  const stepIndex = STEPS.indexOf(step);

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleNext() {
    setError("");
    if (step === "name") {
      if (!form.name.trim()) {
        setError("Please enter your name");
        return;
      }
      setStep("address");
    } else if (step === "address") {
      if (!form.society.trim()) {
        setError("Society / Apartment is required");
        return;
      }
      if (!form.pincode.trim() || !/^\d{6}$/.test(form.pincode)) {
        setError("Enter a valid 6-digit pincode");
        return;
      }
      setStep("home");
    } else {
      handleSubmit();
    }
  }

  function handleBack() {
    if (step === "home") setStep("address");
    else if (step === "address") setStep("name");
  }

  async function handleSubmit() {
    setLoading(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        flat_no: form.flat_no,
        building: form.building,
        society: form.society,
        sector: "",
        city: "Gurugram",
        pincode: form.pincode,
        home_type: form.home_type,
        bhk: form.bhk ? Number(form.bhk) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        balconies: null,
        diet_pref: form.diet_pref,
        people_count: form.people_count ? Number(form.people_count) : null,
        cook_window_morning: false,
        cook_window_evening: false,
        kitchen_notes: "",
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save. Try again.");
      return;
    }
    router.push("/services");
  }

  return (
    <div className="flex flex-col min-h-dvh">
      {/* App bar */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        {stepIndex > 0 && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        )}
        <div className="flex-1">
          <p className="text-xs text-gray-400 font-medium">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
          <h1 className="text-lg font-bold text-gray-900">
            {STEP_LABELS[step]}
          </h1>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-6">
        <div className="h-1 rounded-full bg-gray-100">
          <div
            className="h-1 rounded-full bg-[#004aad] transition-all"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {step === "name" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              Tell us what to call you. This will be used on your profile and bookings.
            </p>
            <Input
              label="Your Full Name *"
              placeholder="e.g. Priya Sharma"
              value={form.name}
              autoFocus
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
        )}

        {step === "address" && (
          <div className="flex flex-col gap-4">
            <Input
              label="Flat / House / Floor Number"
              placeholder="e.g. A-204"
              value={form.flat_no}
              onChange={(e) => update("flat_no", e.target.value)}
            />
            <Input
              label="Building / Tower Info"
              placeholder="e.g. Tower A"
              value={form.building}
              onChange={(e) => update("building", e.target.value)}
            />
            <Input
              label="Society / Sector / Apartment *"
              placeholder="e.g. Sunrise Residency"
              value={form.society}
              onChange={(e) => update("society", e.target.value)}
            />
            <Input
              label="Pincode *"
              placeholder="e.g. 122011"
              inputMode="numeric"
              maxLength={6}
              value={form.pincode}
              onChange={(e) =>
                update("pincode", e.target.value.replace(/\D/g, ""))
              }
            />
            {/* City - display only */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">City</label>
              <div className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-base">
                Gurugram
              </div>
            </div>
          </div>
        )}

        {step === "home" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Home Type
              </label>
              <div className="flex flex-wrap gap-2">
                {["Apartment", "Villa", "Independent House", "Studio"].map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => update("home_type", type)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        form.home_type === type
                          ? "bg-[#004aad] text-white border-[#004aad]"
                          : "bg-white text-gray-700 border-gray-200"
                      }`}
                    >
                      {type}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">BHK</label>
              <div className="flex gap-2">
                {["1", "2", "3", "4", "4+"].map((bhk) => (
                  <button
                    key={bhk}
                    type="button"
                    onClick={() => update("bhk", bhk === "4+" ? "5" : bhk)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      (form.bhk === "5" && bhk === "4+") ||
                      (form.bhk === bhk && bhk !== "4+")
                        ? "bg-[#004aad] text-white border-[#004aad]"
                        : "bg-white text-gray-700 border-gray-200"
                    }`}
                  >
                    {bhk}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Washrooms / Toilets"
              type="number"
              min="1"
              max="10"
              inputMode="numeric"
              value={form.bathrooms}
              onChange={(e) => update("bathrooms", e.target.value)}
              placeholder="Number of washrooms/toilets"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Diet Preference
              </label>
              <div className="flex gap-2">
                {[
                  { val: "veg", label: "Veg" },
                  { val: "non-veg", label: "Non-veg" },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => update("diet_pref", val)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
                      form.diet_pref === val
                        ? "bg-[#004aad] text-white border-[#004aad]"
                        : "bg-white text-gray-700 border-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Number of People"
              type="number"
              min="1"
              max="20"
              inputMode="numeric"
              value={form.people_count}
              onChange={(e) => update("people_count", e.target.value)}
              placeholder="How many people in your home"
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 mt-3">{error}</p>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="px-4 py-4 border-t border-gray-100 bg-white">
        <Button
          size="lg"
          loading={loading}
          onClick={handleNext}
          className="w-full"
        >
          {step === "home" ? "Save & Continue" : "Next"}
        </Button>
      </div>
    </div>
  );
}
