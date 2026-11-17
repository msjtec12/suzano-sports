"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  MessageCircle,
  Heart,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Truck,
  ZoomIn,
  Minus,
  Plus,
} from "lucide-react";
import { useBag } from "./BagAndFavoritesContext";
import { formatBRL, buildWhatsAppUrl } from "@/lib/utils";
import type { EnrichedProduct } from "@/services/product-service";

interface ProductDetailClientProps {
  product: EnrichedProduct;
  settings: {
    whatsappPhone?: string | null;
    whatsappShortLink?: string | null;
    showNumericStockToCustomer: boolean;
    addressStreet: string;
    addressDistrict: string;
    addressCity: string;
    deliveryNotes?: string | null;
  };
}

export function ProductDetailClient({
  product,
  settings,
}: ProductDetailClientProps) {
  const { addItem, toggleFavorite, isFavorite } = useBag();
  const fav = isFavorite(product.id);

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // Inicializa na primeira variação disponível em estoque (ou na primeira da lista se esgotado)
  const activeVariations = useMemo(
    () => product.variations.filter((v) => v.active),
    [product.variations]
  );

  const firstAvailableVariation =
    activeVariations.find((v) => v.quantity > 0) || activeVariations[0];

  const [selectedColor, setSelectedColor] = useState(
    firstAvailableVariation?.color || "Única"
  );
  const [selectedSize, setSelectedSize] = useState(
    firstAvailableVariation?.size || "Único"
  );
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const allColors = useMemo(
    () => Array.from(new Set(activeVariations.map((v) => v.color))),
    [activeVariations]
  );

  const allSizes = useMemo(
    () => Array.from(new Set(activeVariations.map((v) => v.size))),
    [activeVariations]
  );

  // Variação atualmente selecionada
  const currentVariation = useMemo(() => {
    return (
      activeVariations.find(
        (v) => v.color === selectedColor && v.size === selectedSize
      ) || null
    );
  }, [activeVariations, selectedColor, selectedSize]);

  const isColorAvailable = (color: string) =>
    activeVariations.some((v) => v.color === color && v.quantity > 0);

  const isCombinationAvailable = (color: string, size: string) => {
    const match = activeVariations.find(
      (v) => v.color === color && v.size === size
    );
    return Boolean(match && match.quantity > 0);
  };

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    // Se o tamanho atual não estiver disponível nessa cor, seleciona automaticamente o primeiro tamanho disponível
    if (!isCombinationAvailable(color, selectedSize)) {
      const availForColor = activeVariations.find(
        (v) => v.color === color && v.quantity > 0
      );
      if (availForColor) {
        setSelectedSize(availForColor.size);
      }
    }
    setQuantity(1);
    setFeedback(null);
  };

  const handleSelectSize = (size: string) => {
    if (!isCombinationAvailable(selectedColor, size)) return;
    setSelectedSize(size);
    setQuantity(1);
    setFeedback(null);
  };

  const maxStock = currentVariation ? currentVariation.quantity : 0;
  const effectivePrice = currentVariation
    ? currentVariation.effectivePrice
    : product.effectivePrice;
  const baseSalePrice = currentVariation
    ? currentVariation.salePrice
    : product.salePrice;

  const handleAddToBag = () => {
    if (!currentVariation || currentVariation.quantity <= 0) {
      setFeedback({
        type: "error",
        text: "Esta combinação de cor e tamanho está indisponível no momento.",
      });
      return;
    }

    const res = addItem({
      variationId: currentVariation.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      sku: currentVariation.sku,
      color: currentVariation.color,
      size: currentVariation.size,
      unitPrice: effectivePrice,
      maxStock: currentVariation.quantity,
      quantity,
      imageUrl: product.primaryImage,
    });

    setFeedback({
      type: res.added ? "success" : "error",
      text: res.message,
    });
  };

  const { url: directWhatsAppUrl } = buildWhatsAppUrl({
    whatsappPhone: settings.whatsappPhone,
    whatsappShortLink: settings.whatsappShortLink,
    message: `Olá, Suzano Sports! Gostaria de consultar o produto *${product.name}* (Cor: ${selectedColor}, Tamanho: ${selectedSize}, SKU: ${
      currentVariation?.sku || product.sku
    }) — Valor: ${formatBRL(effectivePrice)}.`,
  });

  const activeImage =
    product.images[selectedImageIdx]?.url || product.primaryImage;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Coluna Esquerda: Galeria de Imagens com Zoom */}
      <div className="lg:col-span-6">
        <div
          className="relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
          onMouseEnter={() => setZoomActive(true)}
          onMouseLeave={() => setZoomActive(false)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setZoomPos({ x, y });
          }}
          onClick={() => setZoomActive(!zoomActive)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage}
            alt={product.images[selectedImageIdx]?.altText || product.name}
            style={
              zoomActive
                ? {
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    transform: "scale(1.85)",
                  }
                : undefined
            }
            className="h-full w-full object-cover transition-transform duration-200"
          />

          <div className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg bg-brand-graphite/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
            <ZoomIn className="h-3.5 w-3.5" />
            Passe o mouse ou toque para ampliar
          </div>
        </div>

        {/* Miniaturas */}
        {product.images.length > 1 && (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {product.images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedImageIdx(idx)}
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  selectedImageIdx === idx
                    ? "border-brand-blue"
                    : "border-slate-200 opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.altText}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coluna Direita: Informações e Seletor de Variações */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 lg:col-span-6">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">
              {product.brandName
                ? `${product.brandName} • ${product.categoryName}`
                : product.categoryName}
            </span>
            <span className="text-xs text-slate-400">
              SKU: {currentVariation?.sku || product.sku}
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-black text-brand-graphite sm:text-3xl">
            {product.name}
          </h1>

          {/* Preço e Desconto */}
          <div className="mt-4 flex flex-wrap items-baseline gap-3 rounded-xl bg-brand-ice p-4">
            <span className="text-3xl font-black text-brand-graphite">
              {formatBRL(effectivePrice)}
            </span>
            {effectivePrice < baseSalePrice && (
              <>
                <span className="text-sm font-semibold text-slate-400 line-through">
                  {formatBRL(baseSalePrice)}
                </span>
                <span className="rounded-md bg-brand-red px-2 py-0.5 text-xs font-extrabold text-white">
                  -{product.discountPercent}% OFF
                </span>
              </>
            )}
          </div>

          {/* Descrição curta */}
          {product.shortDescription && (
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              {product.shortDescription}
            </p>
          )}

          {/* Seletor de Cores */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold uppercase tracking-wider text-slate-700">
                Cor selecionada:{" "}
                <strong className="text-brand-graphite">{selectedColor}</strong>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {allColors.map((color) => {
                const avail = isColorAvailable(color);
                const isSelected = selectedColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    disabled={!avail}
                    onClick={() => handleSelectColor(color)}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                      isSelected
                        ? "border-brand-graphite bg-brand-graphite text-white shadow-xs"
                        : avail
                        ? "border-slate-300 bg-white text-slate-700 hover:border-brand-blue"
                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through"
                    }`}
                  >
                    {color}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor de Tamanhos (Bloqueia combinações indisponíveis) */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold uppercase tracking-wider text-slate-700">
                Tamanho:{" "}
                <strong className="text-brand-graphite">{selectedSize}</strong>
              </span>
              {maxStock > 0 ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {settings.showNumericStockToCustomer
                    ? `${maxStock} unidade(s) em estoque`
                    : "Combinação disponível"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-brand-red">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Combinação esgotada
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {allSizes.map((size) => {
                const avail = isCombinationAvailable(selectedColor, size);
                const isSelected = selectedSize === size && avail;
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!avail}
                    onClick={() => handleSelectSize(size)}
                    aria-disabled={!avail}
                    title={
                      avail
                        ? `Selecionar tamanho ${size}`
                        : `Tamanho ${size} indisponível na cor ${selectedColor}`
                    }
                    className={`min-w-12 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition ${
                      isSelected
                        ? "border-brand-blue bg-brand-blue text-white shadow-xs"
                        : avail
                        ? "border-slate-300 bg-white text-brand-graphite hover:border-brand-blue"
                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through opacity-60"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantidade + Botões de Ação */}
          <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
            {feedback && (
              <div
                className={`rounded-xl p-3 text-xs font-bold ${
                  feedback.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {feedback.text}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {/* Seletor de Quantidade */}
              <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={maxStock <= 0}
                  aria-label="Diminuir quantidade"
                  className="p-3 text-slate-700 hover:text-brand-graphite disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 text-sm font-extrabold text-brand-graphite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                  disabled={maxStock <= 0 || quantity >= maxStock}
                  aria-label="Aumentar quantidade"
                  className="p-3 text-slate-700 hover:text-brand-graphite disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Botão Adicionar à Sacola */}
              <button
                type="button"
                disabled={maxStock <= 0}
                onClick={handleAddToBag}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-orange px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <ShoppingBag className="h-5 w-5" />
                {maxStock > 0 ? "Adicionar à Sacola" : "Variação Indisponível"}
              </button>

              {/* Botão Favorito */}
              <button
                type="button"
                onClick={() => toggleFavorite(product.id)}
                aria-label="Favoritar produto"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-brand-red hover:text-brand-red"
              >
                <Heart
                  className={`h-5 w-5 ${
                    fav ? "fill-brand-red text-brand-red" : ""
                  }`}
                />
              </button>
            </div>

            {/* Botão Consultar no WhatsApp */}
            <a
              href={directWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 bg-emerald-50/70 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-emerald-800 transition hover:bg-emerald-600 hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              Consultar este produto no WhatsApp
            </a>
          </div>
        </div>

        {/* Informações Complementares e Retirada/Entrega */}
        <div className="mt-6 space-y-2.5 rounded-xl border border-slate-200 bg-brand-ice p-4 text-xs text-slate-600">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
            <p>
              <strong>Retirada na Loja Física:</strong> {settings.addressStreet}{" "}
              — {settings.addressDistrict}, {settings.addressCity}.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
            <p>
              <strong>Condições de Entrega:</strong>{" "}
              {settings.deliveryNotes ||
                "Consulte entrega rápida em Suzano e região ao enviar sua sacola pelo WhatsApp."}
            </p>
          </div>
          <p className="text-[11px] text-slate-500">
            Não realizamos cobrança automática online. O pagamento (Pix, Cartão
            ou Dinheiro) é combinado somente após a confirmação da sua
            solicitação com nossa equipe.
          </p>
        </div>

        {product.fullDescription && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Descrição e Detalhes Técnicos
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {product.fullDescription}
            </p>
          </div>
        )}

        <div className="mt-4 text-xs text-slate-400">
          Categoria:{" "}
          <Link
            href={`/catalogo?categoria=${product.categorySlug}`}
            className="font-semibold text-brand-blue hover:underline"
          >
            {product.categoryName}
          </Link>
        </div>
      </div>
    </div>
  );
}
