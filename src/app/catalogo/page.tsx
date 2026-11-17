import React from "react";
import type { Metadata } from "next";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { CatalogClient } from "@/components/storefront/CatalogClient";
import { getStoreSettings } from "@/services/settings-service";
import {
  listCategories,
  listBrands,
  getCatalogProducts,
} from "@/services/product-service";
import { buildWhatsAppUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    marca?: string;
    tamanho?: string;
    cor?: string;
    disponivel?: string;
    promocao?: string;
    favoritos?: string;
    ordem?: "newest" | "price_asc" | "price_desc";
  }>;
}

export async function generateMetadata({
  searchParams,
}: CatalogPageProps): Promise<Metadata> {
  const sp = await searchParams;
  const categories = await listCategories(true);
  const activeCat = categories.find((c) => c.slug === sp.categoria);

  if (sp.promocao === "true") {
    return {
      title: "Outlet Esportivo em Suzano | Promoções e Ofertas",
      description:
        "Confira as ofertas de outlet esportivo na Suzano Sports, no centro de Suzano. Tênis, chuteiras, roupas e acessórios com descontos reais.",
    };
  }

  if (activeCat) {
    return {
      title: activeCat.seoTitle || `${activeCat.name} em Suzano`,
      description:
        activeCat.seoDescription ||
        activeCat.description ||
        `Compre ${activeCat.name} na Suzano Sports, Rua Benjamin Constant, 810 — Centro, Suzano - SP.`,
    };
  }

  return {
    title: "Catálogo de Tênis, Roupas Esportivas e Acessórios em Suzano",
    description:
      "Explore o catálogo da Suzano Sports: tênis esportivos e casuais, calçados para treino, chuteiras, roupas esportivas, chinelos, bonés e mochilas no centro de Suzano.",
  };
}

export default async function CatalogoPage({ searchParams }: CatalogPageProps) {
  const sp = await searchParams;
  const [settings, categories, brands, catalogData] = await Promise.all([
    getStoreSettings(),
    listCategories(true),
    listBrands(true),
    getCatalogProducts({ includeInactive: false }),
  ]);

  const { url: whatsappUrl } = buildWhatsAppUrl({
    whatsappPhone: settings.whatsappPhone,
    whatsappShortLink: settings.whatsappShortLink,
    message:
      "Olá, Suzano Sports! Estou navegando no catálogo do site e gostaria de ajuda para escolher um produto.",
  });

  return (
    <StorefrontShell>
      <CatalogClient
        initialProducts={catalogData.products}
        categories={categories}
        brands={brands}
        sizes={catalogData.facets.sizes}
        colors={catalogData.facets.colors}
        showNumericStock={settings.showNumericStockToCustomer}
        whatsappUrl={whatsappUrl}
        initialParams={{
          q: sp.q,
          categoria: sp.categoria,
          marca: sp.marca,
          tamanho: sp.tamanho,
          cor: sp.cor,
          disponivel: sp.disponivel === "true",
          promocao: sp.promocao === "true",
          favoritos: sp.favoritos === "true",
          ordem: sp.ordem,
        }}
      />
    </StorefrontShell>
  );
}
