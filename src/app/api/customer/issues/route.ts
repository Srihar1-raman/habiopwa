import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCustomerFromRequest } from "@/lib/session";

/**
 * GET /api/customer/issues
 * Returns all issue tickets raised by the current customer.
 */
export async function GET() {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: issues, error } = await supabaseAdmin
    .from("issue_tickets")
    .select("id, title, description, status, priority, created_at")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ issues: issues ?? [] });
}

/**
 * POST /api/customer/issues
 * Raises a new issue ticket for the current customer.
 */
export async function POST(req: NextRequest) {
  const customer = await getCustomerFromRequest();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description } = body;
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Fetch the customer's active plan to associate the ticket
  const { data: planRequest } = await supabaseAdmin
    .from("plan_requests")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: issue, error } = await supabaseAdmin
    .from("issue_tickets")
    .insert({
      customer_id: customer.id,
      plan_request_id: planRequest?.id ?? null,
      title: title.trim(),
      description: description?.trim() ?? null,
      status: "open",
      priority: "medium",
    })
    .select("id, title, description, status, priority, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, issue });
}
