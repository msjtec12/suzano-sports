import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "path";
import fs from "fs";
import {
  getDb,
  closeAndResetDbConnection,
} from "../db";
import {
  authenticateUser,
  verifySessionToken,
  resetIpRateLimit,
  type AuthenticatedUser,
} from "../services/auth-service";
import {
  createProductComplete,
  createProductQuick,
  updateProduct,
  setProductStatus,
  getProductBySlugOrId,
  getCatalogProducts,
} from "../services/product-service";
import {
  recordStockMovement,
  applyPhysicalInventoryCount,
  getStockOverview,
} from "../services/stock-service";
import {
  createWhatsAppOrderRequest,
  confirmOrderAsSale,
  createPosSale,
  cancelOrReturnSale,
} from "../services/order-and-pos-service";
import {
  saveExpense,
  getFinancialOverview,
  generateReport,
} from "../services/finance-and-reports-service";
import { InsufficientStockError, ForbiddenError, UnauthorizedError } from "../lib/errors";

const TEST_DB_DIR = path.join(
  process.cwd(),
  ".data",
  `test-pg-${Date.now()}`
);

describe("Suzano Sports — Suíte Completa dos 21 Fluxos Críticos de Negócio", () => {
  let adminUser: AuthenticatedUser;
  let operatorUser: AuthenticatedUser;
  let createdProductId: string;
  let variationPreto39Id: string;
  let variationPreto40Id: string;
  let variationBranco39Id: string;
  let variationBranco40Id: string;

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = TEST_DB_DIR;
    await getDb();
  });

  afterAll(async () => {
    await closeAndResetDbConnection();
    try {
      fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {
      // ignore cleanup issues on Windows file locks
    }
  });

  it("Fluxo 1 & 19: Login administrativo válido, verificação de token e bloqueio de acesso não autorizado", async () => {
    resetIpRateLimit("127.0.0.1");

    // Tentativa com senha incorreta deve falhar
    await expect(
      authenticateUser({
        email: "admin@suzanosports.com.br",
        password: "senha-errada-123",
      })
    ).rejects.toThrow(UnauthorizedError);

    // Login correto de Administrador
    const adminAuth = await authenticateUser({
      email: "admin@suzanosports.com.br",
      password: "Suzano@Admin2026",
    });
    expect(adminAuth.user.roleCode).toBe("ADMIN");
    const verified = await verifySessionToken(adminAuth.token);
    expect(verified?.email).toBe("admin@suzanosports.com.br");
    adminUser = adminAuth.user;

    // Login correto de Operador
    const opAuth = await authenticateUser({
      email: "operador@suzanosports.com.br",
      password: "Suzano@Operador2026",
    });
    expect(opAuth.user.roleCode).toBe("OPERATOR");
    operatorUser = opAuth.user;

    // Operador NÃO pode criar produtos nem acessar relatórios financeiros
    await expect(
      createProductQuick(operatorUser, {
        name: "Produto Não Autorizado",
        categoryId: "cat_tenis_esportivos",
        salePrice: 100,
        imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
        initialQuantity: 5,
        status: "ACTIVE",
        color: "Preto",
        size: "40",
        costPrice: 50,
      })
    ).rejects.toThrow(ForbiddenError);

    await expect(
      generateReport(operatorUser, "MANAGERIAL_RESULT")
    ).rejects.toThrow(ForbiddenError);
  });

  it("Fluxo 2 & 5: Cadastro de produto com múltiplas variações independentes e Cadastro Rápido", async () => {
    // Exemplo exato do Prompt Master (Seção 11):
    // Tênis Esportivo Modelo X:
    // - Preto / 39 / 2 unidades
    // - Preto / 40 / 5 unidades
    // - Branco / 39 / 1 unidade
    // - Branco / 40 / 0 unidades
    const created = await createProductComplete(adminUser, {
      name: "Tênis Esportivo Modelo X",
      sku: "SZS-MOD-X",
      categoryId: "cat_tenis_esportivos",
      costPrice: 110,
      salePrice: 249.9,
      promoPrice: 199.9,
      minStock: 2,
      isFeatured: true,
      isPromo: true,
      hasVariations: true,
      status: "ACTIVE",
      images: [
        {
          url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
          altText: "Tênis Esportivo Modelo X",
          isPrimary: true,
        },
      ],
      variations: [
        { color: "Preto", size: "39", initialStock: 2, minStock: 1, active: true },
        { color: "Preto", size: "40", initialStock: 5, minStock: 1, active: true },
        { color: "Branco", size: "39", initialStock: 1, minStock: 1, active: true },
        { color: "Branco", size: "40", initialStock: 0, minStock: 1, active: true },
      ],
      initialStockSimple: 0,
    });

    createdProductId = created.id;
    const product = await getProductBySlugOrId(created.id, true);
    expect(product).not.toBeNull();
    expect(product!.totalStock).toBe(8); // 2 + 5 + 1 + 0
    expect(product!.discountPercent).toBe(20); // 249.90 -> 199.90 = 20%

    const vPreto39 = product!.variations.find(
      (v) => v.color === "Preto" && v.size === "39"
    )!;
    const vPreto40 = product!.variations.find(
      (v) => v.color === "Preto" && v.size === "40"
    )!;
    const vBranco39 = product!.variations.find(
      (v) => v.color === "Branco" && v.size === "39"
    )!;
    const vBranco40 = product!.variations.find(
      (v) => v.color === "Branco" && v.size === "40"
    )!;

    variationPreto39Id = vPreto39.id;
    variationPreto40Id = vPreto40.id;
    variationBranco39Id = vBranco39.id;
    variationBranco40Id = vBranco40.id;

    expect(vPreto39.quantity).toBe(2);
    expect(vPreto40.quantity).toBe(5);
    expect(vBranco39.quantity).toBe(1);
    expect(vBranco40.quantity).toBe(0);

    // Cadastro Rápido
    const quick = await createProductQuick(adminUser, {
      name: "Bola de Futebol Campo Oficial",
      categoryId: "cat_futebol",
      salePrice: 129.9,
      costPrice: 60,
      imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55",
      initialQuantity: 4,
      status: "ACTIVE",
      color: "Branca",
      size: "Único",
    });
    expect(quick.id).toBeDefined();
  });

  it("Fluxo 3 & 4: Edição de produto, inativação (oculta do catálogo público) e reativação", async () => {
    await updateProduct(adminUser, createdProductId, {
      shortDescription: "Tênis leve e resistente para corrida e treino em Suzano.",
    });

    // Inativa o produto
    await setProductStatus(adminUser, createdProductId, "INACTIVE");
    const publicCheckInactive = await getProductBySlugOrId(createdProductId, false);
    expect(publicCheckInactive).toBeNull(); // Oculto na vitrine pública!

    const adminCheckInactive = await getProductBySlugOrId(createdProductId, true);
    expect(adminCheckInactive?.status).toBe("INACTIVE"); // Preservado no admin!

    // Reativa o produto
    await setProductStatus(adminUser, createdProductId, "ACTIVE");
    const publicCheckActive = await getProductBySlugOrId(createdProductId, false);
    expect(publicCheckActive?.status).toBe("ACTIVE");
  });

  it("Fluxo 6, 7 & 8: Entrada de estoque, saída/perda, ajuste de inventário físico e bloqueio de saldo negativo", async () => {
    // Entrada de +3 unidades na variação Preto/39 (de 2 vai para 5)
    const entryRes = await recordStockMovement(adminUser, {
      variationId: variationPreto39Id,
      type: "ENTRY",
      quantity: 3,
      unitCost: 110,
      reason: "Recebimento de reposição NF 501",
      idempotencyKey: "idem_entry_501",
    });
    expect(entryRes.movement.previousBalance).toBe(2);
    expect(entryRes.movement.newBalance).toBe(5);

    // Repetição com mesma idempotencyKey não duplica lançamento
    const replayRes = await recordStockMovement(adminUser, {
      variationId: variationPreto39Id,
      type: "ENTRY",
      quantity: 3,
      unitCost: 110,
      reason: "Recebimento de reposição NF 501",
      idempotencyKey: "idem_entry_501",
    });
    expect(replayRes.idempotentReplay).toBe(true);

    // Saída por perda de 1 unidade (de 5 vai para 4)
    const lossRes = await recordStockMovement(adminUser, {
      variationId: variationPreto39Id,
      type: "LOSS",
      quantity: 1,
      reason: "Caixa danificada no transporte",
    });
    expect(lossRes.movement.newBalance).toBe(4);

    // Inventário físico: contagem na prateleira = 3 (ajuste de -1)
    const invRes = await applyPhysicalInventoryCount(adminUser, {
      variationId: variationPreto39Id,
      countedQuantity: 3,
      reason: "Conferência mensal de prateleira",
    });
    expect("movement" in invRes && invRes.movement.newBalance).toBe(3);

    // Tentativa de retirar 10 unidades quando há apenas 3 deve bloquear estoque negativo
    await expect(
      recordStockMovement(adminUser, {
        variationId: variationPreto39Id,
        type: "LOSS",
        quantity: 10,
        reason: "Tentativa inválida acima do saldo",
      })
    ).rejects.toThrow(InsufficientStockError);
  });

  it("Fluxo 10, 11 & 12: Sacola bloqueia variação esgotada, pedido WhatsApp NÃO reduz estoque até confirmação da venda", async () => {
    // Tentar criar pedido para variação Branco/40 (que tem 0 unidades) deve ser bloqueado
    await expect(
      createWhatsAppOrderRequest({
        customerName: "Maria Oliveira",
        customerPhone: "11988887777",
        deliveryMethod: "PICKUP",
        preferredPaymentMethod: "PIX",
        items: [{ variationId: variationBranco40Id, quantity: 1 }],
      })
    ).rejects.toThrow(InsufficientStockError);

    // Cria solicitação de pedido para Preto/39 (1 unidade)
    const orderReq = await createWhatsAppOrderRequest({
      customerName: "Carlos Souza",
      customerPhone: "11977776666",
      deliveryMethod: "PICKUP",
      preferredPaymentMethod: "PIX",
      notes: "Retiro hoje à tarde no centro de Suzano",
      idempotencyKey: "order_req_carlos_1",
      items: [{ variationId: variationPreto39Id, quantity: 1 }],
    });

    expect(orderReq.order.code).toMatch(/^PED-/);
    expect(orderReq.order.status).toBe("AGUARDANDO_ATENDIMENTO");
    expect(orderReq.whatsappMessage).toContain(orderReq.order.code);

    // Verifica que o estoque de Preto/39 CONTINUA 3 (clique no WhatsApp não baixou estoque!)
    const prodBeforeConfirm = await getProductBySlugOrId(createdProductId, true);
    const vPreto39Before = prodBeforeConfirm!.variations.find(
      (v) => v.id === variationPreto39Id
    )!;
    expect(vPreto39Before.quantity).toBe(3);

    // Agora o operador confirma a venda do pedido
    const confirmed = await confirmOrderAsSale(operatorUser, {
      orderId: orderReq.order.id,
      discount: 0,
    });
    expect(confirmed.sale.code).toMatch(/^VND-/);
    expect(confirmed.idempotentReplay).toBe(false);

    // Verifica que APENAS a variação Preto/39 teve o estoque reduzido de 3 para 2
    const prodAfterConfirm = await getProductBySlugOrId(createdProductId, true);
    expect(
      prodAfterConfirm!.variations.find((v) => v.id === variationPreto39Id)!
        .quantity
    ).toBe(2);
    expect(
      prodAfterConfirm!.variations.find((v) => v.id === variationPreto40Id)!
        .quantity
    ).toBe(5);

    // Tentar confirmar o mesmo pedido uma segunda vez não duplica venda nem reduz estoque novamente
    const duplicateConfirm = await confirmOrderAsSale(operatorUser, {
      orderId: orderReq.order.id,
    });
    expect(duplicateConfirm.idempotentReplay).toBe(true);
    const prodAfterDup = await getProductBySlugOrId(createdProductId, true);
    expect(
      prodAfterDup!.variations.find((v) => v.id === variationPreto39Id)!.quantity
    ).toBe(2);
  });

  it("Fluxo 20: Vendas concorrentes sobre o mesmo saldo (Branco/39 possui apenas 1 unidade)", async () => {
    // Dispara 2 vendas simultâneas no PDV tentando consumir a única unidade de Branco/39
    const results = await Promise.allSettled([
      createPosSale(operatorUser, {
        customerName: "Cliente Concorrente A",
        discount: 0,
        surcharge: 0,
        items: [{ variationId: variationBranco39Id, quantity: 1 }],
        payments: [
          {
            method: "PIX",
            amount: 199.9,
            feeAmount: 0,
            installments: 1,
            status: "CONFIRMED",
          },
        ],
      }),
      createPosSale(operatorUser, {
        customerName: "Cliente Concorrente B",
        discount: 0,
        surcharge: 0,
        items: [{ variationId: variationBranco39Id, quantity: 1 }],
        payments: [
          {
            method: "CASH",
            amount: 199.9,
            feeAmount: 0,
            installments: 1,
            status: "CONFIRMED",
          },
        ],
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exatamente UMA venda deve ter sucesso e a outra deve falhar por saldo insuficiente
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const prodCheck = await getProductBySlugOrId(createdProductId, true);
    const vBranco39 = prodCheck!.variations.find(
      (v) => v.id === variationBranco39Id
    )!;
    expect(vBranco39.quantity).toBe(0); // Nunca fica negativo!
  });

  it("Fluxo 9, 13 & 14: Venda PDV com pagamento combinado, Produto Esgotado automático e Devolução/Cancelamento", async () => {
    // Vende todo o restante de Preto/39 (2 un.) e Preto/40 (5 un.) = 7 unidades * 199.90 = 1399.30
    // Com pagamento combinado: R$ 1000 no PIX + R$ 399.30 no Cartão de Crédito
    const posSale = await createPosSale(adminUser, {
      customerName: "Cliente Balcão Pagto Combinado",
      discount: 9.3, // Admin tem permissão de desconto -> Total = 1390.00
      surcharge: 0,
      items: [
        { variationId: variationPreto39Id, quantity: 2 },
        { variationId: variationPreto40Id, quantity: 5 },
      ],
      payments: [
        {
          method: "PIX",
          amount: 1000,
          feeAmount: 0,
          installments: 1,
          status: "CONFIRMED",
        },
        {
          method: "CREDIT",
          amount: 390,
          feeAmount: 10,
          installments: 2,
          status: "CONFIRMED",
        },
      ],
    });

    expect(posSale.sale.total).toBe(1390);

    // Como todas as variações de Tênis Esportivo Modelo X zeraram (0 + 0 + 0 + 0),
    // o status do produto deve ter mudado automaticamente para OUT_OF_STOCK!
    const exhaustedProd = await getProductBySlugOrId(createdProductId, true);
    expect(exhaustedProd!.totalStock).toBe(0);
    expect(exhaustedProd!.status).toBe("OUT_OF_STOCK");

    // Agora realiza o cancelamento/devolução dessa venda de balcão:
    // o estoque das variações deve voltar para 2 e 5 e o produto voltar automaticamente para ACTIVE!
    const returnRes = await cancelOrReturnSale(adminUser, {
      saleId: posSale.sale.id,
      reason: "Cliente solicitou estorno imediato",
    });
    expect(returnRes.allReturned).toBe(true);
    expect(returnRes.sale.status).toBe("CANCELLED");

    const restoredProd = await getProductBySlugOrId(createdProductId, true);
    expect(restoredProd!.totalStock).toBe(7);
    expect(restoredProd!.status).toBe("ACTIVE");
  });

  it("Fluxo 15, 16 & 17: CMV Histórico imutável, Despesas recorrentes sem duplicidade e Relatórios CSV", async () => {
    // Atualmente temos 2 vendas confirmadas ativas (1 do pedido WhatsApp Carlos Souza + 1 da concorrência Branco/39)
    // Cada uma vendeu 1 par a R$ 199,90 com custo histórico unitário R$ 110,00 -> Receita = 399.80, CMV = 220.00, Lucro Bruto = 179.80
    // Vamos alterar o preço de custo futuro do produto no cadastro para R$ 180,00
    // e comprovar que o CMV histórico das vendas passadas NÃO é alterado!
    await updateProduct(adminUser, createdProductId, {
      costPrice: 180,
    });

    // Registra despesa recorrente de Aluguel (R$ 150,00)
    const exp1 = await saveExpense(adminUser, {
      description: "Aluguel Loja Centro Suzano",
      category: "ALUGUEL",
      amount: 150,
      competenceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      status: "PAID",
      paymentMethod: "PIX",
      isRecurring: true,
      recurrenceGroup: "rec_aluguel_centro",
    });
    expect(exp1.idempotentReplay).toBe(false);

    // Tentar registrar novamente a mesma despesa recorrente na mesma competência não duplica!
    const expDup = await saveExpense(adminUser, {
      description: "Aluguel Loja Centro Suzano",
      category: "ALUGUEL",
      amount: 150,
      competenceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      status: "PAID",
      paymentMethod: "PIX",
      isRecurring: true,
      recurrenceGroup: "rec_aluguel_centro",
    });
    expect(expDup.idempotentReplay).toBe(true);

    const fin = await getFinancialOverview(adminUser);
    expect(fin.metrics.netSalesRevenue).toBe(399.8);
    expect(fin.metrics.cmvHistorical).toBe(220); // Permaneceu 2 * 110 = 220!
    expect(fin.metrics.grossProfit).toBe(179.8);
    expect(fin.metrics.operationalExpensesTotal).toBe(150);
    expect(fin.metrics.operationalResult).toBe(29.8); // 179.80 - 150.00

    const report = await generateReport(adminUser, "DAILY_SALES");
    expect(report.rows.length).toBe(2);
    expect(report.csv).toContain("Código;Data/Hora;Origem");
  });

  it("Fluxo 18 & 21: Persistência dos dados após reiniciar a conexão do banco e consulta de catálogo", async () => {
    // Fecha a instância do banco simulando reinício do servidor
    await closeAndResetDbConnection();

    // Reabre e verifica que produtos, saldos, vendas e despesas continuam intactos
    const catalog = await getCatalogProducts({ includeInactive: false });
    expect(catalog.products.length).toBeGreaterThanOrEqual(2);

    const stockOverview = await getStockOverview(adminUser);
    expect(stockOverview.summary.totalUnits).toBe(11); // 7 do Modelo X + 4 da Bola de Futebol
  });
});
