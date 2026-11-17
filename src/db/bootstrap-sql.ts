export const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS "roles" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "code" varchar(32) NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "role_permissions" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "role_id" varchar(64) NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "module" varchar(64) NOT NULL,
  "can_view" boolean DEFAULT true NOT NULL,
  "can_create" boolean DEFAULT false NOT NULL,
  "can_edit" boolean DEFAULT false NOT NULL,
  "can_delete" boolean DEFAULT false NOT NULL,
  "can_approve_discount" boolean DEFAULT false NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "role_module_idx" ON "role_permissions" ("role_id", "module");

CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "name" varchar(140) NOT NULL,
  "email" varchar(180) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "role_id" varchar(64) NOT NULL REFERENCES "roles"("id"),
  "active" boolean DEFAULT true NOT NULL,
  "failed_login_attempts" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamp,
  "last_login_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role_id");

CREATE TABLE IF NOT EXISTS "store_settings" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "store_name" varchar(160) DEFAULT 'Suzano Sports' NOT NULL,
  "legal_name" varchar(200) DEFAULT 'Suzano Sports Artigos Esportivos',
  "segment" varchar(200) DEFAULT 'Loja de artigos esportivos, vestuário e outlet' NOT NULL,
  "logo_url" text DEFAULT '/brand/suzano-sports-logo.svg',
  "hero_banner_url" text DEFAULT 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1400&q=80',
  "hero_title" varchar(220) DEFAULT 'Seu estilo. Seu esporte. Seu preço.' NOT NULL,
  "hero_subtitle" text DEFAULT 'Calçados, roupas e acessórios esportivos para acompanhar sua rotina. Conheça as ofertas da Suzano Sports, no centro de Suzano.' NOT NULL,
  "hero_primary_cta_text" varchar(80) DEFAULT 'Ver produtos' NOT NULL,
  "hero_secondary_cta_text" varchar(80) DEFAULT 'Conferir promoções' NOT NULL,
  "top_bar_text" varchar(255) DEFAULT 'Retire na loja no Centro de Suzano ou consulte entrega rápida pelo WhatsApp!' NOT NULL,
  "top_bar_active" boolean DEFAULT true NOT NULL,
  "instagram_url" varchar(255) DEFAULT 'https://www.instagram.com/suzano_sports/' NOT NULL,
  "whatsapp_short_link" varchar(255) DEFAULT 'https://whats.link/suzanosports' NOT NULL,
  "whatsapp_phone" varchar(32) DEFAULT '',
  "address_street" varchar(200) DEFAULT 'Rua Benjamin Constant, 810' NOT NULL,
  "address_district" varchar(120) DEFAULT 'Centro' NOT NULL,
  "address_city" varchar(120) DEFAULT 'Suzano' NOT NULL,
  "address_state" varchar(10) DEFAULT 'SP' NOT NULL,
  "address_zip" varchar(20) DEFAULT '08674-010' NOT NULL,
  "address_confirmed" boolean DEFAULT false NOT NULL,
  "opening_hours" text DEFAULT 'Segunda a Sábado: 09h às 19h' NOT NULL,
  "map_embed_url" text DEFAULT 'https://www.google.com/maps?q=Rua+Benjamin+Constant,+810+-+Centro,+Suzano+-+SP,+08674-010&output=embed' NOT NULL,
  "pickup_enabled" boolean DEFAULT true NOT NULL,
  "delivery_enabled" boolean DEFAULT true NOT NULL,
  "delivery_notes" text DEFAULT 'Retirada rápida na loja física no centro de Suzano ou entrega combinada diretamente pelo atendimento no WhatsApp.',
  "show_numeric_stock_to_customer" boolean DEFAULT false NOT NULL,
  "primary_color" varchar(16) DEFAULT '#101522' NOT NULL,
  "secondary_color" varchar(16) DEFAULT '#087BD3' NOT NULL,
  "accent_color" varchar(16) DEFAULT '#FF7215' NOT NULL,
  "promo_color" varchar(16) DEFAULT '#E83229' NOT NULL,
  "seo_title" varchar(160) DEFAULT 'Suzano Sports | Loja de Artigos Esportivos, Tênis e Outlet no Centro de Suzano' NOT NULL,
  "seo_description" text DEFAULT 'Tênis esportivos e casuais, roupas de treino, chuteiras, chinelos, mochilas e ofertas de outlet na Suzano Sports. Rua Benjamin Constant, 810 — Centro, Suzano - SP.' NOT NULL,
  "ga4_id" varchar(64) DEFAULT '',
  "gsc_verification" varchar(128) DEFAULT '',
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "title" varchar(160) NOT NULL,
  "subtitle" text,
  "badge_text" varchar(60) DEFAULT 'Oferta Sazonal',
  "cta_text" varchar(60) DEFAULT 'Conferir seleção',
  "cta_url" varchar(255) DEFAULT '/catalogo?promocao=true',
  "banner_image_url" text,
  "active" boolean DEFAULT true NOT NULL,
  "starts_at" timestamp,
  "ends_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "coupons" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "code" varchar(40) NOT NULL UNIQUE,
  "description" varchar(160),
  "discount_type" varchar(20) DEFAULT 'PERCENTAGE' NOT NULL,
  "discount_value" double precision NOT NULL,
  "min_order_value" double precision DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "parent_id" varchar(64),
  "name" varchar(120) NOT NULL,
  "slug" varchar(140) NOT NULL UNIQUE,
  "description" text,
  "seo_title" varchar(160),
  "seo_description" text,
  "image_url" text,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "categories_slug_idx" ON "categories" ("slug");
CREATE INDEX IF NOT EXISTS "categories_parent_idx" ON "categories" ("parent_id");

CREATE TABLE IF NOT EXISTS "brands" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL,
  "slug" varchar(140) NOT NULL UNIQUE,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "brands_slug_idx" ON "brands" ("slug");

CREATE TABLE IF NOT EXISTS "products" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "name" varchar(200) NOT NULL,
  "slug" varchar(220) NOT NULL UNIQUE,
  "sku" varchar(80) NOT NULL UNIQUE,
  "barcode" varchar(80),
  "category_id" varchar(64) NOT NULL REFERENCES "categories"("id"),
  "subcategory_name" varchar(120),
  "brand_id" varchar(64) REFERENCES "brands"("id"),
  "short_description" text,
  "full_description" text,
  "cost_price" double precision DEFAULT 0 NOT NULL,
  "sale_price" double precision NOT NULL,
  "promo_price" double precision,
  "min_stock" integer DEFAULT 2 NOT NULL,
  "is_featured" boolean DEFAULT false NOT NULL,
  "is_promo" boolean DEFAULT false NOT NULL,
  "has_variations" boolean DEFAULT true NOT NULL,
  "status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
  "deleted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products" ("category_id");
CREATE INDEX IF NOT EXISTS "products_brand_idx" ON "products" ("brand_id");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products" ("status");
CREATE INDEX IF NOT EXISTS "products_sku_idx" ON "products" ("sku");
CREATE INDEX IF NOT EXISTS "products_barcode_idx" ON "products" ("barcode");

CREATE TABLE IF NOT EXISTS "product_images" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "product_id" varchar(64) NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "alt_text" varchar(220) NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_images_product_idx" ON "product_images" ("product_id");

CREATE TABLE IF NOT EXISTS "product_variations" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "product_id" varchar(64) NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "sku" varchar(100) NOT NULL UNIQUE,
  "barcode" varchar(80),
  "color" varchar(60) DEFAULT 'Única' NOT NULL,
  "size" varchar(40) DEFAULT 'Único' NOT NULL,
  "cost_price_override" double precision,
  "sale_price_override" double precision,
  "promo_price_override" double precision,
  "min_stock" integer DEFAULT 1 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "variations_product_idx" ON "product_variations" ("product_id");
CREATE INDEX IF NOT EXISTS "variations_sku_idx" ON "product_variations" ("sku");
CREATE INDEX IF NOT EXISTS "variations_barcode_idx" ON "product_variations" ("barcode");

CREATE TABLE IF NOT EXISTS "stock_balances" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "variation_id" varchar(64) NOT NULL UNIQUE REFERENCES "product_variations"("id") ON DELETE CASCADE,
  "product_id" varchar(64) NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "quantity" integer DEFAULT 0 NOT NULL CHECK ("quantity" >= 0),
  "reserved_quantity" integer DEFAULT 0 NOT NULL CHECK ("reserved_quantity" >= 0),
  "min_stock" integer DEFAULT 1 NOT NULL,
  "last_movement_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "stock_balances_product_idx" ON "stock_balances" ("product_id");
CREATE INDEX IF NOT EXISTS "stock_balances_variation_idx" ON "stock_balances" ("variation_id");

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "variation_id" varchar(64) NOT NULL REFERENCES "product_variations"("id"),
  "product_id" varchar(64) NOT NULL REFERENCES "products"("id"),
  "type" varchar(40) NOT NULL,
  "previous_balance" integer NOT NULL,
  "moved_quantity" integer NOT NULL,
  "new_balance" integer NOT NULL,
  "unit_cost" double precision DEFAULT 0 NOT NULL,
  "reason" text NOT NULL,
  "reference_type" varchar(40),
  "reference_id" varchar(64),
  "user_id" varchar(64) REFERENCES "users"("id"),
  "idempotency_key" varchar(120) UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "stock_movements_variation_idx" ON "stock_movements" ("variation_id");
CREATE INDEX IF NOT EXISTS "stock_movements_product_idx" ON "stock_movements" ("product_id");
CREATE INDEX IF NOT EXISTS "stock_movements_type_idx" ON "stock_movements" ("type");
CREATE INDEX IF NOT EXISTS "stock_movements_created_idx" ON "stock_movements" ("created_at");

CREATE TABLE IF NOT EXISTS "customers" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "name" varchar(160) NOT NULL,
  "phone" varchar(40) NOT NULL,
  "email" varchar(180),
  "notes" text,
  "lgpd_consent_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers" ("phone");

CREATE TABLE IF NOT EXISTS "orders" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "code" varchar(40) NOT NULL UNIQUE,
  "customer_id" varchar(64) REFERENCES "customers"("id"),
  "customer_name" varchar(160) NOT NULL,
  "customer_phone" varchar(40) NOT NULL,
  "delivery_method" varchar(32) DEFAULT 'PICKUP' NOT NULL,
  "address_notes" text,
  "preferred_payment_method" varchar(32) DEFAULT 'PIX',
  "status" varchar(40) DEFAULT 'AGUARDANDO_ATENDIMENTO' NOT NULL,
  "subtotal" double precision NOT NULL,
  "discount" double precision DEFAULT 0 NOT NULL,
  "total" double precision NOT NULL,
  "notes" text,
  "internal_notes" text,
  "whatsapp_opened_at" timestamp,
  "converted_sale_id" varchar(64),
  "idempotency_key" varchar(120) UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "orders_code_idx" ON "orders" ("code");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" ("status");
CREATE INDEX IF NOT EXISTS "orders_created_idx" ON "orders" ("created_at");

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "order_id" varchar(64) NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "product_id" varchar(64) NOT NULL REFERENCES "products"("id"),
  "variation_id" varchar(64) NOT NULL REFERENCES "product_variations"("id"),
  "product_name_snapshot" varchar(200) NOT NULL,
  "sku_snapshot" varchar(100) NOT NULL,
  "variation_label_snapshot" varchar(120) NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price" double precision NOT NULL,
  "total_price" double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" ("order_id");

CREATE TABLE IF NOT EXISTS "cash_sessions" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "opened_by_user_id" varchar(64) NOT NULL REFERENCES "users"("id"),
  "closed_by_user_id" varchar(64) REFERENCES "users"("id"),
  "opening_balance" double precision DEFAULT 0 NOT NULL,
  "closing_balance" double precision,
  "status" varchar(24) DEFAULT 'OPEN' NOT NULL,
  "notes" text,
  "opened_at" timestamp DEFAULT now() NOT NULL,
  "closed_at" timestamp
);

CREATE TABLE IF NOT EXISTS "sales" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "code" varchar(40) NOT NULL UNIQUE,
  "order_id" varchar(64) UNIQUE,
  "customer_id" varchar(64) REFERENCES "customers"("id"),
  "customer_name" varchar(160) DEFAULT 'Cliente Balcão',
  "customer_phone" varchar(40),
  "cash_session_id" varchar(64) REFERENCES "cash_sessions"("id"),
  "seller_user_id" varchar(64) NOT NULL REFERENCES "users"("id"),
  "origin" varchar(32) DEFAULT 'PDV' NOT NULL,
  "status" varchar(32) DEFAULT 'CONFIRMED' NOT NULL,
  "subtotal" double precision NOT NULL,
  "discount" double precision DEFAULT 0 NOT NULL,
  "surcharge" double precision DEFAULT 0 NOT NULL,
  "total" double precision NOT NULL,
  "total_cost_historical" double precision NOT NULL,
  "gross_profit_historical" double precision NOT NULL,
  "notes" text,
  "cancel_reason" text,
  "idempotency_key" varchar(120) UNIQUE,
  "confirmed_at" timestamp DEFAULT now() NOT NULL,
  "cancelled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "sales_code_idx" ON "sales" ("code");
CREATE INDEX IF NOT EXISTS "sales_status_idx" ON "sales" ("status");
CREATE INDEX IF NOT EXISTS "sales_confirmed_idx" ON "sales" ("confirmed_at");
CREATE INDEX IF NOT EXISTS "sales_origin_idx" ON "sales" ("origin");

CREATE TABLE IF NOT EXISTS "sale_items" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "sale_id" varchar(64) NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
  "product_id" varchar(64) NOT NULL REFERENCES "products"("id"),
  "variation_id" varchar(64) NOT NULL REFERENCES "product_variations"("id"),
  "product_name_snapshot" varchar(200) NOT NULL,
  "sku_snapshot" varchar(100) NOT NULL,
  "variation_label_snapshot" varchar(120) NOT NULL,
  "quantity" integer NOT NULL,
  "returned_quantity" integer DEFAULT 0 NOT NULL,
  "unit_cost_historical" double precision NOT NULL,
  "unit_price" double precision NOT NULL,
  "discount" double precision DEFAULT 0 NOT NULL,
  "total_price" double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS "sale_items_sale_idx" ON "sale_items" ("sale_id");
CREATE INDEX IF NOT EXISTS "sale_items_product_idx" ON "sale_items" ("product_id");

CREATE TABLE IF NOT EXISTS "payments" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "sale_id" varchar(64) NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
  "method" varchar(32) NOT NULL,
  "amount" double precision NOT NULL,
  "fee_amount" double precision DEFAULT 0 NOT NULL,
  "net_amount" double precision NOT NULL,
  "installments" integer DEFAULT 1 NOT NULL,
  "status" varchar(32) DEFAULT 'CONFIRMED' NOT NULL,
  "paid_at" timestamp,
  "reference" varchar(120),
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "payments_sale_idx" ON "payments" ("sale_id");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" ("status");
CREATE INDEX IF NOT EXISTS "payments_method_idx" ON "payments" ("method");

CREATE TABLE IF NOT EXISTS "accounts_receivable" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "sale_id" varchar(64) REFERENCES "sales"("id"),
  "payment_id" varchar(64) REFERENCES "payments"("id"),
  "customer_id" varchar(64) REFERENCES "customers"("id"),
  "customer_name" varchar(160) NOT NULL,
  "description" varchar(220) NOT NULL,
  "amount" double precision NOT NULL,
  "received_amount" double precision DEFAULT 0 NOT NULL,
  "payment_method" varchar(32) DEFAULT 'PIX' NOT NULL,
  "due_date" timestamp NOT NULL,
  "received_at" timestamp,
  "status" varchar(32) DEFAULT 'PENDING' NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ar_status_idx" ON "accounts_receivable" ("status");
CREATE INDEX IF NOT EXISTS "ar_due_date_idx" ON "accounts_receivable" ("due_date");

CREATE TABLE IF NOT EXISTS "accounts_payable" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "supplier_name" varchar(160) NOT NULL,
  "description" varchar(220) NOT NULL,
  "amount" double precision NOT NULL,
  "due_date" timestamp NOT NULL,
  "paid_at" timestamp,
  "payment_method" varchar(32),
  "status" varchar(32) DEFAULT 'PENDING' NOT NULL,
  "stock_entry_reference" varchar(64),
  "notes" text,
  "created_by_user_id" varchar(64) REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ap_status_idx" ON "accounts_payable" ("status");

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "description" varchar(220) NOT NULL,
  "category" varchar(64) NOT NULL,
  "amount" double precision NOT NULL,
  "competence_date" timestamp NOT NULL,
  "due_date" timestamp NOT NULL,
  "paid_at" timestamp,
  "payment_method" varchar(32),
  "status" varchar(32) DEFAULT 'PENDING' NOT NULL,
  "is_recurring" boolean DEFAULT false NOT NULL,
  "recurrence_group" varchar(64),
  "recurrence_month_ref" varchar(16),
  "notes" text,
  "created_by_user_id" varchar(64) REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "expenses_category_idx" ON "expenses" ("category");
CREATE INDEX IF NOT EXISTS "expenses_status_idx" ON "expenses" ("status");
CREATE INDEX IF NOT EXISTS "expenses_competence_idx" ON "expenses" ("competence_date");
CREATE UNIQUE INDEX IF NOT EXISTS "expenses_recurrence_unique_idx" ON "expenses" ("recurrence_group", "recurrence_month_ref");

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "user_id" varchar(64) REFERENCES "users"("id"),
  "action" varchar(100) NOT NULL,
  "entity_type" varchar(60) NOT NULL,
  "entity_id" varchar(64),
  "metadata_json" text,
  "ip_address" varchar(64),
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_idx" ON "audit_logs" ("created_at");
`;
