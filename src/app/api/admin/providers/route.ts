import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET() {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("service_providers")
      .select("id, name, phone, provider_type, status, location_id, notes")
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ providers: data ?? [] });
  } catch (err) {
    console.error("Providers list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name, phone, provider_type, location_id,
      aadhaar, address, permanent_address, notes, supervisor_id,
    } = body;

    if (!name || !phone || !provider_type) {
      return NextResponse.json(
        { error: "name, phone, and provider_type are required" },
        { status: 400 }
      );
    }

    // Check for duplicate phone
    const { data: existing } = await supabaseAdmin
      .from("service_providers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A provider with this phone number already exists" },
        { status: 409 }
      );
    }

    const { data: provider, error: insertError } = await supabaseAdmin
      .from("service_providers")
      .insert({
        name,
        phone,
        provider_type,
        status: "available",
        location_id: location_id || null,
        aadhaar: aadhaar || null,
        address: address || null,
        permanent_address: permanent_address || null,
        notes: notes || null,
      })
      .select("id, name")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (supervisor_id) {
      await supabaseAdmin.from("provider_team_assignments").insert({
        service_provider_id: provider.id,
        supervisor_id,
      });
    }

    return NextResponse.json({ provider }, { status: 201 });
  } catch (err) {
    console.error("Provider create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
