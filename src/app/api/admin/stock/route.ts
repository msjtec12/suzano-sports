import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server-auth";
import {
  getStockOverview,
  recordStockMovement,
  applyPhysicalInventoryCount,
} from "@/services/stock-service";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    const stagnantDays = Number(searchParams.get("stagnantDays") || 30);
    const overview = await getStockOverview(user, stagnantDays);
    return NextResponse.json(overview);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();

    if (body.mode === "PHYSICAL_INVENTORY") {
      const result = await applyPhysicalInventoryCount(user, {
        variationId: String(body.variationId),
        countedQuantity: Number(body.countedQuantity),
        reason: body.reason,
        idempotencyKey: body.idempotencyKey,
      });
      return NextResponse.json(result);
    }

    const result = await recordStockMovement(user, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
