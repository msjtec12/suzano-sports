"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  RotateCcw,
  Store,
  X,
} from "lucide-react";
import { formatBRL, toMoney } from "@/lib/utils";
import type { EnrichedProduct } from "@/services/product-service";

interface PosCartItem {
  variationId: string;
  productId: string;
  productName: string;
  sku: string;
  color: string;
  size: string;
  unitPrice: number;
  maxStock: number;
  quantity: number;
}

interface PaymentEntry {
  method: "PIX" | "CASH" | "DEBIT" | "CREDIT" | "OTHER";
  amount: number;
}

interface RecentSale {
  id: string;
  code: string;
  customerName: string | null;
  origin: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  confirmedAt: Date | string;
  sellerName: string;
  items: {
    id: string;
    productNameSnapshot: string;
    variationLabelSnapshot: string;
    quantity: number;
    returnedQuantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  payments: {
    id: string;
    method: string;
    amount: number;
  }[];
}

export function PosAdminClient({
  products,
  initialSales,
  canApproveDiscount,
}: {
  products: EnrichedProduct[];
  initialSales: RecentSale[];
  canApproveDiscount: boolean;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerName, setCustomerName] = useState("Cliente Balcão");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountInput, setDiscountInput] = useState("0");

  // Pagamento simples ou combinado
  const [primaryMethod, setPrimaryMethod] = useState<
    "PIX" | "CASH" | "DEBIT" | "CREDIT" | "OTHER"
  >("PIX");
  const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(false);
  const [secondMethod, setSecondMethod] = useState<
    "PIX" | "CASH" | "DEBIT" | "CREDIT" | "OTHER"
  >("CASH");
  const [secondAmountInput, setSecondAmountInput] = useState("0");

  const [salesHistory, setSalesHistory] = useState<RecentSale[]>(initialSales);
  const [lastReceipt, setLastReceipt] = useState<{
    code: string;
    date: string;
    customerName: string;
    subtotal: number;
    discount: number;
    total: number;
    items: PosCartItem[];
    payments: PaymentEntry[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Lista plana de variações disponíveis para busca rápida por Nome, SKU ou Código de Barras
  const flatVariations = useMemo(() => {
    const list: {
      variationId: string;
      productId: string;
      productName: string;
      sku: string;
      barcode: string | null;
      color: string;
      size: string;
      effectivePrice: number;
      quantity: number;
      imageUrl: string;
    }[] = [];

    for (const p of products) {
      if (p.status === "INACTIVE" || p.status === "DRAFT") continue;
      for (const v of p.variations) {
        if (!v.active) continue;
        list.push({
          variationId: v.id,
          productId: p.id,
          productName: p.name,
          sku: v.sku,
          barcode: v.barcode || p.barcode,
          color: v.color,
          size: v.size,
          effectivePrice: v.effectivePrice,
          quantity: v.quantity,
          imageUrl: p.primaryImage,
        });
      }
    }
    return list;
  }, [products]);

  const filteredVariations = useMemo(() => {
    if (!searchQuery.trim()) return flatVariations.slice(0, 24);
    const q = searchQuery.trim().toLowerCase();
    return flatVariations.filter(
      (v) =>
        v.productName.toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q) ||
        (v.barcode && v.barcode.toLowerCase().includes(q)) ||
        v.color.toLowerCase().includes(q) ||
        v.size.toLowerCase().includes(q)
    );
  }, [flatVariations, searchQuery]);

  const addToPosCart = (v: (typeof flatVariations)[number]) => {
    if (v.quantity <= 0) {
      setFeedback({
        type: "error",
        text: `Variação "${v.productName} (${v.color}/${v.size})" está sem saldo em estoque.`,
      });
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((i) => i.variationId === v.variationId);
      if (idx >= 0) {
        if (prev[idx].quantity >= v.quantity) {
          return prev;
        }
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          variationId: v.variationId,
          productId: v.productId,
          productName: v.productName,
          sku: v.sku,
          color: v.color,
          size: v.size,
          unitPrice: v.effectivePrice,
          maxStock: v.quantity,
          quantity: 1,
        },
      ];
    });
  };

  const subtotal = toMoney(
    cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0)
  );
  const discount = toMoney(Math.min(subtotal, Math.max(0, Number(discountInput || 0))));
  const total = toMoney(Math.max(0, subtotal - discount));

  const secondAmt = splitPaymentEnabled
    ? toMoney(Math.min(total, Math.max(0, Number(secondAmountInput || 0))))
    : 0;
  const firstAmt = toMoney(Math.max(0, total - secondAmt));

  const handleFinishSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setLoading(true);
    setFeedback(null);

    const paymentsPayload: PaymentEntry[] = [];
    if (firstAmt > 0) {
      paymentsPayload.push({ method: primaryMethod, amount: firstAmt });
    }
    if (splitPaymentEnabled && secondAmt > 0) {
      paymentsPayload.push({ method: secondMethod, amount: secondAmt });
    }

    try {
      const idempotencyKey = `pos_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const res = await fetch("/api/admin/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim() || "Cliente Balcão",
          customerPhone: customerPhone.trim() || null,
          discount,
          surcharge: 0,
          idempotencyKey,
          items: cart.map((i) => ({
            variationId: i.variationId,
            quantity: i.quantity,
            unitPriceOverride: i.unitPrice,
          })),
          payments: paymentsPayload.map((p) => ({
            method: p.method,
            amount: p.amount,
            feeAmount: 0,
            installments: 1,
            status: "CONFIRMED",
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao finalizar venda.");
      }

      setLastReceipt({
        code: data.sale.code,
        date: new Date(data.sale.confirmedAt).toLocaleString("pt-BR"),
        customerName: customerName || "Cliente Balcão",
        subtotal,
        discount,
        total,
        items: [...cart],
        payments: paymentsPayload,
      });

      setCart([]);
      setDiscountInput("0");
      setSecondAmountInput("0");
      setSplitPaymentEnabled(false);
      setFeedback({
        type: "success",
        text: `Venda ${data.sale.code} finalizada com sucesso! Estoque e caixa atualizados.`,
      });

      const salesRes = await fetch("/api/admin/pos");
      if (salesRes.ok) {
        const sData = await salesRes.json();
        setSalesHistory(sData.sales);
      }
      router.refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao finalizar venda.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrReturnSale = async (sale: RecentSale) => {
    const reason = window.prompt(
      `Informe o motivo do cancelamento/devolução da venda ${sale.code}:`,
      "Devolução de mercadoria no balcão"
    );
    if (!reason || reason.trim().length < 3) return;

    const res = await fetch("/api/admin/pos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saleId: sale.id,
        reason,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setFeedback({
        type: "error",
        text: data.error || "Erro ao estornar venda.",
      });
      return;
    }

    setFeedback({
      type: "success",
      text: `Venda ${sale.code} cancelada/devolvida com sucesso. As quantidades retornaram ao estoque!`,
    });
    const salesRes = await fetch("/api/admin/pos");
    if (salesRes.ok) {
      const sData = await salesRes.json();
      setSalesHistory(sData.sales);
    }
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho PDV */}
      <div className="no-print flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange text-white">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-brand-graphite">
              Frente de Caixa Simplificada (PDV)
            </h1>
            <p className="text-xs text-slate-500">
              Venda presencial rápida: busque por nome, SKU ou código de barras,
              escolha a forma de pagamento e finalize em poucos cliques.
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`no-print flex items-center justify-between rounded-xl border p-3.5 text-xs font-bold ${
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

      {/* Área Principal do PDV */}
      <div className="no-print grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Esquerda: Busca e Seleção de Produtos/Variações */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-brand-graphite">
              1. Buscar Produto por Nome, SKU ou Código de Barras
            </label>
            <div className="relative mt-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o nome, SKU (ex: SZS-...) ou bipe o código de barras..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-4 pr-10 text-sm font-medium focus:border-brand-blue focus:outline-none"
              />
              <Search className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="mt-4 grid max-h-[440px] grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2">
              {filteredVariations.map((v) => (
                <button
                  key={v.variationId}
                  type="button"
                  disabled={v.quantity <= 0}
                  onClick={() => addToPosCart(v)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                    v.quantity > 0
                      ? "border-slate-200 bg-slate-50/70 hover:border-brand-blue hover:bg-sky-50/40"
                      : "cursor-not-allowed border-slate-100 bg-slate-100 opacity-50"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-xs font-extrabold text-brand-graphite">
                      {v.productName}
                    </p>
                    <p className="text-[11px] font-bold text-brand-blue">
                      Cor: {v.color} • Tam: {v.size}
                    </p>
                    <p className="text-[10px] text-slate-400">SKU: {v.sku}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-brand-graphite">
                      {formatBRL(v.effectivePrice)}
                    </p>
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        v.quantity > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-brand-red"
                      }`}
                    >
                      {v.quantity > 0 ? `${v.quantity} disp.` : "Esgotado"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Direita: Caixa / Sacola do Balcão e Finalização */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleFinishSale}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
          >
            <h2 className="text-base font-black text-brand-graphite">
              2. Itens da Venda de Balcão
            </h2>

            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-xs text-slate-400">
                Clique em um produto ao lado para adicioná-lo ao caixa.
              </div>
            ) : (
              <div className="space-y-2.5">
                {cart.map((item) => (
                  <div
                    key={item.variationId}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                  >
                    <div>
                      <p className="font-extrabold text-brand-graphite">
                        {item.productName}
                      </p>
                      <p className="text-slate-500">
                        {item.color} / {item.size} • {formatBRL(item.unitPrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            setCart((prev) =>
                              prev
                                .map((c) =>
                                  c.variationId === item.variationId
                                    ? { ...c, quantity: c.quantity - 1 }
                                    : c
                                )
                                .filter((c) => c.quantity > 0)
                            )
                          }
                          className="p-1 text-slate-600"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-2 font-black">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={item.quantity >= item.maxStock}
                          onClick={() =>
                            setCart((prev) =>
                              prev.map((c) =>
                                c.variationId === item.variationId
                                  ? {
                                      ...c,
                                      quantity: Math.min(
                                        c.maxStock,
                                        c.quantity + 1
                                      ),
                                    }
                                  : c
                              )
                            )
                          }
                          className="p-1 text-slate-600 disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="w-20 text-right font-black text-brand-graphite">
                        {formatBRL(item.unitPrice * item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) =>
                            prev.filter(
                              (c) => c.variationId !== item.variationId
                            )
                          )
                        }
                        className="text-slate-400 hover:text-brand-red"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Identificação opcional do cliente e desconto */}
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600">
                  Cliente (Opcional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600">
                  Desconto (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={subtotal}
                  disabled={!canApproveDiscount}
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Formas de Pagamento (Simples ou Combinado) */}
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase text-brand-graphite">
                  3. Forma de Pagamento
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-brand-blue">
                  <input
                    type="checkbox"
                    checked={splitPaymentEnabled}
                    onChange={(e) => setSplitPaymentEnabled(e.target.checked)}
                  />
                  Pagamento Combinado (2 formas)
                </label>
              </div>

              <div className="grid grid-cols-5 gap-1.5 text-xs font-bold">
                {(
                  [
                    { code: "PIX", label: "Pix" },
                    { code: "CASH", label: "Dinheiro" },
                    { code: "DEBIT", label: "Débito" },
                    { code: "CREDIT", label: "Crédito" },
                    { code: "OTHER", label: "Outros" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => setPrimaryMethod(m.code)}
                    className={`rounded-lg border py-2 text-center transition ${
                      primaryMethod === m.code
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {splitPaymentEnabled && (
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600">
                      2ª Forma de Pagamento
                    </label>
                    <select
                      value={secondMethod}
                      onChange={(e) =>
                        setSecondMethod(
                          e.target.value as
                            | "PIX"
                            | "CASH"
                            | "DEBIT"
                            | "CREDIT"
                            | "OTHER"
                        )
                      }
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5"
                    >
                      <option value="CASH">Dinheiro</option>
                      <option value="PIX">Pix</option>
                      <option value="DEBIT">Cartão de Débito</option>
                      <option value="CREDIT">Cartão de Crédito</option>
                      <option value="OTHER">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600">
                      Valor na 2ª Forma (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={total}
                      value={secondAmountInput}
                      onChange={(e) => setSecondAmountInput(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5"
                    />
                    <span className="text-[10px] text-slate-500">
                      1ª Forma ({primaryMethod}): {formatBRL(firstAmt)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Resumo e Botão Finalizar */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Subtotal: {formatBRL(subtotal)}</span>
                <span>Desconto: {formatBRL(discount)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-extrabold uppercase text-brand-graphite">
                  Total a Receber
                </span>
                <span className="text-2xl font-black text-emerald-700">
                  {formatBRL(total)}
                </span>
              </div>

              <button
                type="submit"
                disabled={cart.length === 0 || loading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 py-4 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <CheckCircle2 className="h-5 w-5" />
                {loading
                  ? "Registrando venda..."
                  : "Finalizar Venda no Balcão"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* COMPROVANTE GERENCIAL IMPRIMÍVEL (Não confundir com documento fiscal oficial) */}
      {lastReceipt && (
        <div className="rounded-2xl border-2 border-emerald-500 bg-white p-6 shadow-lg">
          <div className="no-print mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Comprovante Gerencial Pronto
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-graphite px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-blue"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir Comprovante
              </button>
              <button
                type="button"
                onClick={() => setLastReceipt(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Fechar
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-sm font-mono text-xs text-slate-800">
            <div className="text-center">
              <p className="text-sm font-black">SUZANO SPORTS</p>
              <p>Rua Benjamin Constant, 810 - Centro, Suzano - SP</p>
              <p className="mt-1 border-y border-dashed border-slate-400 py-1 font-bold">
                COMPROVANTE GERENCIAL DE VENDA
                <br />
                (SEM VALOR FISCAL / NÃO É DOCUMENTO FISCAL)
              </p>
            </div>

            <div className="mt-2 space-y-0.5">
              <p>Código: {lastReceipt.code}</p>
              <p>Data: {lastReceipt.date}</p>
              <p>Cliente: {lastReceipt.customerName}</p>
            </div>

            <div className="my-2 border-y border-dashed border-slate-400 py-2">
              {lastReceipt.items.map((item) => (
                <div
                  key={item.variationId}
                  className="flex justify-between py-0.5"
                >
                  <span>
                    {item.quantity}x {item.productName} ({item.color}/
                    {item.size})
                  </span>
                  <span>{formatBRL(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-0.5 font-bold">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatBRL(lastReceipt.subtotal)}</span>
              </div>
              {lastReceipt.discount > 0 && (
                <div className="flex justify-between">
                  <span>Desconto:</span>
                  <span>-{formatBRL(lastReceipt.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>TOTAL PAGO:</span>
                <span>{formatBRL(lastReceipt.total)}</span>
              </div>
            </div>

            <div className="mt-2 border-t border-dashed border-slate-400 pt-2">
              <p className="font-bold">Pagamentos:</p>
              {lastReceipt.payments.map((p, idx) => (
                <p key={idx}>
                  • {p.method}: {formatBRL(p.amount)}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Histórico Recente de Vendas (Com opção de Cancelamento / Devolução) */}
      <div className="no-print overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-graphite">
            Últimas Vendas Realizadas (Balcão PDV & WhatsApp)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-extrabold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Código / Data</th>
                <th className="px-4 py-3">Origem / Cliente</th>
                <th className="px-4 py-3">Itens</th>
                <th className="px-4 py-3">Pagamento / Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {salesHistory.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-extrabold text-brand-graphite">
                      {s.code}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(s.confirmedAt).toLocaleString("pt-BR")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold">
                      {s.origin === "PDV" ? "Balcão PDV" : "WhatsApp"}
                    </span>
                    <p className="mt-1 font-bold text-slate-700">
                      {s.customerName || "Cliente Balcão"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {s.items.map((i) => (
                      <p key={i.id} className="text-slate-600">
                        {i.quantity}x {i.productNameSnapshot} (
                        {i.variationLabelSnapshot})
                        {i.returnedQuantity > 0 && (
                          <span className="ml-1 text-brand-red">
                            [{i.returnedQuantity} dev.]
                          </span>
                        )}
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-black text-brand-graphite">
                      {formatBRL(s.total)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {s.payments.map((p) => p.method).join(" + ")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        s.status === "CONFIRMED"
                          ? "bg-emerald-100 text-emerald-800"
                          : s.status === "PARTIALLY_REFUNDED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-brand-red"
                      }`}
                    >
                      {s.status === "CONFIRMED"
                        ? "Confirmada"
                        : s.status === "PARTIALLY_REFUNDED"
                        ? "Dev. Parcial"
                        : "Cancelada"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status !== "CANCELLED" && (
                      <button
                        type="button"
                        onClick={() => handleCancelOrReturnSale(s)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-bold text-brand-red hover:bg-red-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Cancelar / Devolver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
