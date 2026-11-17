import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getDb, getDatabaseDiagnostics } from "../db";
import * as schema from "../db/schema";
import {
  requirePermission,
  createAuditLog,
  type AuthenticatedUser,
} from "./auth-service";
import { AppError } from "../lib/errors";
import { validateWhatsAppNumber } from "../lib/utils";
import { generateId } from "../lib/crypto";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const updateStoreSettingsSchema = z.object({
  storeName: z.string().min(2).max(160),
  legalName: z.string().max(200).optional().nullable(),
  segment: z.string().min(2).max(200),
  logoUrl: z.string().max(500).optional().nullable(),
  heroBannerUrl: z.string().max(1000).optional().nullable(),
  heroTitle: z.string().min(3).max(220),
  heroSubtitle: z.string().min(5).max(600),
  heroPrimaryCtaText: z.string().min(2).max(80),
  heroSecondaryCtaText: z.string().min(2).max(80),
  topBarText: z.string().max(255),
  topBarActive: z.boolean(),
  instagramUrl: z.string().url().max(255),
  whatsappShortLink: z.string().url().max(255),
  whatsappPhone: z.string().max(32).optional().nullable(),
  addressStreet: z.string().min(3).max(200),
  addressDistrict: z.string().min(2).max(120),
  addressCity: z.string().min(2).max(120),
  addressState: z.string().min(2).max(10),
  addressZip: z.string().min(5).max(20),
  addressConfirmed: z.boolean(),
  openingHours: z.string().min(3).max(300),
  mapEmbedUrl: z.string().max(1000),
  pickupEnabled: z.boolean(),
  deliveryEnabled: z.boolean(),
  deliveryNotes: z.string().max(600).optional().nullable(),
  showNumericStockToCustomer: z.boolean(),
  primaryColor: z.string().regex(HEX_COLOR_REGEX, "Cor primária deve ser um código HEX válido"),
  secondaryColor: z.string().regex(HEX_COLOR_REGEX, "Cor secundária deve ser um código HEX válido"),
  accentColor: z.string().regex(HEX_COLOR_REGEX, "Cor de destaque deve ser um código HEX válido"),
  promoColor: z.string().regex(HEX_COLOR_REGEX, "Cor promocional deve ser um código HEX válido"),
  seoTitle: z.string().min(5).max(160),
  seoDescription: z.string().min(10).max(500),
  ga4Id: z.string().max(64).optional().nullable(),
  gscVerification: z.string().max(128).optional().nullable(),
});

export async function getStoreSettings() {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.storeSettings)
    .where(eq(schema.storeSettings.id, "default"));

  if (rows.length > 0) {
    return {
      ...rows[0],
      diagnostics: getDatabaseDiagnostics(),
    };
  }

  throw new AppError("Configurações da loja não inicializadas.", 500);
}

export async function updateStoreSettings(
  actor: AuthenticatedUser,
  rawInput: z.infer<typeof updateStoreSettingsSchema>
) {
  await requirePermission(actor, "settings", "edit");
  const parsed = updateStoreSettingsSchema.parse(rawInput);

  // Valida número de WhatsApp se informado (nunca tenta extrair de link encurtado)
  let normalizedWhatsApp = "";
  if (parsed.whatsappPhone && parsed.whatsappPhone.trim().length > 0) {
    const check = validateWhatsAppNumber(parsed.whatsappPhone);
    if (!check.valid) {
      throw new AppError(
        "Número de WhatsApp inválido. Informe DDD + Número (ex: 11999999999 ou 5511999999999)."
      );
    }
    normalizedWhatsApp = check.normalized;
  }

  const db = await getDb();
  await db
    .update(schema.storeSettings)
    .set({
      ...parsed,
      whatsappPhone: normalizedWhatsApp,
      ga4Id: parsed.ga4Id || "",
      gscVerification: parsed.gscVerification || "",
      updatedAt: new Date(),
    })
    .where(eq(schema.storeSettings.id, "default"));

  await createAuditLog({
    userId: actor.id,
    action: "STORE_SETTINGS_UPDATED",
    entityType: "STORE_SETTINGS",
    entityId: "default",
    metadata: {
      storeName: parsed.storeName,
      whatsappConfigured: Boolean(normalizedWhatsApp),
      addressConfirmed: parsed.addressConfirmed,
    },
  });

  return await getStoreSettings();
}

export async function listCampaigns(onlyActive = false) {
  const db = await getDb();
  const all = await db
    .select()
    .from(schema.campaigns)
    .orderBy(desc(schema.campaigns.createdAt));

  if (!onlyActive) return all;

  const now = new Date();
  return all.filter((c) => {
    if (!c.active) return false;
    if (c.startsAt && new Date(c.startsAt) > now) return false;
    if (c.endsAt && new Date(c.endsAt) < now) return false;
    return true;
  });
}

export async function saveCampaign(
  actor: AuthenticatedUser,
  input: {
    id?: string;
    title: string;
    subtitle?: string;
    badgeText?: string;
    ctaText?: string;
    ctaUrl?: string;
    bannerImageUrl?: string;
    active?: boolean;
  }
) {
  await requirePermission(actor, "settings", "edit");
  if (!input.title || input.title.trim().length < 3) {
    throw new AppError("O título da campanha deve ter pelo menos 3 caracteres.");
  }

  const db = await getDb();
  if (input.id) {
    await db
      .update(schema.campaigns)
      .set({
        title: input.title.trim(),
        subtitle: input.subtitle || "",
        badgeText: input.badgeText || "Campanha",
        ctaText: input.ctaText || "Conferir",
        ctaUrl: input.ctaUrl || "/catalogo",
        bannerImageUrl: input.bannerImageUrl || null,
        active: input.active ?? true,
        updatedAt: new Date(),
      })
      .where(eq(schema.campaigns.id, input.id));
    return { id: input.id };
  }

  const newId = generateId("camp");
  await db.insert(schema.campaigns).values({
    id: newId,
    title: input.title.trim(),
    subtitle: input.subtitle || "",
    badgeText: input.badgeText || "Campanha",
    ctaText: input.ctaText || "Conferir",
    ctaUrl: input.ctaUrl || "/catalogo",
    bannerImageUrl: input.bannerImageUrl || null,
    active: input.active ?? true,
  });

  return { id: newId };
}
