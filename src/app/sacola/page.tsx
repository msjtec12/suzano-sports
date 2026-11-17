"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MessageCircle,
  CheckCircle2,
  MapPin,
  Truck,
  ArrowLeft,
} from "lucide-react";
import { useBag } from "@/components/storefront/BagAndFavoritesContext";
import { formatBRL } from "@/lib/utils";

export default function SacolaFullPage() {
  const { items, updateQuantity, removeItem, clearBag, subtotal } = useBag();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY">(
    "PICKUP"
  );
  const [addressNotes, setAddressNotes] = useState("");
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<
    "PIX" | "CREDIT" | "DEBIT" | "CASH"
  >("PIX");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<{
    code: string;
    whatsappUrl: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const idempotencyKey = `bagpage_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          deliveryMethod,
          addressNotes: deliveryMethod === "DELIVERY" ? addressNotes : null,
          preferredPaymentMethod,
          notes,
          idempotencyKey,
          items: items.map((i) => ({
            variationId: i.variationId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao registrar solicitação.");
      }

      setCreatedOrder({
        code: data.order.code,
        whatsappUrl: data.whatsappUrl,
      });
      clearBag();

      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Erro ao processar sua sacola."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-ice py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Continuar comprando no catálogo
          </Link>
        </div>

        <h1 className="text-2xl font-black text-brand-graphite sm:text-3xl">
          Minha Sacola — Suzano Sports
        </h1>

        {createdOrder ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-xs">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Código Único: {createdOrder.code}
            </span>
            <h2 className="mt-3 text-2xl font-black text-brand-graphite">
              Solicitação de Pedido Criada!
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
              Sua solicitação foi registrada em nosso sistema com status{" "}
              <strong>Aguardando atendimento</strong>. Clique abaixo para enviar
              o resumo no WhatsApp oficial da Suzano Sports e combinar retirada
              ou entrega.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href={createdOrder.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-md hover:bg-emerald-700"
              >
                <MessageCircle className="h-5 w-5" />
                Abrir WhatsApp com Resumo do Pedido
              </a>
              <Link
                href="/"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-brand-graphite hover:bg-slate-50"
              >
                Voltar à Página Inicial
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <h2 className="text-lg font-extrabold text-brand-graphite">
              Sua sacola está vazia
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Adicione tênis, roupas ou acessórios esportivos para enviar seu
              pedido pelo WhatsApp.
            </p>
            <Link
              href="/catalogo"
              className="mt-6 inline-block rounded-xl bg-brand-orange px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-orange-600"
            >
              Ver Produtos no Catálogo
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Lista de Itens */}
            <div className="space-y-4 lg:col-span-7">
              {items.map((item) => (
                <div
                  key={item.variationId}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <Link
                      href={`/produto/${item.productSlug}`}
                      className="text-base font-extrabold text-brand-graphite hover:text-brand-blue"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs font-semibold text-slate-500">
                      Cor: {item.color} • Tamanho: {item.size} • SKU: {item.sku}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-slate-300">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.variationId, item.quantity - 1)
                          }
                          className="p-2 text-slate-600 hover:text-brand-graphite"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-3 text-xs font-extrabold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.variationId, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.maxStock}
                          className="p-2 text-slate-600 hover:text-brand-graphite disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-base font-black text-brand-graphite">
                        {formatBRL(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.variationId)}
                    aria-label="Remover item"
                    className="p-2 text-slate-400 hover:text-brand-red"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Dados para Atendimento WhatsApp */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleSubmit}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
              >
                <h2 className="text-lg font-extrabold text-brand-graphite">
                  Dados para Atendimento
                </h2>

                {errorMsg && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Seu Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome completo"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Seu WhatsApp com DDD *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Retirada ou Entrega
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod("PICKUP")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-bold ${
                        deliveryMethod === "PICKUP"
                          ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      <MapPin className="h-4 w-4" />
                      Retirar na Loja
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod("DELIVERY")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-bold ${
                        deliveryMethod === "DELIVERY"
                          ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      <Truck className="h-4 w-4" />
                      Entrega
                    </button>
                  </div>
                </div>

                {deliveryMethod === "DELIVERY" && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Endereço para Entrega *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressNotes}
                      onChange={(e) => setAddressNotes(e.target.value)}
                      placeholder="Rua, número e bairro em Suzano"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Forma de Pagamento Preferida
                  </label>
                  <select
                    value={preferredPaymentMethod}
                    onChange={(e) =>
                      setPreferredPaymentMethod(
                        e.target.value as "PIX" | "CREDIT" | "DEBIT" | "CASH"
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                  >
                    <option value="PIX">Pix</option>
                    <option value="CREDIT">Cartão de Crédito</option>
                    <option value="DEBIT">Cartão de Débito</option>
                    <option value="CASH">Dinheiro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Observações
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                  />
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">
                      Subtotal do Pedido
                    </span>
                    <span className="text-2xl font-black text-brand-graphite">
                      {formatBRL(subtotal)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {loading
                      ? "Criando solicitação..."
                      : "Concluir Solicitação no WhatsApp"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
