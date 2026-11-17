import { eq, desc, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, runInTransaction } from "../db";
import * as schema from "../db/schema";
import {
  requirePermission,
  checkPermission,
  createAuditLog,
  type AuthenticatedUser,
} from "./auth-service";
import { syncProductAvailabilityStatus } from "./product-service";
import { getStoreSettings } from "./settings-service";
import {
  AppError,
  ForbiddenError,
  InsufficientStockError,
  NotFoundError,
} from "../lib/errors";
import { generateId, generateCommercialCode } from "../lib/crypto";
import {
  toMoney,
  formatBRL,
  getEffectivePrice,
  buildWhatsAppUrl,
} from "../lib/utils";

export const createOrderRequestSchema = z.object({
  customerName: z.string().min(2, "Informe seu nome para atendimento").max(160),
  customerPhone: z.string().min(8, "Informe seu WhatsApp ou telefone").max(40),
  deliveryMethod: z.enum(["PICKUP", "DELIVERY"]).default("PICKUP"),
  addressNotes: z.string().max(500).optional().nullable(),
  preferredPaymentMethod: z
    .enum(["PIX", "CREDIT", "DEBIT", "CASH", "OTHER"])
    .default("PIX"),
  notes: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().optional(),
  items: z
    .array(
      z.object({
        variationId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Adicione pelo menos um produto à sacola"),
});

export const paymentSplitSchema = z.object({
  method: z.enum(["CASH", "PIX", "DEBIT", "CREDIT", "OTHER"]),
  amount: z.number().positive("Valor do pagamento deve ser maior que zero"),
  feeAmount: z.number().nonnegative().default(0),
  installments: z.number().int().positive().default(1),
  status: z.enum(["CONFIRMED", "PENDING"]).default("CONFIRMED"),
  dueDate: z.string().optional(),
  reference: z.string().optional(),
});

export const createPosSaleSchema = z.object({
  customerName: z.string().max(160).optional().default("Cliente Balcão"),
  customerPhone: z.string().max(40).optional().nullable(),
  discount: z.number().nonnegative().default(0),
  surcharge: z.number().nonnegative().default(0),
  notes: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().optional(),
  items: z
    .array(
      z.object({
        variationId: z.string().min(1),
        quantity: z.number().int().positive(),
        unitPriceOverride: z.number().positive().optional(),
      })
    )
    .min(1, "Selecione pelo menos um produto para vender"),
  payments: z
    .array(paymentSplitSchema)
    .min(1, "Informe pelo menos uma forma de pagamento"),
});

/**
 * 1. Criação de Solicitação de Pedido na Vitrine Digital (WhatsApp).
 * CRÍTICO: Não reduz o estoque físico! Apenas valida disponibilidade e cria o pedido
 * com status AGUARDANDO_ATENDIMENTO.
 */
export async function createWhatsAppOrderRequest(
  rawInput: z.infer<typeof createOrderRequestSchema>
) {
  const parsed = createOrderRequestSchema.parse(rawInput);
  const settings = await getStoreSettings();

  return await runInTransaction(async (tx) => {
    if (parsed.idempotencyKey) {
      const existing = await tx
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.idempotencyKey, parsed.idempotencyKey));
      if (existing.length > 0) {
        const ord = existing[0];
        const items = await tx
          .select()
          .from(schema.orderItems)
          .where(eq(schema.orderItems.orderId, ord.id));
        const wa = buildOrderWhatsAppLink(ord, items, settings);
        return {
          order: ord,
          items,
          whatsappUrl: wa.url,
          whatsappMessage: wa.message,
          idempotentReplay: true,
        };
      }
    }

    // Consolida itens repetidos da mesma variação
    const qtyByVar = new Map<string, number>();
    for (const item of parsed.items) {
      qtyByVar.set(
        item.variationId,
        (qtyByVar.get(item.variationId) || 0) + item.quantity
      );
    }

    const variationIds = Array.from(qtyByVar.keys());
    const rows = await tx
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
      .where(inArray(schema.productVariations.id, variationIds));

    if (rows.length !== variationIds.length) {
      throw new NotFoundError("Um ou mais produtos selecionados não foram encontrados.");
    }

    let subtotal = 0;
    const preparedItems: {
      productId: string;
      variationId: string;
      productNameSnapshot: string;
      skuSnapshot: string;
      variationLabelSnapshot: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[] = [];

    for (const { variation, product, balance } of rows) {
      const requestedQty = qtyByVar.get(variation.id) || 0;
      const availableQty = balance ? Number(balance.quantity) : 0;

      if (
        !variation.active ||
        product.status !== "ACTIVE" ||
        product.deletedAt !== null ||
        availableQty < requestedQty
      ) {
        throw new InsufficientStockError(
          `A combinação '${product.name} (${variation.color} / ${variation.size})' não possui quantidade suficiente disponível no momento.`
        );
      }

      const baseSale = variation.salePriceOverride ?? product.salePrice;
      const basePromo = variation.promoPriceOverride ?? product.promoPrice;
      const unitPrice = getEffectivePrice(baseSale, basePromo);
      const totalPrice = toMoney(unitPrice * requestedQty);
      subtotal = toMoney(subtotal + totalPrice);

      preparedItems.push({
        productId: product.id,
        variationId: variation.id,
        productNameSnapshot: product.name,
        skuSnapshot: variation.sku,
        variationLabelSnapshot: `${variation.color} / ${variation.size}`,
        quantity: requestedQty,
        unitPrice,
        totalPrice,
      });
    }

    // Registra ou localiza cliente
    const cleanPhone = parsed.customerPhone.trim();
    const existingCust = await tx
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.phone, cleanPhone));

    let customerId: string;
    if (existingCust.length > 0) {
      customerId = existingCust[0].id;
    } else {
      customerId = generateId("cus");
      await tx.insert(schema.customers).values({
        id: customerId,
        name: parsed.customerName.trim(),
        phone: cleanPhone,
      });
    }

    const orderId = generateId("ord");
    const orderCode = generateCommercialCode("PED");

    const insertedOrders = await tx
      .insert(schema.orders)
      .values({
        id: orderId,
        code: orderCode,
        customerId,
        customerName: parsed.customerName.trim(),
        customerPhone: cleanPhone,
        deliveryMethod: parsed.deliveryMethod,
        addressNotes: parsed.addressNotes || null,
        preferredPaymentMethod: parsed.preferredPaymentMethod,
        status: "AGUARDANDO_ATENDIMENTO",
        subtotal,
        discount: 0,
        total: subtotal,
        notes: parsed.notes || null,
        whatsappOpenedAt: new Date(),
        idempotencyKey: parsed.idempotencyKey || null,
      })
      .returning();

    const order = insertedOrders[0];
    const insertedItems: (typeof schema.orderItems.$inferSelect)[] = [];

    for (const item of preparedItems) {
      const rowsItem = await tx
        .insert(schema.orderItems)
        .values({
          id: generateId("oit"),
          orderId,
          ...item,
        })
        .returning();
      insertedItems.push(rowsItem[0]);
    }

    const wa = buildOrderWhatsAppLink(order, insertedItems, settings);

    return {
      order,
      items: insertedItems,
      whatsappUrl: wa.url,
      whatsappMessage: wa.message,
      idempotentReplay: false,
    };
  });
}

function buildOrderWhatsAppLink(
  order: typeof schema.orders.$inferSelect,
  items: (typeof schema.orderItems.$inferSelect)[],
  settings: { whatsappPhone?: string | null; whatsappShortLink?: string | null }
) {
  const deliveryText =
    order.deliveryMethod === "PICKUP"
      ? "Retirada na loja (Centro de Suzano)"
      : `Entrega (${order.addressNotes || "A combinar"})`;

  const lines = [
    `Olá, *Suzano Sports*! Gostaria de confirmar a solicitação de pedido *${order.code}*:`,
    "",
    "*Itens selecionados:*",
    ...items.map(
      (i) =>
        `• ${i.quantity}x ${i.productNameSnapshot} (${i.variationLabelSnapshot}) — ${formatBRL(
          i.totalPrice
        )} [SKU: ${i.skuSnapshot}]`
    ),
    "",
    `*Subtotal:* ${formatBRL(order.total)}`,
    `*Cliente:* ${order.customerName} (${order.customerPhone})`,
    `*Modalidade:* ${deliveryText}`,
    `*Pagamento de preferência:* ${order.preferredPaymentMethod || "A combinar"}`,
  ];

  if (order.notes) {
    lines.push(`*Observações:* ${order.notes}`);
  }

  const message = lines.join("\n");
  const { url } = buildWhatsAppUrl({
    whatsappPhone: settings.whatsappPhone,
    whatsappShortLink: settings.whatsappShortLink,
    message,
  });

  return { message, url };
}

/**
 * 2. Atualização de Status de Pedido (ex: EM_NEGOCIACAO, EM_SEPARACAO, PRONTO_PARA_RETIRADA, CANCELADO).
 */
export async function updateOrderStatus(
  actor: AuthenticatedUser,
  orderId: string,
  newStatus:
    | "AGUARDANDO_ATENDIMENTO"
    | "EM_NEGOCIACAO"
    | "CONFIRMADO"
    | "EM_SEPARACAO"
    | "PRONTO_PARA_RETIRADA"
    | "FINALIZADO"
    | "CANCELADO",
  internalNotes?: string
) {
  await requirePermission(actor, "orders", "edit");
  const db = await getDb();

  const existing = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));
  if (existing.length === 0) {
    throw new NotFoundError("Pedido não encontrado.");
  }

  const ord = existing[0];

  // Se o operador tentar cancelar um pedido que já teve venda confirmada, orienta ou estorna a venda vinculada
  if (newStatus === "CANCELADO" && ord.convertedSaleId) {
    await cancelOrReturnSale(actor, {
      saleId: ord.convertedSaleId,
      reason: internalNotes || `Cancelamento do pedido ${ord.code}`,
    });
  }

  const updated = await db
    .update(schema.orders)
    .set({
      status: newStatus,
      internalNotes:
        internalNotes !== undefined ? internalNotes : ord.internalNotes,
      updatedAt: new Date(),
    })
    .where(eq(schema.orders.id, orderId))
    .returning();

  await createAuditLog({
    userId: actor.id,
    action: `ORDER_STATUS_${newStatus}`,
    entityType: "ORDER",
    entityId: orderId,
    metadata: { code: ord.code, previousStatus: ord.status, newStatus },
  });

  return updated[0];
}

/**
 * 3. Confirmação de Pedido da Vitrine como Venda Efetiva.
 * Transação ACID:
 * - Previne contagem duplicada de vendas (verifica convertedSaleId e idempotencyKey)
 * - Baixa atomicamente o estoque de cada variação (WHERE quantity >= needed)
 * - Congela o custo unitário histórico (unitCostHistorical) no ato da venda
 * - Gera venda, itens da venda, pagamentos e contas a receber (se pendente)
 */
export async function confirmOrderAsSale(
  actor: AuthenticatedUser,
  input: {
    orderId: string;
    discount?: number;
    payments?: z.infer<typeof paymentSplitSchema>[];
    idempotencyKey?: string;
  }
) {
  await requirePermission(actor, "orders", "edit");

  return await runInTransaction(async (tx) => {
    const ordRows = await tx
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, input.orderId));

    if (ordRows.length === 0) {
      throw new NotFoundError("Solicitação de pedido não encontrada.");
    }
    const order = ordRows[0];

    // Idempotência: se o pedido já foi convertido em venda, retorna a venda existente sem duplicar!
    if (order.convertedSaleId) {
      const existingSale = await tx
        .select()
        .from(schema.sales)
        .where(eq(schema.sales.id, order.convertedSaleId));
      if (existingSale.length > 0) {
        return {
          sale: existingSale[0],
          idempotentReplay: true,
        };
      }
    }

    if (order.status === "CANCELADO") {
      throw new AppError("Não é possível confirmar venda de um pedido cancelado.");
    }

    const discount = toMoney(input.discount ?? order.discount ?? 0);
    if (discount > 0) {
      const canDiscount = await checkPermission(actor, "orders", "approveDiscount");
      if (!canDiscount) {
        throw new ForbiddenError(
          "Seu perfil não possui permissão para conceder descontos."
        );
      }
    }

    const ordItems = await tx
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id));

    if (ordItems.length === 0) {
      throw new AppError("O pedido não possui itens.");
    }

    const totalSale = toMoney(Math.max(0, order.subtotal - discount));
    const paymentList: z.infer<typeof paymentSplitSchema>[] =
      input.payments && input.payments.length > 0
        ? input.payments
        : [
            {
              method: (order.preferredPaymentMethod as
                | "PIX"
                | "CASH"
                | "DEBIT"
                | "CREDIT"
                | "OTHER") || "PIX",
              amount: totalSale,
              feeAmount: 0,
              installments: 1,
              status: "CONFIRMED",
            },
          ];

    const saleResult = await executeAtomicSaleCreation(tx, actor, {
      origin: "ORDER_WHATSAPP",
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      discount,
      surcharge: 0,
      notes: order.notes,
      idempotencyKey: input.idempotencyKey || `ord_sale_${order.id}`,
      items: ordItems.map((i) => ({
        variationId: i.variationId,
        quantity: i.quantity,
        unitPriceOverride: i.unitPrice,
      })),
      payments: paymentList,
    });

    await tx
      .update(schema.orders)
      .set({
        status: "CONFIRMADO",
        discount,
        total: totalSale,
        convertedSaleId: saleResult.sale.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, order.id));

    return saleResult;
  });
}

/**
 * 4. Frente de Caixa Simplificada (PDV — Vendas de Balcão).
 */
export async function createPosSale(
  actor: AuthenticatedUser,
  rawInput: z.infer<typeof createPosSaleSchema>
) {
  await requirePermission(actor, "pos", "create");
  const parsed = createPosSaleSchema.parse(rawInput);

  if (parsed.discount > 0 || parsed.items.some((item) => item.unitPriceOverride !== undefined)) {
    const canDiscount = await checkPermission(actor, "pos", "approveDiscount");
    if (!canDiscount) {
      throw new ForbiddenError(
        "Seu perfil não possui permissão para aplicar descontos ou alterar preços no PDV."
      );
    }
  }

  return await runInTransaction(async (tx) => {
    return await executeAtomicSaleCreation(tx, actor, {
      origin: "PDV",
      customerName: parsed.customerName || "Cliente Balcão",
      customerPhone: parsed.customerPhone || null,
      discount: parsed.discount,
      surcharge: parsed.surcharge,
      notes: parsed.notes || null,
      idempotencyKey: parsed.idempotencyKey,
      items: parsed.items,
      payments: parsed.payments,
    });
  });
}

/**
 * Núcleo transacional compartilhado entre confirmação de pedido WhatsApp e venda PDV.
 * Garante atomicidade de saldo, bloqueio contra estoque negativo concorrente e CMV histórico.
 */
async function executeAtomicSaleCreation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  actor: AuthenticatedUser,
  params: {
    origin: "PDV" | "ORDER_WHATSAPP";
    orderId?: string | null;
    customerId?: string | null;
    customerName: string;
    customerPhone?: string | null;
    discount: number;
    surcharge: number;
    notes?: string | null;
    idempotencyKey?: string;
    items: {
      variationId: string;
      quantity: number;
      unitPriceOverride?: number;
    }[];
    payments: z.infer<typeof paymentSplitSchema>[];
  }
) {
  if (params.idempotencyKey) {
    const existing = await tx
      .select()
      .from(schema.sales)
      .where(eq(schema.sales.idempotencyKey, params.idempotencyKey));
    if (existing.length > 0) {
      const items = await tx
        .select()
        .from(schema.saleItems)
        .where(eq(schema.saleItems.saleId, existing[0].id));
      const pays = await tx
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.saleId, existing[0].id));
      return {
        sale: existing[0],
        items,
        payments: pays,
        idempotentReplay: true,
      };
    }
  }

  // Agrupa quantidades caso a mesma variação tenha sido passada mais de uma vez
  const qtyByVariation = new Map<
    string,
    { quantity: number; unitPriceOverride?: number }
  >();
  for (const item of params.items) {
    const prev = qtyByVariation.get(item.variationId);
    qtyByVariation.set(item.variationId, {
      quantity: (prev?.quantity || 0) + item.quantity,
      unitPriceOverride: item.unitPriceOverride ?? prev?.unitPriceOverride,
    });
  }

  const saleId = generateId("sal");
  const saleCode = generateCommercialCode("VND");
  const affectedProductIds = new Set<string>();

  let subtotal = 0;
  let totalCostHistorical = 0;

  const preparedSaleItems: (typeof schema.saleItems.$inferInsert)[] = [];
  const preparedMovements: (typeof schema.stockMovements.$inferInsert)[] = [];

  for (const [variationId, reqItem] of qtyByVariation.entries()) {
    const neededQty = reqItem.quantity;

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
      .where(eq(schema.productVariations.id, variationId));

    if (varRows.length === 0) {
      throw new NotFoundError("Variação de produto não encontrada.");
    }

    const { variation, product, balance } = varRows[0];
    const previousBalance = balance ? Number(balance.quantity) : 0;

    if (previousBalance < neededQty) {
      throw new InsufficientStockError(
        `Estoque insuficiente para '${product.name} (${variation.color}/${variation.size})'. Saldo atual: ${previousBalance}, solicitado: ${neededQty}.`
      );
    }

    // Atualização atômica com cláusula condicional (WHERE quantity >= neededQty)
    const updatedBalances = await tx
      .update(schema.stockBalances)
      .set({
        quantity: sql`${schema.stockBalances.quantity} - ${neededQty}`,
        lastMovementAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        sql`${schema.stockBalances.variationId} = ${variation.id} AND ${schema.stockBalances.quantity} >= ${neededQty}`
      )
      .returning();

    if (updatedBalances.length === 0) {
      throw new InsufficientStockError(
        `Conflito de concorrência: o saldo de '${product.name} (${variation.color}/${variation.size})' foi consumido por outra operação.`
      );
    }

    const newBalance = Number(updatedBalances[0].quantity);

    const unitCostHistorical = toMoney(
      variation.costPriceOverride ?? product.costPrice
    );
    const defaultUnitPrice = getEffectivePrice(
      variation.salePriceOverride ?? product.salePrice,
      variation.promoPriceOverride ?? product.promoPrice
    );
    const unitPrice = toMoney(reqItem.unitPriceOverride ?? defaultUnitPrice);
    const lineTotal = toMoney(unitPrice * neededQty);
    const lineCost = toMoney(unitCostHistorical * neededQty);

    subtotal = toMoney(subtotal + lineTotal);
    totalCostHistorical = toMoney(totalCostHistorical + lineCost);
    affectedProductIds.add(product.id);

    preparedSaleItems.push({
      id: generateId("sit"),
      saleId,
      productId: product.id,
      variationId: variation.id,
      productNameSnapshot: product.name,
      skuSnapshot: variation.sku,
      variationLabelSnapshot: `${variation.color} / ${variation.size}`,
      quantity: neededQty,
      returnedQuantity: 0,
      unitCostHistorical,
      unitPrice,
      discount: 0,
      totalPrice: lineTotal,
    });

    preparedMovements.push({
      id: generateId("stm"),
      variationId: variation.id,
      productId: product.id,
      type: "SALE_EXIT",
      previousBalance,
      movedQuantity: -neededQty,
      newBalance,
      unitCost: unitCostHistorical,
      reason: `Saída por venda ${saleCode} (${params.origin})`,
      referenceType: "SALE",
      referenceId: saleId,
      userId: actor.id,
    });
  }

  const discount = toMoney(params.discount || 0);
  const surcharge = toMoney(params.surcharge || 0);
  if (discount > subtotal) {
    throw new AppError("O desconto não pode ser maior que o subtotal dos produtos.");
  }

  const total = toMoney(subtotal - discount + surcharge);
  const sumPayments = toMoney(
    params.payments.reduce((acc, p) => acc + Number(p.amount), 0)
  );

  if (Math.abs(sumPayments - total) > 0.02) {
    throw new AppError(
      `A soma dos pagamentos (${formatBRL(sumPayments)}) difere do total da venda (${formatBRL(total)}).`
    );
  }

  const totalFees = toMoney(
    params.payments.reduce((acc, p) => acc + Number(p.feeAmount || 0), 0)
  );
  const grossProfitHistorical = toMoney(total - totalFees - totalCostHistorical);

  // Verifica sessão de caixa aberta
  const openSessions = await tx
    .select()
    .from(schema.cashSessions)
    .where(eq(schema.cashSessions.status, "OPEN"))
    .limit(1);
  const cashSessionId = openSessions.length > 0 ? openSessions[0].id : null;

  const insertedSales = await tx
    .insert(schema.sales)
    .values({
      id: saleId,
      code: saleCode,
      orderId: params.orderId || null,
      customerId: params.customerId || null,
      customerName: params.customerName,
      customerPhone: params.customerPhone || null,
      cashSessionId,
      sellerUserId: actor.id,
      origin: params.origin,
      status: "CONFIRMED",
      subtotal,
      discount,
      surcharge,
      total,
      totalCostHistorical,
      grossProfitHistorical,
      notes: params.notes || null,
      idempotencyKey: params.idempotencyKey || null,
      confirmedAt: new Date(),
    })
    .returning();

  const sale = insertedSales[0];

  for (const sit of preparedSaleItems) {
    await tx.insert(schema.saleItems).values(sit);
  }

  for (const mov of preparedMovements) {
    await tx.insert(schema.stockMovements).values(mov);
  }

  const insertedPayments: (typeof schema.payments.$inferSelect)[] = [];
  for (const pay of params.payments) {
    const paymentId = generateId("pay");
    const amt = toMoney(pay.amount);
    const fee = toMoney(pay.feeAmount || 0);
    const net = toMoney(amt - fee);
    const isConfirmed = pay.status === "CONFIRMED";

    const pRows = await tx
      .insert(schema.payments)
      .values({
        id: paymentId,
        saleId,
        method: pay.method,
        amount: amt,
        feeAmount: fee,
        netAmount: net,
        installments: pay.installments || 1,
        status: pay.status || "CONFIRMED",
        paidAt: isConfirmed ? new Date() : null,
        reference: pay.reference || null,
      })
      .returning();
    insertedPayments.push(pRows[0]);

    // Se o pagamento ficou pendente (a receber), registra em Contas a Receber
    if (!isConfirmed) {
      await tx.insert(schema.accountsReceivable).values({
        id: generateId("ar"),
        saleId,
        paymentId,
        customerId: params.customerId || null,
        customerName: params.customerName,
        description: `Venda ${saleCode} (${pay.method})`,
        amount: amt,
        receivedAmount: 0,
        paymentMethod: pay.method,
        dueDate: pay.dueDate ? new Date(pay.dueDate) : new Date(),
        status: "PENDING",
      });
    }
  }

  // Sincroniza status de cada produto afetado (ex: se esgotou, muda para OUT_OF_STOCK)
  for (const prodId of affectedProductIds) {
    await syncProductAvailabilityStatus(tx, prodId);
  }

  await createAuditLog({
    userId: actor.id,
    action: `SALE_CONFIRMED_${params.origin}`,
    entityType: "SALE",
    entityId: saleId,
    metadata: {
      code: saleCode,
      total,
      totalCostHistorical,
      grossProfitHistorical,
    },
  });

  return {
    sale,
    items: preparedSaleItems,
    payments: insertedPayments,
    idempotentReplay: false,
  };
}

/**
 * 5. Cancelamento ou Devolução (Total ou Parcial) de Venda.
 * Restaura o estoque das unidades devolvidas, registra movimentação RETURN,
 * atualiza itens, pagamentos, contas a receber e lucro histórico da venda.
 */
export async function cancelOrReturnSale(
  actor: AuthenticatedUser,
  input: {
    saleId: string;
    reason: string;
    // Se omitido, cancela/devolve todos os itens restantes da venda
    returnItems?: { saleItemId: string; quantityToReturn: number }[];
  }
) {
  await requirePermission(actor, "pos", "edit");
  if (!input.reason || input.reason.trim().length < 3) {
    throw new AppError("Informe o motivo do cancelamento ou devolução.");
  }

  return await runInTransaction(async (tx) => {
    const saleRows = await tx
      .select()
      .from(schema.sales)
      .where(eq(schema.sales.id, input.saleId));

    if (saleRows.length === 0) {
      throw new NotFoundError("Venda não encontrada.");
    }
    const sale = saleRows[0];

    if (sale.status === "CANCELLED") {
      throw new AppError("Esta venda já se encontra totalmente cancelada.");
    }

    const allItems = await tx
      .select()
      .from(schema.saleItems)
      .where(eq(schema.saleItems.saleId, sale.id));

    const returnMap = new Map<string, number>();
    if (input.returnItems && input.returnItems.length > 0) {
      for (const ri of input.returnItems) {
        returnMap.set(ri.saleItemId, ri.quantityToReturn);
      }
    } else {
      for (const item of allItems) {
        const remaining = item.quantity - item.returnedQuantity;
        if (remaining > 0) {
          returnMap.set(item.id, remaining);
        }
      }
    }

    const affectedProductIds = new Set<string>();

    for (const item of allItems) {
      const qtyReturn = returnMap.get(item.id) || 0;
      if (qtyReturn <= 0) continue;

      const maxReturnable = item.quantity - item.returnedQuantity;
      if (qtyReturn > maxReturnable) {
        throw new AppError(
          `Quantidade de devolução (${qtyReturn}) excede a quantidade vendida restante (${maxReturnable}) para ${item.productNameSnapshot}.`
        );
      }

      // Atualiza saldo de estoque (+qtyReturn)
      const balRows = await tx
        .select()
        .from(schema.stockBalances)
        .where(eq(schema.stockBalances.variationId, item.variationId));
      const prevBal = balRows.length > 0 ? Number(balRows[0].quantity) : 0;

      const updatedBal = await tx
        .update(schema.stockBalances)
        .set({
          quantity: sql`${schema.stockBalances.quantity} + ${qtyReturn}`,
          lastMovementAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.stockBalances.variationId, item.variationId))
        .returning();

      const newBal = updatedBal.length > 0 ? Number(updatedBal[0].quantity) : prevBal + qtyReturn;

      await tx.insert(schema.stockMovements).values({
        id: generateId("stm"),
        variationId: item.variationId,
        productId: item.productId,
        type: "RETURN",
        previousBalance: prevBal,
        movedQuantity: qtyReturn,
        newBalance: newBal,
        unitCost: item.unitCostHistorical,
        reason: `Devolução/Estorno da venda ${sale.code}: ${input.reason.trim()}`,
        referenceType: "SALE",
        referenceId: sale.id,
        userId: actor.id,
      });

      await tx
        .update(schema.saleItems)
        .set({
          returnedQuantity: item.returnedQuantity + qtyReturn,
        })
        .where(eq(schema.saleItems.id, item.id));

      affectedProductIds.add(item.productId);
    }

    // Recalcula estado dos itens após devolução
    const updatedItems = await tx
      .select()
      .from(schema.saleItems)
      .where(eq(schema.saleItems.saleId, sale.id));

    const allReturned = updatedItems.every(
      (i) => i.returnedQuantity >= i.quantity
    );

    if (allReturned) {
      await tx
        .update(schema.sales)
        .set({
          status: "CANCELLED",
          cancelReason: input.reason.trim(),
          cancelledAt: new Date(),
          totalCostHistorical: 0,
          grossProfitHistorical: 0,
        })
        .where(eq(schema.sales.id, sale.id));

      await tx
        .update(schema.payments)
        .set({ status: "REFUNDED" })
        .where(eq(schema.payments.saleId, sale.id));

      await tx
        .update(schema.accountsReceivable)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(eq(schema.accountsReceivable.saleId, sale.id));

      if (sale.orderId) {
        await tx
          .update(schema.orders)
          .set({ status: "CANCELADO", updatedAt: new Date() })
          .where(eq(schema.orders.id, sale.orderId));
      }
    } else {
      // Devolução parcial: recalcula subtotal ativo, custo histórico ativo e lucro bruto
      let activeSubtotal = 0;
      let activeCost = 0;
      for (const i of updatedItems) {
        const activeQty = i.quantity - i.returnedQuantity;
        activeSubtotal = toMoney(activeSubtotal + activeQty * i.unitPrice);
        activeCost = toMoney(activeCost + activeQty * i.unitCostHistorical);
      }
      const newTotal = toMoney(Math.max(0, activeSubtotal - sale.discount + sale.surcharge));
      const newProfit = toMoney(newTotal - activeCost);

      await tx
        .update(schema.sales)
        .set({
          status: "PARTIALLY_REFUNDED",
          subtotal: activeSubtotal,
          total: newTotal,
          totalCostHistorical: activeCost,
          grossProfitHistorical: newProfit,
          cancelReason: input.reason.trim(),
        })
        .where(eq(schema.sales.id, sale.id));
    }

    for (const prodId of affectedProductIds) {
      await syncProductAvailabilityStatus(tx, prodId);
    }

    await createAuditLog({
      userId: actor.id,
      action: allReturned ? "SALE_CANCELLED" : "SALE_PARTIAL_RETURN",
      entityType: "SALE",
      entityId: sale.id,
      metadata: { code: sale.code, reason: input.reason },
    });

    const finalSale = await tx
      .select()
      .from(schema.sales)
      .where(eq(schema.sales.id, sale.id));

    return {
      sale: finalSale[0],
      allReturned,
    };
  });
}

/**
 * Listagem enriquecida de pedidos WhatsApp para o Painel Administrativo.
 */
export async function listOrdersAdmin(actor: AuthenticatedUser, statusFilter?: string) {
  await requirePermission(actor, "orders", "view");
  const db = await getDb();
  const settings = await getStoreSettings();

  const ordersRows = await db
    .select()
    .from(schema.orders)
    .orderBy(desc(schema.orders.createdAt));

  const filtered =
    statusFilter && statusFilter !== "ALL"
      ? ordersRows.filter((o) => o.status === statusFilter)
      : ordersRows;

  if (filtered.length === 0) return [];

  const orderIds = filtered.map((o) => o.id);
  const allItems = await db
    .select()
    .from(schema.orderItems)
    .where(inArray(schema.orderItems.orderId, orderIds));

  return filtered.map((o) => {
    const items = allItems.filter((i) => i.orderId === o.id);
    const wa = buildOrderWhatsAppLink(o, items, settings);
    return {
      ...o,
      items,
      whatsappUrl: wa.url,
    };
  });
}

/**
 * Listagem enriquecida de vendas confirmadas (PDV + WhatsApp).
 */
export async function listSalesAdmin(actor: AuthenticatedUser, limit = 100) {
  await requirePermission(actor, "pos", "view");
  const db = await getDb();

  const salesRows = await db
    .select({
      sale: schema.sales,
      sellerName: schema.users.name,
    })
    .from(schema.sales)
    .leftJoin(schema.users, eq(schema.sales.sellerUserId, schema.users.id))
    .orderBy(desc(schema.sales.confirmedAt))
    .limit(limit);

  if (salesRows.length === 0) return [];

  const saleIds = salesRows.map((s) => s.sale.id);
  const [itemsRows, paymentsRows] = await Promise.all([
    db
      .select()
      .from(schema.saleItems)
      .where(inArray(schema.saleItems.saleId, saleIds)),
    db
      .select()
      .from(schema.payments)
      .where(inArray(schema.payments.saleId, saleIds)),
  ]);

  return salesRows.map(({ sale, sellerName }) => ({
    ...sale,
    sellerName: sellerName || "Operador",
    items: itemsRows.filter((i) => i.saleId === sale.id),
    payments: paymentsRows.filter((p) => p.saleId === sale.id),
  }));
}
