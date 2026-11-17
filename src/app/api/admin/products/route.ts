import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server-auth";
import { requirePermission } from "@/services/auth-service";
import {
  getCatalogProducts,
  createProductComplete,
  createProductQuick,
} from "@/services/product-service";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    await requirePermission(user, "products", "view");

    const { searchParams } = new URL(req.url);
    const data = await getCatalogProducts({
      query: searchParams.get("q") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      includeInactive: true,
    });

    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();

    if (body.mode === "QUICK") {
      const created = await createProductQuick(user, body);
      return NextResponse.json(created, { status: 201 });
    }

    const created = await createProductComplete(user, body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
