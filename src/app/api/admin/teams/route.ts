import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// GET /api/admin/teams — returns full staff hierarchy tree
// Auth: admin, ops_lead, manager
export async function GET() {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all staff accounts with their location
    const { data: allStaff, error: staffError } = await supabaseAdmin
      .from("staff_accounts")
      .select("id, name, phone, email, role, status, reports_to, location_id, locations(id, name, city, sector)")
      .order("name");

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }

    // Fetch all provider team assignments with provider details
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from("provider_team_assignments")
      .select("id, supervisor_id, service_provider_id, assigned_at, service_providers(id, name, phone, specialization, is_active)");

    if (assignError) {
      return NextResponse.json({ error: assignError.message }, { status: 500 });
    }

    const staffList = allStaff ?? [];
    const assignmentList = assignments ?? [];

    // Group assignments by supervisor_id
    const providersBySupervisor: Record<string, typeof assignmentList> = {};
    for (const a of assignmentList) {
      if (!providersBySupervisor[a.supervisor_id]) {
        providersBySupervisor[a.supervisor_id] = [];
      }
      providersBySupervisor[a.supervisor_id].push(a);
    }

    // Build hierarchy: ops_leads → managers → supervisors → providers
    const opsLeads = staffList
      .filter((s) => s.role === "ops_lead")
      .map((ol) => {
        const managers = staffList
          .filter((s) => s.role === "manager" && s.reports_to === ol.id)
          .map((mgr) => {
            const supervisors = staffList
              .filter((s) => s.role === "supervisor" && s.reports_to === mgr.id)
              .map((sv) => ({
                id: sv.id,
                name: sv.name,
                phone: sv.phone,
                status: sv.status,
                location: sv.locations ?? null,
                providers: (providersBySupervisor[sv.id] ?? []).map((a) => ({
                  assignmentId: a.id,
                  assignedAt: a.assigned_at,
                  provider: a.service_providers,
                })),
              }));

            return {
              id: mgr.id,
              name: mgr.name,
              phone: mgr.phone,
              email: mgr.email,
              status: mgr.status,
              supervisors,
            };
          });

        return {
          id: ol.id,
          name: ol.name,
          phone: ol.phone,
          email: ol.email,
          status: ol.status,
          managers,
        };
      });

    // Also include admins (top level)
    const admins = staffList
      .filter((s) => s.role === "admin")
      .map((a) => ({ id: a.id, name: a.name, email: a.email, status: a.status }));

    // Include supervisors not yet assigned to any manager
    const assignedSupervisorIds = new Set(
      staffList
        .filter((s) => s.role === "manager")
        .flatMap((mgr) => staffList.filter((s) => s.role === "supervisor" && s.reports_to === mgr.id).map((s) => s.id))
    );
    const unassignedSupervisors = staffList
      .filter((s) => s.role === "supervisor" && !assignedSupervisorIds.has(s.id))
      .map((sv) => ({
        id: sv.id,
        name: sv.name,
        phone: sv.phone,
        status: sv.status,
        location: sv.locations ?? null,
        providers: (providersBySupervisor[sv.id] ?? []).map((a) => ({
          assignmentId: a.id,
          assignedAt: a.assigned_at,
          provider: a.service_providers,
        })),
      }));

    return NextResponse.json({
      admins,
      opsLeads,
      unassignedSupervisors,
    });
  } catch (err) {
    console.error("Teams hierarchy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
