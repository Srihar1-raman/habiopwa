import { redirect } from "next/navigation";
import { getStaffFromRequest } from "@/lib/staff-session";

const ADMIN_ROLES = ["admin", "ops_lead", "manager"];

/**
 * Admin root entry point — server component.
 * Checks the staff session cookie and redirects:
 *   - Authenticated admin/ops_lead/manager → /admin/dashboard
 *   - Unauthenticated or wrong role         → /admin/login
 */
export default async function AdminRootPage() {
  let staff;
  try {
    staff = await getStaffFromRequest();
  } catch {
    redirect("/admin/login");
  }

  if (!staff || staff.status !== "active" || !ADMIN_ROLES.includes(staff.role)) {
    redirect("/admin/login");
  }

  redirect("/admin/dashboard");
}
