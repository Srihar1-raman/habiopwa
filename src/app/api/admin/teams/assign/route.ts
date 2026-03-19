import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// POST /api/admin/teams/assign — set reports_to for a staff member
// DELETE /api/admin/teams/assign — remove reports_to for a staff member
// Auth: admin, ops_lead

export async function POST(req: NextRequest) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { staff_id, reports_to } = body ?? {};

    if (!staff_id || !reports_to) {
      return NextResponse.json({ error: "staff_id and reports_to are required" }, { status: 400 });
    }

    // Prevent circular references: reports_to cannot be the same as staff_id
    if (staff_id === reports_to) {
      return NextResponse.json({ error: "A staff member cannot report to themselves" }, { status: 400 });
    }

    // Fetch both staff members to validate roles
    const { data: targetStaff } = await supabaseAdmin
      .from("staff_accounts")
      .select("id, role, reports_to")
      .eq("id", staff_id)
      .single();

    const { data: reportsToStaff } = await supabaseAdmin
      .from("staff_accounts")
      .select("id, role")
      .eq("id", reports_to)
      .single();

    if (!targetStaff || !reportsToStaff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Validate role hierarchy (1:1 upward mapping)
    const validMappings: Record<string, string[]> = {
      ops_lead: ["admin"],
      manager: ["ops_lead"],
      supervisor: ["manager"],
    };

    const allowedSuperiorRoles = validMappings[targetStaff.role] ?? [];
    if (!allowedSuperiorRoles.includes(reportsToStaff.role)) {
      return NextResponse.json(
        { error: `A ${targetStaff.role} can only report to: ${allowedSuperiorRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Circular reference check: walk up the chain to ensure reports_to is not a descendant of staff_id
    let cursor = reportsToStaff as { id: string; role: string } | null;
    const visited = new Set<string>();
    while (cursor) {
      if (visited.has(cursor.id)) break;
      if (cursor.id === staff_id) {
        return NextResponse.json({ error: "Circular reference detected in hierarchy" }, { status: 400 });
      }
      visited.add(cursor.id);
      const { data: parent } = await supabaseAdmin
        .from("staff_accounts")
        .select("id, role, reports_to")
        .eq("id", (cursor as { id: string; role: string; reports_to?: string }).reports_to ?? "")
        .maybeSingle();
      cursor = parent ?? null;
    }

    const { error } = await supabaseAdmin
      .from("staff_accounts")
      .update({ reports_to })
      .eq("id", staff_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Teams assign error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { staff_id } = body ?? {};

    if (!staff_id) {
      return NextResponse.json({ error: "staff_id is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("staff_accounts")
      .update({ reports_to: null })
      .eq("id", staff_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Teams unassign error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
