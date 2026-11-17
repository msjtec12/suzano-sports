import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Clock,
  MessageCircle,
  Instagram,
  ShieldCheck,
  Store,
  Tag,
  Sparkles,
  Flame,
  TrendingUp,
} from "lucide-react";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { ProductCard } from "@/components/storefront/ProductCard";
import { getStoreSettings, listCampaigns } from "@/services/settings-service";
import {
  listCategories,
  getCatalogProducts,
  getBestSellingProducts,
} from "@/services/product-service";
import { buildWhatsAppUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, categories, catalogData, bestSellers, activeCampaigns] =
    await Promise.all([
      getStoreSettings(),
      listCategories(true),
      getCatalogProducts({ includeInactive: false }),
      getBestSellingProducts(4),
      listCampaigns(true),
    ]);

  const allProducts = catalogData.products;
  const featuredProducts = allProducts.filter((p) => p.isFeatured).slice(0, 4);
  const newestProducts = allProducts.slice(0, 8);
  const promoProducts = allProducts
    .filter((p) => p.hasLegitPromo || p.isPromo)
    .slice(0, 4);

  const { url: whatsappUrl } = buildWhatsAppUrl({
    whatsappPhone: settings.whatsappPhone,
    whatsappShortLink: settings.whatsappShortLink,
    message:
      "Olá, Suzano Sports! Vi o site da loja e gostaria de conferir as novidades e ofertas disponíveis hoje.",
  });

  const activeCampaign = activeCampaigns[0] || null;

  return (
    <StorefrontShell>
      {/* HERO BANNER PRINCIPAL (Editável pelo Administrador) */}
      <section className="relative overflow-hidden bg-brand-graphite text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-12 lg:grid-cols-12 lg:py-16">
          <div className="z-10 lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/40 bg-brand-blue/20 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-sky-300">
              <Store className="h-3.5 w-3.5" />
              Loja Física no Centro de Suzano • Vitrine Digital
            </span>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl lg:leading-[1.1]">
              {settings.heroTitle}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {settings.heroSubtitle}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg transition hover:bg-orange-600"
              >
                {settings.heroPrimaryCtaText}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/catalogo?promocao=true"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white transition hover:bg-white/20"
              >
                <Tag className="h-4 w-4 text-brand-orange" />
                {settings.heroSecondaryCtaText}
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-xs text-slate-300">
              <div>
                <p className="font-extrabold text-white">Variedade Local</p>
                <p className="mt-0.5 text-slate-400">
                  Tênis, chuteiras, treino e casual
                </p>
              </div>
              <div>
                <p className="font-extrabold text-white">Preços de Outlet</p>
                <p className="mt-0.5 text-slate-400">
                  Ofertas reais selecionadas na loja
                </p>
              </div>
              <div>
                <p className="font-extrabold text-white">Atendimento Rápido</p>
                <p className="mt-0.5 text-slate-400">
                  Monte a sacola e feche no WhatsApp
                </p>
              </div>
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="relative overflow-hidden rounded-2xl border-2 border-brand-orange/60 bg-slate-900 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/fachada-suzano-sports.jpg"
                alt="Fachada da Loja Física Suzano Sports — Rua Benjamin Constant, 810, Centro, Suzano"
                className="h-72 w-full object-cover sm:h-96"
              />
              <div className="bg-slate-900/95 p-4 text-xs text-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-extrabold text-brand-orange">
                    Rua Benjamin Constant, 810 — Centro, Suzano - SP
                  </p>
                  <span className="rounded bg-emerald-600/20 px-2 py-0.5 font-bold text-emerald-400">
                    WhatsApp: (11) 95914-8681
                  </span>
                </div>
                <p className="mt-1 text-slate-300">
                  Trabalhamos com <strong>Mizuno, FILA, Reebok, Adidas, Puma, Nike, Olympikus e Kenner</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Faixa de Marcas Trabalhadas na Loja Física (Confirmadas na Fachada) */}
        <div className="border-t border-white/10 bg-slate-950/70 py-3.5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 px-4 text-xs font-black uppercase tracking-widest text-slate-300 sm:gap-8">
            <span className="text-brand-orange">Marcas na Loja:</span>
            <span>MIZUNO</span>
            <span className="text-slate-600">•</span>
            <span>FILA</span>
            <span className="text-slate-600">•</span>
            <span>REEBOK</span>
            <span className="text-slate-600">•</span>
            <span>ADIDAS</span>
            <span className="text-slate-600">•</span>
            <span>PUMA</span>
            <span className="text-slate-600">•</span>
            <span>NIKE</span>
            <span className="text-slate-600">•</span>
            <span>OLYMPIKUS</span>
            <span className="text-slate-600">•</span>
            <span>KENNER</span>
          </div>
        </div>
      </section>

      {/* SEÇÃO 1: CATEGORIAS PRINCIPAIS COM IMAGENS */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">
              Departamentos da Loja
            </span>
            <h2 className="mt-1 text-2xl font-black text-brand-graphite sm:text-3xl">
              Navegue por Categorias
            </h2>
          </div>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:underline"
          >
            Ver catálogo completo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/catalogo?categoria=${cat.slug}`}
              className="group relative flex h-44 flex-col justify-end overflow-hidden rounded-xl border border-slate-200 bg-brand-graphite p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {cat.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-65 transition duration-300 group-hover:scale-105 group-hover:opacity-75"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-graphite via-brand-graphite/40 to-transparent" />
              <div className="relative z-10">
                <h3 className="text-sm font-extrabold text-white sm:text-base">
                  {cat.name}
                </h3>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-brand-orange">
                  Conferir linha <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SEÇÃO 2 & 3: PRODUTOS EM DESTAQUE E NOVIDADES DA LOJA */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                <Sparkles className="h-3.5 w-3.5" />
                Seleção Suzano Sports
              </span>
              <h2 className="mt-1 text-2xl font-black text-brand-graphite sm:text-3xl">
                {featuredProducts.length > 0
                  ? "Produtos em Destaque & Novidades"
                  : "Vitrine de Calçados, Roupas e Acessórios"}
              </h2>
            </div>
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:underline"
            >
              Ver todos os produtos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {newestProducts.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(featuredProducts.length > 0
                ? [
                    ...featuredProducts,
                    ...newestProducts.filter(
                      (p) => !featuredProducts.some((f) => f.id === p.id)
                    ),
                  ].slice(0, 8)
                : newestProducts
              ).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showNumericStock={settings.showNumericStockToCustomer}
                />
              ))}
            </div>
          ) : (
            /* Estado estruturado e completo quando o estoque inicial está sendo cadastrado */
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              {categories.slice(0, 3).map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-brand-ice p-5"
                >
                  <div>
                    <span className="inline-block rounded bg-brand-blue/10 px-2.5 py-1 text-xs font-bold text-brand-blue">
                      Linha Física Disponível
                    </span>
                    <h3 className="mt-3 text-lg font-extrabold text-brand-graphite">
                      {cat.name}
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600">
                      {cat.description}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Consultar numeração no WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO 4: OFERTAS E OUTLET */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-red px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-white">
                <Flame className="h-3.5 w-3.5" />
                Outlet & Oportunidades
              </span>
              <h2 className="mt-2 text-2xl font-black text-brand-graphite sm:text-3xl">
                Ofertas Reais e Preços Competitivos
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Descontos legítimos calculados diretamente sobre o preço de
                tabela da loja.
              </p>
            </div>
            <Link
              href="/catalogo?promocao=true"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-red px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-red-700"
            >
              Conferir todas as promoções
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {promoProducts.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {promoProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showNumericStock={settings.showNumericStockToCustomer}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl bg-slate-50 p-6 sm:flex-row">
              <div>
                <h3 className="text-base font-extrabold text-brand-graphite">
                  Confira os últimos pares e pontas de estoque na loja física ou
                  pelo WhatsApp
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Nossa equipe atualiza diariamente as oportunidades de calçados
                  e vestuário esportivo no centro de Suzano.
                </p>
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                Pedir lista de ofertas no WhatsApp
              </a>
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO 5: PRODUTOS MAIS VENDIDOS (Exibido quando existirem vendas reais confirmadas) */}
      {bestSellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-blue">
                <TrendingUp className="h-3.5 w-3.5" />
                Preferidos dos Clientes
              </span>
              <h2 className="mt-1 text-2xl font-black text-brand-graphite">
                Mais Vendidos na Suzano Sports
              </h2>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bestSellers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                showNumericStock={settings.showNumericStockToCustomer}
              />
            ))}
          </div>
        </section>
      )}

      {/* SEÇÃO 6: BANNER DE CAMPANHAS SAZONAIS */}
      {activeCampaign && (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <div className="overflow-hidden rounded-2xl bg-brand-graphite text-white shadow-lg">
            <div className="grid grid-cols-1 items-center lg:grid-cols-12">
              <div className="p-6 sm:p-10 lg:col-span-7">
                <span className="inline-block rounded-md bg-brand-orange px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white">
                  {activeCampaign.badgeText || "Campanha Suzano Sports"}
                </span>
                <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                  {activeCampaign.title}
                </h2>
                {activeCampaign.subtitle && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                    {activeCampaign.subtitle}
                  </p>
                )}
                <div className="mt-6">
                  <Link
                    href={activeCampaign.ctaUrl || "/catalogo"}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-sky-600"
                  >
                    {activeCampaign.ctaText || "Conferir seleção"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              {activeCampaign.bannerImageUrl && (
                <div className="h-60 lg:col-span-5 lg:h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeCampaign.bannerImageUrl}
                    alt={activeCampaign.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* SEÇÃO 7: DIFERENCIAIS COMERCIAIS CONFIRMADOS PELA EMPRESA */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">
              Por que comprar na Suzano Sports
            </span>
            <h2 className="mt-1 text-2xl font-black text-brand-graphite sm:text-3xl">
              A confiança da loja física com a praticidade digital
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-brand-ice p-5">
              <Store className="h-8 w-8 text-brand-blue" />
              <h3 className="mt-3 text-base font-extrabold text-brand-graphite">
                Presença no Centro de Suzano
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Loja física estruturada na Rua Benjamin Constant, 810. Retire
                pessoalmente ou experimente na loja.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-brand-ice p-5">
              <MessageCircle className="h-8 w-8 text-emerald-600" />
              <h3 className="mt-3 text-base font-extrabold text-brand-graphite">
                Atendimento Humano no WhatsApp
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Monte sua sacola no site e fale direto com nosso vendedor com o
                código do pedido pronto.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-brand-ice p-5">
              <Tag className="h-8 w-8 text-brand-orange" />
              <h3 className="mt-3 text-base font-extrabold text-brand-graphite">
                Variedade & Preço de Outlet
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Tênis esportivos e casuais, chuteiras, roupas de treino,
                chinelos, bonés e mochilas com ótimo custo-benefício.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-brand-ice p-5">
              <ShieldCheck className="h-8 w-8 text-brand-graphite" />
              <h3 className="mt-3 text-base font-extrabold text-brand-graphite">
                Pagamento Só na Confirmação
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Sem cobranças automáticas surpresa: você confirma a numeração e
                combina pagamento e retirada/entrega com segurança.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 8 & 9: LOCALIZAÇÃO COM GOOGLE MAPS + INSTAGRAM & WHATSAPP */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-5">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">
                Visite a Suzano Sports
              </span>
              <h2 className="mt-1 text-2xl font-black text-brand-graphite">
                Localização e Contato
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Estamos no coração comercial de Suzano. Venha conferir de perto
                nossos lançamentos e ofertas de outlet.
              </p>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
                  <div>
                    <p className="font-bold text-brand-graphite">Endereço</p>
                    <p className="text-slate-600">
                      {settings.addressStreet} — {settings.addressDistrict},{" "}
                      {settings.addressCity} — {settings.addressState}, CEP{" "}
                      {settings.addressZip}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" />
                  <div>
                    <p className="font-bold text-brand-graphite">
                      Horário de Funcionamento
                    </p>
                    <p className="text-slate-600">{settings.openingHours}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3 border-t border-slate-100 pt-6">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                Chamar no WhatsApp Oficial
              </a>

              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-brand-graphite transition hover:bg-slate-50"
              >
                <Instagram className="h-4 w-4 text-pink-600" />
                Seguir @suzano_sports no Instagram
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-7">
            <iframe
              title="Mapa de localização Suzano Sports - Rua Benjamin Constant, 810, Centro, Suzano"
              src={settings.mapEmbedUrl}
              className="h-80 w-full border-0 lg:h-full lg:min-h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </StorefrontShell>
  );
}
