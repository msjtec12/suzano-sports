import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, createAuditLog } from "@/services/auth-service";
import { getCurrentUser } from "@/lib/server-auth";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await createAuditLog({
      userId: user.id,
      action: "LOGOUT",
      entityType: "AUTH",
      entityId: user.id,
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
