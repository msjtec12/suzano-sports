import React from "react";
import { getStoreSettings } from "@/services/settings-service";
import { listCategories } from "@/services/product-service";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BagDrawer } from "./BagDrawer";

export async function StorefrontShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, categories] = await Promise.all([
    getStoreSettings(),
    listCategories(true),
  ]);

  const jsonLdStore = {
    "@context": "https://schema.org",
    "@type": "SportingGoodsStore",
    name: settings.storeName,
    description: settings.seoDescription,
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://suzanosports.com.br",
    sameAs: [settings.instagramUrl],
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.addressStreet,
      addressLocality: settings.addressCity,
      addressRegion: settings.addressState,
      postalCode: settings.addressZip,
      addressCountry: "BR",
    },
    openingHours: settings.openingHours,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdStore) }}
      />
      <Header settings={settings} categories={categories} />
      <BagDrawer />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} categories={categories} />
    </div>
  );
}
