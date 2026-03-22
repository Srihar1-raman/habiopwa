import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET() {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all staff for name lookups (used for reports_to names)
    const { data: allStaffNames } = await supabaseAdmin
      .from("staff_accounts")
      .select("id, name");

    const staffNameMap = new Map(
      (allStaffNames ?? []).map((s) => [s.id, s.name as string])
    );

    const [staffResult, providerResult] = await Promise.all([
      supabaseAdmin
        .from("staff_accounts")
        .select(
          `id, phone, name, email, role, status, location_id, reports_to,
           locations(id, name, city)`
        )
        .neq("role", "admin")
        .order("name"),
      supabaseAdmin
        .from("service_providers")
        .select(
          `id, name, phone, provider_type, status, location_id,
           locations(id, name, city),
           provider_team_assignments(supervisor_id, staff_accounts(id, name))`
        )
        .order("name"),
    ]);

    if (staffResult.error) {
      return NextResponse.json({ error: staffResult.error.message }, { status: 500 });
    }
    if (providerResult.error) {
      return NextResponse.json({ error: providerResult.error.message }, { status: 500 });
    }

    const staffPersonnel = (staffResult.data ?? []).map((row) => {
      const location = Array.isArray(row.locations) ? row.locations[0] : row.locations;
      return {
        person_type: "staff" as const,
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        role: row.role,
        status: row.status,
        location_id: row.location_id,
        location_name: (location as { name: string } | null)?.name ?? null,
        reports_to_name: row.reports_to ? (staffNameMap.get(row.reports_to) ?? null) : null,
        provider_type: null,
        supervisor_name: null,
      };
    });

    const providerPersonnel = (providerResult.data ?? []).map((row) => {
      const location = Array.isArray(row.locations) ? row.locations[0] : row.locations;
      const assignments = Array.isArray(row.provider_team_assignments)
        ? row.provider_team_assignments
        : [];
      const firstAssignment = assignments[0] as
        | { supervisor_id: string; staff_accounts: { id: string; name: string } | { id: string; name: string }[] }
        | undefined;
      const supervisorAccount = firstAssignment
        ? Array.isArray(firstAssignment.staff_accounts)
          ? firstAssignment.staff_accounts[0]
          : firstAssignment.staff_accounts
        : null;

      return {
        person_type: "provider" as const,
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: null,
        role: null,
        status: row.status,
        location_id: row.location_id,
        location_name: (location as { name: string } | null)?.name ?? null,
        reports_to_name: null,
        provider_type: row.provider_type,
        supervisor_name: (supervisorAccount as { name: string } | null)?.name ?? null,
      };
    });

    return NextResponse.json({
      personnel: [...staffPersonnel, ...providerPersonnel],
    });
  } catch (err) {
    console.error("All-personnel error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
