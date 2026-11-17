import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { checkPermission } from "@/services/auth-service";
import {
  getCatalogProducts,
  listCategories,
} from "@/services/product-service";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductsAdminClient } from "@/components/admin/ProductsAdminClient";

export const dynamic = "force-dynamic";

interface AdminProductsPageProps {
  searchParams: Promise<{ novo?: string }>;
}

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const sp = await searchParams;
  const [catalogData, categories, canEdit, canDelete] = await Promise.all([
    getCatalogProducts({ includeInactive: true }),
    listCategories(false),
    checkPermission(user, "products", "edit"),
    checkPermission(user, "products", "delete"),
  ]);

  return (
    <AdminShell user={user}>
      <ProductsAdminClient
        initialProducts={catalogData.products}
        categories={categories}
        canEdit={canEdit}
        canDelete={canDelete}
        initialOpenMode={sp.novo === "rapido" ? "QUICK" : null}
      />
    </AdminShell>
  );
}
