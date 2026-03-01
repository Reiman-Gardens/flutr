import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/authz";

export async function GET() {
  const session = await auth();

  let user;
  try {
    user = requireUser(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    typeof user.institutionId !== "number" ||
    !Number.isInteger(user.institutionId) ||
    user.institutionId <= 0
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    institutionId: user.institutionId,
  });
}
