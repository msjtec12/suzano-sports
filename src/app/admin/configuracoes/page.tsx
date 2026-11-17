import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { checkPermission, listUsers } from "@/services/auth-service";
import { getStoreSettings } from "@/services/settings-service";
import { AdminShell } from "@/components/admin/AdminShell";
import { SettingsAdminClient } from "@/components/admin/SettingsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.roleCode === "OPERATOR") redirect("/admin");

  const [settings, canViewUsers] = await Promise.all([
    getStoreSettings(),
    checkPermission(user, "users", "view"),
  ]);

  const users = canViewUsers ? await listUsers(user) : [];

  return (
    <AdminShell user={user}>
      <SettingsAdminClient
        initialSettings={settings}
        initialUsers={users}
        isAdmin={user.roleCode === "ADMIN"}
      />
    </AdminShell>
  );
}
