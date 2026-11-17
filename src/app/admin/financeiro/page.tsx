import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { getFinancialOverview } from "@/services/finance-and-reports-service";
import { AdminShell } from "@/components/admin/AdminShell";
import { FinanceAdminClient } from "@/components/admin/FinanceAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.roleCode === "OPERATOR") redirect("/admin");

  const overview = await getFinancialOverview(user);

  return (
    <AdminShell user={user}>
      <FinanceAdminClient initialData={overview} />
    </AdminShell>
  );
}
