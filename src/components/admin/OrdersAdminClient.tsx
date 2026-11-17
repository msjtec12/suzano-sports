"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { formatBRL, validateWhatsAppNumber } from "@/lib/utils";

interface OrderItemRow {
  id: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  variationLabelSnapshot: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderRow {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  deliveryMethod: string;
  addressNotes: string | null;
  preferredPaymentMethod: string | null;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  internalNotes: string | null;
  convertedSaleId: string | null;
  createdAt: Date | string;
  items: OrderItemRow[];
}

const ORDER_STATUS_LIST = [
  { code: "AGUARDANDO_ATENDIMENTO", label: "Aguardando atendimento" },
  { code: "EM_NEGOCIACAO", label: "Em negociação" },
  { code: "CONFIRMADO", label: "Confirmado" },
  { code: "EM_SEPARACAO", label: "Em separação" },
  { code: "PRONTO_PARA_RETIRADA", label: "Pronto para retirada" },
  { code: "FINALIZADO", label: "Finalizado" },
  { code: "CANCELADO", label: "Cancelado" },
] as const;

export function OrdersAdminClient({
  initialOrders,
  canApproveDiscount,
}: {
  initialOrders: OrderRow[];
  canApproveDiscount: boolean;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [confirmingOrder, setConfirmingOrder] = useState<OrderRow | null>(null);
  const [discountInput, setDiscountInput] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<
    "PIX" | "CASH" | "DEBIT" | "CREDIT" | "OTHER"
  >("PIX");
  const [paymentStatus, setPaymentStatus] = useState<"CONFIRMED" | "PENDING">(
    "CONFIRMED"
  );
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const reloadOrders = async () => {
    const res = await fetch("/api/admin/orders");
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
    router.refresh();
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: newStatus }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({
        type: "error",
        text: data.error || "Erro ao alterar status.",
      });
      return;
    }
    setFeedback({
      type: "success",
      text: `Status do pedido atualizado para "${
        ORDER_STATUS_LIST.find((s) => s.code === newStatus)?.label || newStatus
      }".`,
    });
    await reloadOrders();
  };

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingOrder) return;
    setLoading(true);
    setFeedback(null);

    try {
      const disc = Number(discountInput || 0);
      const finalTotal = Math.max(0, confirmingOrder.subtotal - disc);

      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: confirmingOrder.id,
          discount: disc,
          payments: [
            {
              method: paymentMethod,
              amount: finalTotal,
              feeAmount: 0,
              installments: 1,
              status: paymentStatus,
            },
          ],
          idempotencyKey: `confirm_ord_${confirmingOrder.id}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao confirmar venda.");
      }

      setFeedback({
        type: "success",
        text: `Venda confirmada com sucesso (${data.sale.code})! O estoque e o financeiro foram atualizados.`,
      });
      setConfirmingOrder(null);
      await reloadOrders();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao confirmar venda.",
      });
    } finally {
      setLoading(false);
    }
  };

  const buildCustomerWhatsApp = (ord: OrderRow) => {
    const check = validateWhatsAppNumber(ord.customerPhone);
    const msg = encodeURIComponent(
      `Olá, ${ord.customerName}! Aqui é da *Suzano Sports* sobre seu pedido *${ord.code}* (${formatBRL(
        ord.total
      )}). Já separamos seus itens para confirmarmos os detalhes!`
    );
    if (check.valid) {
      return `https://wa.me/${check.normalized}?text=${msg}`;
    }
    return `https://wa.me/?text=${msg}`;
  };

  const filtered =
    statusFilter === "ALL"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <h1 className="text-2xl font-black text-brand-graphite">
          Gestão de Pedidos Recebidos pela Vitrine (WhatsApp)
        </h1>
        <p className="text-xs text-slate-500">
          Acompanhe as solicitações da sacola digital. Somente ao clicar em{" "}
          <strong>Confirmar Venda</strong> o estoque é baixado definitivamente e
          o valor entra no faturamento.
        </p>
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

      {/* Filtros por Status */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`rounded-lg px-3 py-1.5 ${
            statusFilter === "ALL"
              ? "bg-brand-graphite text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Todos ({orders.length})
        </button>
        {ORDER_STATUS_LIST.map((st) => (
          <button
            key={st.code}
            type="button"
            onClick={() => setStatusFilter(st.code)}
            className={`rounded-lg px-3 py-1.5 ${
              statusFilter === st.code
                ? "bg-brand-blue text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {st.label} ({orders.filter((o) => o.status === st.code).length})
          </button>
        ))}
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
            Nenhuma solicitação de pedido encontrada neste filtro.
          </div>
        ) : (
          filtered.map((ord) => (
            <div
              key={ord.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
            >
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-brand-graphite px-2.5 py-1 text-xs font-extrabold text-white">
                      {ord.code}
                    </span>
                    <span className="text-sm font-black text-brand-graphite">
                      {ord.customerName}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      ({ord.customerPhone})
                    </span>
                    {ord.convertedSaleId && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Venda Confirmada & Estoque Baixado
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Criado em {new Date(ord.createdAt).toLocaleString("pt-BR")}{" "}
                    • Modalidade:{" "}
                    <strong>
                      {ord.deliveryMethod === "PICKUP"
                        ? "Retirada na Loja"
                        : `Entrega (${ord.addressNotes || "A combinar"})`}
                    </strong>{" "}
                    • Pagto preferido:{" "}
                    <strong>{ord.preferredPaymentMethod}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Abrir Conversa no WhatsApp do Cliente */}
                  <a
                    href={buildCustomerWhatsApp(ord)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Falar no WhatsApp
                  </a>

                  {/* Seletor rápido de Status */}
                  <select
                    value={ord.status}
                    onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-brand-graphite"
                  >
                    {ORDER_STATUS_LIST.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.label}
                      </option>
                    ))}
                  </select>

                  {/* Botão Confirmar Venda */}
                  {!ord.convertedSaleId && ord.status !== "CANCELADO" && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingOrder(ord);
                        setDiscountInput(String(ord.discount || 0));
                        setPaymentMethod(
                          (ord.preferredPaymentMethod as
                            | "PIX"
                            | "CASH"
                            | "DEBIT"
                            | "CREDIT"
                            | "OTHER") || "PIX"
                        );
                        setPaymentStatus("CONFIRMED");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white shadow-xs hover:bg-orange-600"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Confirmar Venda
                    </button>
                  )}

                  {ord.status !== "CANCELADO" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(ord.id, "CANCELADO")}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-brand-red hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {/* Itens do Pedido */}
              <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div className="space-y-1 text-xs">
                  {ord.items.map((item) => (
                    <p key={item.id} className="text-slate-700">
                      • <strong>{item.quantity}x</strong>{" "}
                      {item.productNameSnapshot} ({item.variationLabelSnapshot}){" "}
                      — <strong>{formatBRL(item.totalPrice)}</strong>{" "}
                      <span className="text-slate-400">
                        [SKU: {item.skuSnapshot}]
                      </span>
                    </p>
                  ))}
                  {ord.notes && (
                    <p className="mt-2 rounded bg-amber-50 px-2.5 py-1 text-amber-800">
                      <strong>Obs. do Cliente:</strong> {ord.notes}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  {ord.discount > 0 && (
                    <p className="text-xs text-slate-400">
                      Subtotal: {formatBRL(ord.subtotal)} | Desconto:{" "}
                      {formatBRL(ord.discount)}
                    </p>
                  )}
                  <p className="text-lg font-black text-brand-graphite">
                    Total: {formatBRL(ord.total)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE VENDA E RECEBIMENTO */}
      {confirmingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-black text-brand-graphite">
                Confirmar Venda do Pedido {confirmingOrder.code}
              </h2>
              <button
                type="button"
                onClick={() => setConfirmingOrder(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSale} className="mt-4 space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-bold text-brand-graphite">
                  Cliente: {confirmingOrder.customerName}
                </p>
                <p className="mt-1 text-slate-600">
                  Subtotal dos itens:{" "}
                  <strong>{formatBRL(confirmingOrder.subtotal)}</strong>
                </p>
              </div>

              {canApproveDiscount && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Desconto Concedido (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={confirmingOrder.subtotal}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(
                      e.target.value as
                        | "PIX"
                        | "CASH"
                        | "DEBIT"
                        | "CREDIT"
                        | "OTHER"
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="PIX">Pix</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="DEBIT">Cartão de Débito</option>
                  <option value="CREDIT">Cartão de Crédito</option>
                  <option value="OTHER">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Status do Recebimento Financeiro
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) =>
                    setPaymentStatus(
                      e.target.value as "CONFIRMED" | "PENDING"
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="CONFIRMED">
                    Já Recebido (Entra no Caixa Agora)
                  </option>
                  <option value="PENDING">
                    A Receber na Retirada/Entrega (Gera Conta a Receber)
                  </option>
                </select>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>Valor Final da Venda:</span>
                  <span className="text-lg text-emerald-700">
                    {formatBRL(
                      Math.max(
                        0,
                        confirmingOrder.subtotal - Number(discountInput || 0)
                      )
                    )}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingOrder(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-emerald-700"
                >
                  {loading
                    ? "Processando transação..."
                    : "Confirmar Venda & Baixar Estoque"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
