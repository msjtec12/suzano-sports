"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Heart,
  ShoppingBag,
  MessageCircle,
  Menu,
  X,
  MapPin,
} from "lucide-react";
import { useBag } from "./BagAndFavoritesContext";
import { buildWhatsAppUrl } from "@/lib/utils";

interface HeaderProps {
  settings: {
    storeName: string;
    logoUrl?: string | null;
    topBarText: string;
    topBarActive: boolean;
    whatsappPhone?: string | null;
    whatsappShortLink?: string | null;
    instagramUrl: string;
  };
  categories: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export function Header({ settings, categories }: HeaderProps) {
  const router = useRouter();
  const { totalItems, favorites, openBag } = useBag();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { url: whatsappUrl } = buildWhatsAppUrl({
    whatsappPhone: settings.whatsappPhone,
    whatsappShortLink: settings.whatsappShortLink,
    message: "Olá, Suzano Sports! Gostaria de consultar produtos e ofertas.",
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/catalogo?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/catalogo");
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-brand-graphite text-white shadow-md">
      {/* Barra Informativa de Campanhas */}
      {settings.topBarActive && settings.topBarText && (
        <div className="border-b border-white/10 bg-brand-blue px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <span>{settings.topBarText}</span>
            <Link
              href="/localizacao"
              className="hidden items-center gap-1 underline opacity-90 hover:opacity-100 sm:inline-flex"
            >
              <MapPin className="h-3 w-3" />
              Centro de Suzano
            </Link>
          </div>
        </div>
      )}

      {/* Linha Principal do Cabeçalho */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5">
        {/* Botão Mobile Menu + Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu de categorias"}
            className="rounded-lg p-2 text-slate-200 hover:bg-white/10 lg:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          <Link href="/" className="flex items-center gap-3">
            {/* Logo Original da Suzano Sports preservando proporções */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/suzano-sports-logo-original.png"
              alt={settings.storeName}
              className="h-12 w-12 shrink-0 rounded-full border border-brand-blue/40 object-contain shadow-sm sm:h-14 sm:w-14"
            />
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1">
                <span className="text-3xl font-black text-brand-orange drop-shadow-xs sm:text-4xl">
                  S
                </span>
                <div className="flex flex-col items-center justify-center leading-none">
                  <span className="text-[11px] font-black tracking-wider text-brand-red sm:text-xs">
                    SUZANO
                  </span>
                  <span className="text-sm font-black tracking-widest text-brand-blue sm:text-base">
                    PORT
                  </span>
                </div>
                <span className="text-3xl font-black text-brand-orange drop-shadow-xs sm:text-4xl">
                  S
                </span>
              </div>
              <span className="mt-0.5 text-[9px] font-extrabold italic tracking-widest text-brand-ice sm:text-[10px]">
                ARTIGOS ESPORTIVOS
              </span>
            </div>
          </Link>
        </div>

        {/* Campo de Pesquisa Desktop */}
        <form
          onSubmit={handleSearch}
          className="hidden max-w-md flex-1 items-center lg:flex"
          role="search"
        >
          <div className="relative w-full">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tênis, chuteiras, roupas, SKU ou marca..."
              aria-label="Pesquisar produtos"
              className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-4 pr-10 text-sm text-white placeholder-slate-300 transition focus:border-brand-orange focus:bg-white focus:text-brand-graphite focus:placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Executar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-brand-orange hover:bg-brand-orange/10"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Ações à Direita */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-emerald-700 sm:inline-flex"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>

          <Link
            href="/catalogo?favoritos=true"
            aria-label={`Favoritos (${favorites.length})`}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/15 hover:text-white"
          >
            <Heart className="h-5 w-5" />
            {favorites.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
                {favorites.length}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={openBag}
            aria-label={`Abrir sacola (${totalItems} itens)`}
            className="relative flex items-center gap-2 rounded-xl bg-brand-orange px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm transition hover:bg-orange-600"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="hidden sm:inline">Sacola</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-graphite px-1.5 text-[11px] font-bold text-white">
              {totalItems}
            </span>
          </button>
        </div>
      </div>

      {/* Barra de Pesquisa Mobile */}
      <div className="border-t border-white/10 px-4 py-2 lg:hidden">
        <form onSubmit={handleSearch} className="relative w-full" role="search">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tênis, roupas, acessórios..."
            className="w-full rounded-lg border border-white/15 bg-white/10 py-2 pl-3.5 pr-10 text-sm text-white placeholder-slate-300 focus:bg-white focus:text-brand-graphite focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Pesquisar"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-brand-orange"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Menu Principal de Categorias Desktop */}
      <nav
        aria-label="Categorias principais"
        className="hidden border-t border-white/10 bg-slate-900/80 lg:block"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-200">
          <div className="flex flex-wrap items-center gap-5">
            <Link
              href="/catalogo"
              className="text-white transition hover:text-brand-orange"
            >
              Todos os Produtos
            </Link>
            {categories.slice(0, 7).map((cat) => (
              <Link
                key={cat.id}
                href={`/catalogo?categoria=${cat.slug}`}
                className="transition hover:text-brand-orange"
              >
                {cat.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/catalogo?promocao=true"
              className="rounded-md bg-brand-red px-2.5 py-1 text-white transition hover:bg-red-700"
            >
              Ofertas & Outlet
            </Link>
            <Link
              href="/localizacao"
              className="text-slate-300 transition hover:text-white"
            >
              Nossa Loja
            </Link>
          </div>
        </div>
      </nav>

      {/* Menu Compacto Mobile */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-brand-graphite px-4 py-4 lg:hidden">
          <div className="flex flex-col space-y-2.5 text-sm font-bold">
            <Link
              href="/catalogo"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg bg-white/5 px-3 py-2 text-white"
            >
              Ver Todo o Catálogo
            </Link>
            <Link
              href="/catalogo?promocao=true"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg bg-brand-red/90 px-3 py-2 text-white"
            >
              Ofertas e Outlet
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalogo?categoria=${cat.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-1.5 text-slate-200 hover:bg-white/5"
              >
                {cat.name}
              </Link>
            ))}
            <Link
              href="/localizacao"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-1.5 text-brand-orange"
            >
              Endereço e Horários (Centro de Suzano)
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-center text-white"
            >
              <MessageCircle className="h-4 w-4" />
              Atendimento no WhatsApp
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
