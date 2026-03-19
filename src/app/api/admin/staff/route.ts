import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest, hashPassword } from "@/lib/staff-session";

export async function GET() {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || staff.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("staff_accounts")
      .select(
        `id, phone, name, email, role, status, location_id, reports_to,
         locations(id, name, city)`
      )
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (data ?? []).map((row) => {
      const location = Array.isArray(row.locations)
        ? row.locations[0]
        : row.locations;
      return {
        id: row.id,
        phone: row.phone,
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.status,
        location_id: row.location_id,
        reports_to: row.reports_to,
        location_name: location?.name ?? null,
        location_city: location?.city ?? null,
      };
    });

    return NextResponse.json({ staff: result });
  } catch (err) {
    console.error("Staff list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || staff.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, role, password, location_id, reports_to } = body;

    if (!name || !phone || !role || !password) {
      return NextResponse.json(
        { error: "name, phone, role, and password are required" },
        { status: 400 }
      );
    }

    const password_hash = await hashPassword(password);

    const { data, error } = await supabaseAdmin
      .from("staff_accounts")
      .insert({
        name,
        email: email || null,
        phone,
        role,
        password_hash,
        status: "active",
        location_id: location_id || null,
        reports_to: reports_to || null,
      })
      .select("id, name, email, phone, role, status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ staff: data }, { status: 201 });
  } catch (err) {
    console.error("Staff create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
