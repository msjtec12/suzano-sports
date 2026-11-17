"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Zap,
  Search,
  Edit3,
  Copy,
  Power,
  Trash2,
  Eye,
  Upload,
  X,
  CheckCircle2,
} from "lucide-react";
import { formatBRL, calculateDiscountPercent } from "@/lib/utils";
import type { EnrichedProduct } from "@/services/product-service";

interface ProductsAdminClientProps {
  initialProducts: EnrichedProduct[];
  categories: { id: string; name: string; slug: string }[];
  canEdit: boolean;
  canDelete: boolean;
  initialOpenMode?: "QUICK" | "COMPLETE" | null;
}

export function ProductsAdminClient({
  initialProducts,
  categories,
  canEdit,
  canDelete,
  initialOpenMode = null,
}: ProductsAdminClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<EnrichedProduct[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modalMode, setModalMode] = useState<"QUICK" | "COMPLETE" | null>(
    initialOpenMode
  );
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Estado do Cadastro Rápido
  const [qName, setQName] = useState("");
  const [qCategoryId, setQCategoryId] = useState(categories[0]?.id || "");
  const [qPrice, setQPrice] = useState("");
  const [qImageUrl, setQImageUrl] = useState(
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"
  );
  const [qInitialQty, setQInitialQty] = useState("5");
  const [qColor, setQColor] = useState("Preto");
  const [qSize, setQSize] = useState("40");
  const [qStatus, setQStatus] = useState<"ACTIVE" | "DRAFT">("ACTIVE");

  // Estado do Cadastro Completo / Edição
  const [cName, setCName] = useState("");
  const [cSku, setCSku] = useState("");
  const [cBarcode, setCBarcode] = useState("");
  const [cCategoryId, setCCategoryId] = useState(categories[0]?.id || "");
  const [cSubcategory, setCSubcategory] = useState("");
  const [cBrandName, setCBrandName] = useState("");
  const [cShortDesc, setCShortDesc] = useState("");
  const [cFullDesc, setCFullDesc] = useState("");
  const [cCostPrice, setCCostPrice] = useState("0");
  const [cSalePrice, setCSalePrice] = useState("");
  const [cPromoPrice, setCPromoPrice] = useState("");
  const [cMinStock, setCMinStock] = useState("2");
  const [cIsFeatured, setCIsFeatured] = useState(false);
  const [cIsPromo, setCIsPromo] = useState(false);
  const [cStatus, setCStatus] = useState<"DRAFT" | "ACTIVE" | "INACTIVE">(
    "ACTIVE"
  );
  const [cImages, setCImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
  ]);
  const [cVariations, setCVariations] = useState<
    {
      id?: string;
      color: string;
      size: string;
      sku?: string;
      initialStock: number;
      minStock: number;
    }[]
  >([
    { color: "Preto", size: "39", initialStock: 2, minStock: 1 },
    { color: "Preto", size: "40", initialStock: 5, minStock: 1 },
  ]);

  const reloadProducts = async () => {
    const res = await fetch("/api/admin/products");
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
    }
    router.refresh();
  };

  const handleImageFileUpload = async (
    file: File,
    target: "QUICK" | "COMPLETE"
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({
        type: "error",
        text: data.error || "Erro ao enviar imagem.",
      });
      return;
    }
    if (target === "QUICK") {
      setQImageUrl(data.url);
    } else {
      setCImages((prev) => [data.url, ...prev]);
    }
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "QUICK",
          name: qName,
          categoryId: qCategoryId,
          salePrice: Number(qPrice),
          imageUrl: qImageUrl,
          initialQuantity: Number(qInitialQty),
          color: qColor,
          size: qSize,
          status: qStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao cadastrar produto.");

      setFeedback({
        type: "success",
        text: `Produto "${qName}" cadastrado com sucesso (SKU: ${data.sku})!`,
      });
      setQName("");
      setQPrice("");
      setModalMode(null);
      await reloadProducts();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao salvar.",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (p: EnrichedProduct) => {
    setEditingProductId(p.id);
    setCName(p.name);
    setCSku(p.sku);
    setCBarcode(p.barcode || "");
    setCCategoryId(p.categoryId);
    setCSubcategory(p.subcategoryName || "");
    setCBrandName(p.brandName || "");
    setCShortDesc(p.shortDescription || "");
    setCFullDesc(p.fullDescription || "");
    setCCostPrice(String(p.costPrice));
    setCSalePrice(String(p.salePrice));
    setCPromoPrice(p.promoPrice ? String(p.promoPrice) : "");
    setCMinStock(String(p.minStock));
    setCIsFeatured(p.isFeatured);
    setCIsPromo(p.isPromo);
    setCStatus(
      p.status === "DRAFT" || p.status === "INACTIVE" ? p.status : "ACTIVE"
    );
    setCImages(p.images.map((i) => i.url));
    setCVariations(
      p.variations.map((v) => ({
        id: v.id,
        color: v.color,
        size: v.size,
        sku: v.sku,
        initialStock: v.quantity,
        minStock: v.minStock,
      }))
    );
    setModalMode("COMPLETE");
  };

  const openNewCompleteModal = () => {
    setEditingProductId(null);
    setCName("");
    setCSku("");
    setCBarcode("");
    setCCategoryId(categories[0]?.id || "");
    setCSubcategory("");
    setCBrandName("");
    setCShortDesc("");
    setCFullDesc("");
    setCCostPrice("0");
    setCSalePrice("");
    setCPromoPrice("");
    setCMinStock("2");
    setCIsFeatured(false);
    setCIsPromo(false);
    setCStatus("ACTIVE");
    setCImages([
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
    ]);
    setCVariations([
      { color: "Preto", size: "39", initialStock: 2, minStock: 1 },
      { color: "Preto", size: "40", initialStock: 5, minStock: 1 },
    ]);
    setModalMode("COMPLETE");
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const payload = {
        name: cName,
        sku: cSku || undefined,
        barcode: cBarcode || null,
        categoryId: cCategoryId,
        subcategoryName: cSubcategory || null,
        brandName: cBrandName || null,
        shortDescription: cShortDesc || null,
        fullDescription: cFullDesc || null,
        costPrice: Number(cCostPrice || 0),
        salePrice: Number(cSalePrice),
        promoPrice: cPromoPrice ? Number(cPromoPrice) : null,
        minStock: Number(cMinStock || 2),
        isFeatured: cIsFeatured,
        isPromo: cIsPromo,
        hasVariations: true,
        status: cStatus,
        images: cImages
          .filter((u) => u.trim().length > 0)
          .map((url, idx) => ({
            url,
            altText: cName,
            isPrimary: idx === 0,
          })),
        variations: cVariations,
      };

      const url = editingProductId
        ? `/api/admin/products/${editingProductId}`
        : "/api/admin/products";
      const method = editingProductId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar produto.");

      setFeedback({
        type: "success",
        text: editingProductId
          ? "Produto atualizado com sucesso!"
          : "Produto completo cadastrado com sucesso!",
      });
      setModalMode(null);
      setEditingProductId(null);
      await reloadProducts();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao salvar.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (p: EnrichedProduct) => {
    const nextStatus = p.status === "INACTIVE" ? "ACTIVE" : "INACTIVE";
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SET_STATUS", status: nextStatus }),
    });
    if (res.ok) {
      setFeedback({
        type: "success",
        text: `Produto "${p.name}" alterado para ${
          nextStatus === "ACTIVE" ? "Ativo" : "Inativo"
        }.`,
      });
      await reloadProducts();
    }
  };

  const handleDuplicate = async (p: EnrichedProduct) => {
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DUPLICATE" }),
    });
    if (res.ok) {
      setFeedback({
        type: "success",
        text: `Cópia de "${p.name}" criada como Rascunho!`,
      });
      await reloadProducts();
    }
  };

  const handleSoftDelete = async (p: EnrichedProduct) => {
    if (
      !window.confirm(
        `Deseja arquivar/excluir logicamente o produto "${p.name}"? O histórico de vendas e movimentações será preservado.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setFeedback({
        type: "success",
        text: `Produto "${p.name}" arquivado com preservação do histórico.`,
      });
      await reloadProducts();
    }
  };

  const filtered = products.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q) ||
      (p.brandName && p.brandName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Botões de Ação */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-brand-graphite">
            Gestão de Produtos & Variações
          </h1>
          <p className="text-xs text-slate-500">
            Cadastre novos itens em segundos ou gerencie grades completas de
            tamanhos, cores e preços.
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setModalMode("QUICK")}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm hover:bg-orange-600"
            >
              <Zap className="h-4 w-4" />
              Cadastro Rápido (5 Passos)
            </button>
            <button
              type="button"
              onClick={openNewCompleteModal}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-graphite px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-brand-blue"
            >
              <Plus className="h-4 w-4" />
              Cadastro Completo
            </button>
          </div>
        )}
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

      {/* Filtros de Busca e Status */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, SKU, categoria ou marca..."
            className="w-full rounded-xl border border-slate-300 py-2 pl-3.5 pr-9 text-xs focus:border-brand-blue focus:outline-none"
          />
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {[
            { code: "ALL", label: "Todos" },
            { code: "ACTIVE", label: "Ativos" },
            { code: "OUT_OF_STOCK", label: "Esgotados" },
            { code: "DRAFT", label: "Rascunhos" },
            { code: "INACTIVE", label: "Inativos" },
          ].map((st) => (
            <button
              key={st.code}
              type="button"
              onClick={() => setStatusFilter(st.code)}
              className={`rounded-lg px-3 py-1.5 transition ${
                statusFilter === st.code
                  ? "bg-brand-blue text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-extrabold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3.5">Produto</th>
                <th className="px-4 py-3.5">SKU / Categoria</th>
                <th className="px-4 py-3.5">Preços</th>
                <th className="px-4 py-3.5">Variações & Saldo</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Nenhum produto encontrado. Clique em{" "}
                    <strong>Cadastro Rápido</strong> para adicionar o primeiro
                    item!
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.primaryImage}
                          alt={p.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-extrabold text-brand-graphite">
                            {p.name}
                          </p>
                          {p.brandName && (
                            <p className="text-[11px] font-semibold text-brand-blue">
                              Marca: {p.brandName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-700">{p.sku}</p>
                      <p className="text-slate-500">{p.categoryName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-extrabold text-brand-graphite">
                        Venda: {formatBRL(p.effectivePrice)}
                      </p>
                      {p.hasLegitPromo && (
                        <p className="text-[11px] text-brand-red">
                          De {formatBRL(p.salePrice)} (-{p.discountPercent}%)
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        Custo: {formatBRL(p.costPrice)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-extrabold text-brand-graphite">
                        Total: {p.totalStock} un.
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.variations.slice(0, 4).map((v) => (
                          <span
                            key={v.id}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              v.quantity <= 0
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {v.color}/{v.size}: {v.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "OUT_OF_STOCK"
                            ? "bg-red-100 text-brand-red"
                            : p.status === "DRAFT"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {p.status === "ACTIVE"
                          ? "Ativo"
                          : p.status === "OUT_OF_STOCK"
                          ? "Esgotado"
                          : p.status === "DRAFT"
                          ? "Rascunho"
                          : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/produto/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver na Vitrine"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              title="Editar produto"
                              className="rounded-lg border border-slate-200 p-1.5 text-brand-blue hover:bg-sky-50"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(p)}
                              title="Duplicar produto"
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(p)}
                              title={
                                p.status === "INACTIVE"
                                  ? "Ativar produto"
                                  : "Inativar produto"
                              }
                              className="rounded-lg border border-slate-200 p-1.5 text-amber-600 hover:bg-amber-50"
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleSoftDelete(p)}
                            title="Arquivar / Excluir logicamente"
                            className="rounded-lg border border-slate-200 p-1.5 text-brand-red hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CADASTRO RÁPIDO COM PRÉ-VISUALIZAÇÃO DO CARD */}
      {modalMode === "QUICK" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-brand-orange" />
                <h2 className="text-lg font-black text-brand-graphite">
                  Cadastro Rápido de Produto (5 Passos)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-12">
              <form
                onSubmit={handleQuickSubmit}
                className="space-y-4 md:col-span-7"
              >
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    1. Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={qName}
                    onChange={(e) => setQName(e.target.value)}
                    placeholder="Ex: Tênis Esportivo Corrida Leve"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    2. Categoria *
                  </label>
                  <select
                    value={qCategoryId}
                    onChange={(e) => setQCategoryId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      3. Preço de Venda (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={qPrice}
                      onChange={(e) => setQPrice(e.target.value)}
                      placeholder="199.90"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      5. Quantidade Inicial *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={qInitialQty}
                      onChange={(e) => setQInitialQty(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Cor Inicial
                    </label>
                    <input
                      type="text"
                      value={qColor}
                      onChange={(e) => setQColor(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Tamanho Inicial
                    </label>
                    <input
                      type="text"
                      value={qSize}
                      onChange={(e) => setQSize(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    4. Foto Principal (URL ou Upload) *
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      required
                      value={qImageUrl}
                      onChange={(e) => setQImageUrl(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                      <Upload className="h-3.5 w-3.5" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageFileUpload(f, "QUICK");
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Status de Publicação
                  </label>
                  <div className="mt-1 flex gap-3 text-xs font-bold">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        checked={qStatus === "ACTIVE"}
                        onChange={() => setQStatus("ACTIVE")}
                      />
                      Publicar Agora na Vitrine
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        checked={qStatus === "DRAFT"}
                        onChange={() => setQStatus("DRAFT")}
                      />
                      Salvar como Rascunho
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-brand-orange px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-md hover:bg-orange-600"
                  >
                    {loading ? "Salvando..." : "Concluir Cadastro Rápido"}
                  </button>
                </div>
              </form>

              {/* Pré-visualização ao Vivo do Card antes da Publicação */}
              <div className="rounded-2xl border border-slate-200 bg-brand-ice p-4 md:col-span-5">
                <p className="mb-3 text-center text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Pré-visualização do Card na Vitrine
                </p>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="aspect-square w-full bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qImageUrl}
                      alt={qName || "Preview"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold uppercase text-brand-blue">
                        {categories.find((c) => c.id === qCategoryId)?.name ||
                          "Categoria"}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        {Number(qInitialQty) > 0 ? "Disponível" : "Esgotado"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-brand-graphite">
                      {qName || "Nome do Produto Esportivo"}
                    </p>
                    <p className="mt-2 text-lg font-black text-brand-graphite">
                      {formatBRL(Number(qPrice || 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CADASTRO COMPLETO / EDIÇÃO COM MÚLTIPLAS VARIAÇÕES */}
      {modalMode === "COMPLETE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h2 className="text-lg font-black text-brand-graphite">
                {editingProductId
                  ? "Editar Produto e Grade de Variações"
                  : "Cadastro Completo de Produto"}
              </h2>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="mt-5 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    SKU (Opcional — Automático)
                  </label>
                  <input
                    type="text"
                    value={cSku}
                    onChange={(e) => setCSku(e.target.value)}
                    placeholder="Ex: SZS-TENIS-01"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Categoria *
                  </label>
                  <select
                    value={cCategoryId}
                    onChange={(e) => setCCategoryId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Subcategoria
                  </label>
                  <input
                    type="text"
                    value={cSubcategory}
                    onChange={(e) => setCSubcategory(e.target.value)}
                    placeholder="Ex: Corrida / Society"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Marca (se aplicável)
                  </label>
                  <input
                    type="text"
                    value={cBrandName}
                    onChange={(e) => setCBrandName(e.target.value)}
                    placeholder="Informe a marca real"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Código de Barras (EAN)
                  </label>
                  <input
                    type="text"
                    value={cBarcode}
                    onChange={(e) => setCBarcode(e.target.value)}
                    placeholder="Opcional"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Preços */}
              <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Preço de Custo (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={cCostPrice}
                    onChange={(e) => setCCostPrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={cSalePrice}
                    onChange={(e) => setCSalePrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Preço Promocional (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cPromoPrice}
                    onChange={(e) => setCPromoPrice(e.target.value)}
                    placeholder="Opcional (< venda)"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  {cPromoPrice && Number(cPromoPrice) < Number(cSalePrice) && (
                    <span className="text-[11px] font-bold text-brand-red">
                      Desconto:{" "}
                      {calculateDiscountPercent(
                        Number(cSalePrice),
                        Number(cPromoPrice)
                      )}
                      % OFF
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Estoque Mínimo Alerta
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cMinStock}
                    onChange={(e) => setCMinStock(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Descrições */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Descrição Curta
                  </label>
                  <textarea
                    rows={2}
                    value={cShortDesc}
                    onChange={(e) => setCShortDesc(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Descrição Completa
                  </label>
                  <textarea
                    rows={2}
                    value={cFullDesc}
                    onChange={(e) => setCFullDesc(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Grade de Variações Independentes (Cor, Tamanho, Saldo) */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-graphite">
                    Variações do Produto (Cor, Tamanho e Estoque Independente)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setCVariations((prev) => [
                        ...prev,
                        {
                          color: "Preto",
                          size: "41",
                          initialStock: 1,
                          minStock: 1,
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-2.5 py-1 text-xs font-bold text-white"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar Variação
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {cVariations.map((v, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 sm:grid-cols-5"
                    >
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500">
                          Cor
                        </label>
                        <input
                          type="text"
                          value={v.color}
                          onChange={(e) => {
                            const next = [...cVariations];
                            next[idx].color = e.target.value;
                            setCVariations(next);
                          }}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500">
                          Tamanho
                        </label>
                        <input
                          type="text"
                          value={v.size}
                          onChange={(e) => {
                            const next = [...cVariations];
                            next[idx].size = e.target.value;
                            setCVariations(next);
                          }}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500">
                          {v.id ? "Saldo Atual" : "Saldo Inicial"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          disabled={Boolean(v.id)}
                          value={v.initialStock}
                          onChange={(e) => {
                            const next = [...cVariations];
                            next[idx].initialStock = Number(e.target.value);
                            setCVariations(next);
                          }}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500">
                          Estoque Mínimo
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={v.minStock}
                          onChange={(e) => {
                            const next = [...cVariations];
                            next[idx].minStock = Number(e.target.value);
                            setCVariations(next);
                          }}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        {cVariations.length > 1 && !v.id && (
                          <button
                            type="button"
                            onClick={() =>
                              setCVariations((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="rounded border border-red-200 px-2 py-1 text-xs font-bold text-brand-red hover:bg-red-50"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Imagens e Flags */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    URLs das Imagens (1 por linha ou Upload)
                  </label>
                  <textarea
                    rows={3}
                    value={cImages.join("\n")}
                    onChange={(e) => setCImages(e.target.value.split("\n"))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                  <label className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100">
                    <Upload className="h-3.5 w-3.5" />
                    Enviar foto do dispositivo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageFileUpload(f, "COMPLETE");
                      }}
                    />
                  </label>
                </div>

                <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-xs font-bold">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cIsFeatured}
                      onChange={(e) => setCIsFeatured(e.target.checked)}
                    />
                    Exibir nos Produtos em Destaque da Home
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cIsPromo}
                      onChange={(e) => setCIsPromo(e.target.checked)}
                    />
                    Destacar na seção de Ofertas e Outlet
                  </label>
                  <div>
                    <label className="block uppercase text-slate-600">
                      Status de Publicação
                    </label>
                    <select
                      value={cStatus}
                      onChange={(e) =>
                        setCStatus(
                          e.target.value as "DRAFT" | "ACTIVE" | "INACTIVE"
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                    >
                      <option value="ACTIVE">Ativo (Visível na Vitrine)</option>
                      <option value="DRAFT">Rascunho</option>
                      <option value="INACTIVE">Inativo (Oculto)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-brand-blue px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-md hover:bg-sky-600"
                >
                  {loading ? "Salvando..." : "Salvar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
