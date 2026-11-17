import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { checkPermission } from "@/services/auth-service";
import { getCatalogProducts } from "@/services/product-service";
import { listSalesAdmin } from "@/services/order-and-pos-service";
import { AdminShell } from "@/components/admin/AdminShell";
import { PosAdminClient } from "@/components/admin/PosAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const [catalogData, recentSales, canApproveDiscount] = await Promise.all([
    getCatalogProducts({ includeInactive: false }),
    listSalesAdmin(user, 50),
    checkPermission(user, "pos", "approveDiscount"),
  ]);

  return (
    <AdminShell user={user}>
      <PosAdminClient
        products={catalogData.products}
        initialSales={recentSales}
        canApproveDiscount={canApproveDiscount}
      />
    </AdminShell>
  );
}
