"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  MessageCircle,
  CheckCircle2,
  MapPin,
  Truck,
} from "lucide-react";
import { useBag } from "./BagAndFavoritesContext";
import { formatBRL } from "@/lib/utils";

export function BagDrawer() {
  const {
    items,
    isBagOpen,
    closeBag,
    updateQuantity,
    removeItem,
    clearBag,
    subtotal,
  } = useBag();

  const [step, setStep] = useState<"CART" | "CHECKOUT" | "SUCCESS">("CART");
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

  if (!isBagOpen) return null;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const idempotencyKey = `web_${Date.now()}_${Math.random()
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
        throw new Error(data.error || "Não foi possível gerar o pedido.");
      }

      setCreatedOrder({
        code: data.order.code,
        whatsappUrl: data.whatsappUrl,
      });
      clearBag();
      setStep("SUCCESS");

      // Abre o WhatsApp em nova aba com a mensagem estruturada
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Erro ao processar sua solicitação."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Sacola de compras Suzano Sports"
    >
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-brand-graphite px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-brand-orange" />
            <h2 className="text-base font-bold">
              {step === "CART" && "Sua Sacola"}
              {step === "CHECKOUT" && "Finalizar Solicitação"}
              {step === "SUCCESS" && "Solicitação Registrada"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep("CART");
              closeBag();
            }}
            aria-label="Fechar sacola"
            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "SUCCESS" && createdOrder ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
                Código do Pedido: {createdOrder.code}
              </span>
              <h3 className="mt-3 text-xl font-extrabold text-brand-graphite">
                Solicitação gerada com sucesso!
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Seu pedido entrou em nosso painel com status{" "}
                <strong>Aguardando atendimento</strong>. Finalize o envio da
                mensagem no WhatsApp para nossa equipe confirmar disponibilidade,
                retirada ou entrega e pagamento.
              </p>

              <a
                href={createdOrder.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700"
              >
                <MessageCircle className="h-5 w-5" />
                Abrir conversa no WhatsApp
              </a>

              <button
                type="button"
                onClick={() => {
                  setCreatedOrder(null);
                  setStep("CART");
                  closeBag();
                }}
                className="mt-4 text-xs font-semibold text-slate-500 underline hover:text-brand-graphite"
              >
                Voltar para a loja
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-base font-bold text-slate-700">
                Sua sacola está vazia
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Escolha seus calçados, roupas e acessórios esportivos no
                catálogo e finalize pelo WhatsApp.
              </p>
              <Link
                href="/catalogo"
                onClick={closeBag}
                className="mt-5 rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-brand-graphite"
              >
                Explorar Catálogo
              </Link>
            </div>
          ) : step === "CART" ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.variationId}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="h-18 w-18 rounded-lg object-cover"
                  />
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/produto/${item.productSlug}`}
                          onClick={closeBag}
                          className="text-sm font-bold text-brand-graphite hover:text-brand-blue"
                        >
                          {item.productName}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.variationId)}
                          aria-label={`Remover ${item.productName}`}
                          className="text-slate-400 hover:text-brand-red"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        Cor: {item.color} • Tam: {item.size}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.variationId, item.quantity - 1)
                          }
                          aria-label="Diminuir quantidade"
                          className="p-1.5 text-slate-600 hover:text-brand-graphite"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-brand-graphite">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.variationId, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.maxStock}
                          aria-label="Aumentar quantidade"
                          className="p-1.5 text-slate-600 hover:text-brand-graphite disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-extrabold text-brand-graphite">
                        {formatBRL(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <form
              id="bag-checkout-form"
              onSubmit={handleCreateOrder}
              className="space-y-4"
            >
              {errorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: João Silva"
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
                  placeholder="Ex: (11) 99999-9999"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Como prefere receber? *
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("PICKUP")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-bold transition ${
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
                    className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-bold transition ${
                      deliveryMethod === "DELIVERY"
                        ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                    Consultar Entrega
                  </button>
                </div>
              </div>

              {deliveryMethod === "DELIVERY" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Bairro / Endereço em Suzano ou Região *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressNotes}
                    onChange={(e) => setAddressNotes(e.target.value)}
                    placeholder="Informe rua, número e bairro para cálculo"
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
                  <option value="CASH">Dinheiro na retirada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguma dúvida sobre forma ou tamanho?"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                />
              </div>
            </form>
          )}
        </div>

        {/* Rodapé da Sacola */}
        {items.length > 0 && step !== "SUCCESS" && (
          <div className="border-t border-slate-200 bg-slate-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">
                Subtotal estimado
              </span>
              <span className="text-xl font-extrabold text-brand-graphite">
                {formatBRL(subtotal)}
              </span>
            </div>

            {step === "CART" ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStep("CHECKOUT")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-orange-600"
                >
                  Avançar para Solicitação WhatsApp
                </button>
                <Link
                  href="/sacola"
                  onClick={closeBag}
                  className="block text-center text-xs font-semibold text-slate-600 underline hover:text-brand-blue"
                >
                  Ver sacola em tela cheia
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="submit"
                  form="bag-checkout-form"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <MessageCircle className="h-5 w-5" />
                  {loading
                    ? "Gerando código do pedido..."
                    : "Enviar Pedido pelo WhatsApp"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("CART")}
                  className="w-full py-1.5 text-center text-xs font-semibold text-slate-500 hover:text-brand-graphite"
                >
                  ← Voltar para revisão dos itens
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
