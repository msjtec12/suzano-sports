import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server-auth";
import { listCategories, saveCategory } from "@/services/product-service";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    await requireAuthenticatedUser();
    const categories = await listCategories(false);
    return NextResponse.json({ categories });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const result = await saveCategory(user, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
