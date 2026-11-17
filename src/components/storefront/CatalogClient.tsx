"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  X,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { ProductCard } from "./ProductCard";
import { useBag } from "./BagAndFavoritesContext";
import type { EnrichedProduct } from "@/services/product-service";

interface CatalogClientProps {
  initialProducts: EnrichedProduct[];
  categories: { id: string; name: string; slug: string; description?: string | null }[];
  brands: { id: string; name: string; slug: string }[];
  sizes: string[];
  colors: string[];
  showNumericStock: boolean;
  whatsappUrl: string;
  initialParams: {
    q?: string;
    categoria?: string;
    marca?: string;
    tamanho?: string;
    cor?: string;
    disponivel?: boolean;
    promocao?: boolean;
    favoritos?: boolean;
    ordem?: "newest" | "price_asc" | "price_desc";
  };
}

export function CatalogClient({
  initialProducts,
  categories,
  brands,
  sizes,
  colors,
  showNumericStock,
  whatsappUrl,
  initialParams,
}: CatalogClientProps) {
  const { favorites } = useBag();

  const [query, setQuery] = useState(initialParams.q || "");
  const [selectedCategory, setSelectedCategory] = useState(
    initialParams.categoria || ""
  );
  const [selectedBrand, setSelectedBrand] = useState(initialParams.marca || "");
  const [selectedSize, setSelectedSize] = useState(initialParams.tamanho || "");
  const [selectedColor, setSelectedColor] = useState(initialParams.cor || "");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(
    Boolean(initialParams.disponivel)
  );
  const [onlyPromo, setOnlyPromo] = useState(Boolean(initialParams.promocao));
  const [onlyFavorites, setOnlyFavorites] = useState(
    Boolean(initialParams.favoritos)
  );
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">(
    initialParams.ordem || "newest"
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeCategoryObj = categories.find(
    (c) => c.slug === selectedCategory
  );

  const filteredProducts = useMemo(() => {
    let list = [...initialProducts];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          (p.brandName && p.brandName.toLowerCase().includes(q))
      );
    }

    if (selectedCategory) {
      if (selectedCategory === "outlet-e-promocoes") {
        list = list.filter(
          (p) =>
            p.categorySlug === "outlet-e-promocoes" ||
            p.hasLegitPromo ||
            p.isPromo
        );
      } else {
        list = list.filter((p) => p.categorySlug === selectedCategory);
      }
    }

    if (selectedBrand) {
      list = list.filter(
        (p) =>
          p.brandName &&
          p.brandName.toLowerCase() === selectedBrand.toLowerCase()
      );
    }

    if (selectedSize) {
      list = list.filter((p) =>
        p.variations.some(
          (v) =>
            v.active &&
            v.quantity > 0 &&
            v.size.toLowerCase() === selectedSize.toLowerCase()
        )
      );
    }

    if (selectedColor) {
      list = list.filter((p) =>
        p.variations.some(
          (v) =>
            v.active &&
            v.quantity > 0 &&
            v.color.toLowerCase() === selectedColor.toLowerCase()
        )
      );
    }

    const min = Number(minPrice);
    if (!Number.isNaN(min) && min > 0) {
      list = list.filter((p) => p.effectivePrice >= min);
    }

    const max = Number(maxPrice);
    if (!Number.isNaN(max) && max > 0) {
      list = list.filter((p) => p.effectivePrice <= max);
    }

    if (onlyAvailable) {
      list = list.filter((p) => p.isAvailable);
    }

    if (onlyPromo) {
      list = list.filter((p) => p.hasLegitPromo || p.isPromo);
    }

    if (onlyFavorites) {
      list = list.filter((p) => favorites.includes(p.id));
    }

    if (sortBy === "price_asc") {
      list.sort((a, b) => a.effectivePrice - b.effectivePrice);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.effectivePrice - a.effectivePrice);
    } else {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return list;
  }, [
    initialProducts,
    query,
    selectedCategory,
    selectedBrand,
    selectedSize,
    selectedColor,
    minPrice,
    maxPrice,
    onlyAvailable,
    onlyPromo,
    onlyFavorites,
    favorites,
    sortBy,
  ]);

  const clearAllFilters = () => {
    setQuery("");
    setSelectedCategory("");
    setSelectedBrand("");
    setSelectedSize("");
    setSelectedColor("");
    setMinPrice("");
    setMaxPrice("");
    setOnlyAvailable(false);
    setOnlyPromo(false);
    setOnlyFavorites(false);
    setSortBy("newest");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-blue">
              Início
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/catalogo" className="hover:text-brand-blue">
              Catálogo
            </Link>
          </li>
          {activeCategoryObj && (
            <>
              <li>/</li>
              <li className="font-bold text-brand-graphite">
                {activeCategoryObj.name}
              </li>
            </>
          )}
        </ol>
      </nav>

      {/* Cabeçalho do Catálogo / Área de Promoções */}
      <div
        className={`mb-6 rounded-2xl border p-6 ${
          onlyPromo
            ? "border-red-200 bg-brand-graphite text-white"
            : "border-slate-200 bg-white text-brand-graphite"
        }`}
      >
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            {onlyPromo && (
              <span className="mb-2 inline-flex items-center gap-1 rounded bg-brand-red px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-white">
                <Sparkles className="h-3.5 w-3.5" />
                Área Oficial de Promoções e Outlet
              </span>
            )}
            <h1 className="text-2xl font-black sm:text-3xl">
              {onlyPromo
                ? "Ofertas & Outlet Suzano Sports"
                : activeCategoryObj
                ? activeCategoryObj.name
                : "Catálogo de Produtos Esportivos"}
            </h1>
            <p
              className={`mt-1 text-sm ${
                onlyPromo ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {activeCategoryObj?.description ||
                "Encontre tênis, roupas esportivas, calçados para treino, chuteiras, bonés e mochilas no centro de Suzano."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-brand-graphite lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </button>

            <div className="flex items-center gap-2">
              <label
                htmlFor="catalog-sort"
                className={`text-xs font-bold ${
                  onlyPromo ? "text-slate-300" : "text-slate-600"
                }`}
              >
                Ordenar:
              </label>
              <select
                id="catalog-sort"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as "newest" | "price_asc" | "price_desc"
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-brand-graphite focus:border-brand-blue focus:outline-none"
              >
                <option value="newest">Novidades primeiro</option>
                <option value="price_asc">Menor preço</option>
                <option value="price_desc">Maior preço</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Barra Lateral de Filtros */}
        <aside
          className={`lg:col-span-3 ${
            mobileFiltersOpen ? "block" : "hidden lg:block"
          }`}
        >
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-graphite">
                Filtrar Catálogo
              </h2>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-brand-blue hover:underline"
              >
                Limpar tudo
              </button>
            </div>

            {/* Busca rápida */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600">
                Nome, Marca ou SKU
              </label>
              <div className="relative mt-1.5">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: Tênis, Chuteira..."
                  className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-8 text-xs focus:border-brand-blue focus:outline-none"
                />
                <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Checkboxes rápidos */}
            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs font-semibold">
              <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-blue"
                />
                Somente disponíveis em estoque
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-brand-red">
                <input
                  type="checkbox"
                  checked={onlyPromo}
                  onChange={(e) => setOnlyPromo(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-red"
                />
                Somente Promoções e Outlet
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyFavorites}
                  onChange={(e) => setOnlyFavorites(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-blue"
                />
                Meus Favoritos ({favorites.length})
              </label>
            </div>

            {/* Categorias */}
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium focus:border-brand-blue focus:outline-none"
              >
                <option value="">Todas as categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Marca */}
            {brands.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold uppercase text-slate-600">
                  Marca
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium focus:border-brand-blue focus:outline-none"
                >
                  <option value="">Todas as marcas</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Faixa de Preço */}
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Faixa de Preço (R$)
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Mínimo"
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-brand-blue focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Máximo"
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-brand-blue focus:outline-none"
                />
              </div>
            </div>

            {/* Tamanhos */}
            {sizes.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold uppercase text-slate-600">
                  Tamanho
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sizes.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() =>
                        setSelectedSize(selectedSize === sz ? "" : sz)
                      }
                      className={`rounded-md border px-2.5 py-1 text-xs font-bold transition ${
                        selectedSize === sz
                          ? "border-brand-blue bg-brand-blue text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cores */}
            {colors.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold uppercase text-slate-600">
                  Cor
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setSelectedColor(selectedColor === c ? "" : c)
                      }
                      className={`rounded-md border px-2.5 py-1 text-xs font-bold transition ${
                        selectedColor === c
                          ? "border-brand-graphite bg-brand-graphite text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Grid de Produtos */}
        <div className="lg:col-span-9">
          <div className="mb-4 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>
              Exibindo <strong>{filteredProducts.length}</strong> produto(s)
            </span>
            {(query ||
              selectedCategory ||
              selectedBrand ||
              selectedSize ||
              selectedColor ||
              onlyAvailable ||
              onlyPromo ||
              onlyFavorites) && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 text-brand-red hover:underline"
              >
                <X className="h-3.5 w-3.5" />
                Remover filtros ativos
              </button>
            )}
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showNumericStock={showNumericStock}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
              <h3 className="text-lg font-extrabold text-brand-graphite">
                Não encontrou exatamente o modelo ou tamanho que procurava?
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
                Nossa loja física no Centro de Suzano recebe mercadorias toda
                semana. Chame nossa equipe no WhatsApp para verificarmos na
                prateleira agora mesmo!
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-emerald-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  Consultar disponibilidade no WhatsApp
                </a>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-brand-graphite hover:bg-slate-50"
                >
                  Limpar filtros de busca
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
