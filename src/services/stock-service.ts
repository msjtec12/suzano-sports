import { eq, desc, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, runInTransaction } from "../db";
import * as schema from "../db/schema";
import {
  requirePermission,
  createAuditLog,
  type AuthenticatedUser,
} from "./auth-service";
import { syncProductAvailabilityStatus } from "./product-service";
import {
  AppError,
  InsufficientStockError,
  NotFoundError,
} from "../lib/errors";
import { generateId } from "../lib/crypto";
import { toMoney } from "../lib/utils";

export const stockMovementSchema = z.object({
  variationId: z.string().min(1, "Informe a variação do produto"),
  type: z.enum([
    "ENTRY",
    "SALE_EXIT",
    "INVENTORY_ADJUSTMENT",
    "RETURN",
    "LOSS",
  ]),
  quantity: z.number().int("A quantidade deve ser inteira"),
  unitCost: z.number().nonnegative().optional(),
  reason: z.string().min(3, "Informe uma justificativa com pelo menos 3 caracteres"),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  // Opcional: caso uma entrada gere uma conta a pagar para fornecedor (não entra no CMV até vender!)
  supplierName: z.string().optional(),
  payableDueDate: z.string().optional(),
});

export async function recordStockMovement(
  actor: AuthenticatedUser,
  rawInput: z.infer<typeof stockMovementSchema>
) {
  await requirePermission(actor, "stock", "create");
  const parsed = stockMovementSchema.parse(rawInput);

  return await runInTransaction(async (tx) => {
    // 1. Verifica idempotência caso informada
    if (parsed.idempotencyKey) {
      const existingMov = await tx
        .select()
        .from(schema.stockMovements)
        .where(eq(schema.stockMovements.idempotencyKey, parsed.idempotencyKey));
      if (existingMov.length > 0) {
        return {
          movement: existingMov[0],
          idempotentReplay: true,
        };
      }
    }

    // 2. Busca variação, produto e saldo atual
    const varRows = await tx
      .select({
        variation: schema.productVariations,
        product: schema.products,
        balance: schema.stockBalances,
      })
      .from(schema.productVariations)
      .innerJoin(
        schema.products,
        eq(schema.productVariations.productId, schema.products.id)
      )
      .leftJoin(
        schema.stockBalances,
        eq(schema.stockBalances.variationId, schema.productVariations.id)
      )
      .where(eq(schema.productVariations.id, parsed.variationId));

    if (varRows.length === 0) {
      throw new NotFoundError("Variação de produto não encontrada.");
    }

    const { variation, product, balance } = varRows[0];
    const previousBalance = balance ? Number(balance.quantity) : 0;

    let movedQuantity = 0;
    let newBalance = previousBalance;

    if (parsed.type === "ENTRY" || parsed.type === "RETURN") {
      if (parsed.quantity <= 0) {
        throw new AppError("A quantidade de entrada ou devolução deve ser maior que zero.");
      }
      movedQuantity = parsed.quantity;
      newBalance = previousBalance + movedQuantity;
    } else if (parsed.type === "SALE_EXIT" || parsed.type === "LOSS") {
      const absQty = Math.abs(parsed.quantity);
      if (absQty <= 0) {
        throw new AppError("A quantidade de saída ou perda deve ser maior que zero.");
      }
      movedQuantity = -absQty;
      newBalance = previousBalance - absQty;
    } else if (parsed.type === "INVENTORY_ADJUSTMENT") {
      // No ajuste de inventário, 'quantity' pode representar o delta (+/-)
      if (parsed.quantity === 0) {
        throw new AppError("O ajuste de inventário deve movimentar uma quantidade diferente de zero.");
      }
      movedQuantity = parsed.quantity;
      newBalance = previousBalance + movedQuantity;
    }

    if (newBalance < 0) {
      throw new InsufficientStockError(
        `Operação bloqueada: o saldo da variação '${product.name} (${variation.color}/${variation.size})' ficaria negativo (${newBalance}). Saldo disponível: ${previousBalance}.`
      );
    }

    const effectiveUnitCost = toMoney(
      parsed.unitCost ?? variation.costPriceOverride ?? product.costPrice
    );

    if (balance) {
      // Se for redução, usa cláusula atômica no banco para garantir que quantity >= abs(movedQuantity)
      if (movedQuantity < 0) {
        const needed = Math.abs(movedQuantity);
        const updatedRows = await tx
          .update(schema.stockBalances)
          .set({
            quantity: sql`${schema.stockBalances.quantity} - ${needed}`,
            lastMovementAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            sql`${schema.stockBalances.variationId} = ${variation.id} AND ${schema.stockBalances.quantity} >= ${needed}`
          )
          .returning();

        if (updatedRows.length === 0) {
          throw new InsufficientStockError(
            "Saldo insuficiente devido a atualização concorrente de estoque."
          );
        }
        newBalance = Number(updatedRows[0].quantity);
      } else {
        const updatedRows = await tx
          .update(schema.stockBalances)
          .set({
            quantity: sql`${schema.stockBalances.quantity} + ${movedQuantity}`,
            lastMovementAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.stockBalances.variationId, variation.id))
          .returning();
        newBalance = Number(updatedRows[0].quantity);
      }
    } else {
      await tx.insert(schema.stockBalances).values({
        id: generateId("stb"),
        variationId: variation.id,
        productId: product.id,
        quantity: newBalance,
        reservedQuantity: 0,
        minStock: variation.minStock,
      });
    }

    // Atualiza preço de custo se informado numa entrada de mercadoria
    if (parsed.type === "ENTRY" && parsed.unitCost && parsed.unitCost > 0) {
      await tx
        .update(schema.productVariations)
        .set({
          costPriceOverride: toMoney(parsed.unitCost),
          updatedAt: new Date(),
        })
        .where(eq(schema.productVariations.id, variation.id));
    }

    const movementId = generateId("stm");
    const insertedMovements = await tx
      .insert(schema.stockMovements)
      .values({
        id: movementId,
        variationId: variation.id,
        productId: product.id,
        type: parsed.type,
        previousBalance,
        movedQuantity,
        newBalance,
        unitCost: effectiveUnitCost,
        reason: parsed.reason.trim(),
        referenceType: parsed.referenceType || "MANUAL",
        referenceId: parsed.referenceId || null,
        userId: actor.id,
        idempotencyKey: parsed.idempotencyKey || null,
      })
      .returning();

    // Se for compra de mercadoria com fornecedor informado, registra em Contas a Pagar
    // (Importante: compra de estoque é entrada de Ativo, não entra como CMV até a venda acontecer)
    if (
      parsed.type === "ENTRY" &&
      parsed.supplierName &&
      parsed.supplierName.trim().length > 0 &&
      effectiveUnitCost > 0
    ) {
      const totalInvoice = toMoney(effectiveUnitCost * movedQuantity);
      await tx.insert(schema.accountsPayable).values({
        id: generateId("ap"),
        supplierName: parsed.supplierName.trim(),
        description: `Entrada de estoque: ${movedQuantity}x ${product.name} (${variation.color}/${variation.size})`,
        amount: totalInvoice,
        dueDate: parsed.payableDueDate ? new Date(parsed.payableDueDate) : new Date(),
        status: "PENDING",
        stockEntryReference: movementId,
        createdByUserId: actor.id,
      });
    }

    // Sincroniza status ACTIVE <-> OUT_OF_STOCK do produto
    const productAvailability = await syncProductAvailabilityStatus(tx, product.id);

    await createAuditLog({
      userId: actor.id,
      action: `STOCK_${parsed.type}`,
      entityType: "STOCK_MOVEMENT",
      entityId: movementId,
      metadata: {
        productId: product.id,
        variationId: variation.id,
        previousBalance,
        movedQuantity,
        newBalance,
        productStatus: productAvailability.status,
      },
    });

    return {
      movement: insertedMovements[0],
      idempotentReplay: false,
      productStatus: productAvailability.status,
    };
  });
}

/**
 * Executa ajuste de inventário físico definindo a contagem física exata encontrada na prateleira.
 */
export async function applyPhysicalInventoryCount(
  actor: AuthenticatedUser,
  input: {
    variationId: string;
    countedQuantity: number;
    reason?: string;
    idempotencyKey?: string;
  }
) {
  await requirePermission(actor, "stock", "create");
  if (input.countedQuantity < 0 || !Number.isInteger(input.countedQuantity)) {
    throw new AppError("A contagem física deve ser um número inteiro maior ou igual a zero.");
  }

  const db = await getDb();
  const balRows = await db
    .select()
    .from(schema.stockBalances)
    .where(eq(schema.stockBalances.variationId, input.variationId));

  const currentQty = balRows.length > 0 ? Number(balRows[0].quantity) : 0;
  const delta = input.countedQuantity - currentQty;

  if (delta === 0) {
    return {
      unchanged: true,
      currentQuantity: currentQty,
    };
  }

  return await recordStockMovement(actor, {
    variationId: input.variationId,
    type: "INVENTORY_ADJUSTMENT",
    quantity: delta,
    reason:
      input.reason && input.reason.trim().length >= 3
        ? input.reason.trim()
        : `Inventário físico: ajuste de ${currentQty} para ${input.countedQuantity} un.`,
    referenceType: "INVENTORY",
    idempotencyKey: input.idempotencyKey,
  });
}

/**
 * Retorna visão consolidada do estoque: saldos por variação, valor total a custo,
 * alertas de reposição, esgotados, produtos parados e histórico de movimentações.
 */
export async function getStockOverview(actor: AuthenticatedUser, stagnantDays = 30) {
  await requirePermission(actor, "stock", "view");
  const db = await getDb();

  const [variationsRows, movementsRows, salesItemsRows] = await Promise.all([
    db
      .select({
        variation: schema.productVariations,
        product: schema.products,
        category: schema.categories,
        balance: schema.stockBalances,
      })
      .from(schema.productVariations)
      .innerJoin(
        schema.products,
        eq(schema.productVariations.productId, schema.products.id)
      )
      .innerJoin(
        schema.categories,
        eq(schema.products.categoryId, schema.categories.id)
      )
      .leftJoin(
        schema.stockBalances,
        eq(schema.stockBalances.variationId, schema.productVariations.id)
      )
      .where(isNull(schema.products.deletedAt)),
    db
      .select({
        movement: schema.stockMovements,
        productName: schema.products.name,
        variationColor: schema.productVariations.color,
        variationSize: schema.productVariations.size,
        variationSku: schema.productVariations.sku,
        userName: schema.users.name,
      })
      .from(schema.stockMovements)
      .innerJoin(
        schema.products,
        eq(schema.stockMovements.productId, schema.products.id)
      )
      .innerJoin(
        schema.productVariations,
        eq(schema.stockMovements.variationId, schema.productVariations.id)
      )
      .leftJoin(schema.users, eq(schema.stockMovements.userId, schema.users.id))
      .orderBy(desc(schema.stockMovements.createdAt))
      .limit(150),
    db
      .select({
        variationId: schema.saleItems.variationId,
        lastSoldAt: sql<Date>`MAX(${schema.sales.confirmedAt})`,
      })
      .from(schema.saleItems)
      .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
      .where(eq(schema.sales.status, "CONFIRMED"))
      .groupBy(schema.saleItems.variationId),
  ]);

  const lastSoldMap = new Map(
    salesItemsRows.map((r) => [r.variationId, r.lastSoldAt ? new Date(r.lastSoldAt) : null])
  );

  const cutoffDate = new Date(Date.now() - stagnantDays * 24 * 60 * 60 * 1000);

  let totalUnits = 0;
  let totalCostValue = 0;
  let totalRetailValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  const items = variationsRows.map(({ variation, product, category, balance }) => {
    const qty = balance ? Number(balance.quantity) : 0;
    const minStock = balance ? Number(balance.minStock) : variation.minStock;
    const unitCost = toMoney(variation.costPriceOverride ?? product.costPrice);
    const unitSale = toMoney(
      variation.promoPriceOverride ??
        variation.salePriceOverride ??
        product.promoPrice ??
        product.salePrice
    );
    const totalCost = toMoney(qty * unitCost);
    const totalSale = toMoney(qty * unitSale);

    totalUnits += qty;
    totalCostValue = toMoney(totalCostValue + totalCost);
    totalRetailValue = toMoney(totalRetailValue + totalSale);

    const isOut = qty <= 0;
    const isLow = qty > 0 && qty <= minStock;
    if (isOut) outOfStockCount += 1;
    if (isLow) lowStockCount += 1;

    const lastSoldAt = lastSoldMap.get(variation.id) || null;
    const createdAt = new Date(variation.createdAt);
    const isStagnant =
      qty > 0 &&
      (!lastSoldAt
        ? createdAt <= cutoffDate
        : new Date(lastSoldAt).getTime() <= cutoffDate.getTime());

    return {
      variationId: variation.id,
      productId: product.id,
      productName: product.name,
      productStatus: product.status,
      categoryName: category.name,
      sku: variation.sku,
      barcode: variation.barcode || product.barcode,
      color: variation.color,
      size: variation.size,
      quantity: qty,
      minStock,
      unitCost,
      unitSale,
      totalCost,
      totalSale,
      isOut,
      isLow,
      isStagnant,
      lastSoldAt,
      lastMovementAt: balance?.lastMovementAt || variation.updatedAt,
    };
  });

  const stagnantItems = items.filter((i) => i.isStagnant);

  return {
    summary: {
      totalSkus: items.length,
      totalUnits,
      totalCostValue,
      totalRetailValue,
      lowStockCount,
      outOfStockCount,
      stagnantCount: stagnantItems.length,
    },
    items,
    stagnantItems,
    movements: movementsRows.map((m) => ({
      id: m.movement.id,
      variationId: m.movement.variationId,
      productId: m.movement.productId,
      productName: m.productName,
      variationLabel: `${m.variationColor} / ${m.variationSize}`,
      sku: m.variationSku,
      type: m.movement.type,
      previousBalance: m.movement.previousBalance,
      movedQuantity: m.movement.movedQuantity,
      newBalance: m.movement.newBalance,
      unitCost: m.movement.unitCost,
      reason: m.movement.reason,
      referenceType: m.movement.referenceType,
      referenceId: m.movement.referenceId,
      userName: m.userName || "Sistema",
      createdAt: m.movement.createdAt,
    })),
  };
}
