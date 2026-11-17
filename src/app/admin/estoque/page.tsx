import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { getStockOverview } from "@/services/stock-service";
import { AdminShell } from "@/components/admin/AdminShell";
import { StockAdminClient } from "@/components/admin/StockAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminStockPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const overview = await getStockOverview(user, 30);

  return (
    <AdminShell user={user}>
      <StockAdminClient initialData={overview} />
    </AdminShell>
  );
}
