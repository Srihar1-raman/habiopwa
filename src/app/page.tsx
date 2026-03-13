import { redirect } from "next/navigation";
import { getCustomerFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Root entry point — server component.
 * Checks session cookie and redirects to the correct page without
 * forcing the user to log in again on every reload or new tab.
 */
export default async function Home() {
  let customer;
  try {
    customer = await getCustomerFromRequest();
  } catch {
    redirect("/login");
  }

  if (!customer) {
    redirect("/login");
  }

  // Check if onboarding has been completed
  const { data: profile } = await supabaseAdmin
    .from("customer_profiles")
    .select("customer_id")
    .eq("customer_id", customer.id)
    .single();

  if (!profile) {
    redirect("/onboarding");
  }

  // Check plan status to send paid users directly to their active plan
  const { data: planRequest } = await supabaseAdmin
    .from("plan_requests")
    .select("id, status")
    .eq("customer_id", customer.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (planRequest?.status === "paid") {
    redirect("/plan-active");
  }

  // For all other states (no plan / submitted / under_process / finalized),
  // go to /services which renders the correct plan-status-aware view.
  redirect("/services");
}
