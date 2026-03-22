import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await params;

    const { data, error } = await supabaseAdmin
      .from("staff_accounts")
      .select(
        `id, phone, name, email, role, status, location_id, reports_to,
         aadhaar, address, permanent_address,
         locations(id, name, city)`
      )
      .eq("id", staffId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch reports_to name separately to avoid self-join schema cache issues
    let reports_to_name: string | null = null;
    if (data.reports_to) {
      const { data: managerData } = await supabaseAdmin
        .from("staff_accounts")
        .select("id, name")
        .eq("id", data.reports_to)
        .single();
      reports_to_name = managerData?.name ?? null;
    }

    const location = Array.isArray(data.locations)
      ? data.locations[0]
      : data.locations;

    return NextResponse.json({
      staff: {
        id: data.id,
        phone: data.phone,
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        location_id: data.location_id,
        reports_to: data.reports_to,
        aadhaar: data.aadhaar,
        address: data.address,
        permanent_address: data.permanent_address,
        location_name: location?.name ?? null,
        location_city: location?.city ?? null,
        reports_to_name: reports_to_name,
      },
    });
  } catch (err) {
    console.error("Staff get error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await params;
    const body = await req.json();
    const {
      name, email, phone, role, status,
      location_id, reports_to, aadhaar, address, permanent_address,
    } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email || null;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
    if (location_id !== undefined) updates.location_id = location_id || null;
    if (reports_to !== undefined) updates.reports_to = reports_to || null;
    if (aadhaar !== undefined) updates.aadhaar = aadhaar || null;
    if (address !== undefined) updates.address = address || null;
    if (permanent_address !== undefined) updates.permanent_address = permanent_address || null;

    const { data, error } = await supabaseAdmin
      .from("staff_accounts")
      .update(updates)
      .eq("id", staffId)
      .select("id, name, email, phone, role, status, location_id, reports_to, aadhaar, address, permanent_address")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ staff: data });
  } catch (err) {
    console.error("Staff update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
