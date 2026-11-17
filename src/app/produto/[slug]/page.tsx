import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { ProductDetailClient } from "@/components/storefront/ProductDetailClient";
import { ProductCard } from "@/components/storefront/ProductCard";
import {
  getProductBySlugOrId,
  getCatalogProducts,
} from "@/services/product-service";
import { getStoreSettings } from "@/services/settings-service";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlugOrId(slug, false);
  if (!product) {
    return {
      title: "Produto não encontrado",
    };
  }

  return {
    title: `${product.name} em Suzano`,
    description:
      product.shortDescription ||
      `Compre ${product.name} (${product.categoryName}) na Suzano Sports, no centro de Suzano. Confira disponibilidade de tamanhos e cores.`,
    openGraph: {
      title: `${product.name} | Suzano Sports`,
      description:
        product.shortDescription ||
        `${product.name} disponível na Suzano Sports — Centro de Suzano.`,
      images: [{ url: product.primaryImage }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProductBySlugOrId(slug, false),
    getStoreSettings(),
  ]);

  if (!product) {
    notFound();
  }

  const relatedData = await getCatalogProducts({
    categorySlug: product.categorySlug,
    includeInactive: false,
  });

  const relatedProducts = relatedData.products
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://suzanosports.com.br";

  const jsonLdProduct = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    image: product.images.map((i) => i.url),
    description:
      product.shortDescription ||
      product.fullDescription ||
      `${product.name} na Suzano Sports em Suzano - SP`,
    brand: product.brandName
      ? {
          "@type": "Brand",
          name: product.brandName,
        }
      : undefined,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/produto/${product.slug}`,
      priceCurrency: "BRL",
      price: product.effectivePrice,
      availability: product.isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "SportingGoodsStore",
        name: settings.storeName,
      },
    },
  };

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.categoryName,
        item: `${siteUrl}/catalogo?categoria=${product.categorySlug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${siteUrl}/produto/${product.slug}`,
      },
    ],
  };

  return (
    <StorefrontShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb Visual */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-brand-blue">
                Início
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link
                href={`/catalogo?categoria=${product.categorySlug}`}
                className="hover:text-brand-blue"
              >
                {product.categoryName}
              </Link>
            </li>
            <li>/</li>
            <li className="font-bold text-brand-graphite">{product.name}</li>
          </ol>
        </nav>

        <ProductDetailClient product={product} settings={settings} />

        {/* Produtos Relacionados */}
        {relatedProducts.length > 0 && (
          <section className="mt-14 border-t border-slate-200 pt-10">
            <h2 className="text-xl font-black text-brand-graphite sm:text-2xl">
              Produtos Relacionados em {product.categoryName}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((rel) => (
                <ProductCard
                  key={rel.id}
                  product={rel}
                  showNumericStock={settings.showNumericStockToCustomer}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </StorefrontShell>
  );
}
