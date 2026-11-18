import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const EXPENSE_CATEGORIES = [
  { code: "ALUGUEL", label: "Aluguel" },
  { code: "AGUA", label: "Água" },
  { code: "ENERGIA", label: "Energia Elétrica" },
  { code: "INTERNET", label: "Internet e Telefonia" },
  { code: "FUNCIONARIOS", label: "Funcionários / Comissões" },
  { code: "FORNECEDORES", label: "Fornecedores Operacionais" },
  { code: "MARKETING", label: "Marketing e Divulgação" },
  { code: "TRANSPORTE", label: "Transporte e Frete" },
  { code: "OUTRAS", label: "Outras Despesas" },
] as const;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Arredonda valores monetários exatamente para 2 casas decimais evitando erros de ponto flutuante.
 */
export function toMoney(value: number | string | null | undefined): number {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Formata número em Real Brasileiro (R$ 199,90).
 */
export function formatBRL(value: number | string | null | undefined): string {
  const num = toMoney(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

/**
 * Calcula percentual de desconto real somente quando promoPrice é estritamente menor que salePrice (> 0).
 */
export function calculateDiscountPercent(
  salePrice: number,
  promoPrice?: number | null
): number {
  if (!promoPrice || promoPrice <= 0 || salePrice <= 0 || promoPrice >= salePrice) {
    return 0;
  }
  const pct = Math.round(((salePrice - promoPrice) / salePrice) * 100);
  return pct > 0 && pct < 100 ? pct : 0;
}

/**
 * Retorna o preço efetivo vigente (promocional se válido, senão preço de venda).
 */
export function getEffectivePrice(salePrice: number, promoPrice?: number | null): number {
  if (promoPrice && promoPrice > 0 && promoPrice < salePrice) {
    return toMoney(promoPrice);
  }
  return toMoney(salePrice);
}

/**
 * Gera um slug semântico a partir de um texto em português.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Valida se um número de telefone para WhatsApp está no formato DDI+DDD+Número (12 ou 13 dígitos para Brasil).
 * Nunca tenta adivinhar telefone a partir de link encurtado.
 */
export function validateWhatsAppNumber(rawPhone?: string | null): {
  valid: boolean;
  normalized: string;
} {
  if (!rawPhone) return { valid: false, normalized: "" };
  const digits = rawPhone.replace(/\D/g, "");
  // Aceita número brasileiro com DDI 55 (12 ou 13 dígitos) ou sem DDI (10 ou 11 dígitos -> prefixa 55)
  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith("55")) {
      return { valid: true, normalized: digits };
    }
  }
  if (digits.length === 10 || digits.length === 11) {
    return { valid: true, normalized: `55${digits}` };
  }
  return { valid: false, normalized: "" };
}

/**
 * Constrói URL de atendimento do WhatsApp priorizando número validado (wa.me)
 * ou utilizando o link institucional oficial configurado quando o número ainda não foi preenchido.
 */
export function buildWhatsAppUrl(params: {
  whatsappPhone?: string | null;
  whatsappShortLink?: string | null;
  message: string;
}): { url: string; mode: "WA_ME" | "SHORT_LINK" } {
  const check = validateWhatsAppNumber(params.whatsappPhone);
  const encodedText = encodeURIComponent(params.message);
  if (check.valid) {
    return {
      url: `https://wa.me/${check.normalized}?text=${encodedText}`,
      mode: "WA_ME",
    };
  }
  const fallback = (params.whatsappShortLink || "https://wa.me/5511939057301").trim();
  return {
    url: fallback,
    mode: "SHORT_LINK",
  };
}
