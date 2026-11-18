import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { hashPassword } from "../lib/crypto";

export const INITIAL_BRANDS = [
  { id: "brd_kenner", name: "Kenner", slug: "kenner", active: true },
  { id: "brd_olympikus", name: "Olympikus", slug: "olympikus", active: true },
  { id: "brd_mizuno", name: "Mizuno", slug: "mizuno", active: true },
  { id: "brd_fila", name: "FILA", slug: "fila", active: true },
  { id: "brd_reebok", name: "Reebok", slug: "reebok", active: true },
  { id: "brd_adidas", name: "Adidas", slug: "adidas", active: true },
  { id: "brd_puma", name: "Puma", slug: "puma", active: true },
  { id: "brd_nike", name: "Nike", slug: "nike", active: true },
];

export const INITIAL_CATEGORIES = [
  {
    id: "cat_tenis_esportivos",
    name: "Tênis Esportivos e Casuais",
    slug: "tenis-esportivos-e-casuais",
    description:
      "Tênis Olympikus, Mizuno, FILA, Reebok, Nike, Adidas e Puma para caminhada, corrida e uso diário no centro de Suzano.",
    seoTitle: "Tênis Esportivos e Casuais em Suzano | Suzano Sports",
    seoDescription:
      "Encontre tênis Olympikus, Mizuno, FILA, Nike e Adidas na Suzano Sports, Rua Benjamin Constant, 810 — Centro de Suzano.",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
    sortOrder: 1,
  },
  {
    id: "cat_chinelos_sandalias",
    name: "Chinelos e Sandálias Kenner",
    slug: "chinelos-e-sandalias",
    description:
      "Linha Kenner Red, Re.Defina, Kivah e chinelos esportivos originais a partir de R$ 49,99 na loja física e WhatsApp.",
    seoTitle: "Chinelos Kenner em Suzano | Suzano Sports",
    seoDescription:
      "Chinelos Kenner Red, Re.Defina e sandálias esportivas com ofertas a partir de R$ 49,99 na Suzano Sports no centro de Suzano.",
    imageUrl:
      "https://images.unsplash.com/photo-1603487742131-4160ec999306?auto=format&fit=crop&w=800&q=80",
    sortOrder: 2,
  },
  {
    id: "cat_roupas_esportivas",
    name: "Roupas Esportivas",
    slug: "roupas-esportivas",
    description:
      "Camisetas dry, camisas de time, conjuntos de agasalho, bermudas e vestuário de treino masculino e feminino.",
    seoTitle: "Roupas Esportivas e Agasalhos em Suzano | Suzano Sports",
    seoDescription:
      "Roupas esportivas, conjuntos de agasalho, camisetas dry e bermudas na Suzano Sports, no centro de Suzano.",
    imageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
    sortOrder: 3,
  },
  {
    id: "cat_calcados_treino",
    name: "Calçados para Treino",
    slug: "calcados-para-treino",
    description:
      "Calçados com estabilidade, amortecimento e aderência ideais para academia, funcional e corrida.",
    seoTitle: "Calçados para Treino e Academia em Suzano | Suzano Sports",
    seoDescription:
      "Calçados para treino, academia e corrida na Suzano Sports. Confira disponibilidade de cores e tamanhos.",
    imageUrl:
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80",
    sortOrder: 4,
  },
  {
    id: "cat_futebol",
    name: "Artigos de Futebol",
    slug: "artigos-de-futebol",
    description:
      "Camisas de clubes, chuteiras de campo, society e futsal, bolas, meiões e caneleiras.",
    seoTitle: "Artigos de Futebol, Camisas e Chuteiras em Suzano | Suzano Sports",
    seoDescription:
      "Chuteiras society, futsal, campo, camisas de futebol e bolas na Suzano Sports, Rua Benjamin Constant, 810 - Suzano.",
    imageUrl:
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80",
    sortOrder: 5,
  },
  {
    id: "cat_mochilas_acessorios",
    name: "Mochilas e Acessórios",
    slug: "mochilas-e-acessorios",
    description:
      "Mochilas reforçadas, bolsas de treino, pochetes, meias esportivas e acessórios práticos.",
    seoTitle: "Mochilas Esportivas e Acessórios em Suzano | Suzano Sports",
    seoDescription:
      "Mochilas esportivas para treino, estudo e rotina diária na Suzano Sports em Suzano - SP.",
    imageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
    sortOrder: 6,
  },
  {
    id: "cat_bones",
    name: "Bonés",
    slug: "bones",
    description:
      "Bonés aba curva e reta, modelos respiráveis para corrida, treino ao ar livre e estilo casual.",
    seoTitle: "Bonés Esportivos e Casuais em Suzano | Suzano Sports",
    seoDescription:
      "Variedade de bonés esportivos e casuais na Suzano Sports, no centro de Suzano.",
    imageUrl:
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80",
    sortOrder: 7,
  },
  {
    id: "cat_outlet_promocoes",
    name: "Outlet e Promoções",
    slug: "outlet-e-promocoes",
    description:
      "Ofertas imperdíveis da faixa da loja: Chinelo Kenner a partir de R$ 49,99 e Tênis Olympikus a partir de R$ 99,99.",
    seoTitle: "Outlet Esportivo em Suzano | Ofertas Suzano Sports",
    seoDescription:
      "Confira as ofertas de outlet esportivo em Suzano: Chinelo Kenner R$ 49,99 e Tênis Olympikus R$ 99,99 na Suzano Sports.",
    imageUrl:
      "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=800&q=80",
    sortOrder: 8,
  },
];

export const STARTER_PRODUCTS = [
  {
    id: "prd_starter_1",
    name: "Chinelo Kenner Red Re.Defina Original",
    slug: "chinelo-kenner-red-re-defina",
    sku: "SZS-KEN-101",
    barcode: "7891000001015",
    categoryId: "cat_chinelos_sandalias",
    brandId: "brd_kenner",
    subcategoryName: "Kenner Red",
    shortDescription:
      "Oferta em destaque na fachada da loja! Chinelo Kenner Red Re.Defina com palmilha extramacia impermeável e solado tratorado antiderrapante.",
    fullDescription:
      "Destaque oficial da vitrine Suzano Sports (Rua Benjamin Constant, 810). A linha Kenner Red Re.Defina entrega durabilidade superior, cabedal em gel macio e design marcante nas cores vermelho, laranja, preto e branco.",
    costPrice: 27.9,
    salePrice: 79.99,
    promoPrice: 49.99,
    minStock: 3,
    isFeatured: true,
    isPromo: true,
    imageUrl:
      "https://images.unsplash.com/photo-1603487742131-4160ec999306?auto=format&fit=crop&w=900&q=80",
    variations: [
      { id: "var_st1_1", sku: "SZS-KEN-101-VM-38", color: "Vermelho/Preto", size: "37/38", qty: 5 },
      { id: "var_st1_2", sku: "SZS-KEN-101-VM-40", color: "Vermelho/Preto", size: "39/40", qty: 8 },
      { id: "var_st1_3", sku: "SZS-KEN-101-VM-42", color: "Vermelho/Preto", size: "41/42", qty: 6 },
      { id: "var_st1_4", sku: "SZS-KEN-101-LR-40", color: "Laranja/Branco", size: "39/40", qty: 5 },
      { id: "var_st1_5", sku: "SZS-KEN-101-PR-42", color: "Preto/Branco", size: "41/42", qty: 4 },
    ],
  },
  {
    id: "prd_starter_2",
    name: "Tênis Olympikus Corrida & Caminhada",
    slug: "tenis-olympikus-corrida-caminhada",
    sku: "SZS-OLY-102",
    barcode: "7891000001022",
    categoryId: "cat_tenis_esportivos",
    brandId: "brd_olympikus",
    subcategoryName: "Corrida e Caminhada",
    shortDescription:
      "Oferta da faixa da loja! Tênis Olympikus leve com tecnologia de amortecimento EVASense para rotina diária e caminhada.",
    fullDescription:
      "Um dos campeões de vendas na Suzano Sports! O Tênis Olympikus oferece cabedal têxtil respirável, extrema leveza e solado em EVA macio. Promoção especial da fachada por R$ 99,99.",
    costPrice: 58,
    salePrice: 149.99,
    promoPrice: 99.99,
    minStock: 2,
    isFeatured: true,
    isPromo: true,
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    variations: [
      { id: "var_st2_1", sku: "SZS-OLY-102-PR-38", color: "Preto/Branco", size: "38", qty: 4 },
      { id: "var_st2_2", sku: "SZS-OLY-102-PR-39", color: "Preto/Branco", size: "39", qty: 6 },
      { id: "var_st2_3", sku: "SZS-OLY-102-PR-40", color: "Preto/Branco", size: "40", qty: 7 },
      { id: "var_st2_4", sku: "SZS-OLY-102-AZ-41", color: "Azul Marinho", size: "41", qty: 5 },
    ],
  },
  {
    id: "prd_starter_3",
    name: "Tênis Mizuno Wave Treino & Corrida",
    slug: "tenis-mizuno-wave-treino-corrida",
    sku: "SZS-MIZ-103",
    barcode: "7891000002012",
    categoryId: "cat_calcados_treino",
    brandId: "brd_mizuno",
    subcategoryName: "Performance",
    shortDescription:
      "Estabilidade com placa Wave, amortecimento responsivo e solado X10 de alta durabilidade para treinos e corridas.",
    fullDescription:
      "Ideal para quem busca suporte, absorção de impacto e resistência superior tanto na esteira quanto no asfalto.",
    costPrice: 145,
    salePrice: 299.9,
    promoPrice: 249.9,
    minStock: 2,
    isFeatured: true,
    isPromo: true,
    imageUrl:
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=900&q=80",
    variations: [
      { id: "var_st3_1", sku: "SZS-MIZ-103-GR-39", color: "Grafite/Laranja", size: "39", qty: 3 },
      { id: "var_st3_2", sku: "SZS-MIZ-103-GR-40", color: "Grafite/Laranja", size: "40", qty: 5 },
      { id: "var_st3_3", sku: "SZS-MIZ-103-GR-42", color: "Grafite/Laranja", size: "42", qty: 4 },
      { id: "var_st3_4", sku: "SZS-MIZ-103-PR-41", color: "Preto/Azul", size: "41", qty: 3 },
    ],
  },
  {
    id: "prd_starter_4",
    name: "Tênis FILA Street & Academia",
    slug: "tenis-fila-street-academia",
    sku: "SZS-FIL-104",
    barcode: "7891000003019",
    categoryId: "cat_tenis_esportivos",
    brandId: "brd_fila",
    subcategoryName: "Casual Esportivo",
    shortDescription:
      "Estilo esportivo autêntico FILA com entressola macia Energized Rubber para o dia a dia e academia.",
    fullDescription:
      "Design moderno com excelente ajuste no pé, colarinho acolchoado e palmilha confortável para uso prolongado.",
    costPrice: 110,
    salePrice: 229.9,
    promoPrice: 189.9,
    minStock: 2,
    isFeatured: true,
    isPromo: true,
    imageUrl:
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
    variations: [
      { id: "var_st4_1", sku: "SZS-FIL-104-BR-37", color: "Branco/Marinho", size: "37", qty: 4 },
      { id: "var_st4_2", sku: "SZS-FIL-104-BR-38", color: "Branco/Marinho", size: "38", qty: 5 },
      { id: "var_st4_3", sku: "SZS-FIL-104-PR-40", color: "Preto", size: "40", qty: 6 },
      { id: "var_st4_4", sku: "SZS-FIL-104-PR-41", color: "Preto", size: "41", qty: 4 },
      { id: "var_st4_5", sku: "SZS-FIL-104-PR-42", color: "Preto", size: "42", qty: 3 },
    ],
  },
  {
    id: "prd_starter_5",
    name: "Camisa de Futebol Torcedor Oficial",
    slug: "camisa-de-futebol-torcedor-oficial",
    sku: "SZS-CAM-105",
    barcode: "7891000003026",
    categoryId: "cat_futebol",
    brandId: "brd_adidas",
    subcategoryName: "Camisas de Futebol",
    shortDescription:
      "Modelos em exposição nos manequins da vitrine! Tecido respirável de secagem rápida com escudo bordado.",
    fullDescription:
      "Camisas esportivas de clubes e seleções disponíveis na vitrine da Suzano Sports. Caimento confortável para torcer ou jogar.",
    costPrice: 55,
    salePrice: 129.9,
    promoPrice: 99.9,
    minStock: 2,
    isFeatured: true,
    isPromo: true,
    imageUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    variations: [
      { id: "var_st5_1", sku: "SZS-CAM-105-VM-M", color: "Vermelha/Branca", size: "M", qty: 5 },
      { id: "var_st5_2", sku: "SZS-CAM-105-VM-G", color: "Vermelha/Branca", size: "G", qty: 6 },
      { id: "var_st5_3", sku: "SZS-CAM-105-PR-G", color: "Preta/Branca", size: "G", qty: 5 },
    ],
  },
  {
    id: "prd_starter_6",
    name: "Chuteira Society Puma Future Grip",
    slug: "chuteira-society-puma-future-grip",
    sku: "SZS-PUM-106",
    barcode: "7891000004016",
    categoryId: "cat_futebol",
    brandId: "brd_puma",
    subcategoryName: "Chuteiras Society",
    shortDescription:
      "Solado de borracha com microtravas para grama sintética e cabedal texturizado para domínio de bola.",
    fullDescription:
      "Conforto imediato e ajuste firme no tornozelo para partidas de futebol society com alta tração.",
    costPrice: 98,
    salePrice: 219.9,
    promoPrice: 179.9,
    minStock: 2,
    isFeatured: false,
    isPromo: true,
    imageUrl:
      "https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=900&q=80",
    variations: [
      { id: "var_st6_1", sku: "SZS-PUM-106-LR-39", color: "Laranja/Preto", size: "39", qty: 3 },
      { id: "var_st6_2", sku: "SZS-PUM-106-LR-40", color: "Laranja/Preto", size: "40", qty: 5 },
      { id: "var_st6_3", sku: "SZS-PUM-106-LR-41", color: "Laranja/Preto", size: "41", qty: 4 },
      { id: "var_st6_4", sku: "SZS-PUM-106-AZ-40", color: "Azul/Branco", size: "40", qty: 3 },
    ],
  },
  {
    id: "prd_starter_7",
    name: "Conjunto Agasalho Esportivo Treino & Inverno",
    slug: "conjunto-agasalho-esportivo-treino",
    sku: "SZS-AGA-107",
    barcode: "7891000004023",
    categoryId: "cat_roupas_esportivas",
    brandId: "brd_nike",
    subcategoryName: "Agasalhos e Conjuntos",
    shortDescription:
      "Conjunto jaqueta com zíper + calça esportiva (em destaque no manequim da vitrine da loja).",
    fullDescription:
      "Confeccionado em poliéster peluciado internamente com ótimo isolamento térmico e liberdade de movimentos.",
    costPrice: 95,
    salePrice: 199.9,
    promoPrice: 169.9,
    minStock: 2,
    isFeatured: true,
    isPromo: true,
    imageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
    variations: [
      { id: "var_st7_1", sku: "SZS-AGA-107-PR-M", color: "Preto/Grafite", size: "M", qty: 4 },
      { id: "var_st7_2", sku: "SZS-AGA-107-PR-G", color: "Preto/Grafite", size: "G", qty: 5 },
    ],
  },
  {
    id: "prd_starter_8",
    name: "Tênis Reebok Cross Functional",
    slug: "tenis-reebok-cross-functional",
    sku: "SZS-REE-108",
    barcode: "7891000005013",
    categoryId: "cat_calcados_treino",
    brandId: "brd_reebok",
    subcategoryName: "Academia e Cross",
    shortDescription:
      "Base firme e cabedal resistente à abrasão para musculação, funcional e corrida curta.",
    fullDescription:
      "Excelente estabilidade lateral e conforto anatômico da linha esportiva Reebok.",
    costPrice: 118,
    salePrice: 239.9,
    promoPrice: null,
    minStock: 2,
    isFeatured: false,
    isPromo: false,
    imageUrl:
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=900&q=80",
    variations: [
      { id: "var_st8_1", sku: "SZS-REE-108-PR-39", color: "Preto/Branco", size: "39", qty: 4 },
      { id: "var_st8_2", sku: "SZS-REE-108-PR-40", color: "Preto/Branco", size: "40", qty: 6 },
      { id: "var_st8_3", sku: "SZS-REE-108-PR-41", color: "Preto/Branco", size: "41", qty: 5 },
    ],
  },
  {
    id: "prd_starter_9",
    name: "Mochila Esportiva Adidas Treino 26L",
    slug: "mochila-esportiva-adidas-treino-26l",
    sku: "SZS-MOC-109",
    barcode: "7891000006010",
    categoryId: "cat_mochilas_acessorios",
    brandId: "brd_adidas",
    subcategoryName: "Mochilas",
    shortDescription:
      "Compartimento principal espaçoso, base reforçada resistente à umidade e alças ergonômicas.",
    fullDescription:
      "Ideal para academia, trabalho, faculdade e viagens curtas, com bolsos laterais e frontal com zíper.",
    costPrice: 68,
    salePrice: 149.9,
    promoPrice: 129.9,
    minStock: 2,
    isFeatured: false,
    isPromo: true,
    imageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    variations: [
      { id: "var_st9_1", sku: "SZS-MOC-109-PR", color: "Preta", size: "Único", qty: 6 },
      { id: "var_st9_2", sku: "SZS-MOC-109-AZ", color: "Azul Marinho", size: "Único", qty: 4 },
    ],
  },
  {
    id: "prd_starter_10",
    name: "Boné Nike Dri-FIT Aba Curva",
    slug: "bone-nike-dri-fit-aba-curva",
    sku: "SZS-BON-110",
    barcode: "7891000007017",
    categoryId: "cat_bones",
    brandId: "brd_nike",
    subcategoryName: "Aba Curva",
    shortDescription:
      "Tecnologia antissuor, tecido leve respirável e fecho regulável traseiro.",
    fullDescription:
      "Proteção solar e estilo esportivo autêntico para treinos ao ar livre e dia a dia.",
    costPrice: 38,
    salePrice: 89.9,
    promoPrice: 69.9,
    minStock: 2,
    isFeatured: false,
    isPromo: true,
    imageUrl:
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=80",
    variations: [
      { id: "var_st10_1", sku: "SZS-BON-110-PR", color: "Preto", size: "Único", qty: 7 },
      { id: "var_st10_2", sku: "SZS-BON-110-BR", color: "Branco", size: "Único", qty: 5 },
    ],
  },
];

const MODULES = [
  "dashboard",
  "products",
  "stock",
  "orders",
  "pos",
  "finance",
  "reports",
  "settings",
  "users",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedStarterCatalogIfEmpty(db: any) {
  if (process.env.VITEST) return;

  // Garante que as 8 marcas da fachada estão cadastradas
  const existingBrands = await db.select().from(schema.brands);
  const existingBrandIds = new Set(existingBrands.map((b: { id: string }) => b.id));
  for (const b of INITIAL_BRANDS) {
    if (!existingBrandIds.has(b.id)) {
      await db.insert(schema.brands).values(b);
    }
  }

  // Atualiza configurações da loja com o WhatsApp real da fachada (11 95914-8681) e foto da fachada
  await db
    .update(schema.storeSettings)
    .set({
      logoUrl: "/brand/suzano-sports-logo-original.png",
      heroBannerUrl: "/brand/fachada-suzano-sports.jpg",
      whatsappPhone: "5511959148681",
      addressConfirmed: true,
      topBarText:
        "Ofertas da Loja Física: Chinelo Kenner R$ 49,99 e Tênis Olympikus R$ 99,99 • WhatsApp (11) 95914-8681",
      updatedAt: new Date(),
    })
    .where(eq(schema.storeSettings.id, "default"));

  const existingProducts = await db.select().from(schema.products);
  if (existingProducts.length > 0) {
    const alreadySyncedFacade = existingProducts.some(
      (ep: { id: string; brandId: string | null }) =>
        ep.id === "prd_starter_1" && ep.brandId === "brd_kenner"
    );
    if (alreadySyncedFacade) {
      return;
    }

    // Atualiza os produtos starter existentes caso ainda estejam sem as marcas da fachada
    for (const p of STARTER_PRODUCTS) {
      await db
        .update(schema.products)
        .set({
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          categoryId: p.categoryId,
          brandId: p.brandId,
          subcategoryName: p.subcategoryName,
          shortDescription: p.shortDescription,
          fullDescription: p.fullDescription,
          costPrice: p.costPrice,
          salePrice: p.salePrice,
          promoPrice: p.promoPrice,
          isFeatured: p.isFeatured,
          isPromo: p.isPromo,
          updatedAt: new Date(),
        })
        .where(eq(schema.products.id, p.id));

      await db
        .update(schema.productImages)
        .set({
          url: p.imageUrl,
          altText: p.name,
        })
        .where(eq(schema.productImages.productId, p.id));
    }
    return;
  }

  for (const p of STARTER_PRODUCTS) {
    await db.insert(schema.products).values({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      barcode: p.barcode,
      categoryId: p.categoryId,
      brandId: p.brandId,
      subcategoryName: p.subcategoryName,
      shortDescription: p.shortDescription,
      fullDescription: p.fullDescription,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      promoPrice: p.promoPrice,
      minStock: p.minStock,
      isFeatured: p.isFeatured,
      isPromo: p.isPromo,
      hasVariations: p.variations.length > 1,
      status: "ACTIVE",
    });

    await db.insert(schema.productImages).values({
      id: `img_${p.id}`,
      productId: p.id,
      url: p.imageUrl,
      altText: p.name,
      isPrimary: true,
      sortOrder: 0,
    });

    for (const v of p.variations) {
      await db.insert(schema.productVariations).values({
        id: v.id,
        productId: p.id,
        sku: v.sku,
        barcode: p.barcode,
        color: v.color,
        size: v.size,
        minStock: 2,
        active: true,
      });

      await db.insert(schema.stockBalances).values({
        id: `stb_${v.id}`,
        variationId: v.id,
        productId: p.id,
        quantity: v.qty,
        reservedQuantity: 0,
        minStock: 2,
      });

      await db.insert(schema.stockMovements).values({
        id: `stm_init_${v.id}`,
        variationId: v.id,
        productId: p.id,
        type: "ENTRY",
        previousBalance: 0,
        movedQuantity: v.qty,
        newBalance: v.qty,
        unitCost: p.costPrice,
        reason: "Carga inicial de estoque de operação Suzano Sports",
        referenceType: "INITIAL",
        referenceId: p.id,
      });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedEssentialData(db: any) {
  // 1. Perfis de acesso (RBAC)
  const existingRoles = await db.select().from(schema.roles);
  if (existingRoles.length === 0) {
    await db.insert(schema.roles).values([
      {
        id: "role_admin",
        code: "ADMIN",
        name: "Administrador",
        description: "Acesso total a todos os módulos, configurações financeiras e usuários.",
      },
      {
        id: "role_manager",
        code: "MANAGER",
        name: "Gerente",
        description: "Gestão de produtos, estoque, vendas, pedidos, PDV, financeiro e relatórios.",
      },
      {
        id: "role_operator",
        code: "OPERATOR",
        name: "Operador",
        description: "Atendimento de pedidos, PDV (vendas de balcão) e consulta de produtos/estoque.",
      },
    ]);

    const perms: (typeof schema.rolePermissions.$inferInsert)[] = [];
    for (const mod of MODULES) {
      perms.push({
        id: `perm_admin_${mod}`,
        roleId: "role_admin",
        module: mod,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApproveDiscount: true,
      });

      const isManagerAllowed = mod !== "users";
      perms.push({
        id: `perm_manager_${mod}`,
        roleId: "role_manager",
        module: mod,
        canView: isManagerAllowed,
        canCreate: isManagerAllowed && mod !== "settings",
        canEdit: isManagerAllowed,
        canDelete: mod === "products" || mod === "finance",
        canApproveDiscount: true,
      });

      const isOperatorView =
        mod === "dashboard" ||
        mod === "products" ||
        mod === "stock" ||
        mod === "orders" ||
        mod === "pos";
      const isOperatorWrite = mod === "orders" || mod === "pos" || mod === "stock";
      perms.push({
        id: `perm_operator_${mod}`,
        roleId: "role_operator",
        module: mod,
        canView: isOperatorView,
        canCreate: isOperatorWrite,
        canEdit: mod === "orders" || mod === "pos",
        canDelete: false,
        canApproveDiscount: false,
      });
    }
    await db.insert(schema.rolePermissions).values(perms);
  }

  // 2. Configurações iniciais da Suzano Sports
  const existingSettings = await db
    .select()
    .from(schema.storeSettings)
    .where(eq(schema.storeSettings.id, "default"));
  if (existingSettings.length === 0) {
    await db.insert(schema.storeSettings).values({
      id: "default",
      storeName: "Suzano Sports",
      legalName: "Suzano Sports Artigos Esportivos",
      segment: "Loja de artigos esportivos, vestuário e outlet",
      logoUrl: "/brand/suzano-sports-logo-original.png",
      heroBannerUrl: "/brand/fachada-suzano-sports.jpg",
      heroTitle: "Seu estilo. Seu esporte. Seu preço.",
      heroSubtitle:
        "Calçados, roupas e acessórios esportivos das marcas Mizuno, FILA, Reebok, Adidas, Puma, Nike, Olympikus e Kenner no centro de Suzano.",
      heroPrimaryCtaText: "Ver produtos",
      heroSecondaryCtaText: "Conferir promoções",
      topBarText:
        "Ofertas da Loja Física: Chinelo Kenner R$ 49,99 e Tênis Olympikus R$ 99,99 • WhatsApp (11) 95914-8681",
      topBarActive: true,
      instagramUrl: "https://www.instagram.com/suzano_sports/",
      whatsappShortLink: "https://whats.link/suzanosports",
      whatsappPhone: "5511959148681",
      addressStreet: "Rua Benjamin Constant, 810",
      addressDistrict: "Centro",
      addressCity: "Suzano",
      addressState: "SP",
      addressZip: "08674-010",
      addressConfirmed: true,
      openingHours: "Segunda a Sábado das 09h às 19h",
      pickupEnabled: true,
      deliveryEnabled: true,
      showNumericStockToCustomer: false,
      primaryColor: "#101522",
      secondaryColor: "#087BD3",
      accentColor: "#FF7215",
      promoColor: "#E83229",
    });
  }

  // 3. Categorias iniciais identificadas nas referências
  const existingCategories = await db.select().from(schema.categories);
  if (existingCategories.length === 0) {
    await db.insert(schema.categories).values(INITIAL_CATEGORIES);
  }

  // 4. Campanha sazonal inicial editável (baseada na faixa da fachada!)
  const existingCampaigns = await db.select().from(schema.campaigns);
  if (existingCampaigns.length === 0) {
    await db.insert(schema.campaigns).values({
      id: "camp_sazonal_1",
      title: "Promoção da Fachada: Chinelo Kenner R$ 49,99 & Tênis Olympikus R$ 99,99",
      subtitle:
        "Garanta na loja física (Rua Benjamin Constant, 810 — Centro de Suzano) ou monte sua sacola no site e chame no WhatsApp (11) 95914-8681.",
      badgeText: "Promoção Imperdível Suzano Sports",
      ctaText: "Ver ofertas agora",
      ctaUrl: "/catalogo?promocao=true",
      bannerImageUrl: "/brand/fachada-suzano-sports.jpg",
      active: true,
    });
  }

  // 5. Usuários iniciais
  const existingUsers = await db.select().from(schema.users);
  if (existingUsers.length === 0) {
    const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    const envAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || (isProduction ? "" : "admin@suzanosports.com.br"))
      .trim()
      .toLowerCase();
    const adminPass = process.env.INITIAL_ADMIN_PASSWORD || (isProduction ? "" : "Suzano@Admin2026");
    if (!envAdminEmail || !adminPass || (isProduction && adminPass.length < 12)) {
      throw new Error("INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD (mín. 12 caracteres) são obrigatórios no primeiro provisionamento em produção.");
    }
    await db.insert(schema.users).values({
      id: "user_admin_1",
      name: process.env.INITIAL_ADMIN_NAME || "Administrador Suzano Sports",
      email: envAdminEmail,
      passwordHash: hashPassword(adminPass),
      roleId: "role_admin",
      active: true,
    });

    // Contas de homologação nunca são criadas automaticamente em produção.
    if (!isProduction) {
      await db.insert(schema.users).values([
        {
          id: "user_manager_1",
          name: "Gerente da Loja",
          email: "gerente@suzanosports.com.br",
          passwordHash: hashPassword(process.env.INITIAL_MANAGER_PASSWORD || "Suzano@Gerente2026"),
          roleId: "role_manager",
          active: true,
        },
        {
          id: "user_operator_1",
          name: "Operador de Caixa / Atendimento",
          email: "operador@suzanosports.com.br",
          passwordHash: hashPassword(process.env.INITIAL_OPERATOR_PASSWORD || "Suzano@Operador2026"),
          roleId: "role_operator",
          active: true,
        },
      ]);
    }
  }

  // 6. Catálogo inicial de operação
  await seedStarterCatalogIfEmpty(db);
}
