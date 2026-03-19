import { NextResponse } from "next/server";
import { getStaffFromRequest } from "@/lib/staff-session";

export async function GET() {
  const staff = await getStaffFromRequest();

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    staff: {
      id: staff.id,
      name: staff.name,
      phone: staff.phone,
      role: staff.role,
      status: staff.status,
      location_id: staff.location_id,
    },
  });
}
