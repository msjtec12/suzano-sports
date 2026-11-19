import type { MetadataRoute } from "next";
import { listCategories, getCatalogProducts } from "@/services/product-service";

export const dynamic = "force-dynamic";

function resolveBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://suzanosports.com.br";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = resolveBaseUrl();

  const [categories, catalogData] = await Promise.all([
    listCategories(true),
    getCatalogProducts({ includeInactive: false }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/catalogo`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/localizacao`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/catalogo?categoria=${cat.slug}`,
    lastModified: cat.updatedAt || new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = catalogData.products.map(
    (prod) => ({
      url: `${baseUrl}/produto/${prod.slug}`,
      lastModified: prod.updatedAt || new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    })
  );

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
