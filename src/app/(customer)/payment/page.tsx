"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Clock, CheckCircle2, XCircle, Lock, ChevronLeft } from "lucide-react";

type PaymentState = "idle" | "processing" | "success" | "error";

interface PlanRequest {
  id: string;
  request_code: string;
  status: string;
  total_price_monthly: number;
}

export default function PaymentPage() {
  const router = useRouter();
  const [planRequest, setPlanRequest] = useState<PlanRequest | null>(null);
  const [payState, setPayState] = useState<PaymentState>("idle");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plan/current")
      .then((r) => r.json())
      .then((d) => {
        setPlanRequest(d.planRequest);
        setLoading(false);
      });
  }, []);

  async function handlePay() {
    if (!planRequest) return;
    setPayState("processing");

    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 2000));

    const res = await fetch("/api/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_request_id: planRequest.id }),
    });

    if (res.ok) {
      setPayState("success");
      setTimeout(() => router.push("/plan-active"), 2500);
    } else {
      setPayState("error");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (!planRequest || planRequest.status !== "payment_pending") {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center px-8 text-center gap-4">
        <Clock className="w-12 h-12 text-amber-400" />
        <h2 className="text-xl font-bold text-gray-900">Not ready yet</h2>
        <p className="text-gray-500">
          Your plan is being reviewed. Come back once itYour plan is being reviewed. Come back once it&apos;s finalized.apos;s ready for payment.
        </p>
        <Button onClick={() => router.push("/services")} variant="outline">
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh items-center justify-center px-6 gap-6">
      {payState === "idle" && (
        <>
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-[#004aad]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Confirm Payment
            </h1>
            <p className="text-gray-500 mt-2">Monthly plan subscription</p>
          </div>

          <div className="w-full bg-blue-50 rounded-2xl p-5 text-center">
            <p className="text-sm text-gray-500">Plan total</p>
            <p className="text-4xl font-bold text-[#004aad] mt-1">
              {formatCurrency(planRequest.total_price_monthly)}
            </p>
            <p className="text-sm text-gray-400 mt-1">per month</p>
          </div>

          <div className="w-full bg-[#ffbd59]/20 rounded-xl px-4 py-3 flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Payment processing is stubbed for this MVP. No real charge will
              occur.
            </p>
          </div>

          <Button size="lg" className="w-full" onClick={handlePay}>
            Pay {formatCurrency(planRequest.total_price_monthly)}
          </Button>

          <button
            onClick={() => router.push("/services")}
            className="flex items-center gap-1 text-sm text-gray-500"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to plan summary
          </button>
        </>
      )}

      {payState === "processing" && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Clock className="w-8 h-8 text-[#004aad]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Processing…</h2>
          <p className="text-gray-400 mt-2">Please wait</p>
        </div>
      )}

      {payState === "success" && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-700">
            Payment Successful!
          </h2>
          <p className="text-gray-500 mt-2">Redirecting to your active plan…</p>
        </div>
      )}

      {payState === "error" && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-red-700">Payment Failed</h2>
          <p className="text-gray-500 mt-2 mb-6">Something went wrong.</p>
          <Button onClick={() => setPayState("idle")}>Try Again</Button>
        </div>
      )}
    </div>
  );
}
