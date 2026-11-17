import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server-auth";
import {
  listOrdersAdmin,
  updateOrderStatus,
  confirmOrderAsSale,
} from "@/services/order-and-pos-service";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL";
    const orders = await listOrdersAdmin(user, status);
    return NextResponse.json({ orders });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const result = await confirmOrderAsSale(user, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const updated = await updateOrderStatus(
      user,
      String(body.orderId),
      body.status,
      body.internalNotes
    );
    return NextResponse.json({ order: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
