import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// PATCH /api/admin/plan-requests/[planRequestId]/items/[itemId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planRequestId: string; itemId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planRequestId, itemId } = await params;
    const body = await req.json();
    const { title, unit_value, price_monthly } = body ?? {};

    if (title === undefined && unit_value === undefined && price_monthly === undefined) {
      return NextResponse.json(
        { error: "At least one of title, unit_value, or price_monthly is required" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (unit_value !== undefined) updates.unit_value = unit_value;
    if (price_monthly !== undefined) updates.price_monthly = price_monthly;

    const { data: item, error: updateError } = await supabaseAdmin
      .from("plan_request_items")
      .update(updates)
      .eq("id", itemId)
      .eq("plan_request_id", planRequestId)
      .select("*")
      .single();

    if (updateError || !item) {
      return NextResponse.json({ error: updateError?.message ?? "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    console.error("Plan request item PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/plan-requests/[planRequestId]/items/[itemId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planRequestId: string; itemId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planRequestId, itemId } = await params;

    const { error: deleteError } = await supabaseAdmin
      .from("plan_request_items")
      .delete()
      .eq("id", itemId)
      .eq("plan_request_id", planRequestId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Plan request item DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
