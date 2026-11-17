import React from "react";
import type { Metadata } from "next";
import { MapPin, Clock, MessageCircle, Instagram, Store } from "lucide-react";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { getStoreSettings } from "@/services/settings-service";
import { buildWhatsAppUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Localização e Contato no Centro de Suzano",
  description:
    "Visite a loja física da Suzano Sports na Rua Benjamin Constant, 810 — Centro, Suzano — SP, CEP 08674-010. Veja mapa, horários de atendimento e WhatsApp oficial.",
};

export default async function LocalizacaoPage() {
  const settings = await getStoreSettings();
  const { url: whatsappUrl } = buildWhatsAppUrl({
    whatsappPhone: settings.whatsappPhone,
    whatsappShortLink: settings.whatsappShortLink,
    message:
      "Olá, Suzano Sports! Gostaria de confirmar o horário de funcionamento e endereço da loja no Centro de Suzano.",
  });

  return (
    <StorefrontShell>
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-blue">
            <Store className="h-4 w-4" />
            Nossa Loja Física em Suzano — SP
          </span>
          <h1 className="mt-1 text-3xl font-black text-brand-graphite sm:text-4xl">
            Onde Estamos e Como Chegar
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            A Suzano Sports está localizada no centro comercial de Suzano, com
            fácil acesso para você experimentar calçados, roupas esportivas e
            retirar seus pedidos feitos pelo site.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 lg:col-span-5">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/fachada-suzano-sports.jpg"
                alt="Fachada da Loja Suzano Sports — Rua Benjamin Constant, 810"
                className="h-52 w-full object-cover"
              />
            </div>

            <div className="flex items-start gap-3.5">
              <MapPin className="mt-1 h-6 w-6 shrink-0 text-brand-orange" />
              <div>
                <h2 className="text-base font-extrabold text-brand-graphite">
                  Endereço Completo
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {settings.addressStreet} — {settings.addressDistrict}
                  <br />
                  {settings.addressCity} — {settings.addressState}, CEP{" "}
                  {settings.addressZip}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Clock className="mt-1 h-6 w-6 shrink-0 text-brand-blue" />
              <div>
                <h2 className="text-base font-extrabold text-brand-graphite">
                  Horário de Atendimento
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {settings.openingHours}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-graphite">
                Canais Oficiais de Atendimento
              </h2>
              <div className="mt-4 space-y-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-emerald-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  Falar com Vendedor no WhatsApp
                </a>
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider text-brand-graphite transition hover:bg-slate-50"
                >
                  <Instagram className="h-4 w-4 text-pink-600" />
                  Instagram Oficial (@suzano_sports)
                </a>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs lg:col-span-7">
            <iframe
              title="Mapa Suzano Sports Rua Benjamin Constant 810 Suzano SP"
              src={settings.mapEmbedUrl}
              className="h-96 w-full border-0 lg:h-full lg:min-h-[450px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </StorefrontShell>
  );
}
