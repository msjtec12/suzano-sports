import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server-auth";
import {
  listSalesAdmin,
  createPosSale,
  cancelOrReturnSale,
} from "@/services/order-and-pos-service";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const sales = await listSalesAdmin(user);
    return NextResponse.json({ sales });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const result = await createPosSale(user, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const result = await cancelOrReturnSale(user, {
      saleId: String(body.saleId),
      reason: String(body.reason || ""),
      returnItems: body.returnItems,
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
