import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId } = await params;

    const { data, error } = await supabaseAdmin
      .from("service_providers")
      .select(
        `id, name, phone, provider_type, status, location_id,
         aadhaar, address, permanent_address, notes, created_at,
         locations(id, name, city),
         provider_team_assignments(supervisor_id, staff_accounts(id, name))`
      )
      .eq("id", providerId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const location = Array.isArray(data.locations)
      ? data.locations[0]
      : data.locations;

    const assignments = Array.isArray(data.provider_team_assignments)
      ? data.provider_team_assignments
      : [];
    const firstAssignment = assignments[0] as
      | { supervisor_id: string; staff_accounts: { id: string; name: string } | { id: string; name: string }[] }
      | undefined;

    const supervisorAccount = firstAssignment
      ? Array.isArray(firstAssignment.staff_accounts)
        ? firstAssignment.staff_accounts[0]
        : firstAssignment.staff_accounts
      : null;

    return NextResponse.json({
      provider: {
        id: data.id,
        name: data.name,
        phone: data.phone,
        provider_type: data.provider_type,
        status: data.status,
        location_id: data.location_id,
        aadhaar: data.aadhaar,
        address: data.address,
        permanent_address: data.permanent_address,
        notes: data.notes,
        created_at: data.created_at,
        location_name: (location as { name: string } | null)?.name ?? null,
        location_city: (location as { city: string } | null)?.city ?? null,
        supervisor_id: firstAssignment?.supervisor_id ?? null,
        supervisor_name: (supervisorAccount as { name: string } | null)?.name ?? null,
      },
    });
  } catch (err) {
    console.error("Provider get error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId } = await params;
    const body = await req.json();
    const {
      name, status, location_id,
      aadhaar, address, permanent_address, notes, supervisor_id,
    } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (location_id !== undefined) updates.location_id = location_id || null;
    if (aadhaar !== undefined) updates.aadhaar = aadhaar || null;
    if (address !== undefined) updates.address = address || null;
    if (permanent_address !== undefined) updates.permanent_address = permanent_address || null;
    if (notes !== undefined) updates.notes = notes || null;

    const { data, error } = await supabaseAdmin
      .from("service_providers")
      .update(updates)
      .eq("id", providerId)
      .select("id, name, phone, provider_type, status, location_id, aadhaar, address, permanent_address, notes")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update supervisor assignment if provided
    if (supervisor_id !== undefined) {
      await supabaseAdmin
        .from("provider_team_assignments")
        .delete()
        .eq("service_provider_id", providerId);

      if (supervisor_id) {
        await supabaseAdmin.from("provider_team_assignments").insert({
          service_provider_id: providerId,
          supervisor_id,
        });
      }
    }

    return NextResponse.json({ provider: data });
  } catch (err) {
    console.error("Provider update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
