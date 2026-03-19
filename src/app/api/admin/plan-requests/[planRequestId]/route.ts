import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffFromRequest } from "@/lib/staff-session";

// PATCH /api/admin/plan-requests/[planRequestId]
// Update assigned_supervisor_id and/or status for a plan request
// Auth: admin, ops_lead, manager
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planRequestId: string }> }
) {
  try {
    const staff = await getStaffFromRequest();
    if (!staff || !["admin", "ops_lead", "manager"].includes(staff.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planRequestId } = await params;
    const body = await req.json();
    const { assigned_supervisor_id, status } = body ?? {};

    if (!assigned_supervisor_id && !status) {
      return NextResponse.json(
        { error: "At least one of assigned_supervisor_id or status is required" },
        { status: 400 }
      );
    }

    // Verify plan request exists
    const { data: planRequest, error: fetchError } = await supabaseAdmin
      .from("plan_requests")
      .select("id, status, assigned_supervisor_id")
      .eq("id", planRequestId)
      .single();

    if (fetchError || !planRequest) {
      return NextResponse.json({ error: "Plan request not found" }, { status: 404 });
    }

    // If assigning a supervisor, validate supervisor exists and is active
    if (assigned_supervisor_id) {
      const { data: supervisor } = await supabaseAdmin
        .from("staff_accounts")
        .select("id, role, status")
        .eq("id", assigned_supervisor_id)
        .eq("role", "supervisor")
        .eq("status", "active")
        .single();

      if (!supervisor) {
        return NextResponse.json(
          { error: "Supervisor not found or not active" },
          { status: 404 }
        );
      }
    }

    // Build update object
    const updates: Record<string, string> = {};
    if (assigned_supervisor_id) {
      updates.assigned_supervisor_id = assigned_supervisor_id;
      // Auto-advance status when supervisor is first assigned
      if (
        !status &&
        (planRequest.status === "submitted" ||
          planRequest.status === "captain_allocation_pending")
      ) {
        updates.status = "captain_review_pending";
      }
    }
    if (status) {
      updates.status = status;
    }

    const { error: updateError } = await supabaseAdmin
      .from("plan_requests")
      .update(updates)
      .eq("id", planRequestId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the event
    const eventNote =
      assigned_supervisor_id && !planRequest.assigned_supervisor_id
        ? `Supervisor allocated by admin (${staff.name})`
        : assigned_supervisor_id
        ? `Supervisor reassigned by admin (${staff.name})`
        : `Status updated to ${status} by admin (${staff.name})`;

    await supabaseAdmin.from("plan_request_events").insert({
      plan_request_id: planRequestId,
      event_type: assigned_supervisor_id ? "supervisor_assigned" : "status_changed",
      note: eventNote,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Plan request patch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
