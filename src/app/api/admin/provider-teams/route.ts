import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET() {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all supervisors
    const { data: supervisors, error: supError } = await supabaseAdmin
      .from("staff_accounts")
      .select("id, name, phone, status")
      .eq("role", "supervisor")
      .order("name");

    if (supError) {
      return NextResponse.json({ error: supError.message }, { status: 500 });
    }

    // Get all provider_team_assignments with provider info
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from("provider_team_assignments")
      .select(
        `id, supervisor_id, assigned_at,
         service_providers(id, name, phone, provider_type, status)`
      );

    if (assignError) {
      return NextResponse.json({ error: assignError.message }, { status: 500 });
    }

    // Group assignments by supervisor_id
    const assignmentMap: Record<
      string,
      { assignmentId: string; provider: { id: string; name: string; phone: string; provider_type: string | null; status: string }; assigned_at: string }[]
    > = {};

    for (const a of assignments ?? []) {
      const provider = Array.isArray(a.service_providers)
        ? a.service_providers[0]
        : a.service_providers;
      if (!provider) continue;
      if (!assignmentMap[a.supervisor_id]) {
        assignmentMap[a.supervisor_id] = [];
      }
      assignmentMap[a.supervisor_id].push({
        assignmentId: a.id,
        provider: {
          id: provider.id,
          name: provider.name,
          phone: provider.phone,
          provider_type: provider.provider_type,
          status: provider.status,
        },
        assigned_at: a.assigned_at,
      });
    }

    const result = (supervisors ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      status: s.status,
      assignments: assignmentMap[s.id] ?? [],
    }));

    return NextResponse.json({ supervisors: result });
  } catch (err) {
    console.error("Provider teams GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { supervisor_id, service_provider_id } = body;

    if (!supervisor_id || !service_provider_id) {
      return NextResponse.json(
        { error: "supervisor_id and service_provider_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("provider_team_assignments")
      .insert({ supervisor_id, service_provider_id })
      .select("id, supervisor_id, service_provider_id, assigned_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (err) {
    console.error("Provider teams POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
