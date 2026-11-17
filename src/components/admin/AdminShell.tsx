"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingBag,
  Store,
  Wallet,
  FileBarChart,
  Settings,
  PlusCircle,
  LogOut,
  ExternalLink,
} from "lucide-react";
import type { AuthenticatedUser } from "@/services/auth-service";

interface AdminShellProps {
  user: AuthenticatedUser;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Visão geral",
    icon: LayoutDashboard,
    roles: ["ADMIN", "MANAGER", "OPERATOR"],
  },
  {
    href: "/admin/vender",
    label: "Vender (PDV)",
    icon: Store,
    roles: ["ADMIN", "MANAGER", "OPERATOR"],
  },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    icon: ShoppingBag,
    roles: ["ADMIN", "MANAGER", "OPERATOR"],
  },
  {
    href: "/admin/produtos",
    label: "Produtos",
    icon: Package,
    roles: ["ADMIN", "MANAGER", "OPERATOR"],
  },
  {
    href: "/admin/estoque",
    label: "Estoque",
    icon: Boxes,
    roles: ["ADMIN", "MANAGER", "OPERATOR"],
  },
  {
    href: "/admin/financeiro",
    label: "Financeiro",
    icon: Wallet,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/admin/relatorios",
    label: "Relatórios",
    icon: FileBarChart,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/admin/configuracoes",
    label: "Configurações",
    icon: Settings,
    roles: ["ADMIN", "MANAGER"],
  },
];

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.roleCode)
  );

  const canCreateProduct =
    user.roleCode === "ADMIN" || user.roleCode === "MANAGER";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-ice lg:flex-row">
      {/* Sidebar Desktop */}
      <aside className="no-print hidden w-64 shrink-0 flex-col justify-between bg-brand-graphite text-white lg:flex">
        <div>
          <div className="border-b border-white/10 p-5">
            <Link href="/admin" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/suzano-sports-logo-original.png"
                alt="Logo Suzano Sports"
                className="h-11 w-11 shrink-0 rounded-full border border-brand-blue/40 object-contain"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/suzano-sports-logo.svg"
                alt="Suzano Sports Admin"
                className="h-9 w-auto"
              />
            </Link>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs">
              <div className="truncate">
                <p className="truncate font-bold text-white">{user.name}</p>
                <p className="text-[11px] text-sky-400">{user.roleName}</p>
              </div>
            </div>
          </div>

          {/* Botão Novo Produto Sempre Fácil de Encontrar */}
          {canCreateProduct && (
            <div className="px-4 pt-4">
              <Link
                href="/admin/produtos?novo=rapido"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-orange-600"
              >
                <PlusCircle className="h-4 w-4" />
                Novo Produto
              </Link>
            </div>
          )}

          <nav className="mt-4 space-y-1 px-3" aria-label="Menu Administrativo">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
                    isActive
                      ? "bg-brand-blue text-white shadow-xs"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 border-t border-white/10 p-4 text-xs">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between rounded-lg px-3 py-2 font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <span>Ver Vitrine da Loja</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal + Barra Superior Mobile */}
      <div className="flex flex-1 flex-col pb-20 lg:pb-0">
        {/* Topbar sempre visível com atalho "Novo Produto" */}
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-2xs lg:px-8">
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-brand-graphite lg:text-base">
              Suzano Sports — Gestão Operacional
            </span>
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 sm:inline-block">
              Perfil: {user.roleName}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {canCreateProduct && (
              <Link
                href="/admin/produtos?novo=rapido"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider text-white shadow-xs transition hover:bg-orange-600"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Novo Produto</span>
              </Link>
            )}
            <Link
              href="/admin/vender"
              className="hidden items-center gap-1.5 rounded-xl bg-brand-graphite px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-brand-blue sm:inline-flex"
            >
              <Store className="h-4 w-4" />
              <span>Abrir PDV</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sair"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Barra de Navegação Compacta Mobile (Adequada ao Toque) */}
      <nav
        aria-label="Navegação Mobile Admin"
        className="no-print fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-brand-graphite px-1 py-1.5 text-white lg:hidden"
      >
        {visibleItems.slice(0, 6).map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center rounded-lg px-2 py-1 text-[10px] font-bold ${
                isActive ? "text-brand-orange" : "text-slate-300"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="mt-0.5 truncate">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
