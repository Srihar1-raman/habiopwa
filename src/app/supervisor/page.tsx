import { redirect } from "next/navigation";
import { getStaffFromRequest } from "@/lib/staff-session";

/**
 * Supervisor root entry point — server component.
 * Checks the staff session cookie and redirects:
 *   - Authenticated supervisor → /supervisor/dashboard
 *   - Unauthenticated          → /supervisor/login
 */
export default async function SupervisorRootPage() {
  let staff;
  try {
    staff = await getStaffFromRequest();
  } catch {
    redirect("/supervisor/login");
  }

  if (!staff || staff.role !== "supervisor" || staff.status !== "active") {
    redirect("/supervisor/login");
  }

  redirect("/supervisor/dashboard");
}
