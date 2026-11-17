CREATE TABLE "accounts_payable" (
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
	"created_by_user_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts_receivable" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"sale_id" varchar(64),
	"payment_id" varchar(64),
	"customer_id" varchar(64),
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
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64),
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" varchar(64),
	"metadata_json" text,
	"ip_address" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
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
--> statement-breakpoint
CREATE TABLE "cash_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"opened_by_user_id" varchar(64) NOT NULL,
	"closed_by_user_id" varchar(64),
	"opening_balance" double precision DEFAULT 0 NOT NULL,
	"closing_balance" double precision,
	"status" varchar(24) DEFAULT 'OPEN' NOT NULL,
	"notes" text,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"parent_id" varchar(64),
	"name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"description" text,
	"seo_title" varchar(160),
	"seo_description" text,
	"image_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"description" varchar(160),
	"discount_type" varchar(20) DEFAULT 'PERCENTAGE' NOT NULL,
	"discount_value" double precision NOT NULL,
	"min_order_value" double precision DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"phone" varchar(40) NOT NULL,
	"email" varchar(180),
	"notes" text,
	"lgpd_consent_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
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
	"created_by_user_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"order_id" varchar(64) NOT NULL,
	"product_id" varchar(64) NOT NULL,
	"variation_id" varchar(64) NOT NULL,
	"product_name_snapshot" varchar(200) NOT NULL,
	"sku_snapshot" varchar(100) NOT NULL,
	"variation_label_snapshot" varchar(120) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" double precision NOT NULL,
	"total_price" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"customer_id" varchar(64),
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
	"idempotency_key" varchar(120),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_code_unique" UNIQUE("code"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"sale_id" varchar(64) NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"product_id" varchar(64) NOT NULL,
	"url" text NOT NULL,
	"alt_text" varchar(220) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"product_id" varchar(64) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"barcode" varchar(80),
	"color" varchar(60) DEFAULT 'Única' NOT NULL,
	"size" varchar(40) DEFAULT 'Único' NOT NULL,
	"cost_price_override" double precision,
	"sale_price_override" double precision,
	"promo_price_override" double precision,
	"min_stock" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_variations_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"sku" varchar(80) NOT NULL,
	"barcode" varchar(80),
	"category_id" varchar(64) NOT NULL,
	"subcategory_name" varchar(120),
	"brand_id" varchar(64),
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"role_id" varchar(64) NOT NULL,
	"module" varchar(64) NOT NULL,
	"can_view" boolean DEFAULT true NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"can_approve_discount" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"sale_id" varchar(64) NOT NULL,
	"product_id" varchar(64) NOT NULL,
	"variation_id" varchar(64) NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"order_id" varchar(64),
	"customer_id" varchar(64),
	"customer_name" varchar(160) DEFAULT 'Cliente Balcão',
	"customer_phone" varchar(40),
	"cash_session_id" varchar(64),
	"seller_user_id" varchar(64) NOT NULL,
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
	"idempotency_key" varchar(120),
	"confirmed_at" timestamp DEFAULT now() NOT NULL,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_code_unique" UNIQUE("code"),
	CONSTRAINT "sales_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "sales_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "stock_balances" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"variation_id" varchar(64) NOT NULL,
	"product_id" varchar(64) NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"min_stock" integer DEFAULT 1 NOT NULL,
	"last_movement_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_balances_variation_id_unique" UNIQUE("variation_id")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"variation_id" varchar(64) NOT NULL,
	"product_id" varchar(64) NOT NULL,
	"type" varchar(40) NOT NULL,
	"previous_balance" integer NOT NULL,
	"moved_quantity" integer NOT NULL,
	"new_balance" integer NOT NULL,
	"unit_cost" double precision DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"reference_type" varchar(40),
	"reference_id" varchar(64),
	"user_id" varchar(64),
	"idempotency_key" varchar(120),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
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
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(140) NOT NULL,
	"email" varchar(180) NOT NULL,
	"password_hash" text NOT NULL,
	"role_id" varchar(64) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variation_id_product_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variations" ADD CONSTRAINT "product_variations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_variation_id_product_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cash_session_id_cash_sessions_id_fk" FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_variation_id_product_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variation_id_product_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ap_status_idx" ON "accounts_payable" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ar_status_idx" ON "accounts_receivable" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ar_due_date_idx" ON "accounts_receivable" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "expenses_status_idx" ON "expenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "expenses_competence_idx" ON "expenses" USING btree ("competence_date");--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_recurrence_unique_idx" ON "expenses" USING btree ("recurrence_group","recurrence_month_ref");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_code_idx" ON "orders" USING btree ("code");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_sale_idx" ON "payments" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_method_idx" ON "payments" USING btree ("method");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variations_product_idx" ON "product_variations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variations_sku_idx" ON "product_variations" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "variations_barcode_idx" ON "product_variations" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_barcode_idx" ON "products" USING btree ("barcode");--> statement-breakpoint
CREATE UNIQUE INDEX "role_module_idx" ON "role_permissions" USING btree ("role_id","module");--> statement-breakpoint
CREATE INDEX "sale_items_sale_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_product_idx" ON "sale_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sales_code_idx" ON "sales" USING btree ("code");--> statement-breakpoint
CREATE INDEX "sales_status_idx" ON "sales" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sales_confirmed_idx" ON "sales" USING btree ("confirmed_at");--> statement-breakpoint
CREATE INDEX "sales_origin_idx" ON "sales" USING btree ("origin");--> statement-breakpoint
CREATE INDEX "stock_balances_product_idx" ON "stock_balances" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_balances_variation_idx" ON "stock_balances" USING btree ("variation_id");--> statement-breakpoint
CREATE INDEX "stock_movements_variation_idx" ON "stock_movements" USING btree ("variation_id");--> statement-breakpoint
CREATE INDEX "stock_movements_product_idx" ON "stock_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_movements_type_idx" ON "stock_movements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "stock_movements_created_idx" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role_id");