"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "lucide-react";

type Step = "address" | "home" | "kitchen";

interface FormData {
  // Address
  flat_no: string;
  building: string;
  society: string;
  sector: string;
  city: string;
  pincode: string;
  // Home
  home_type: string;
  bhk: string;
  bathrooms: string;
  balconies: string;
  // Kitchen
  diet_pref: string;
  people_count: string;
  cook_window_morning: boolean;
  cook_window_evening: boolean;
  kitchen_notes: string;
}

const STEPS: Step[] = ["address", "home", "kitchen"];
const STEP_LABELS: Record<Step, string> = {
  address: "Your Address",
  home: "Home Details",
  kitchen: "Kitchen Context",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("address");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormData>({
    flat_no: "",
    building: "",
    society: "",
    sector: "",
    city: "",
    pincode: "",
    home_type: "",
    bhk: "",
    bathrooms: "",
    balconies: "",
    diet_pref: "veg",
    people_count: "",
    cook_window_morning: false,
    cook_window_evening: false,
    kitchen_notes: "",
  });

  const stepIndex = STEPS.indexOf(step);

  function update(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleNext() {
    setError("");
    if (step === "address") {
      if (!form.flat_no.trim()) {
        setError("Flat/house number is required");
        return;
      }
      setStep("home");
    } else if (step === "home") {
      setStep("kitchen");
    } else {
      handleSubmit();
    }
  }

  function handleBack() {
    if (step === "home") setStep("address");
    else if (step === "kitchen") setStep("home");
  }

  async function handleSubmit() {
    setLoading(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        bhk: form.bhk ? Number(form.bhk) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        balconies: form.balconies ? Number(form.balconies) : null,
        people_count: form.people_count ? Number(form.people_count) : null,
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
        {step === "address" && (
          <div className="flex flex-col gap-4">
            <Input
              label="Flat / House No. *"
              placeholder="e.g. A-204"
              value={form.flat_no}
              onChange={(e) => update("flat_no", e.target.value)}
            />
            <Input
              label="Building / Tower"
              placeholder="e.g. Tower A"
              value={form.building}
              onChange={(e) => update("building", e.target.value)}
            />
            <Input
              label="Society / Apartment"
              placeholder="e.g. Sunrise Residency"
              value={form.society}
              onChange={(e) => update("society", e.target.value)}
            />
            <Input
              label="Sector / Area"
              placeholder="e.g. Sector 56"
              value={form.sector}
              onChange={(e) => update("sector", e.target.value)}
            />
            <Input
              label="City"
              placeholder="e.g. Gurgaon"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
            <Input
              label="Pincode"
              placeholder="e.g. 122011"
              inputMode="numeric"
              maxLength={6}
              value={form.pincode}
              onChange={(e) =>
                update("pincode", e.target.value.replace(/\D/g, ""))
              }
            />
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
              label="Bathrooms"
              type="number"
              min="1"
              max="10"
              inputMode="numeric"
              value={form.bathrooms}
              onChange={(e) => update("bathrooms", e.target.value)}
              placeholder="Number of bathrooms"
            />
            <Input
              label="Balconies (optional)"
              type="number"
              min="0"
              max="10"
              inputMode="numeric"
              value={form.balconies}
              onChange={(e) => update("balconies", e.target.value)}
              placeholder="Number of balconies"
            />
          </div>
        )}

        {step === "kitchen" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Diet Preference
              </label>
              <div className="flex gap-2">
                {[
                  { val: "veg", label: "🥦 Veg" },
                  { val: "non-veg", label: "🍖 Non-veg" },
                  { val: "egg", label: "🥚 Egg" },
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
              placeholder="How many people to cook for"
            />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Preferred Cook Windows
              </label>
              {[
                {
                  key: "cook_window_morning" as const,
                  label: "🌅 Morning (6–10 AM)",
                },
                {
                  key: "cook_window_evening" as const,
                  label: "🌆 Evening (5–9 PM)",
                },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => update(key, !form[key])}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all ${
                    form[key]
                      ? "bg-[#004aad]/10 text-[#004aad] border-[#004aad]"
                      : "bg-white text-gray-700 border-gray-200"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      form[key]
                        ? "bg-[#004aad] border-[#004aad]"
                        : "border-gray-300"
                    }`}
                  >
                    {form[key] && (
                      <svg
                        className="w-3 h-3 text-white"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Allergies / Notes (optional)
              </label>
              <textarea
                value={form.kitchen_notes}
                onChange={(e) => update("kitchen_notes", e.target.value)}
                placeholder="e.g. No onion-garlic, nut allergy…"
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 resize-none"
              />
            </div>
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
          {step === "kitchen" ? "Save & Continue" : "Next"}
        </Button>
      </div>
    </div>
  );
}
