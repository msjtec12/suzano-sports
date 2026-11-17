import type { Metadata } from "next";
import "./globals.css";
import { BagAndFavoritesProvider } from "@/components/storefront/BagAndFavoritesContext";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://suzanosports.com.br"
  ),
  title: {
    default:
      "Suzano Sports | Loja de Artigos Esportivos, Tênis e Outlet no Centro de Suzano",
    template: "%s | Suzano Sports",
  },
  description:
    "Calçados, roupas e acessórios esportivos para acompanhar sua rotina. Conheça as ofertas da Suzano Sports na Rua Benjamin Constant, 810 — Centro, Suzano - SP.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Suzano Sports",
    title:
      "Suzano Sports | Calçados, Roupas Esportivas e Outlet no Centro de Suzano",
    description:
      "Tênis esportivos e casuais, chuteiras, chinelos, roupas de treino e acessórios com preços competitivos no centro de Suzano.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-brand-ice text-brand-graphite antialiased">
        <BagAndFavoritesProvider>{children}</BagAndFavoritesProvider>
      </body>
    </html>
  );
}
