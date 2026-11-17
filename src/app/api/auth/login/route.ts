import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, SESSION_COOKIE_NAME } from "@/services/auth-service";
import { handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    const { user, token } = await authenticateUser({
      email: String(body.email || ""),
      password: String(body.password || ""),
      ipAddress: ip,
    });

    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 horas
    });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
