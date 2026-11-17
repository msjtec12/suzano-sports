"use client";

import React from "react";
import Link from "next/link";
import { Heart, ShoppingBag, CheckCircle2, AlertCircle } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { useBag } from "./BagAndFavoritesContext";
import type { EnrichedProduct } from "@/services/product-service";

interface ProductCardProps {
  product: EnrichedProduct;
  showNumericStock?: boolean;
}

export function ProductCard({
  product,
  showNumericStock = false,
}: ProductCardProps) {
  const { toggleFavorite, isFavorite } = useBag();
  const fav = isFavorite(product.id);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-md">
      {/* Badges superiores */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
        {product.hasLegitPromo && product.discountPercent > 0 && (
          <span className="inline-flex items-center rounded-md bg-brand-red px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm">
            -{product.discountPercent}% OFF
          </span>
        )}
        {!product.isAvailable && (
          <span className="inline-flex items-center rounded-md bg-slate-800 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Esgotado
          </span>
        )}
      </div>

      {/* Botão Favoritar */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          toggleFavorite(product.id);
        }}
        aria-label={
          fav
            ? `Remover ${product.name} dos favoritos`
            : `Adicionar ${product.name} aos favoritos`
        }
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-brand-red"
      >
        <Heart
          className={`h-4 w-4 ${
            fav ? "fill-brand-red text-brand-red" : "text-slate-600"
          }`}
        />
      </button>

      {/* Imagem Principal */}
      <Link
        href={`/produto/${product.slug}`}
        className="relative aspect-square w-full overflow-hidden bg-slate-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.primaryImage}
          alt={product.images[0]?.altText || product.name}
          loading="lazy"
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold uppercase tracking-wider text-brand-blue">
              {product.brandName || product.categoryName}
            </span>
            {product.isAvailable ? (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {showNumericStock
                  ? `${product.totalStock} disp.`
                  : "Disponível"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                <AlertCircle className="h-3.5 w-3.5" />
                Indisponível
              </span>
            )}
          </div>

          <Link
            href={`/produto/${product.slug}`}
            className="line-clamp-2 text-sm font-bold text-brand-graphite transition-colors group-hover:text-brand-blue sm:text-base"
          >
            {product.name}
          </Link>

          {product.availableSizes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.availableSizes.slice(0, 5).map((sz) => (
                <span
                  key={sz}
                  className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-700"
                >
                  {sz}
                </span>
              ))}
              {product.availableSizes.length > 5 && (
                <span className="px-1 text-[11px] text-slate-500">
                  +{product.availableSizes.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-brand-graphite sm:text-xl">
              {formatBRL(product.effectivePrice)}
            </span>
            {product.hasLegitPromo && (
              <span className="text-xs font-medium text-slate-400 line-through">
                {formatBRL(product.salePrice)}
              </span>
            )}
          </div>

          <Link
            href={`/produto/${product.slug}`}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-graphite px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-brand-blue"
          >
            <ShoppingBag className="h-4 w-4" />
            {product.isAvailable ? "Ver opções e tamanhos" : "Ver detalhes"}
          </Link>
        </div>
      </div>
    </article>
  );
}
