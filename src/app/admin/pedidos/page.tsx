import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { checkPermission } from "@/services/auth-service";
import { listOrdersAdmin } from "@/services/order-and-pos-service";
import { AdminShell } from "@/components/admin/AdminShell";
import { OrdersAdminClient } from "@/components/admin/OrdersAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const [orders, canApproveDiscount] = await Promise.all([
    listOrdersAdmin(user, "ALL"),
    checkPermission(user, "orders", "approveDiscount"),
  ]);

  return (
    <AdminShell user={user}>
      <OrdersAdminClient
        initialOrders={orders}
        canApproveDiscount={canApproveDiscount}
      />
    </AdminShell>
  );
}
