import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { generateReport } from "@/services/finance-and-reports-service";
import { AdminShell } from "@/components/admin/AdminShell";
import { ReportsAdminClient } from "@/components/admin/ReportsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.roleCode === "OPERATOR") redirect("/admin");

  const initialReport = await generateReport(user, "DAILY_SALES");

  return (
    <AdminShell user={user}>
      <ReportsAdminClient initialReport={initialReport} />
    </AdminShell>
  );
}
