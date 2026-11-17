import React from "react";
import Link from "next/link";
import { MapPin, Clock, Instagram, MessageCircle, ShieldCheck, Lock } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/utils";

interface FooterProps {
  settings: {
    storeName: string;
    legalName?: string | null;
    segment: string;
    logoUrl?: string | null;
    instagramUrl: string;
    whatsappPhone?: string | null;
    whatsappShortLink?: string | null;
    addressStreet: string;
    addressDistrict: string;
    addressCity: string;
    addressState: string;
    addressZip: string;
    openingHours: string;
  };
  categories: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export function Footer({ settings, categories }: FooterProps) {
  const { url: whatsappUrl } = buildWhatsAppUrl({
    whatsappPhone: settings.whatsappPhone,
    whatsappShortLink: settings.whatsappShortLink,
    message: "Olá, Suzano Sports! Vim pelo site e gostaria de atendimento.",
  });

  return (
    <footer className="border-t border-slate-800 bg-brand-graphite text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Coluna 1: Marca */}
          <div>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/suzano-sports-logo-original.png"
                alt={settings.storeName}
                className="h-14 w-14 shrink-0 rounded-full border border-brand-blue/40 object-contain"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/suzano-sports-logo.svg"
                alt={settings.storeName}
                className="h-11 w-auto"
              />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {settings.segment}. Tradição, variedade e preços competitivos para
              o seu esporte e dia a dia no coração de Suzano.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Suzano Sports"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-orange"
              >
                <Instagram className="h-4 w-4" />
                @suzano_sports
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp Suzano Sports"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>

          {/* Coluna 2: Categorias */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Categorias
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {categories.slice(0, 7).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/catalogo?categoria=${cat.slug}`}
                    className="text-slate-400 transition hover:text-brand-orange"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/catalogo?promocao=true"
                  className="font-bold text-brand-orange hover:underline"
                >
                  Outlet & Ofertas
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Atendimento e Loja Física */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Loja Física em Suzano
            </h3>
            <div className="mt-3 space-y-3 text-sm text-slate-400">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                <span>
                  {settings.addressStreet} — {settings.addressDistrict},{" "}
                  {settings.addressCity} — {settings.addressState}, CEP{" "}
                  {settings.addressZip}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                <span>{settings.openingHours}</span>
              </p>
              <Link
                href="/localizacao"
                className="inline-block text-xs font-bold uppercase tracking-wider text-brand-blue hover:underline"
              >
                Ver mapa e como chegar →
              </Link>
            </div>
          </div>

          {/* Coluna 4: Políticas e Segurança */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Como Funciona & Políticas
            </h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>Compra Assistida Segura:</strong> Você monta sua
                  sacola no site e confirma disponibilidade, retirada ou entrega
                  diretamente com nossa equipe pelo WhatsApp oficial.
                </span>
              </li>
              <li>
                • Trocas presenciais na loja em até 30 dias com etiqueta fixada
                e comprovante de compra.
              </li>
              <li>
                • Seus dados de contato (nome e telefone) são protegidos
                conforme a LGPD e utilizados exclusivamente para o atendimento
                do seu pedido.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {settings.storeName}. Todos os direitos
            reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/localizacao" className="hover:text-slate-300">
              Localização
            </Link>
            <Link href="/sacola" className="hover:text-slate-300">
              Minha Sacola
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
            >
              <Lock className="h-3 w-3" />
              Painel da Loja
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
