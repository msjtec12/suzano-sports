import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Wallet,
  PackageX,
  ArrowRight,
  Store,
  PlusCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { getCurrentUser } from "@/lib/server-auth";
import { getAdminDashboardData } from "@/services/finance-and-reports-service";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface AdminDashboardProps {
  searchParams: Promise<{
    inicio?: string;
    fim?: string;
  }>;
}

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  const sp = await searchParams;
  const startDate = sp.inicio ? new Date(sp.inicio) : undefined;
  const endDate = sp.fim ? new Date(`${sp.fim}T23:59:59.999Z`) : undefined;

  const data = await getAdminDashboardData(user, { startDate, endDate });
  const { kpis } = data;

  const maxDailyVal = Math.max(
    1,
    ...data.dailySeries.map((d) => d.total)
  );
  const maxCatVal = Math.max(
    1,
    ...data.salesByCategory.map((c) => c.revenue)
  );

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        {/* Cabeçalho + Filtro de Período */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-black text-brand-graphite">
              Visão Geral da Loja
            </h1>
            <p className="text-xs text-slate-500">
              Indicadores separados entre vendas efetivamente confirmadas,
              valores recebidos e solicitações no WhatsApp.
            </p>
          </div>

          <form method="GET" className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500">
                Data Inicial
              </label>
              <input
                type="date"
                name="inicio"
                defaultValue={sp.inicio || ""}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500">
                Data Final
              </label>
              <input
                type="date"
                name="fim"
                defaultValue={sp.fim || ""}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand-blue px-3.5 py-1.5 text-xs font-bold text-white hover:bg-sky-600"
            >
              Filtrar Período
            </button>
            {(sp.inicio || sp.fim) && (
              <Link
                href="/admin"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Mês Atual
              </Link>
            )}
          </form>
        </div>

        {/* Bloco 1: KPIs Comerciais e Financeiros */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
              <span>Vendas Confirmadas Hoje</span>
              <Store className="h-4 w-4 text-brand-blue" />
            </div>
            <p className="mt-2 text-2xl font-black text-brand-graphite">
              {formatBRL(kpis.todaySalesTotal)}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {kpis.todaySalesCount} venda(s) concluída(s) hoje
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
              <span>Faturamento no Período</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-brand-graphite">
              {formatBRL(kpis.monthRevenue)}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              Recebido líquido: {formatBRL(kpis.monthConfirmedReceipts)}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-amber-800">
              <span>Pedidos Aguardando Atendimento</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-brand-graphite">
              {kpis.pendingOrdersCount}
            </p>
            <Link
              href="/admin/pedidos"
              className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:underline"
            >
              Atender solicitações do WhatsApp <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
              <span>Alertas de Estoque</span>
              <AlertTriangle className="h-4 w-4 text-brand-orange" />
            </div>
            <div className="mt-2 flex items-baseline gap-4">
              <div>
                <span className="text-2xl font-black text-brand-orange">
                  {kpis.lowStockProductsCount}
                </span>
                <span className="ml-1 text-xs font-semibold text-slate-500">
                  baixo
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-brand-red">
                  {kpis.outOfStockProductsCount}
                </span>
                <span className="ml-1 text-xs font-semibold text-slate-500">
                  esgotado(s)
                </span>
              </div>
            </div>
            <Link
              href="/admin/estoque"
              className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-blue hover:underline"
            >
              Ver reposição <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Bloco 2: Resultado Financeiro Gerencial (Exibido para Admin e Gerente) */}
        {(user.roleCode === "ADMIN" || user.roleCode === "MANAGER") && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
                <span>Lucro Bruto Estimado</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-xl font-black text-emerald-700">
                {formatBRL(kpis.grossProfit)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Receita ({formatBRL(kpis.monthRevenue)}) − CMV Histórico (
                {formatBRL(kpis.monthCmv)})
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
                <span>Despesas do Período</span>
                <Wallet className="h-4 w-4 text-brand-red" />
              </div>
              <p className="mt-2 text-xl font-black text-brand-red">
                {formatBRL(kpis.monthExpenses)}
              </p>
              <Link
                href="/admin/financeiro"
                className="mt-1 inline-block text-xs font-bold text-brand-blue hover:underline"
              >
                Gerenciar despesas →
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-brand-graphite p-5 text-white shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-300">
                <span>Resultado Financeiro Gerencial</span>
                <TrendingUp className="h-4 w-4 text-brand-orange" />
              </div>
              <p
                className={`mt-2 text-xl font-black ${
                  kpis.operationalResult >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {formatBRL(kpis.operationalResult)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Lucro bruto menos despesas operacionais registradas
              </p>
            </div>
          </div>
        )}

        {/* Bloco 3: Gráficos de Evolução de Vendas e Distribuição por Categoria */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Evolução últimos 7 dias */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-7">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-graphite">
              Evolução Diária das Vendas Confirmadas (Últimos 7 dias)
            </h2>
            <div className="mt-5 flex h-48 items-end justify-between gap-2 border-b border-slate-200 pb-2 pt-4">
              {data.dailySeries.map((day) => {
                const heightPct = Math.max(
                  6,
                  Math.round((day.total / maxDailyVal) * 100)
                );
                return (
                  <div
                    key={day.date}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <span className="text-[10px] font-bold text-slate-600">
                      {day.total > 0 ? formatBRL(day.total) : "R$ 0"}
                    </span>
                    <div className="flex h-32 w-full items-end justify-center">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-10 rounded-t-lg transition-all ${
                          day.total > 0 ? "bg-brand-blue" : "bg-slate-200"
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribuição por Categorias */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-graphite">
              Vendas por Categoria
            </h2>
            {data.salesByCategory.length > 0 ? (
              <div className="mt-4 space-y-3">
                {data.salesByCategory.map((cat) => {
                  const pct = Math.max(
                    5,
                    Math.round((cat.revenue / maxCatVal) * 100)
                  );
                  return (
                    <div key={cat.category}>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-brand-graphite">
                          {cat.category} ({cat.units} un.)
                        </span>
                        <span className="text-slate-600">
                          {formatBRL(cat.revenue)}
                        </span>
                      </div>
                      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full rounded-full bg-brand-orange"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-8 text-center text-xs text-slate-500">
                Nenhuma venda confirmada no período selecionado. Utilize o{" "}
                <Link
                  href="/admin/vender"
                  className="font-bold text-brand-blue underline"
                >
                  PDV
                </Link>{" "}
                ou confirme pedidos na aba{" "}
                <Link
                  href="/admin/pedidos"
                  className="font-bold text-brand-blue underline"
                >
                  Pedidos
                </Link>
                .
              </div>
            )}
          </div>
        </div>

        {/* Bloco 4: Alertas Operacionais, Solicitações Pendentes e Mais Vendidos */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Solicitações de Pedido Aguardando Atendimento */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-graphite">
                Solicitações no WhatsApp
              </h2>
              <Link
                href="/admin/pedidos"
                className="text-xs font-bold text-brand-blue hover:underline"
              >
                Ver todos
              </Link>
            </div>
            {data.recentPendingOrders.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {data.recentPendingOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                  >
                    <div>
                      <p className="font-extrabold text-brand-graphite">
                        {ord.code} • {ord.customerName}
                      </p>
                      <p className="text-slate-500">{ord.customerPhone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-brand-graphite">
                        {formatBRL(ord.total)}
                      </p>
                      <Link
                        href="/admin/pedidos"
                        className="font-bold text-brand-blue hover:underline"
                      >
                        Atender →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-center text-xs text-slate-500">
                Nenhuma solicitação pendente de atendimento no momento.
              </p>
            )}
          </div>

          {/* Produtos com Estoque Baixo ou Esgotados */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-graphite">
                Reposição de Estoque
              </h2>
              <Link
                href="/admin/estoque"
                className="text-xs font-bold text-brand-blue hover:underline"
              >
                Abrir Estoque
              </Link>
            </div>
            {data.lowStockAlerts.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {data.lowStockAlerts.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-brand-graphite">
                        {item.name}
                      </p>
                      <p className="text-slate-400">SKU: {item.sku}</p>
                    </div>
                    <span
                      className={`rounded-md px-2 py-1 font-extrabold ${
                        item.stock <= 0
                          ? "bg-red-100 text-brand-red"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.stock <= 0
                        ? "ESGOTADO"
                        : `${item.stock} un. (mín: ${item.minStock})`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 text-center text-xs text-slate-500">
                <PackageX className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                Nenhum alerta crítico de estoque baixo ou esgotado.
              </div>
            )}
          </div>

          {/* Produtos Mais Vendidos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-graphite">
                Produtos Mais Vendidos
              </h2>
              <Link
                href="/admin/relatorios"
                className="text-xs font-bold text-brand-blue hover:underline"
              >
                Relatórios
              </Link>
            </div>
            {data.topProducts.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {data.topProducts.map((tp, idx) => (
                  <div
                    key={tp.productId}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-graphite text-[11px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-brand-graphite">
                        {tp.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-brand-graphite">
                        {tp.units} un.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatBRL(tp.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 text-center text-xs text-slate-500">
                <ShoppingBag className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                As vendas confirmadas exibirão aqui o ranking de produtos.
                <div className="mt-3">
                  <Link
                    href="/admin/produtos?novo=rapido"
                    className="inline-flex items-center gap-1 font-bold text-brand-orange hover:underline"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Cadastrar novo produto
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
