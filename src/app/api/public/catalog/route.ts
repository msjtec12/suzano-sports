import { NextRequest, NextResponse } from "next/server";
import { getCatalogProducts } from "@/services/product-service";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const result = await getCatalogProducts({
      query: searchParams.get("q") || undefined,
      categorySlug: searchParams.get("categoria") || undefined,
      brandSlug: searchParams.get("marca") || undefined,
      size: searchParams.get("tamanho") || undefined,
      color: searchParams.get("cor") || undefined,
      minPrice: searchParams.get("min") ? Number(searchParams.get("min")) : undefined,
      maxPrice: searchParams.get("max") ? Number(searchParams.get("max")) : undefined,
      onlyAvailable: searchParams.get("disponivel") === "true",
      onlyPromo: searchParams.get("promocao") === "true",
      sortBy:
        (searchParams.get("ordem") as "newest" | "price_asc" | "price_desc") ||
        "newest",
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
