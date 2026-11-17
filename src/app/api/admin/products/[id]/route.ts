import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server-auth";
import {
  updateProduct,
  setProductStatus,
  duplicateProduct,
  softDeleteProduct,
  getProductBySlugOrId,
} from "@/services/product-service";
import { handleApiError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuthenticatedUser();
    const { id } = await context.params;
    const product = await getProductBySlugOrId(id, true);
    return NextResponse.json({ product });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const body = await req.json();

    if (body.action === "SET_STATUS") {
      const updated = await setProductStatus(user, id, body.status);
      return NextResponse.json({ product: updated });
    }

    if (body.action === "DUPLICATE") {
      const duplicated = await duplicateProduct(user, id);
      return NextResponse.json(duplicated, { status: 201 });
    }

    const updated = await updateProduct(user, id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const result = await softDeleteProduct(user, id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
