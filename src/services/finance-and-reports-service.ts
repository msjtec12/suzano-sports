import { eq, and, desc, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, runInTransaction } from "../db";
import * as schema from "../db/schema";
import {
  requirePermission,
  createAuditLog,
  type AuthenticatedUser,
} from "./auth-service";
import { AppError, NotFoundError } from "../lib/errors";
import { generateId } from "../lib/crypto";
import { toMoney, EXPENSE_CATEGORIES } from "../lib/utils";
export { EXPENSE_CATEGORIES };

export const createExpenseSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(2, "Informe a descrição da despesa").max(220),
  category: z.enum([
    "ALUGUEL",
    "AGUA",
    "ENERGIA",
    "INTERNET",
    "FUNCIONARIOS",
    "FORNECEDORES",
    "MARKETING",
    "TRANSPORTE",
    "OUTRAS",
  ]),
  amount: z.number().positive("O valor da despesa deve ser maior que zero"),
  competenceDate: z.string().min(1),
  dueDate: z.string().min(1),
  paidAt: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]).default("PENDING"),
  isRecurring: z.boolean().default(false),
  recurrenceGroup: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

function getDefaultMonthRange(filter?: DateRangeFilter) {
  const now = new Date();
  const startDate =
    filter?.startDate || new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endDate =
    filter?.endDate ||
    new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}

/**
 * 1. Criação ou edição de Despesa Operacional com proteção contra duplicidade de recorrentes.
 */
export async function saveExpense(
  actor: AuthenticatedUser,
  rawInput: z.infer<typeof createExpenseSchema>
) {
  await requirePermission(actor, "finance", rawInput.id ? "edit" : "create");
  const parsed = createExpenseSchema.parse(rawInput);

  const compDate = new Date(parsed.competenceDate);
  const dueDate = new Date(parsed.dueDate);
  const paidAt =
    parsed.status === "PAID"
      ? parsed.paidAt
        ? new Date(parsed.paidAt)
        : new Date()
      : null;

  const monthRef = `${compDate.getUTCFullYear()}-${String(
    compDate.getUTCMonth() + 1
  ).padStart(2, "0")}`;

  const recGroup = parsed.isRecurring
    ? parsed.recurrenceGroup ||
      `rec_${parsed.category.toLowerCase()}_${ parsed.description
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20) }`
    : null;

  return await runInTransaction(async (tx) => {
    if (parsed.id) {
      const updated = await tx
        .update(schema.expenses)
        .set({
          description: parsed.description.trim(),
          category: parsed.category,
          amount: toMoney(parsed.amount),
          competenceDate: compDate,
          dueDate,
          paidAt,
          paymentMethod: parsed.paymentMethod || null,
          status: parsed.status,
          isRecurring: parsed.isRecurring,
          recurrenceGroup: recGroup,
          recurrenceMonthRef: recGroup ? monthRef : null,
          notes: parsed.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.expenses.id, parsed.id))
        .returning();

      return { expense: updated[0], idempotentReplay: false };
    }

    // Se for despesa recorrente, verifica se já foi lançada ou paga na competência (monthRef)
    if (recGroup) {
      const existingRec = await tx
        .select()
        .from(schema.expenses)
        .where(
          and(
            eq(schema.expenses.recurrenceGroup, recGroup),
            eq(schema.expenses.recurrenceMonthRef, monthRef)
          )
        );
      if (existingRec.length > 0) {
        return {
          expense: existingRec[0],
          idempotentReplay: true,
        };
      }
    }

    const newId = generateId("exp");
    const inserted = await tx
      .insert(schema.expenses)
      .values({
        id: newId,
        description: parsed.description.trim(),
        category: parsed.category,
        amount: toMoney(parsed.amount),
        competenceDate: compDate,
        dueDate,
        paidAt,
        paymentMethod: parsed.paymentMethod || null,
        status: parsed.status,
        isRecurring: parsed.isRecurring,
        recurrenceGroup: recGroup,
        recurrenceMonthRef: recGroup ? monthRef : null,
        notes: parsed.notes || null,
        createdByUserId: actor.id,
      })
      .returning();

    await createAuditLog({
      userId: actor.id,
      action: "EXPENSE_CREATED",
      entityType: "EXPENSE",
      entityId: newId,
      metadata: {
        description: parsed.description,
        category: parsed.category,
        amount: parsed.amount,
      },
    });

    return { expense: inserted[0], idempotentReplay: false };
  });
}

/**
 * 2. Baixa de Conta a Receber (Recebimento total ou parcial).
 */
export async function receiveAccountReceivable(
  actor: AuthenticatedUser,
  input: {
    receivableId: string;
    amountReceived: number;
    paymentMethod?: string;
  }
) {
  await requirePermission(actor, "finance", "edit");
  if (input.amountReceived <= 0) {
    throw new AppError("O valor recebido deve ser maior que zero.");
  }

  return await runInTransaction(async (tx) => {
    const rows = await tx
      .select()
      .from(schema.accountsReceivable)
      .where(eq(schema.accountsReceivable.id, input.receivableId));

    if (rows.length === 0) {
      throw new NotFoundError("Conta a receber não encontrada.");
    }
    const ar = rows[0];
    if (ar.status === "RECEIVED" || ar.status === "CANCELLED") {
      return { receivable: ar, alreadySettled: true };
    }

    const nextReceived = toMoney(ar.receivedAmount + input.amountReceived);
    const isFullyReceived = nextReceived >= ar.amount - 0.01;
    const finalReceived = isFullyReceived ? ar.amount : nextReceived;
    const nextStatus = isFullyReceived ? "RECEIVED" : "PARTIAL";

    const updated = await tx
      .update(schema.accountsReceivable)
      .set({
        receivedAmount: finalReceived,
        status: nextStatus,
        paymentMethod: input.paymentMethod || ar.paymentMethod,
        receivedAt: isFullyReceived ? new Date() : ar.receivedAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.accountsReceivable.id, ar.id))
      .returning();

    if (isFullyReceived && ar.paymentId) {
      await tx
        .update(schema.payments)
        .set({
          status: "CONFIRMED",
          paidAt: new Date(),
        })
        .where(eq(schema.payments.id, ar.paymentId));
    }

    await createAuditLog({
      userId: actor.id,
      action: "RECEIVABLE_SETTLED",
      entityType: "ACCOUNTS_RECEIVABLE",
      entityId: ar.id,
      metadata: { amountReceived: input.amountReceived, status: nextStatus },
    });

    return { receivable: updated[0], alreadySettled: false };
  });
}

/**
 * 3. Cálculo Completo de Indicadores Financeiros e DRE Gerencial.
 * Separa rigorosamente:
 * - Solicitações de pedido no WhatsApp (não entram como receita)
 * - Receita líquida de vendas confirmadas
 * - Valores efetivamente recebidos vs Contas a Receber
 * - Custo das Mercadorias Vendidas (CMV histórico congelado no item da venda)
 * - Margem de Contribuição (Receita Líquida - Taxas de Pagamento - CMV)
 * - Lucro Bruto (Receita Líquida - CMV)
 * - Resultado Operacional Gerencial (Lucro Bruto - Taxas - Despesas Operacionais da competência)
 * - Compras de mercadorias (Contas a Pagar de entrada de estoque, que não se confundem com CMV)
 */
export async function getFinancialOverview(
  actor: AuthenticatedUser,
  filter?: DateRangeFilter
) {
  await requirePermission(actor, "finance", "view");
  const db = await getDb();
  const { startDate, endDate } = getDefaultMonthRange(filter);

  const [
    allSales,
    allSaleItems,
    allPayments,
    allExpenses,
    allReceivables,
    allPayables,
  ] = await Promise.all([
    db.select().from(schema.sales).orderBy(desc(schema.sales.confirmedAt)),
    db.select().from(schema.saleItems),
    db.select().from(schema.payments),
    db.select().from(schema.expenses).orderBy(desc(schema.expenses.dueDate)),
    db
      .select()
      .from(schema.accountsReceivable)
      .orderBy(desc(schema.accountsReceivable.dueDate)),
    db
      .select()
      .from(schema.accountsPayable)
      .orderBy(desc(schema.accountsPayable.dueDate)),
  ]);

  // Filtra vendas ativas (CONFIRMED ou PARTIALLY_REFUNDED) dentro do período
  const activeSalesInPeriod = allSales.filter((s) => {
    if (s.status === "CANCELLED") return false;
    const d = new Date(s.confirmedAt);
    return d >= startDate && d <= endDate;
  });

  const saleIdsInPeriod = new Set(activeSalesInPeriod.map((s) => s.id));
  const itemsInPeriod = allSaleItems.filter((i) => saleIdsInPeriod.has(i.saleId));
  const paymentsInPeriod = allPayments.filter(
    (p) => saleIdsInPeriod.has(p.saleId) && p.status !== "CANCELLED" && p.status !== "REFUNDED"
  );

  // Receita Bruta, Descontos e Receita Líquida
  let grossRevenue = 0;
  let totalDiscounts = 0;
  let netSalesRevenue = 0;

  for (const s of activeSalesInPeriod) {
    grossRevenue = toMoney(grossRevenue + Number(s.subtotal));
    totalDiscounts = toMoney(totalDiscounts + Number(s.discount));
    netSalesRevenue = toMoney(netSalesRevenue + Number(s.total));
  }

  // CMV Histórico (calculado exclusivamente sobre unidades efetivamente vendidas e não devolvidas)
  let cmvHistorical = 0;
  for (const item of itemsInPeriod) {
    const netSoldQty = Math.max(0, item.quantity - item.returnedQuantity);
    cmvHistorical = toMoney(cmvHistorical + netSoldQty * item.unitCostHistorical);
  }

  // Pagamentos confirmados e taxas
  let confirmedReceiptsGross = 0;
  let paymentFeesTotal = 0;
  let confirmedReceiptsNet = 0;
  const byPaymentMethodMap = new Map<
    string,
    { method: string; count: number; amount: number; netAmount: number }
  >();

  for (const p of paymentsInPeriod) {
    const methodEntry = byPaymentMethodMap.get(p.method) || {
      method: p.method,
      count: 0,
      amount: 0,
      netAmount: 0,
    };
    methodEntry.count += 1;
    methodEntry.amount = toMoney(methodEntry.amount + Number(p.amount));
    methodEntry.netAmount = toMoney(methodEntry.netAmount + Number(p.netAmount));
    byPaymentMethodMap.set(p.method, methodEntry);

    if (p.status === "CONFIRMED") {
      confirmedReceiptsGross = toMoney(confirmedReceiptsGross + Number(p.amount));
      paymentFeesTotal = toMoney(paymentFeesTotal + Number(p.feeAmount));
      confirmedReceiptsNet = toMoney(confirmedReceiptsNet + Number(p.netAmount));
    }
  }

  // Despesas operacionais na competência do período
  const expensesInPeriod = allExpenses.filter((e) => {
    if (e.status === "CANCELLED") return false;
    const d = new Date(e.competenceDate);
    return d >= startDate && d <= endDate;
  });

  let operationalExpensesTotal = 0;
  let paidExpensesTotal = 0;
  let pendingExpensesTotal = 0;

  for (const e of expensesInPeriod) {
    operationalExpensesTotal = toMoney(operationalExpensesTotal + Number(e.amount));
    if (e.status === "PAID") {
      paidExpensesTotal = toMoney(paidExpensesTotal + Number(e.amount));
    } else if (e.status === "PENDING") {
      pendingExpensesTotal = toMoney(pendingExpensesTotal + Number(e.amount));
    }
  }

  // Contas a receber pendentes (total em aberto)
  const pendingReceivablesTotal = toMoney(
    allReceivables
      .filter((r) => r.status === "PENDING" || r.status === "PARTIAL")
      .reduce((acc, r) => acc + Math.max(0, r.amount - r.receivedAmount), 0)
  );

  // Compras de mercadorias (Contas a Pagar de estoque — separado do CMV!)
  const inventoryPurchasesTotal = toMoney(
    allPayables
      .filter((ap) => ap.status !== "CANCELLED")
      .reduce((acc, ap) => acc + Number(ap.amount), 0)
  );

  // Indicadores de Lucro (Seção 17 do Prompt Master)
  // 1. Lucro Bruto (Margem Bruta) = Receita Líquida de Vendas - CMV Histórico
  const grossProfit = toMoney(netSalesRevenue - cmvHistorical);
  const grossMarginPercent =
    netSalesRevenue > 0 ? toMoney((grossProfit / netSalesRevenue) * 100) : 0;

  // 2. Margem de Contribuição = Lucro Bruto - Taxas variáveis de pagamento
  const contributionMargin = toMoney(grossProfit - paymentFeesTotal);

  // 3. Resultado Operacional Gerencial = Margem de Contribuição - Despesas Operacionais
  const operationalResult = toMoney(contributionMargin - operationalExpensesTotal);

  // 4. Fluxo de Caixa Líquido Realizado = Recebimentos Líquidos Confirmados - Despesas Pagas
  const cashFlowBalance = toMoney(confirmedReceiptsNet - paidExpensesTotal);

  const salesCount = activeSalesInPeriod.length;
  const averageTicket = salesCount > 0 ? toMoney(netSalesRevenue / salesCount) : 0;

  return {
    period: { startDate, endDate },
    metrics: {
      grossRevenue,
      totalDiscounts,
      netSalesRevenue,
      confirmedReceiptsGross,
      confirmedReceiptsNet,
      paymentFeesTotal,
      pendingReceivablesTotal,
      cmvHistorical,
      grossProfit,
      grossMarginPercent,
      contributionMargin,
      operationalExpensesTotal,
      paidExpensesTotal,
      pendingExpensesTotal,
      operationalResult,
      cashFlowBalance,
      inventoryPurchasesTotal,
      salesCount,
      averageTicket,
    },
    salesByPaymentMethod: Array.from(byPaymentMethodMap.values()),
    expenses: allExpenses,
    receivables: allReceivables,
    payables: allPayables,
  };
}

/**
 * 4. Dashboard Inicial (/admin) com separação clara entre vendas realizadas,
 * valores recebidos e solicitações de pedido no WhatsApp, além de gráficos e alertas.
 */
export async function getAdminDashboardData(
  actor: AuthenticatedUser,
  filter?: DateRangeFilter
) {
  await requirePermission(actor, "dashboard", "view");
  const db = await getDb();
  const { startDate, endDate } = getDefaultMonthRange(filter);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const [
    allSales,
    allSaleItems,
    allPayments,
    allOrders,
    allExpenses,
    allProducts,
    allCategories,
    allVariations,
    allBalances,
  ] = await Promise.all([
    db.select().from(schema.sales),
    db.select().from(schema.saleItems),
    db.select().from(schema.payments),
    db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)),
    db.select().from(schema.expenses),
    db.select().from(schema.products).where(isNull(schema.products.deletedAt)),
    db.select().from(schema.categories),
    db.select().from(schema.productVariations),
    db.select().from(schema.stockBalances),
  ]);

  const activeSalesToday = allSales.filter(
    (s) => s.status !== "CANCELLED" && new Date(s.confirmedAt) >= todayStart
  );
  const todaySalesTotal = toMoney(
    activeSalesToday.reduce((acc, s) => acc + Number(s.total), 0)
  );

  const activeSalesMonth = allSales.filter((s) => {
    if (s.status === "CANCELLED") return false;
    const d = new Date(s.confirmedAt);
    return d >= startDate && d <= endDate;
  });

  const monthSaleIds = new Set(activeSalesMonth.map((s) => s.id));
  const monthRevenue = toMoney(
    activeSalesMonth.reduce((acc, s) => acc + Number(s.total), 0)
  );

  const monthConfirmedReceipts = toMoney(
    allPayments
      .filter((p) => monthSaleIds.has(p.saleId) && p.status === "CONFIRMED")
      .reduce((acc, p) => acc + Number(p.netAmount), 0)
  );

  const monthCmv = toMoney(
    allSaleItems
      .filter((i) => monthSaleIds.has(i.saleId))
      .reduce(
        (acc, i) =>
          acc + Math.max(0, i.quantity - i.returnedQuantity) * i.unitCostHistorical,
        0
      )
  );

  const monthExpenses = toMoney(
    allExpenses
      .filter((e) => {
        if (e.status === "CANCELLED") return false;
        const d = new Date(e.competenceDate);
        return d >= startDate && d <= endDate;
      })
      .reduce((acc, e) => acc + Number(e.amount), 0)
  );

  const grossProfit = toMoney(monthRevenue - monthCmv);
  const operationalResult = toMoney(grossProfit - monthExpenses);

  // Pedidos aguardando atendimento (separados das vendas!)
  const pendingOrders = allOrders.filter(
    (o) => o.status === "AGUARDANDO_ATENDIMENTO" || o.status === "EM_NEGOCIACAO"
  );

  // Estoque baixo e esgotado
  const balByVar = new Map(allBalances.map((b) => [b.variationId, b]));
  const prodStockMap = new Map<string, number>();
  for (const v of allVariations) {
    if (!v.active) continue;
    const qty = Number(balByVar.get(v.id)?.quantity || 0);
    prodStockMap.set(v.productId, (prodStockMap.get(v.productId) || 0) + qty);
  }

  let lowStockProductsCount = 0;
  let outOfStockProductsCount = 0;
  const lowStockAlerts: { id: string; name: string; sku: string; stock: number; minStock: number }[] = [];

  for (const p of allProducts) {
    if (p.status === "INACTIVE" || p.status === "DRAFT") continue;
    const totalQty = prodStockMap.get(p.id) || 0;
    if (totalQty <= 0) {
      outOfStockProductsCount += 1;
      lowStockAlerts.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: 0,
        minStock: p.minStock,
      });
    } else if (totalQty <= p.minStock) {
      lowStockProductsCount += 1;
      lowStockAlerts.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: totalQty,
        minStock: p.minStock,
      });
    }
  }

  // Evolução diária (últimos 7 dias) e distribuição por categoria
  const catMap = new Map(allCategories.map((c) => [c.id, c.name]));
  const prodMap = new Map(allProducts.map((p) => [p.id, p]));

  const salesByCategoryMap = new Map<string, { category: string; revenue: number; units: number }>();
  const topProductsMap = new Map<
    string,
    { productId: string; name: string; units: number; revenue: number }
  >();

  for (const item of allSaleItems) {
    if (!monthSaleIds.has(item.saleId)) continue;
    const netQty = Math.max(0, item.quantity - item.returnedQuantity);
    if (netQty <= 0) continue;
    const lineRev = toMoney(netQty * item.unitPrice);

    const prod = prodMap.get(item.productId);
    const catName = prod ? catMap.get(prod.categoryId) || "Geral" : "Geral";

    const cEntry = salesByCategoryMap.get(catName) || {
      category: catName,
      revenue: 0,
      units: 0,
    };
    cEntry.revenue = toMoney(cEntry.revenue + lineRev);
    cEntry.units += netQty;
    salesByCategoryMap.set(catName, cEntry);

    const pEntry = topProductsMap.get(item.productId) || {
      productId: item.productId,
      name: item.productNameSnapshot,
      units: 0,
      revenue: 0,
    };
    pEntry.units += netQty;
    pEntry.revenue = toMoney(pEntry.revenue + lineRev);
    topProductsMap.set(item.productId, pEntry);
  }

  const dailySeries: { date: string; label: string; total: number; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const isoDay = d.toISOString().slice(0, 10);
    const label = `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}`;

    const daySales = allSales.filter(
      (s) =>
        s.status !== "CANCELLED" &&
        new Date(s.confirmedAt).toISOString().slice(0, 10) === isoDay
    );
    dailySeries.push({
      date: isoDay,
      label,
      total: toMoney(daySales.reduce((acc, s) => acc + Number(s.total), 0)),
      count: daySales.length,
    });
  }

  return {
    kpis: {
      todaySalesTotal,
      todaySalesCount: activeSalesToday.length,
      monthRevenue,
      monthSalesCount: activeSalesMonth.length,
      monthConfirmedReceipts,
      pendingOrdersCount: pendingOrders.length,
      lowStockProductsCount,
      outOfStockProductsCount,
      monthExpenses,
      monthCmv,
      grossProfit,
      operationalResult,
    },
    dailySeries,
    salesByCategory: Array.from(salesByCategoryMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    ),
    topProducts: Array.from(topProductsMap.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 5),
    lowStockAlerts: lowStockAlerts.slice(0, 10),
    recentPendingOrders: pendingOrders.slice(0, 8),
  };
}

export type ReportType =
  | "DAILY_SALES"
  | "SALES_BY_PRODUCT"
  | "SALES_BY_CATEGORY"
  | "CURRENT_STOCK"
  | "LOW_STOCK"
  | "STOCK_VALUATION"
  | "MONTHLY_REVENUE_EXPENSES"
  | "CASH_FLOW"
  | "MANAGERIAL_RESULT"
  | "PENDING_RECEIVABLES";

/**
 * 5. Gerador de Relatórios Gerenciais com exportação estruturada (JSON + CSV).
 */
export async function generateReport(
  actor: AuthenticatedUser,
  reportType: ReportType,
  filter?: DateRangeFilter
): Promise<{
  title: string;
  generatedAt: string;
  headers: string[];
  rows: (string | number)[][];
  csv: string;
}> {
  await requirePermission(actor, "reports", "view");
  const db = await getDb();
  const { startDate, endDate } = getDefaultMonthRange(filter);

  const [
    salesRows,
    saleItemsRows,
    productsRows,
    categoriesRows,
    variationsRows,
    balancesRows,
    expensesRows,
    receivablesRows,
  ] = await Promise.all([
    db.select().from(schema.sales).orderBy(desc(schema.sales.confirmedAt)),
    db.select().from(schema.saleItems),
    db.select().from(schema.products).where(isNull(schema.products.deletedAt)),
    db.select().from(schema.categories),
    db.select().from(schema.productVariations),
    db.select().from(schema.stockBalances),
    db.select().from(schema.expenses),
    db.select().from(schema.accountsReceivable),
  ]);

  let title = "Relatório Gerencial — Suzano Sports";
  let headers: string[] = [];
  let rows: (string | number)[][] = [];

  const activeSales = salesRows.filter((s) => {
    if (s.status === "CANCELLED") return false;
    const d = new Date(s.confirmedAt);
    return d >= startDate && d <= endDate;
  });
  const activeSaleIds = new Set(activeSales.map((s) => s.id));

  if (reportType === "DAILY_SALES") {
    title = "Relatório Diário de Vendas Confirmadas";
    headers = ["Código", "Data/Hora", "Origem", "Cliente", "Subtotal (R$)", "Desconto (R$)", "Total (R$)", "CMV Histórico (R$)", "Lucro Bruto (R$)"];
    rows = activeSales.map((s) => [
      s.code,
      new Date(s.confirmedAt).toLocaleString("pt-BR"),
      s.origin === "PDV" ? "Balcão (PDV)" : "WhatsApp",
      s.customerName || "Cliente Balcão",
      toMoney(s.subtotal),
      toMoney(s.discount),
      toMoney(s.total),
      toMoney(s.totalCostHistorical),
      toMoney(s.grossProfitHistorical),
    ]);
  } else if (reportType === "SALES_BY_PRODUCT") {
    title = "Relatório de Vendas por Produto";
    headers = ["SKU", "Produto", "Variação", "Qtd. Líquida Vendida", "Receita Total (R$)", "CMV Histórico (R$)", "Margem Bruta (R$)"];
    const map = new Map<
      string,
      { sku: string; name: string; variation: string; qty: number; rev: number; cost: number }
    >();
    for (const i of saleItemsRows) {
      if (!activeSaleIds.has(i.saleId)) continue;
      const netQty = Math.max(0, i.quantity - i.returnedQuantity);
      if (netQty <= 0) continue;
      const prev = map.get(i.variationId) || {
        sku: i.skuSnapshot,
        name: i.productNameSnapshot,
        variation: i.variationLabelSnapshot,
        qty: 0,
        rev: 0,
        cost: 0,
      };
      prev.qty += netQty;
      prev.rev = toMoney(prev.rev + netQty * i.unitPrice);
      prev.cost = toMoney(prev.cost + netQty * i.unitCostHistorical);
      map.set(i.variationId, prev);
    }
    rows = Array.from(map.values()).map((r) => [
      r.sku,
      r.name,
      r.variation,
      r.qty,
      r.rev,
      r.cost,
      toMoney(r.rev - r.cost),
    ]);
  } else if (reportType === "SALES_BY_CATEGORY") {
    title = "Relatório de Vendas por Categoria";
    headers = ["Categoria", "Unidades Vendidas", "Receita (R$)", "CMV (R$)", "Lucro Bruto (R$)"];
    const prodMap = new Map(productsRows.map((p) => [p.id, p]));
    const catMap = new Map(categoriesRows.map((c) => [c.id, c.name]));
    const map = new Map<string, { cat: string; qty: number; rev: number; cost: number }>();

    for (const i of saleItemsRows) {
      if (!activeSaleIds.has(i.saleId)) continue;
      const netQty = Math.max(0, i.quantity - i.returnedQuantity);
      if (netQty <= 0) continue;
      const prod = prodMap.get(i.productId);
      const catName = prod ? catMap.get(prod.categoryId) || "Geral" : "Geral";
      const prev = map.get(catName) || { cat: catName, qty: 0, rev: 0, cost: 0 };
      prev.qty += netQty;
      prev.rev = toMoney(prev.rev + netQty * i.unitPrice);
      prev.cost = toMoney(prev.cost + netQty * i.unitCostHistorical);
      map.set(catName, prev);
    }
    rows = Array.from(map.values()).map((r) => [
      r.cat,
      r.qty,
      r.rev,
      r.cost,
      toMoney(r.rev - r.cost),
    ]);
  } else if (
    reportType === "CURRENT_STOCK" ||
    reportType === "LOW_STOCK" ||
    reportType === "STOCK_VALUATION"
  ) {
    title =
      reportType === "LOW_STOCK"
        ? "Relatório de Estoque Abaixo do Mínimo / Esgotado"
        : "Relatório de Posição e Valor de Estoque";
    headers = [
      "SKU",
      "Produto",
      "Cor / Tamanho",
      "Saldo Atual",
      "Estoque Mínimo",
      "Custo Unit. (R$)",
      "Valor Total a Custo (R$)",
      "Status",
    ];
    const prodMap = new Map(productsRows.map((p) => [p.id, p]));
    const balMap = new Map(balancesRows.map((b) => [b.variationId, b]));

    for (const v of variationsRows) {
      const p = prodMap.get(v.productId);
      if (!p) continue;
      const bal = balMap.get(v.id);
      const qty = bal ? Number(bal.quantity) : 0;
      const min = bal ? Number(bal.minStock) : v.minStock;
      if (reportType === "LOW_STOCK" && qty > min) continue;

      const uCost = toMoney(v.costPriceOverride ?? p.costPrice);
      rows.push([
        v.sku,
        p.name,
        `${v.color} / ${v.size}`,
        qty,
        min,
        uCost,
        toMoney(qty * uCost),
        qty <= 0 ? "ESGOTADO" : qty <= min ? "REPOR ESTOQUE" : "NORMAL",
      ]);
    }
  } else if (reportType === "PENDING_RECEIVABLES") {
    title = "Relatório de Recebimentos Pendentes (Contas a Receber)";
    headers = ["Cliente", "Descrição", "Forma Pagto", "Vencimento", "Valor Total (R$)", "Recebido (R$)", "Saldo Pendente (R$)", "Status"];
    rows = receivablesRows
      .filter((r) => r.status === "PENDING" || r.status === "PARTIAL")
      .map((r) => [
        r.customerName,
        r.description,
        r.paymentMethod,
        new Date(r.dueDate).toLocaleDateString("pt-BR"),
        toMoney(r.amount),
        toMoney(r.receivedAmount),
        toMoney(Math.max(0, r.amount - r.receivedAmount)),
        r.status,
      ]);
  } else {
    // MONTHLY_REVENUE_EXPENSES | CASH_FLOW | MANAGERIAL_RESULT
    const fin = await getFinancialOverview(actor, filter);
    title = "Demonstrativo de Resultado Gerencial e Fluxo de Caixa";
    headers = ["Indicador Financeiro", "Valor (R$)"];
    rows = [
      ["Receita Bruta de Vendas", fin.metrics.grossRevenue],
      ["(-) Descontos Concedidos", fin.metrics.totalDiscounts],
      ["(=) Receita Líquida de Vendas", fin.metrics.netSalesRevenue],
      ["(-) Custo das Mercadorias Vendidas (CMV Histórico)", fin.metrics.cmvHistorical],
      ["(=) Lucro Bruto (Margem Bruta)", fin.metrics.grossProfit],
      ["(-) Taxas de Meios de Pagamento", fin.metrics.paymentFeesTotal],
      ["(=) Margem de Contribuição", fin.metrics.contributionMargin],
      ["(-) Despesas Operacionais da Competência", fin.metrics.operationalExpensesTotal],
      ["(=) Resultado Operacional Gerencial", fin.metrics.operationalResult],
      ["Recebimentos Líquidos Confirmados no Caixa", fin.metrics.confirmedReceiptsNet],
      ["Despesas Efetivamente Pagas no Período", fin.metrics.paidExpensesTotal],
      ["Saldo de Fluxo de Caixa Realizado", fin.metrics.cashFlowBalance],
      ["Contas a Receber em Aberto", fin.metrics.pendingReceivablesTotal],
    ];
  }

  const escapeCsvCell = (val: string | number) => {
    const str = String(val ?? "");
    if (str.includes(";") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCsvCell).join(";"),
    ...rows.map((r) => r.map(escapeCsvCell).join(";")),
  ];

  return {
    title,
    generatedAt: new Date().toISOString(),
    headers,
    rows,
    csv: "\uFEFF" + csvLines.join("\n"),
  };
}
