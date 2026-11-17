"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  CheckCircle2,
  X,
} from "lucide-react";
import { formatBRL, EXPENSE_CATEGORIES } from "@/lib/utils";

interface FinanceMetrics {
  grossRevenue: number;
  totalDiscounts: number;
  netSalesRevenue: number;
  confirmedReceiptsGross: number;
  confirmedReceiptsNet: number;
  paymentFeesTotal: number;
  pendingReceivablesTotal: number;
  cmvHistorical: number;
  grossProfit: number;
  grossMarginPercent: number;
  contributionMargin: number;
  operationalExpensesTotal: number;
  paidExpensesTotal: number;
  pendingExpensesTotal: number;
  operationalResult: number;
  cashFlowBalance: number;
  inventoryPurchasesTotal: number;
  salesCount: number;
  averageTicket: number;
}

interface ExpenseRow {
  id: string;
  description: string;
  category: string;
  amount: number;
  competenceDate: Date | string;
  dueDate: Date | string;
  paidAt: Date | string | null;
  paymentMethod: string | null;
  status: string;
  isRecurring: boolean;
  notes: string | null;
}

interface ReceivableRow {
  id: string;
  customerName: string;
  description: string;
  amount: number;
  receivedAmount: number;
  paymentMethod: string;
  dueDate: Date | string;
  status: string;
}

export function FinanceAdminClient({
  initialData,
}: {
  initialData: {
    metrics: FinanceMetrics;
    salesByPaymentMethod: {
      method: string;
      count: number;
      amount: number;
      netAmount: number;
    }[];
    expenses: ExpenseRow[];
    receivables: ReceivableRow[];
  };
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "EXPENSES" | "RECEIVABLES"
  >("OVERVIEW");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal de Nova Despesa
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expCategory, setExpCategory] = useState<string>("ALUGUEL");
  const [expAmount, setExpAmount] = useState("");
  const [expCompDate, setExpCompDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [expDueDate, setExpDueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [expStatus, setExpStatus] = useState<"PAID" | "PENDING">("PAID");
  const [expMethod, setExpMethod] = useState("PIX");
  const [expRecurring, setExpRecurring] = useState(false);
  const [expNotes, setExpNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const reloadFinance = async (start = startDate, end = endDate) => {
    const params = new URLSearchParams();
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    const res = await fetch(`/api/admin/finance?${params.toString()}`);
    if (res.ok) {
      const next = await res.json();
      setData(next);
    }
    router.refresh();
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expDesc,
          category: expCategory,
          amount: Number(expAmount),
          competenceDate: expCompDate,
          dueDate: expDueDate,
          status: expStatus,
          paymentMethod: expMethod,
          isRecurring: expRecurring,
          notes: expNotes || null,
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Erro ao registrar despesa.");
      }

      setFeedback({
        type: "success",
        text: resData.idempotentReplay
          ? "Esta despesa recorrente já estava registrada para a competência informada (sem duplicidade)."
          : "Despesa registrada com sucesso!",
      });
      setExpDesc("");
      setExpAmount("");
      setExpenseModalOpen(false);
      await reloadFinance();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao salvar despesa.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettleReceivable = async (r: ReceivableRow) => {
    const remaining = Math.max(0, r.amount - r.receivedAmount);
    const res = await fetch("/api/admin/finance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receivableId: r.id,
        amountReceived: remaining,
        paymentMethod: r.paymentMethod,
      }),
    });
    if (res.ok) {
      setFeedback({
        type: "success",
        text: `Recebimento de ${formatBRL(remaining)} confirmado no caixa!`,
      });
      await reloadFinance();
    }
  };

  const { metrics } = data;

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Filtro de Período */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-black text-brand-graphite">
            Gestão Financeira Gerencial
          </h1>
          <p className="text-xs text-slate-500">
            Controle gerencial integrado às vendas: Receita, CMV histórico,
            Lucro Bruto, Despesas Operacionais e Fluxo de Caixa.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500">
              Início
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500">
              Fim
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => reloadFinance(startDate, endDate)}
            className="rounded-lg bg-brand-blue px-3.5 py-1.5 text-xs font-bold text-white hover:bg-sky-600"
          >
            Aplicar Período
          </button>
          <button
            type="button"
            onClick={() => setExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white shadow-xs hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Registrar Despesa
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-bold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Cards Principais do Financeiro */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-xs font-bold uppercase text-slate-500">
            Receita Líquida de Vendas
          </span>
          <p className="mt-2 text-2xl font-black text-brand-graphite">
            {formatBRL(metrics.netSalesRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {metrics.salesCount} vendas • Ticket médio:{" "}
            {formatBRL(metrics.averageTicket)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-xs font-bold uppercase text-slate-500">
            Recebimentos Confirmados
          </span>
          <p className="mt-2 text-2xl font-black text-emerald-700">
            {formatBRL(metrics.confirmedReceiptsNet)}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            A receber: {formatBRL(metrics.pendingReceivablesTotal)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-xs font-bold uppercase text-slate-500">
            Lucro Bruto (Margem Bruta)
          </span>
          <p className="mt-2 text-2xl font-black text-brand-blue">
            {formatBRL(metrics.grossProfit)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            CMV histórico: {formatBRL(metrics.cmvHistorical)} (Margem:{" "}
            {metrics.grossMarginPercent}%)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-brand-graphite p-5 text-white">
          <span className="text-xs font-bold uppercase text-slate-300">
            Resultado Operacional Estimado
          </span>
          <p
            className={`mt-2 text-2xl font-black ${
              metrics.operationalResult >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {formatBRL(metrics.operationalResult)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Fluxo de caixa realizado: {formatBRL(metrics.cashFlowBalance)}
          </p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-extrabold">
        <button
          type="button"
          onClick={() => setActiveTab("OVERVIEW")}
          className={`rounded-xl px-4 py-2 ${
            activeTab === "OVERVIEW"
              ? "bg-brand-graphite text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          DRE Gerencial & Formas de Pagamento
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("EXPENSES")}
          className={`rounded-xl px-4 py-2 ${
            activeTab === "EXPENSES"
              ? "bg-brand-graphite text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Despesas Operacionais ({data.expenses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("RECEIVABLES")}
          className={`rounded-xl px-4 py-2 ${
            activeTab === "RECEIVABLES"
              ? "bg-brand-graphite text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Contas a Receber ({data.receivables.length})
        </button>
      </div>

      {activeTab === "OVERVIEW" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Demonstrativo de Cálculo de Lucro */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-7">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-graphite">
              Demonstrativo Gerencial de Lucro (Competência)
            </h2>
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-600">
                  (+) Receita Bruta de Vendas Confirmadas
                </span>
                <span className="font-bold text-brand-graphite">
                  {formatBRL(metrics.grossRevenue)}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-600">
                  (-) Descontos Concedidos
                </span>
                <span className="font-bold text-brand-red">
                  -{formatBRL(metrics.totalDiscounts)}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2 font-extrabold text-brand-graphite">
                <span>(=) Receita Líquida de Vendas</span>
                <span>{formatBRL(metrics.netSalesRevenue)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-600">
                  (-) Custo das Mercadorias Efetivamente Vendidas (CMV
                  Histórico)
                </span>
                <span className="font-bold text-brand-red">
                  -{formatBRL(metrics.cmvHistorical)}
                </span>
              </div>
              <div className="flex justify-between rounded-lg bg-sky-50 p-2.5 font-extrabold text-brand-blue">
                <span>(=) Margem Bruta / Lucro Bruto</span>
                <span>
                  {formatBRL(metrics.grossProfit)} ({metrics.grossMarginPercent}
                  %)
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-600">
                  (-) Taxas de Pagamento
                </span>
                <span className="font-bold text-brand-red">
                  -{formatBRL(metrics.paymentFeesTotal)}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 font-bold text-slate-700">
                <span>(=) Margem de Contribuição</span>
                <span>{formatBRL(metrics.contributionMargin)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-600">
                  (-) Despesas Operacionais (Aluguel, Energia, Água, etc.)
                </span>
                <span className="font-bold text-brand-red">
                  -{formatBRL(metrics.operationalExpensesTotal)}
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-brand-graphite p-3 text-sm font-black text-white">
                <span>(=) Resultado Gerencial</span>
                <span
                  className={
                    metrics.operationalResult >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {formatBRL(metrics.operationalResult)}
                </span>
              </div>
            </div>
          </div>

          {/* Vendas por Forma de Pagamento */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-graphite">
              Vendas por Forma de Pagamento
            </h2>
            {data.salesByPaymentMethod.length === 0 ? (
              <p className="mt-6 text-xs text-slate-500">
                Nenhum pagamento registrado no período.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.salesByPaymentMethod.map((pm) => (
                  <div
                    key={pm.method}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                  >
                    <div>
                      <p className="font-extrabold text-brand-graphite">
                        {pm.method}
                      </p>
                      <p className="text-slate-500">
                        {pm.count} transação(ões)
                      </p>
                    </div>
                    <span className="text-sm font-black text-brand-graphite">
                      {formatBRL(pm.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: DESPESAS OPERACIONAIS */}
      {activeTab === "EXPENSES" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-extrabold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Descrição</th>
                  <th className="px-4 py-3.5">Categoria</th>
                  <th className="px-4 py-3.5">Competência / Vencimento</th>
                  <th className="px-4 py-3.5">Valor</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.expenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Nenhuma despesa registrada.
                    </td>
                  </tr>
                ) : (
                  data.expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-brand-graphite">
                          {e.description}
                        </p>
                        {e.isRecurring && (
                          <span className="text-[10px] font-bold text-brand-blue">
                            Recorrente mensal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {e.category}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        Venc: {new Date(e.dueDate).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 font-black text-brand-red">
                        {formatBRL(e.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                            e.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {e.status === "PAID" ? "Paga" : "Pendente"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: CONTAS A RECEBER */}
      {activeTab === "RECEIVABLES" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-extrabold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Cliente / Descrição</th>
                  <th className="px-4 py-3.5">Vencimento</th>
                  <th className="px-4 py-3.5">Valor / Recebido</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.receivables.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Nenhuma conta a receber pendente.
                    </td>
                  </tr>
                ) : (
                  data.receivables.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-brand-graphite">
                          {r.customerName}
                        </p>
                        <p className="text-slate-500">{r.description}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(r.dueDate).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-black text-brand-graphite">
                          Total: {formatBRL(r.amount)}
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          Recebido: {formatBRL(r.receivedAmount)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                            r.status === "RECEIVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(r.status === "PENDING" || r.status === "PARTIAL") && (
                          <button
                            type="button"
                            onClick={() => handleSettleReceivable(r)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirmar Recebimento
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE REGISTRO DE DESPESA */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-black text-brand-graphite">
                Registrar Despesa da Loja
              </h2>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Descrição *
                </label>
                <input
                  type="text"
                  required
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="Ex: Conta de Energia Loja Centro"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Categoria *
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Data de Competência
                  </label>
                  <input
                    type="date"
                    required
                    value={expCompDate}
                    onChange={(e) => setExpCompDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    required
                    value={expDueDate}
                    onChange={(e) => setExpDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Status
                  </label>
                  <select
                    value={expStatus}
                    onChange={(e) =>
                      setExpStatus(e.target.value as "PAID" | "PENDING")
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="PAID">Paga</option>
                    <option value="PENDING">Pendente (A Pagar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Forma de Pagamento
                  </label>
                  <select
                    value={expMethod}
                    onChange={(e) => setExpMethod(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="PIX">Pix</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="CASH">Dinheiro</option>
                    <option value="DEBIT">Débito</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={expRecurring}
                  onChange={(e) => setExpRecurring(e.target.checked)}
                />
                Despesa fixa recorrente mensal (protegida contra duplicidade no
                mês)
              </label>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Observações
                </label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-brand-orange px-5 py-2 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-orange-600"
                >
                  {loading ? "Salvando..." : "Salvar Despesa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
