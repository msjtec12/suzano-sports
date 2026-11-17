import { NextRequest, NextResponse } from "next/server";
import { createWhatsAppOrderRequest } from "@/services/order-and-pos-service";
import { checkIpRateLimit } from "@/services/auth-service";
import { handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    checkIpRateLimit(`order_${ip}`, 25, 60_000);

    const body = await req.json();
    const result = await createWhatsAppOrderRequest(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
