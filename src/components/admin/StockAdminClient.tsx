"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  Search,
  X,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";

interface StockItem {
  variationId: string;
  productId: string;
  productName: string;
  productStatus: string;
  categoryName: string;
  sku: string;
  barcode: string | null;
  color: string;
  size: string;
  quantity: number;
  minStock: number;
  unitCost: number;
  unitSale: number;
  totalCost: number;
  totalSale: number;
  isOut: boolean;
  isLow: boolean;
  isStagnant: boolean;
  lastSoldAt: Date | string | null;
}

interface MovementItem {
  id: string;
  variationId: string;
  productId: string;
  productName: string;
  variationLabel: string;
  sku: string;
  type: string;
  previousBalance: number;
  movedQuantity: number;
  newBalance: number;
  unitCost: number;
  reason: string;
  referenceType: string | null;
  userName: string;
  createdAt: Date | string;
}

interface StockAdminClientProps {
  initialData: {
    summary: {
      totalSkus: number;
      totalUnits: number;
      totalCostValue: number;
      totalRetailValue: number;
      lowStockCount: number;
      outOfStockCount: number;
      stagnantCount: number;
    };
    items: StockItem[];
    stagnantItems: StockItem[];
    movements: MovementItem[];
  };
}

export function StockAdminClient({ initialData }: StockAdminClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<
    "BALANCES" | "MOVEMENTS" | "STAGNANT"
  >("BALANCES");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyAlerts, setOnlyAlerts] = useState(false);

  // Modal de Movimentação / Inventário
  const [selectedVar, setSelectedVar] = useState<StockItem | null>(null);
  const [opMode, setOpMode] = useState<
    "ENTRY" | "LOSS" | "RETURN" | "PHYSICAL_INVENTORY"
  >("ENTRY");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const reloadStock = async () => {
    const res = await fetch("/api/admin/stock");
    if (res.ok) {
      const next = await res.json();
      setData(next);
    }
    router.refresh();
  };

  const openMovementModal = (
    item: StockItem,
    mode: "ENTRY" | "LOSS" | "RETURN" | "PHYSICAL_INVENTORY"
  ) => {
    setSelectedVar(item);
    setOpMode(mode);
    setQuantity(mode === "PHYSICAL_INVENTORY" ? String(item.quantity) : "1");
    setUnitCost(String(item.unitCost || 0));
    setReason("");
    setSupplierName("");
  };

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVar) return;
    setLoading(true);
    setFeedback(null);

    try {
      const idempotencyKey = `stk_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const body =
        opMode === "PHYSICAL_INVENTORY"
          ? {
              mode: "PHYSICAL_INVENTORY",
              variationId: selectedVar.variationId,
              countedQuantity: Number(quantity),
              reason:
                reason.trim() ||
                `Contagem de inventário físico em ${new Date().toLocaleDateString(
                  "pt-BR"
                )}`,
              idempotencyKey,
            }
          : {
              variationId: selectedVar.variationId,
              type: opMode,
              quantity: Number(quantity),
              unitCost: unitCost ? Number(unitCost) : undefined,
              reason: reason.trim(),
              supplierName: supplierName.trim() || undefined,
              idempotencyKey,
            };

      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Erro ao movimentar estoque.");
      }

      setFeedback({
        type: "success",
        text: `Estoque atualizado com sucesso para "${selectedVar.productName} (${selectedVar.color}/${selectedVar.size})"!`,
      });
      setSelectedVar(null);
      await reloadStock();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erro na operação.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = data.items.filter((i) => {
    if (onlyAlerts && !i.isLow && !i.isOut) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.productName.toLowerCase().includes(q) ||
      i.sku.toLowerCase().includes(q) ||
      i.color.toLowerCase().includes(q) ||
      i.size.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <h1 className="text-2xl font-black text-brand-graphite">
          Controle de Estoque Integrado & Auditável
        </h1>
        <p className="text-xs text-slate-500">
          Entradas de mercadorias, saídas, ajustes de inventário físico,
          devoluções, perdas e alertas de reposição.
        </p>
      </div>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-bold uppercase text-slate-500">
            Unidades em Estoque
          </span>
          <p className="mt-1 text-2xl font-black text-brand-graphite">
            {data.summary.totalUnits}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-bold uppercase text-slate-500">
            Valor Total a Custo
          </span>
          <p className="mt-1 text-lg font-black text-brand-blue">
            {formatBRL(data.summary.totalCostValue)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-bold uppercase text-slate-500">
            Valor a Preço de Venda
          </span>
          <p className="mt-1 text-lg font-black text-emerald-700">
            {formatBRL(data.summary.totalRetailValue)}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <span className="text-[11px] font-bold uppercase text-amber-800">
            Estoque Baixo
          </span>
          <p className="mt-1 text-2xl font-black text-brand-orange">
            {data.summary.lowStockCount}
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
          <span className="text-[11px] font-bold uppercase text-red-800">
            Variações Esgotadas
          </span>
          <p className="mt-1 text-2xl font-black text-brand-red">
            {data.summary.outOfStockCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-bold uppercase text-slate-500">
            Produtos Parados
          </span>
          <p className="mt-1 text-2xl font-black text-slate-700">
            {data.summary.stagnantCount}
          </p>
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

      {/* Abas */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2 text-xs font-extrabold">
          <button
            type="button"
            onClick={() => setActiveTab("BALANCES")}
            className={`rounded-xl px-4 py-2 ${
              activeTab === "BALANCES"
                ? "bg-brand-graphite text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Saldos & Inventário ({data.items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("MOVEMENTS")}
            className={`rounded-xl px-4 py-2 ${
              activeTab === "MOVEMENTS"
                ? "bg-brand-graphite text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Histórico de Movimentações ({data.movements.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("STAGNANT")}
            className={`rounded-xl px-4 py-2 ${
              activeTab === "STAGNANT"
                ? "bg-brand-graphite text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Relatório de Produtos Parados ({data.stagnantItems.length})
          </button>
        </div>

        {activeTab === "BALANCES" && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-brand-orange">
              <input
                type="checkbox"
                checked={onlyAlerts}
                onChange={(e) => setOnlyAlerts(e.target.checked)}
              />
              Somente alertas de reposição
            </label>
            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar SKU, produto, tamanho..."
                className="rounded-xl border border-slate-300 py-1.5 pl-3 pr-8 text-xs"
              />
              <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        )}
      </div>

      {/* ABA 1: SALDOS E OPERAÇÕES */}
      {activeTab === "BALANCES" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-extrabold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">SKU / Produto</th>
                  <th className="px-4 py-3.5">Cor / Tamanho</th>
                  <th className="px-4 py-3.5">Saldo Atual</th>
                  <th className="px-4 py-3.5">Custo Unit. / Total</th>
                  <th className="px-4 py-3.5 text-right">
                    Operações de Estoque
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((item) => (
                  <tr key={item.variationId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-extrabold text-brand-graphite">
                        {item.productName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        SKU: {item.sku} • {item.categoryName}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {item.color} / {item.size}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${
                          item.isOut
                            ? "bg-red-100 text-brand-red"
                            : item.isLow
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.quantity} un.
                      </span>
                      <span className="ml-2 text-[11px] text-slate-400">
                        (mín: {item.minStock})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-700">
                        Unit: {formatBRL(item.unitCost)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Total: {formatBRL(item.totalCost)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openMovementModal(item, "ENTRY")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                        >
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                          Entrada
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openMovementModal(item, "PHYSICAL_INVENTORY")
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-sky-600"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Inventário
                        </button>
                        <button
                          type="button"
                          onClick={() => openMovementModal(item, "RETURN")}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Devolução
                        </button>
                        <button
                          type="button"
                          onClick={() => openMovementModal(item, "LOSS")}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-brand-red hover:bg-red-100"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          Perda/Baixa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: HISTÓRICO AUDITÁVEL DE MOVIMENTAÇÕES */}
      {activeTab === "MOVEMENTS" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-extrabold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Data / Horário</th>
                  <th className="px-4 py-3.5">Produto / Variação</th>
                  <th className="px-4 py-3.5">Operação</th>
                  <th className="px-4 py-3.5">Saldo Ant. → Mov. → Novo</th>
                  <th className="px-4 py-3.5">Justificativa & Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(m.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-brand-graphite">
                        {m.productName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {m.variationLabel} ({m.sku})
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          m.movedQuantity > 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-brand-red"
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      <span>{m.previousBalance}</span>{" "}
                      <span
                        className={
                          m.movedQuantity > 0
                            ? "text-emerald-700"
                            : "text-brand-red"
                        }
                      >
                        ({m.movedQuantity > 0 ? `+${m.movedQuantity}` : m.movedQuantity})
                      </span>{" "}
                      → <strong className="text-brand-graphite">{m.newBalance}</strong>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700">{m.reason}</p>
                      <p className="text-[11px] text-slate-400">
                        Por: {m.userName} • Ref: {m.referenceType || "MANUAL"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: RELATÓRIO DE PRODUTOS PARADOS */}
      {activeTab === "STAGNANT" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <h2 className="text-sm font-extrabold uppercase text-brand-graphite">
            Produtos em Estoque sem Giro Recente (Sugestão para Campanha /
            Outlet)
          </h2>
          {data.stagnantItems.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              Nenhum produto parado acima de 30 dias encontrado no momento.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {data.stagnantItems.map((st) => (
                <div
                  key={st.variationId}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-brand-graphite">
                      {st.productName} ({st.color} / {st.size})
                    </p>
                    <p className="text-slate-500">SKU: {st.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-brand-graphite">
                      {st.quantity} un. paradas ({formatBRL(st.totalCost)} a
                      custo)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE LANÇAMENTO DE ESTOQUE / INVENTÁRIO FÍSICO */}
      {selectedVar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-black text-brand-graphite">
                {opMode === "ENTRY" && "Entrada de Mercadoria"}
                {opMode === "PHYSICAL_INVENTORY" &&
                  "Contagem de Inventário Físico"}
                {opMode === "RETURN" && "Devolução ao Estoque"}
                {opMode === "LOSS" && "Registro de Perda / Avaria"}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedVar(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
              <p className="font-extrabold text-brand-graphite">
                {selectedVar.productName}
              </p>
              <p className="text-slate-600">
                Variação: {selectedVar.color} / {selectedVar.size} • Saldo
                atual: <strong>{selectedVar.quantity} un.</strong>
              </p>
            </div>

            <form onSubmit={handleSubmitMovement} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700">
                  {opMode === "PHYSICAL_INVENTORY"
                    ? "Quantidade Contada na Prateleira *"
                    : "Quantidade a Movimentar *"}
                </label>
                <input
                  type="number"
                  min={opMode === "PHYSICAL_INVENTORY" ? "0" : "1"}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
              </div>

              {opMode === "ENTRY" && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Custo Unitário desta Entrada (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Fornecedor (Opcional — Gera Conta a Pagar)
                    </label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Ex: Distribuidora Esportiva SP"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Justificativa / Observação *
                </label>
                <input
                  type="text"
                  required={opMode !== "PHYSICAL_INVENTORY"}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Nota fiscal 1042 / Reposição de grade"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVar(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-brand-blue px-5 py-2 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-sky-600"
                >
                  {loading ? "Registrando..." : "Confirmar Movimentação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
