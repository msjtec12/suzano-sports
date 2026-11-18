import {
  pgTable,
  varchar,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";

// Binários armazenados como BYTEA no Neon PostgreSQL.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() { return "bytea"; },
});

// ============================================================================
// 1. PERFIS, PERMISSÕES E USUÁRIOS
// ============================================================================

export const roles = pgTable("roles", {
  id: varchar("id", { length: 64 }).primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(), // ADMIN | MANAGER | OPERATOR
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    roleId: varchar("role_id", { length: 64 })
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    module: varchar("module", { length: 64 }).notNull(), // dashboard | products | stock | orders | pos | finance | reports | settings | users
    canView: boolean("can_view").default(true).notNull(),
    canCreate: boolean("can_create").default(false).notNull(),
    canEdit: boolean("can_edit").default(false).notNull(),
    canDelete: boolean("can_delete").default(false).notNull(),
    canApproveDiscount: boolean("can_approve_discount").default(false).notNull(),
  },
  (table) => [
    uniqueIndex("role_module_idx").on(table.roleId, table.module),
  ]
);

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 140 }).notNull(),
    email: varchar("email", { length: 180 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    roleId: varchar("role_id", { length: 64 })
      .notNull()
      .references(() => roles.id),
    active: boolean("active").default(true).notNull(),
    failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until"),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_role_idx").on(table.roleId),
  ]
);

// ============================================================================
// 2. CONFIGURAÇÕES DA LOJA E CAMPANHAS
// ============================================================================


export const mediaAssets = pgTable(
  "media_assets",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    contentType: varchar("content_type", { length: 32 }).notNull(),
    content: bytea("content").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    createdByUserId: varchar("created_by_user_id", { length: 64 }).references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("media_assets_created_at_idx").on(table.createdAt)]
);

export const storeSettings = pgTable("store_settings", {
  id: varchar("id", { length: 64 }).primaryKey(), // "default"
  storeName: varchar("store_name", { length: 160 }).notNull().default("Suzano Sports"),
  legalName: varchar("legal_name", { length: 200 }).default("Suzano Sports Artigos Esportivos"),
  segment: varchar("segment", { length: 200 })
    .notNull()
    .default("Loja de artigos esportivos, vestuário e outlet"),
  logoUrl: text("logo_url").default("/brand/suzano-sports-logo.svg"),
  heroBannerUrl: text("hero_banner_url").default(
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1400&q=80"
  ),
  heroTitle: varchar("hero_title", { length: 220 })
    .notNull()
    .default("Seu estilo. Seu esporte. Seu preço."),
  heroSubtitle: text("hero_subtitle")
    .notNull()
    .default(
      "Calçados, roupas e acessórios esportivos para acompanhar sua rotina. Conheça as ofertas da Suzano Sports, no centro de Suzano."
    ),
  heroPrimaryCtaText: varchar("hero_primary_cta_text", { length: 80 })
    .notNull()
    .default("Ver produtos"),
  heroSecondaryCtaText: varchar("hero_secondary_cta_text", { length: 80 })
    .notNull()
    .default("Conferir promoções"),
  topBarText: varchar("top_bar_text", { length: 255 })
    .notNull()
    .default("Retire na loja no Centro de Suzano ou consulte entrega rápida pelo WhatsApp!"),
  topBarActive: boolean("top_bar_active").default(true).notNull(),
  instagramUrl: varchar("instagram_url", { length: 255 })
    .notNull()
    .default("https://www.instagram.com/suzano_sports/"),
  whatsappShortLink: varchar("whatsapp_short_link", { length: 255 })
    .notNull()
    .default("https://whats.link/suzanosports"),
  whatsappPhone: varchar("whatsapp_phone", { length: 32 }).default(""), // Número validado (ex: 5511999999999)
  addressStreet: varchar("address_street", { length: 200 })
    .notNull()
    .default("Rua Benjamin Constant, 810"),
  addressDistrict: varchar("address_district", { length: 120 }).notNull().default("Centro"),
  addressCity: varchar("address_city", { length: 120 }).notNull().default("Suzano"),
  addressState: varchar("address_state", { length: 10 }).notNull().default("SP"),
  addressZip: varchar("address_zip", { length: 20 }).notNull().default("08674-010"),
  addressConfirmed: boolean("address_confirmed").default(false).notNull(),
  openingHours: text("opening_hours")
    .notNull()
    .default("Segunda a Sábado: 09h às 19h"),
  mapEmbedUrl: text("map_embed_url")
    .notNull()
    .default(
      "https://www.google.com/maps?q=Rua+Benjamin+Constant,+810+-+Centro,+Suzano+-+SP,+08674-010&output=embed"
    ),
  pickupEnabled: boolean("pickup_enabled").default(true).notNull(),
  deliveryEnabled: boolean("delivery_enabled").default(true).notNull(),
  deliveryNotes: text("delivery_notes").default(
    "Retirada rápida na loja física no centro de Suzano ou entrega combinada diretamente pelo atendimento no WhatsApp."
  ),
  showNumericStockToCustomer: boolean("show_numeric_stock_to_customer")
    .default(false)
    .notNull(),
  primaryColor: varchar("primary_color", { length: 16 }).default("#101522").notNull(),
  secondaryColor: varchar("secondary_color", { length: 16 }).default("#087BD3").notNull(),
  accentColor: varchar("accent_color", { length: 16 }).default("#FF7215").notNull(),
  promoColor: varchar("promo_color", { length: 16 }).default("#E83229").notNull(),
  seoTitle: varchar("seo_title", { length: 160 })
    .notNull()
    .default("Suzano Sports | Loja de Artigos Esportivos, Tênis e Outlet no Centro de Suzano"),
  seoDescription: text("seo_description")
    .notNull()
    .default(
      "Tênis esportivos e casuais, roupas de treino, chuteiras, chinelos, mochilas e ofertas de outlet na Suzano Sports. Rua Benjamin Constant, 810 — Centro, Suzano - SP."
    ),
  ga4Id: varchar("ga4_id", { length: 64 }).default(""),
  gscVerification: varchar("gsc_verification", { length: 128 }).default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id", { length: 64 }).primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  subtitle: text("subtitle"),
  badgeText: varchar("badge_text", { length: 60 }).default("Oferta Sazonal"),
  ctaText: varchar("cta_text", { length: 60 }).default("Conferir seleção"),
  ctaUrl: varchar("cta_url", { length: 255 }).default("/catalogo?promocao=true"),
  bannerImageUrl: text("banner_image_url"),
  active: boolean("active").default(true).notNull(),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const coupons = pgTable("coupons", {
  id: varchar("id", { length: 64 }).primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  description: varchar("description", { length: 160 }),
  discountType: varchar("discount_type", { length: 20 }).notNull().default("PERCENTAGE"), // PERCENTAGE | FIXED
  discountValue: doublePrecision("discount_value").notNull(),
  minOrderValue: doublePrecision("min_order_value").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// 3. CATEGORIAS, MARCAS, PRODUTOS, IMAGENS E VARIAÇÕES
// ============================================================================

export const categories = pgTable(
  "categories",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    parentId: varchar("parent_id", { length: 64 }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull().unique(),
    description: text("description"),
    seoTitle: varchar("seo_title", { length: 160 }),
    seoDescription: text("seo_description"),
    imageUrl: text("image_url"),
    active: boolean("active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("categories_slug_idx").on(table.slug),
    index("categories_parent_idx").on(table.parentId),
  ]
);

export const brands = pgTable(
  "brands",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull().unique(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("brands_slug_idx").on(table.slug)]
);

export const products = pgTable(
  "products",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    sku: varchar("sku", { length: 80 }).notNull().unique(),
    barcode: varchar("barcode", { length: 80 }),
    categoryId: varchar("category_id", { length: 64 })
      .notNull()
      .references(() => categories.id),
    subcategoryName: varchar("subcategory_name", { length: 120 }),
    brandId: varchar("brand_id", { length: 64 }).references(() => brands.id),
    shortDescription: text("short_description"),
    fullDescription: text("full_description"),
    costPrice: doublePrecision("cost_price").default(0).notNull(),
    salePrice: doublePrecision("sale_price").notNull(),
    promoPrice: doublePrecision("promo_price"),
    minStock: integer("min_stock").default(2).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    isPromo: boolean("is_promo").default(false).notNull(),
    hasVariations: boolean("has_variations").default(true).notNull(),
    status: varchar("status", { length: 32 }).default("ACTIVE").notNull(), // DRAFT | ACTIVE | INACTIVE | OUT_OF_STOCK
    deletedAt: timestamp("deleted_at"), // Exclusão lógica
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("products_category_idx").on(table.categoryId),
    index("products_brand_idx").on(table.brandId),
    index("products_status_idx").on(table.status),
    index("products_sku_idx").on(table.sku),
    index("products_barcode_idx").on(table.barcode),
  ]
);

export const productImages = pgTable(
  "product_images",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    productId: varchar("product_id", { length: 64 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: varchar("alt_text", { length: 220 }).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("product_images_product_idx").on(table.productId)]
);

export const productVariations = pgTable(
  "product_variations",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    productId: varchar("product_id", { length: 64 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    barcode: varchar("barcode", { length: 80 }),
    color: varchar("color", { length: 60 }).default("Única").notNull(),
    size: varchar("size", { length: 40 }).default("Único").notNull(),
    costPriceOverride: doublePrecision("cost_price_override"),
    salePriceOverride: doublePrecision("sale_price_override"),
    promoPriceOverride: doublePrecision("promo_price_override"),
    minStock: integer("min_stock").default(1).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("variations_product_idx").on(table.productId),
    index("variations_sku_idx").on(table.sku),
    index("variations_barcode_idx").on(table.barcode),
  ]
);

// ============================================================================
// 4. CONTROLE DE ESTOQUE E MOVIMENTAÇÕES
// ============================================================================

export const stockBalances = pgTable(
  "stock_balances",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    variationId: varchar("variation_id", { length: 64 })
      .notNull()
      .unique()
      .references(() => productVariations.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 64 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").default(0).notNull(),
    reservedQuantity: integer("reserved_quantity").default(0).notNull(),
    minStock: integer("min_stock").default(1).notNull(),
    lastMovementAt: timestamp("last_movement_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("stock_balances_product_idx").on(table.productId),
    index("stock_balances_variation_idx").on(table.variationId),
  ]
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    variationId: varchar("variation_id", { length: 64 })
      .notNull()
      .references(() => productVariations.id),
    productId: varchar("product_id", { length: 64 })
      .notNull()
      .references(() => products.id),
    type: varchar("type", { length: 40 }).notNull(), // ENTRY | SALE_EXIT | INVENTORY_ADJUSTMENT | RETURN | LOSS
    previousBalance: integer("previous_balance").notNull(),
    movedQuantity: integer("moved_quantity").notNull(), // positivo em entradas/devoluções, negativo em saídas/perdas
    newBalance: integer("new_balance").notNull(),
    unitCost: doublePrecision("unit_cost").default(0).notNull(),
    reason: text("reason").notNull(),
    referenceType: varchar("reference_type", { length: 40 }), // SALE | ORDER | MANUAL | INVENTORY | INITIAL
    referenceId: varchar("reference_id", { length: 64 }),
    userId: varchar("user_id", { length: 64 }).references(() => users.id),
    idempotencyKey: varchar("idempotency_key", { length: 120 }).unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("stock_movements_variation_idx").on(table.variationId),
    index("stock_movements_product_idx").on(table.productId),
    index("stock_movements_type_idx").on(table.type),
    index("stock_movements_created_idx").on(table.createdAt),
  ]
);

// ============================================================================
// 5. CLIENTES, SOLICITAÇÕES DE PEDIDO (WHATSAPP) E ITENS
// ============================================================================

export const customers = pgTable(
  "customers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 40 }).notNull(),
    email: varchar("email", { length: 180 }),
    notes: text("notes"),
    lgpdConsentAt: timestamp("lgpd_consent_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("customers_phone_idx").on(table.phone)]
);

export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    code: varchar("code", { length: 40 }).notNull().unique(), // Ex: PED-20261117-0001
    customerId: varchar("customer_id", { length: 64 }).references(() => customers.id),
    customerName: varchar("customer_name", { length: 160 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 40 }).notNull(),
    deliveryMethod: varchar("delivery_method", { length: 32 })
      .notNull()
      .default("PICKUP"), // PICKUP | DELIVERY
    addressNotes: text("address_notes"),
    preferredPaymentMethod: varchar("preferred_payment_method", { length: 32 }).default("PIX"),
    status: varchar("status", { length: 40 })
      .notNull()
      .default("AGUARDANDO_ATENDIMENTO"),
    // AGUARDANDO_ATENDIMENTO | EM_NEGOCIACAO | CONFIRMADO | EM_SEPARACAO | PRONTO_PARA_RETIRADA | FINALIZADO | CANCELADO
    subtotal: doublePrecision("subtotal").notNull(),
    discount: doublePrecision("discount").default(0).notNull(),
    total: doublePrecision("total").notNull(),
    notes: text("notes"),
    internalNotes: text("internal_notes"),
    whatsappOpenedAt: timestamp("whatsapp_opened_at"),
    convertedSaleId: varchar("converted_sale_id", { length: 64 }),
    idempotencyKey: varchar("idempotency_key", { length: 120 }).unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("orders_code_idx").on(table.code),
    index("orders_status_idx").on(table.status),
    index("orders_created_idx").on(table.createdAt),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    orderId: varchar("order_id", { length: 64 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 64 })
      .notNull()
      .references(() => products.id),
    variationId: varchar("variation_id", { length: 64 })
      .notNull()
      .references(() => productVariations.id),
    productNameSnapshot: varchar("product_name_snapshot", { length: 200 }).notNull(),
    skuSnapshot: varchar("sku_snapshot", { length: 100 }).notNull(),
    variationLabelSnapshot: varchar("variation_label_snapshot", { length: 120 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: doublePrecision("unit_price").notNull(),
    totalPrice: doublePrecision("total_price").notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)]
);

// ============================================================================
// 6. SESSÕES DE CAIXA, VENDAS CONFIRMADAS, ITENS E PAGAMENTOS
// ============================================================================

export const cashSessions = pgTable("cash_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  openedByUserId: varchar("opened_by_user_id", { length: 64 })
    .notNull()
    .references(() => users.id),
  closedByUserId: varchar("closed_by_user_id", { length: 64 }).references(() => users.id),
  openingBalance: doublePrecision("opening_balance").default(0).notNull(),
  closingBalance: doublePrecision("closing_balance"),
  status: varchar("status", { length: 24 }).default("OPEN").notNull(), // OPEN | CLOSED
  notes: text("notes"),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const sales = pgTable(
  "sales",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    code: varchar("code", { length: 40 }).notNull().unique(), // Ex: VND-20261117-0001
    orderId: varchar("order_id", { length: 64 }).unique(),
    customerId: varchar("customer_id", { length: 64 }).references(() => customers.id),
    customerName: varchar("customer_name", { length: 160 }).default("Cliente Balcão"),
    customerPhone: varchar("customer_phone", { length: 40 }),
    cashSessionId: varchar("cash_session_id", { length: 64 }).references(
      () => cashSessions.id
    ),
    sellerUserId: varchar("seller_user_id", { length: 64 })
      .notNull()
      .references(() => users.id),
    origin: varchar("origin", { length: 32 }).notNull().default("PDV"), // PDV | ORDER_WHATSAPP
    status: varchar("status", { length: 32 }).notNull().default("CONFIRMED"), // CONFIRMED | PARTIALLY_REFUNDED | CANCELLED
    subtotal: doublePrecision("subtotal").notNull(),
    discount: doublePrecision("discount").default(0).notNull(),
    surcharge: doublePrecision("surcharge").default(0).notNull(),
    total: doublePrecision("total").notNull(),
    totalCostHistorical: doublePrecision("total_cost_historical").notNull(),
    grossProfitHistorical: doublePrecision("gross_profit_historical").notNull(),
    notes: text("notes"),
    cancelReason: text("cancel_reason"),
    idempotencyKey: varchar("idempotency_key", { length: 120 }).unique(),
    confirmedAt: timestamp("confirmed_at").defaultNow().notNull(),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sales_code_idx").on(table.code),
    index("sales_status_idx").on(table.status),
    index("sales_confirmed_idx").on(table.confirmedAt),
    index("sales_origin_idx").on(table.origin),
  ]
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    saleId: varchar("sale_id", { length: 64 })
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 64 })
      .notNull()
      .references(() => products.id),
    variationId: varchar("variation_id", { length: 64 })
      .notNull()
      .references(() => productVariations.id),
    productNameSnapshot: varchar("product_name_snapshot", { length: 200 }).notNull(),
    skuSnapshot: varchar("sku_snapshot", { length: 100 }).notNull(),
    variationLabelSnapshot: varchar("variation_label_snapshot", { length: 120 }).notNull(),
    quantity: integer("quantity").notNull(),
    returnedQuantity: integer("returned_quantity").default(0).notNull(),
    unitCostHistorical: doublePrecision("unit_cost_historical").notNull(), // Custo unitário congelado no ato da venda
    unitPrice: doublePrecision("unit_price").notNull(),
    discount: doublePrecision("discount").default(0).notNull(),
    totalPrice: doublePrecision("total_price").notNull(),
  },
  (table) => [
    index("sale_items_sale_idx").on(table.saleId),
    index("sale_items_product_idx").on(table.productId),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    saleId: varchar("sale_id", { length: 64 })
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 32 }).notNull(), // CASH | PIX | DEBIT | CREDIT | OTHER
    amount: doublePrecision("amount").notNull(),
    feeAmount: doublePrecision("fee_amount").default(0).notNull(),
    netAmount: doublePrecision("net_amount").notNull(),
    installments: integer("installments").default(1).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("CONFIRMED"), // CONFIRMED | PENDING | REFUNDED | CANCELLED
    paidAt: timestamp("paid_at"),
    reference: varchar("reference", { length: 120 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("payments_sale_idx").on(table.saleId),
    index("payments_status_idx").on(table.status),
    index("payments_method_idx").on(table.method),
  ]
);

// ============================================================================
// 7. GESTÃO FINANCEIRA: CONTAS A RECEBER, CONTAS A PAGAR E DESPESAS
// ============================================================================

export const accountsReceivable = pgTable(
  "accounts_receivable",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    saleId: varchar("sale_id", { length: 64 }).references(() => sales.id),
    paymentId: varchar("payment_id", { length: 64 }).references(() => payments.id),
    customerId: varchar("customer_id", { length: 64 }).references(() => customers.id),
    customerName: varchar("customer_name", { length: 160 }).notNull(),
    description: varchar("description", { length: 220 }).notNull(),
    amount: doublePrecision("amount").notNull(),
    receivedAmount: doublePrecision("received_amount").default(0).notNull(),
    paymentMethod: varchar("payment_method", { length: 32 }).default("PIX").notNull(),
    dueDate: timestamp("due_date").notNull(),
    receivedAt: timestamp("received_at"),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"), // PENDING | PARTIAL | RECEIVED | CANCELLED
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ar_status_idx").on(table.status),
    index("ar_due_date_idx").on(table.dueDate),
  ]
);

export const accountsPayable = pgTable(
  "accounts_payable",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    supplierName: varchar("supplier_name", { length: 160 }).notNull(),
    description: varchar("description", { length: 220 }).notNull(),
    amount: doublePrecision("amount").notNull(),
    dueDate: timestamp("due_date").notNull(),
    paidAt: timestamp("paid_at"),
    paymentMethod: varchar("payment_method", { length: 32 }),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"), // PENDING | PAID | CANCELLED
    stockEntryReference: varchar("stock_entry_reference", { length: 64 }),
    notes: text("notes"),
    createdByUserId: varchar("created_by_user_id", { length: 64 }).references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("ap_status_idx").on(table.status)]
);

export const expenses = pgTable(
  "expenses",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    description: varchar("description", { length: 220 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    // ALUGUEL | AGUA | ENERGIA | INTERNET | FUNCIONARIOS | FORNECEDORES | MARKETING | TRANSPORTE | OUTRAS
    amount: doublePrecision("amount").notNull(),
    competenceDate: timestamp("competence_date").notNull(),
    dueDate: timestamp("due_date").notNull(),
    paidAt: timestamp("paid_at"),
    paymentMethod: varchar("payment_method", { length: 32 }),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"), // PENDING | PAID | CANCELLED
    isRecurring: boolean("is_recurring").default(false).notNull(),
    recurrenceGroup: varchar("recurrence_group", { length: 64 }),
    recurrenceMonthRef: varchar("recurrence_month_ref", { length: 16 }), // Ex: 2026-11 para evitar duplicidade
    notes: text("notes"),
    createdByUserId: varchar("created_by_user_id", { length: 64 }).references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("expenses_category_idx").on(table.category),
    index("expenses_status_idx").on(table.status),
    index("expenses_competence_idx").on(table.competenceDate),
    uniqueIndex("expenses_recurrence_unique_idx").on(
      table.recurrenceGroup,
      table.recurrenceMonthRef
    ),
  ]
);

// ============================================================================
// 8. LOGS DE AUDITORIA
// ============================================================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 }).references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    metadataJson: text("metadata_json"),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_idx").on(table.createdAt),
  ]
);
