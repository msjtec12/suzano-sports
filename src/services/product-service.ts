import {
  eq,
  and,
  isNull,
  desc,
  inArray,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { getDb, runInTransaction, type AppDatabase } from "../db";
import * as schema from "../db/schema";
import { seedStarterCatalogIfEmpty } from "../db/seed-data";
import {
  requirePermission,
  createAuditLog,
  type AuthenticatedUser,
} from "./auth-service";
import { AppError, NotFoundError } from "../lib/errors";
import { generateId, generateCommercialCode } from "../lib/crypto";
import {
  slugify,
  toMoney,
  calculateDiscountPercent,
  getEffectivePrice,
} from "../lib/utils";

export const variationInputSchema = z.object({
  id: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional().nullable(),
  color: z.string().min(1).max(60).default("Única"),
  size: z.string().min(1).max(40).default("Único"),
  costPriceOverride: z.number().nonnegative().optional().nullable(),
  salePriceOverride: z.number().positive().optional().nullable(),
  promoPriceOverride: z.number().nonnegative().optional().nullable(),
  initialStock: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(1),
  active: z.boolean().default(true),
});

export const createProductCompleteSchema = z.object({
  name: z.string().min(2, "Informe o nome do produto").max(200),
  sku: z.string().max(80).optional(),
  barcode: z.string().max(80).optional().nullable(),
  categoryId: z.string().min(1, "Selecione a categoria"),
  subcategoryName: z.string().max(120).optional().nullable(),
  brandId: z.string().optional().nullable(),
  brandName: z.string().max(120).optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  fullDescription: z.string().max(5000).optional().nullable(),
  costPrice: z.number().nonnegative().default(0),
  salePrice: z.number().positive("O preço de venda deve ser maior que zero"),
  promoPrice: z.number().nonnegative().optional().nullable(),
  minStock: z.number().int().nonnegative().default(2),
  isFeatured: z.boolean().default(false),
  isPromo: z.boolean().default(false),
  hasVariations: z.boolean().default(true),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).default("ACTIVE"),
  images: z
    .array(
      z.object({
        url: z.string().min(1),
        altText: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .default([]),
  variations: z.array(variationInputSchema).default([]),
  initialStockSimple: z.number().int().nonnegative().default(0),
});

export const quickProductSchema = z.object({
  name: z.string().min(2, "Informe o nome do produto").max(200),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  salePrice: z.number().positive("Informe um preço válido"),
  imageUrl: z.string().min(1, "Informe a foto principal do produto"),
  initialQuantity: z.number().int().nonnegative("Quantidade inicial não pode ser negativa"),
  status: z.enum(["DRAFT", "ACTIVE"]).default("ACTIVE"),
  color: z.string().max(60).optional().default("Padrão"),
  size: z.string().max(40).optional().default("Único"),
  costPrice: z.number().nonnegative().optional().default(0),
});

export interface EnrichedVariation {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  color: string;
  size: string;
  costPrice: number;
  salePrice: number;
  promoPrice: number | null;
  effectivePrice: number;
  quantity: number;
  reservedQuantity: number;
  minStock: number;
  active: boolean;
}

export interface EnrichedProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  subcategoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  costPrice: number;
  salePrice: number;
  promoPrice: number | null;
  effectivePrice: number;
  discountPercent: number;
  hasLegitPromo: boolean;
  minStock: number;
  totalStock: number;
  isAvailable: boolean;
  isLowStock: boolean;
  isFeatured: boolean;
  isPromo: boolean;
  hasVariations: boolean;
  status: string;
  primaryImage: string;
  images: { id: string; url: string; altText: string; isPrimary: boolean }[];
  variations: EnrichedVariation[];
  availableColors: string[];
  availableSizes: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sincroniza automaticamente o status OUT_OF_STOCK <-> ACTIVE de um produto
 * com base na soma do estoque das variações ativas.
 * Não altera produtos com status DRAFT ou INACTIVE.
 */
export async function syncProductAvailabilityStatus(
  tx: AppDatabase,
  productId: string
): Promise<{ totalStock: number; status: string }> {
  const prodRows = await tx
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, productId));
  if (prodRows.length === 0) return { totalStock: 0, status: "INACTIVE" };

  const product = prodRows[0];
  const balances = await tx
    .select({
      quantity: schema.stockBalances.quantity,
      active: schema.productVariations.active,
    })
    .from(schema.stockBalances)
    .innerJoin(
      schema.productVariations,
      eq(schema.stockBalances.variationId, schema.productVariations.id)
    )
    .where(eq(schema.stockBalances.productId, productId));

  const totalStock = balances
    .filter((b) => b.active)
    .reduce((acc, b) => acc + Number(b.quantity || 0), 0);

  let nextStatus = product.status;
  if (product.status === "ACTIVE" && totalStock <= 0) {
    nextStatus = "OUT_OF_STOCK";
  } else if (product.status === "OUT_OF_STOCK" && totalStock > 0) {
    nextStatus = "ACTIVE";
  }

  if (nextStatus !== product.status) {
    await tx
      .update(schema.products)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(schema.products.id, productId));
  }

  return { totalStock, status: nextStatus };
}

export async function listCategories(onlyActive = false) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.categories)
    .orderBy(schema.categories.sortOrder, schema.categories.name);
  if (onlyActive) {
    return rows.filter((c) => c.active);
  }
  return rows;
}

export async function saveCategory(
  actor: AuthenticatedUser,
  input: {
    id?: string;
    name: string;
    description?: string;
    imageUrl?: string;
    active?: boolean;
    sortOrder?: number;
  }
) {
  await requirePermission(actor, "products", input.id ? "edit" : "create");
  const db = await getDb();
  const cleanName = input.name.trim();
  if (cleanName.length < 2) {
    throw new AppError("Nome da categoria deve ter pelo menos 2 caracteres.");
  }
  const baseSlug = slugify(cleanName);

  if (input.id) {
    await db
      .update(schema.categories)
      .set({
        name: cleanName,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
        active: input.active ?? true,
        sortOrder: input.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(schema.categories.id, input.id));
    return { id: input.id };
  }

  const newId = generateId("cat");
  const existing = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.slug, baseSlug));
  const finalSlug = existing.length > 0 ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

  await db.insert(schema.categories).values({
    id: newId,
    name: cleanName,
    slug: finalSlug,
    description: input.description || null,
    imageUrl: input.imageUrl || null,
    active: input.active ?? true,
    sortOrder: input.sortOrder ?? 10,
  });

  return { id: newId };
}

export async function listBrands(onlyActive = false) {
  const db = await getDb();
  const rows = await db.select().from(schema.brands).orderBy(schema.brands.name);
  return onlyActive ? rows.filter((b) => b.active) : rows;
}

async function resolveOrCreateBrandId(
  tx: AppDatabase,
  brandId?: string | null,
  brandName?: string | null
): Promise<string | null> {
  if (brandId && brandId.trim()) return brandId.trim();
  if (!brandName || !brandName.trim()) return null;

  const clean = brandName.trim();
  const slug = slugify(clean);
  const existing = await tx
    .select()
    .from(schema.brands)
    .where(eq(schema.brands.slug, slug));
  if (existing.length > 0) return existing[0].id;

  const newBrandId = generateId("brd");
  await tx.insert(schema.brands).values({
    id: newBrandId,
    name: clean,
    slug,
    active: true,
  });
  return newBrandId;
}

async function generateUniqueSlug(tx: AppDatabase, name: string): Promise<string> {
  const base = slugify(name) || "produto";
  const existing = await tx
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.slug, base));
  if (existing.length === 0) return base;
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

async function generateUniqueSku(tx: AppDatabase, requestedSku?: string): Promise<string> {
  const candidate =
    requestedSku && requestedSku.trim().length > 0
      ? requestedSku.trim().toUpperCase()
      : generateCommercialCode("SKU");

  const existing = await tx
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.sku, candidate));

  if (existing.length === 0) return candidate;
  if (requestedSku && requestedSku.trim().length > 0) {
    throw new AppError(`O SKU '${candidate}' já está cadastrado em outro produto.`);
  }
  return `${candidate}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

/**
 * Cadastro completo de produto (com suporte a múltiplas variações, imagens e saldo inicial auditado).
 */
export async function createProductComplete(
  actor: AuthenticatedUser,
  rawInput: z.infer<typeof createProductCompleteSchema>
) {
  await requirePermission(actor, "products", "create");
  const parsed = createProductCompleteSchema.parse(rawInput);

  if (parsed.promoPrice && parsed.promoPrice >= parsed.salePrice) {
    throw new AppError("O preço promocional deve ser menor que o preço normal de venda.");
  }

  return await runInTransaction(async (tx) => {
    const productId = generateId("prd");
    const slug = await generateUniqueSlug(tx, parsed.name);
    const sku = await generateUniqueSku(tx, parsed.sku);
    const resolvedBrandId = await resolveOrCreateBrandId(
      tx,
      parsed.brandId,
      parsed.brandName
    );

    const hasLegitPromo = Boolean(
      parsed.promoPrice && parsed.promoPrice > 0 && parsed.promoPrice < parsed.salePrice
    );

    await tx.insert(schema.products).values({
      id: productId,
      name: parsed.name.trim(),
      slug,
      sku,
      barcode: parsed.barcode || null,
      categoryId: parsed.categoryId,
      subcategoryName: parsed.subcategoryName || null,
      brandId: resolvedBrandId,
      shortDescription: parsed.shortDescription || null,
      fullDescription: parsed.fullDescription || null,
      costPrice: toMoney(parsed.costPrice),
      salePrice: toMoney(parsed.salePrice),
      promoPrice: hasLegitPromo ? toMoney(parsed.promoPrice) : null,
      minStock: parsed.minStock,
      isFeatured: parsed.isFeatured,
      isPromo: parsed.isPromo || hasLegitPromo,
      hasVariations: parsed.hasVariations,
      status: parsed.status,
    });

    // Imagens
    const imagesToInsert =
      parsed.images.length > 0
        ? parsed.images
        : [
            {
              url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
              altText: parsed.name.trim(),
              isPrimary: true,
            },
          ];

    for (let idx = 0; idx < imagesToInsert.length; idx++) {
      const img = imagesToInsert[idx];
      await tx.insert(schema.productImages).values({
        id: generateId("img"),
        productId,
        url: img.url.trim(),
        altText: (img.altText || parsed.name).trim(),
        isPrimary: idx === 0 ? true : Boolean(img.isPrimary),
        sortOrder: idx,
      });
    }

    // Variações
    const variationsList =
      parsed.variations.length > 0
        ? parsed.variations
        : [
            {
              color: "Única",
              size: "Único",
              initialStock: parsed.initialStockSimple,
              minStock: parsed.minStock,
              active: true,
            },
          ];

    for (let idx = 0; idx < variationsList.length; idx++) {
      const v = variationsList[idx];
      const varId = generateId("var");
      const varSku =
        v.sku && v.sku.trim().length > 0
          ? v.sku.trim().toUpperCase()
          : `${sku}-${slugify(v.color).toUpperCase().slice(0, 4)}-${slugify(v.size)
              .toUpperCase()
              .slice(0, 4)}-${idx + 1}`;

      await tx.insert(schema.productVariations).values({
        id: varId,
        productId,
        sku: varSku,
        barcode: v.barcode || null,
        color: v.color.trim(),
        size: v.size.trim(),
        costPriceOverride:
          v.costPriceOverride !== undefined && v.costPriceOverride !== null
            ? toMoney(v.costPriceOverride)
            : null,
        salePriceOverride:
          v.salePriceOverride !== undefined && v.salePriceOverride !== null
            ? toMoney(v.salePriceOverride)
            : null,
        promoPriceOverride:
          v.promoPriceOverride !== undefined && v.promoPriceOverride !== null
            ? toMoney(v.promoPriceOverride)
            : null,
        minStock: v.minStock ?? 1,
        active: v.active ?? true,
      });

      const initQty = Math.max(0, Math.floor(v.initialStock || 0));
      await tx.insert(schema.stockBalances).values({
        id: generateId("stb"),
        variationId: varId,
        productId,
        quantity: initQty,
        reservedQuantity: 0,
        minStock: v.minStock ?? 1,
      });

      if (initQty > 0) {
        await tx.insert(schema.stockMovements).values({
          id: generateId("stm"),
          variationId: varId,
          productId,
          type: "ENTRY",
          previousBalance: 0,
          movedQuantity: initQty,
          newBalance: initQty,
          unitCost: toMoney(v.costPriceOverride ?? parsed.costPrice),
          reason: "Saldo inicial no cadastro do produto",
          referenceType: "INITIAL",
          referenceId: productId,
          userId: actor.id,
        });
      }
    }

    await syncProductAvailabilityStatus(tx, productId);

    await createAuditLog({
      userId: actor.id,
      action: "PRODUCT_CREATED",
      entityType: "PRODUCT",
      entityId: productId,
      metadata: { name: parsed.name, sku },
    });

    return { id: productId, slug, sku };
  });
}

/**
 * Cadastro Rápido em 5 passos: Nome, Categoria, Preço, Foto e Quantidade Inicial.
 */
export async function createProductQuick(
  actor: AuthenticatedUser,
  rawInput: z.infer<typeof quickProductSchema>
) {
  await requirePermission(actor, "products", "create");
  const parsed = quickProductSchema.parse(rawInput);

  return await createProductComplete(actor, {
    name: parsed.name,
    categoryId: parsed.categoryId,
    salePrice: parsed.salePrice,
    costPrice: parsed.costPrice ?? 0,
    minStock: 2,
    isFeatured: false,
    isPromo: false,
    hasVariations: false,
    status: parsed.status,
    images: [
      {
        url: parsed.imageUrl,
        altText: parsed.name,
        isPrimary: true,
      },
    ],
    variations: [
      {
        color: parsed.color || "Padrão",
        size: parsed.size || "Único",
        initialStock: parsed.initialQuantity,
        minStock: 2,
        active: true,
      },
    ],
    initialStockSimple: parsed.initialQuantity,
  });
}

/**
 * Edição de produto e suas variações.
 */
export async function updateProduct(
  actor: AuthenticatedUser,
  productId: string,
  rawInput: Partial<z.infer<typeof createProductCompleteSchema>>
) {
  await requirePermission(actor, "products", "edit");

  return await runInTransaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.id, productId), isNull(schema.products.deletedAt)));

    if (existingRows.length === 0) {
      throw new NotFoundError("Produto não encontrado.");
    }
    const existing = existingRows[0];

    const salePrice =
      rawInput.salePrice !== undefined ? toMoney(rawInput.salePrice) : existing.salePrice;
    const promoPrice =
      rawInput.promoPrice !== undefined
        ? rawInput.promoPrice
          ? toMoney(rawInput.promoPrice)
          : null
        : existing.promoPrice;

    if (promoPrice && promoPrice >= salePrice) {
      throw new AppError("O preço promocional deve ser menor que o preço de venda.");
    }

    const resolvedBrandId =
      rawInput.brandId !== undefined || rawInput.brandName !== undefined
        ? await resolveOrCreateBrandId(tx, rawInput.brandId, rawInput.brandName)
        : existing.brandId;

    await tx
      .update(schema.products)
      .set({
        name: rawInput.name ? rawInput.name.trim() : existing.name,
        barcode: rawInput.barcode !== undefined ? rawInput.barcode : existing.barcode,
        categoryId: rawInput.categoryId || existing.categoryId,
        subcategoryName:
          rawInput.subcategoryName !== undefined
            ? rawInput.subcategoryName
            : existing.subcategoryName,
        brandId: resolvedBrandId,
        shortDescription:
          rawInput.shortDescription !== undefined
            ? rawInput.shortDescription
            : existing.shortDescription,
        fullDescription:
          rawInput.fullDescription !== undefined
            ? rawInput.fullDescription
            : existing.fullDescription,
        costPrice:
          rawInput.costPrice !== undefined ? toMoney(rawInput.costPrice) : existing.costPrice,
        salePrice,
        promoPrice,
        minStock: rawInput.minStock ?? existing.minStock,
        isFeatured: rawInput.isFeatured ?? existing.isFeatured,
        isPromo: rawInput.isPromo ?? Boolean(promoPrice && promoPrice < salePrice),
        hasVariations: rawInput.hasVariations ?? existing.hasVariations,
        status: rawInput.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, productId));

    // Atualiza imagens se enviadas
    if (rawInput.images && rawInput.images.length > 0) {
      await tx
        .delete(schema.productImages)
        .where(eq(schema.productImages.productId, productId));
      for (let i = 0; i < rawInput.images.length; i++) {
        const img = rawInput.images[i];
        await tx.insert(schema.productImages).values({
          id: generateId("img"),
          productId,
          url: img.url.trim(),
          altText: (img.altText || rawInput.name || existing.name).trim(),
          isPrimary: i === 0 ? true : Boolean(img.isPrimary),
          sortOrder: i,
        });
      }
    }

    // Adiciona ou atualiza variações enviadas
    if (rawInput.variations && rawInput.variations.length > 0) {
      for (let idx = 0; idx < rawInput.variations.length; idx++) {
        const v = rawInput.variations[idx];
        if (v.id) {
          await tx
            .update(schema.productVariations)
            .set({
              color: v.color.trim(),
              size: v.size.trim(),
              barcode: v.barcode || null,
              costPriceOverride:
                v.costPriceOverride !== undefined && v.costPriceOverride !== null
                  ? toMoney(v.costPriceOverride)
                  : null,
              salePriceOverride:
                v.salePriceOverride !== undefined && v.salePriceOverride !== null
                  ? toMoney(v.salePriceOverride)
                  : null,
              promoPriceOverride:
                v.promoPriceOverride !== undefined && v.promoPriceOverride !== null
                  ? toMoney(v.promoPriceOverride)
                  : null,
              minStock: v.minStock ?? 1,
              active: v.active ?? true,
              updatedAt: new Date(),
            })
            .where(eq(schema.productVariations.id, v.id));
        } else {
          const newVarId = generateId("var");
          const varSku =
            v.sku && v.sku.trim().length > 0
              ? v.sku.trim().toUpperCase()
              : `${existing.sku}-${slugify(v.color).toUpperCase().slice(0, 4)}-${slugify(
                  v.size
                )
                  .toUpperCase()
                  .slice(0, 4)}-${Date.now().toString(36).slice(-3).toUpperCase()}`;

          await tx.insert(schema.productVariations).values({
            id: newVarId,
            productId,
            sku: varSku,
            barcode: v.barcode || null,
            color: v.color.trim(),
            size: v.size.trim(),
            costPriceOverride:
              v.costPriceOverride !== undefined && v.costPriceOverride !== null
                ? toMoney(v.costPriceOverride)
                : null,
            salePriceOverride:
              v.salePriceOverride !== undefined && v.salePriceOverride !== null
                ? toMoney(v.salePriceOverride)
                : null,
            promoPriceOverride:
              v.promoPriceOverride !== undefined && v.promoPriceOverride !== null
                ? toMoney(v.promoPriceOverride)
                : null,
            minStock: v.minStock ?? 1,
            active: v.active ?? true,
          });

          const initQty = Math.max(0, Math.floor(v.initialStock || 0));
          await tx.insert(schema.stockBalances).values({
            id: generateId("stb"),
            variationId: newVarId,
            productId,
            quantity: initQty,
            reservedQuantity: 0,
            minStock: v.minStock ?? 1,
          });

          if (initQty > 0) {
            await tx.insert(schema.stockMovements).values({
              id: generateId("stm"),
              variationId: newVarId,
              productId,
              type: "ENTRY",
              previousBalance: 0,
              movedQuantity: initQty,
              newBalance: initQty,
              unitCost: toMoney(v.costPriceOverride ?? existing.costPrice),
              reason: "Entrada inicial de nova variação",
              referenceType: "INITIAL",
              referenceId: productId,
              userId: actor.id,
            });
          }
        }
      }
    }

    await syncProductAvailabilityStatus(tx, productId);

    await createAuditLog({
      userId: actor.id,
      action: "PRODUCT_UPDATED",
      entityType: "PRODUCT",
      entityId: productId,
      metadata: { updatedFields: Object.keys(rawInput) },
    });

    return { id: productId };
  });
}

export async function setProductStatus(
  actor: AuthenticatedUser,
  productId: string,
  status: "DRAFT" | "ACTIVE" | "INACTIVE"
) {
  await requirePermission(actor, "products", "edit");
  return await runInTransaction(async (tx) => {
    await tx
      .update(schema.products)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.products.id, productId));

    if (status === "ACTIVE") {
      await syncProductAvailabilityStatus(tx, productId);
    }

    await createAuditLog({
      userId: actor.id,
      action: `PRODUCT_STATUS_${status}`,
      entityType: "PRODUCT",
      entityId: productId,
    });

    const updated = await tx
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    return updated[0];
  });
}

/**
 * Exclusão lógica: preserva histórico de vendas, movimentações de estoque e financeiro.
 */
export async function softDeleteProduct(actor: AuthenticatedUser, productId: string) {
  await requirePermission(actor, "products", "delete");
  const db = await getDb();

  await db
    .update(schema.products)
    .set({
      status: "INACTIVE",
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.products.id, productId));

  await createAuditLog({
    userId: actor.id,
    action: "PRODUCT_SOFT_DELETED",
    entityType: "PRODUCT",
    entityId: productId,
  });

  return { id: productId, deleted: true };
}

export async function duplicateProduct(actor: AuthenticatedUser, productId: string) {
  await requirePermission(actor, "products", "create");
  const detail = await getProductBySlugOrId(productId, true);
  if (!detail) {
    throw new NotFoundError("Produto original não encontrado para duplicação.");
  }

  return await createProductComplete(actor, {
    name: `${detail.name} (Cópia)`,
    categoryId: detail.categoryId,
    subcategoryName: detail.subcategoryName,
    brandId: detail.brandId,
    shortDescription: detail.shortDescription,
    fullDescription: detail.fullDescription,
    costPrice: detail.costPrice,
    salePrice: detail.salePrice,
    promoPrice: detail.promoPrice,
    minStock: detail.minStock,
    isFeatured: false,
    isPromo: detail.isPromo,
    hasVariations: detail.hasVariations,
    status: "DRAFT",
    images: detail.images.map((img) => ({
      url: img.url,
      altText: img.altText,
      isPrimary: img.isPrimary,
    })),
    variations: detail.variations.map((v) => ({
      color: v.color,
      size: v.size,
      costPriceOverride: v.costPrice,
      salePriceOverride: v.salePrice,
      promoPriceOverride: v.promoPrice,
      initialStock: 0,
      minStock: v.minStock,
      active: true,
    })),
    initialStockSimple: 0,
  });
}

/**
 * Hidrata uma lista de produtos com suas categorias, marcas, imagens, variações e saldos.
 */
async function hydrateProducts(
  productRows: (typeof schema.products.$inferSelect)[]
): Promise<EnrichedProduct[]> {
  if (productRows.length === 0) return [];
  const db = await getDb();
  const productIds = productRows.map((p) => p.id);

  const [cats, brds, imgs, vars, bals] = await Promise.all([
    db.select().from(schema.categories),
    db.select().from(schema.brands),
    db
      .select()
      .from(schema.productImages)
      .where(inArray(schema.productImages.productId, productIds)),
    db
      .select()
      .from(schema.productVariations)
      .where(inArray(schema.productVariations.productId, productIds)),
    db
      .select()
      .from(schema.stockBalances)
      .where(inArray(schema.stockBalances.productId, productIds)),
  ]);

  const catMap = new Map(cats.map((c) => [c.id, c]));
  const brandMap = new Map(brds.map((b) => [b.id, b]));
  const balMap = new Map(bals.map((b) => [b.variationId, b]));

  return productRows.map((p) => {
    const cat = catMap.get(p.categoryId);
    const brand = p.brandId ? brandMap.get(p.brandId) : undefined;
    const pImages = imgs
      .filter((i) => i.productId === p.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const pVars: EnrichedVariation[] = vars
      .filter((v) => v.productId === p.id)
      .map((v) => {
        const bal = balMap.get(v.id);
        const vCost = toMoney(v.costPriceOverride ?? p.costPrice);
        const vSale = toMoney(v.salePriceOverride ?? p.salePrice);
        const vPromo =
          v.promoPriceOverride !== null && v.promoPriceOverride !== undefined
            ? toMoney(v.promoPriceOverride)
            : p.promoPrice !== null && p.promoPrice !== undefined
            ? toMoney(p.promoPrice)
            : null;
        return {
          id: v.id,
          productId: p.id,
          sku: v.sku,
          barcode: v.barcode,
          color: v.color,
          size: v.size,
          costPrice: vCost,
          salePrice: vSale,
          promoPrice: vPromo && vPromo < vSale ? vPromo : null,
          effectivePrice: getEffectivePrice(vSale, vPromo),
          quantity: bal ? Number(bal.quantity) : 0,
          reservedQuantity: bal ? Number(bal.reservedQuantity) : 0,
          minStock: bal ? Number(bal.minStock) : v.minStock,
          active: v.active,
        };
      });

    const totalStock = pVars
      .filter((v) => v.active)
      .reduce((acc, v) => acc + v.quantity, 0);

    const discountPercent = calculateDiscountPercent(p.salePrice, p.promoPrice);
    const hasLegitPromo = discountPercent > 0;
    const effectivePrice = getEffectivePrice(p.salePrice, p.promoPrice);

    const availableVars = pVars.filter((v) => v.active && v.quantity > 0);
    const availableColors = Array.from(new Set(availableVars.map((v) => v.color)));
    const availableSizes = Array.from(new Set(availableVars.map((v) => v.size)));

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      barcode: p.barcode,
      categoryId: p.categoryId,
      categoryName: cat ? cat.name : "Geral",
      categorySlug: cat ? cat.slug : "geral",
      subcategoryName: p.subcategoryName,
      brandId: p.brandId,
      brandName: brand ? brand.name : null,
      shortDescription: p.shortDescription,
      fullDescription: p.fullDescription,
      costPrice: toMoney(p.costPrice),
      salePrice: toMoney(p.salePrice),
      promoPrice: hasLegitPromo ? toMoney(p.promoPrice) : null,
      effectivePrice,
      discountPercent,
      hasLegitPromo,
      minStock: p.minStock,
      totalStock,
      isAvailable: totalStock > 0 && p.status === "ACTIVE",
      isLowStock: totalStock > 0 && totalStock <= p.minStock,
      isFeatured: p.isFeatured,
      isPromo: p.isPromo || hasLegitPromo,
      hasVariations: p.hasVariations,
      status: p.status,
      primaryImage:
        pImages.find((i) => i.isPrimary)?.url ||
        pImages[0]?.url ||
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
      images: pImages.map((i) => ({
        id: i.id,
        url: i.url,
        altText: i.altText,
        isPrimary: i.isPrimary,
      })),
      variations: pVars,
      availableColors,
      availableSizes,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });
}

export interface CatalogFilters {
  query?: string;
  categorySlug?: string;
  categoryId?: string;
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  onlyAvailable?: boolean;
  onlyPromo?: boolean;
  onlyFeatured?: boolean;
  includeInactive?: boolean;
  sortBy?: "newest" | "price_asc" | "price_desc";
}

export async function getCatalogProducts(filters: CatalogFilters = {}): Promise<{
  products: EnrichedProduct[];
  facets: {
    categories: { id: string; name: string; slug: string; count: number }[];
    brands: { id: string; name: string; slug: string; count: number }[];
    sizes: string[];
    colors: string[];
  };
}> {
  const db = await getDb();
  if (!process.env.VITEST) {
    await seedStarterCatalogIfEmpty(db);
  }
  const allRows = await db
    .select()
    .from(schema.products)
    .where(isNull(schema.products.deletedAt))
    .orderBy(desc(schema.products.createdAt));

  // Filtra produtos públicos vs administrativos
  const visibleRows = filters.includeInactive
    ? allRows
    : allRows.filter((p) => p.status === "ACTIVE" || p.status === "OUT_OF_STOCK");

  const hydrated = await hydrateProducts(visibleRows);

  // Calcula facetas sobre os produtos visíveis na vitrine
  const catCountMap = new Map<string, { id: string; name: string; slug: string; count: number }>();
  const brandCountMap = new Map<string, { id: string; name: string; slug: string; count: number }>();
  const sizeSet = new Set<string>();
  const colorSet = new Set<string>();

  for (const p of hydrated) {
    const cEntry = catCountMap.get(p.categorySlug) || {
      id: p.categoryId,
      name: p.categoryName,
      slug: p.categorySlug,
      count: 0,
    };
    cEntry.count += 1;
    catCountMap.set(p.categorySlug, cEntry);

    if (p.brandId && p.brandName) {
      const bSlug = slugify(p.brandName);
      const bEntry = brandCountMap.get(bSlug) || {
        id: p.brandId,
        name: p.brandName,
        slug: bSlug,
        count: 0,
      };
      bEntry.count += 1;
      brandCountMap.set(bSlug, bEntry);
    }

    for (const v of p.variations) {
      if (v.active) {
        if (v.size) sizeSet.add(v.size);
        if (v.color) colorSet.add(v.color);
      }
    }
  }

  let filtered = hydrated;

  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        p.categoryName.toLowerCase().includes(q) ||
        (p.brandName && p.brandName.toLowerCase().includes(q)) ||
        p.variations.some(
          (v) =>
            v.sku.toLowerCase().includes(q) ||
            (v.barcode && v.barcode.toLowerCase().includes(q))
        )
    );
  }

  if (filters.categorySlug) {
    if (filters.categorySlug === "outlet-e-promocoes") {
      filtered = filtered.filter(
        (p) => p.categorySlug === "outlet-e-promocoes" || p.hasLegitPromo || p.isPromo
      );
    } else {
      filtered = filtered.filter((p) => p.categorySlug === filters.categorySlug);
    }
  }

  if (filters.categoryId) {
    filtered = filtered.filter((p) => p.categoryId === filters.categoryId);
  }

  if (filters.brandSlug) {
    filtered = filtered.filter(
      (p) => p.brandName && slugify(p.brandName) === filters.brandSlug
    );
  }

  if (filters.minPrice !== undefined && filters.minPrice > 0) {
    filtered = filtered.filter((p) => p.effectivePrice >= filters.minPrice!);
  }

  if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
    filtered = filtered.filter((p) => p.effectivePrice <= filters.maxPrice!);
  }

  if (filters.size) {
    const targetSize = filters.size.toLowerCase();
    filtered = filtered.filter((p) =>
      p.variations.some(
        (v) => v.active && v.quantity > 0 && v.size.toLowerCase() === targetSize
      )
    );
  }

  if (filters.color) {
    const targetColor = filters.color.toLowerCase();
    filtered = filtered.filter((p) =>
      p.variations.some(
        (v) => v.active && v.quantity > 0 && v.color.toLowerCase() === targetColor
      )
    );
  }

  if (filters.onlyAvailable) {
    filtered = filtered.filter((p) => p.isAvailable);
  }

  if (filters.onlyPromo) {
    filtered = filtered.filter((p) => p.hasLegitPromo || p.isPromo);
  }

  if (filters.onlyFeatured) {
    filtered = filtered.filter((p) => p.isFeatured);
  }

  if (filters.sortBy === "price_asc") {
    filtered = [...filtered].sort((a, b) => a.effectivePrice - b.effectivePrice);
  } else if (filters.sortBy === "price_desc") {
    filtered = [...filtered].sort((a, b) => b.effectivePrice - a.effectivePrice);
  } else {
    filtered = [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return {
    products: filtered,
    facets: {
      categories: Array.from(catCountMap.values()),
      brands: Array.from(brandCountMap.values()),
      sizes: Array.from(sizeSet),
      colors: Array.from(colorSet),
    },
  };
}

export async function getProductBySlugOrId(
  slugOrId: string,
  includeInactive = false
): Promise<EnrichedProduct | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.products)
    .where(
      and(
        isNull(schema.products.deletedAt),
        sql`(${schema.products.slug} = ${slugOrId} OR ${schema.products.id} = ${slugOrId})`
      )
    );

  if (rows.length === 0) return null;
  const prod = rows[0];
  if (!includeInactive && prod.status !== "ACTIVE" && prod.status !== "OUT_OF_STOCK") {
    return null;
  }

  const hydrated = await hydrateProducts([prod]);
  return hydrated[0] || null;
}

/**
 * Retorna os produtos mais vendidos reais (somente quando existirem vendas confirmadas).
 */
export async function getBestSellingProducts(limit = 4): Promise<EnrichedProduct[]> {
  const db = await getDb();
  const soldRows = await db
    .select({
      productId: schema.saleItems.productId,
      totalQty: sql<number>`SUM(${schema.saleItems.quantity} - ${schema.saleItems.returnedQuantity})`,
    })
    .from(schema.saleItems)
    .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
    .where(eq(schema.sales.status, "CONFIRMED"))
    .groupBy(schema.saleItems.productId)
    .orderBy(
      desc(sql`SUM(${schema.saleItems.quantity} - ${schema.saleItems.returnedQuantity})`)
    )
    .limit(limit);

  if (soldRows.length === 0) return [];

  const ids = soldRows.map((r) => r.productId);
  const prodRows = await db
    .select()
    .from(schema.products)
    .where(and(inArray(schema.products.id, ids), isNull(schema.products.deletedAt)));

  const hydrated = await hydrateProducts(
    prodRows.filter((p) => p.status === "ACTIVE" || p.status === "OUT_OF_STOCK")
  );
  const byId = new Map(hydrated.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is EnrichedProduct => Boolean(p));
}
