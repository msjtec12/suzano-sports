# Suzano Sports — Plataforma Comercial Full Stack
**Vitrine Digital, Controle de Estoque Auditável, Pedidos WhatsApp, Frente de Caixa (PDV) e Gestão Financeira Gerencial**

Plataforma desenvolvida integralmente para a loja **Suzano Sports** (Rua Benjamin Constant, 810 — Centro, Suzano — SP, CEP 08674-010).

---

## 1. Arquitetura e Tecnologias

- **Frontend & Backend:** Next.js 15 (App Router), React 19, TypeScript (`strict: true`), Tailwind CSS, Lucide Icons.
- **Banco de Dados:** Neon PostgreSQL (`@neondatabase/serverless`) com Drizzle ORM (`drizzle-orm/pg-core`) e migrações versionadas em `drizzle/migrations`.
  - *Modo Local Persistente Automático:* Caso `DATABASE_URL` ainda não esteja apontando para o Neon PostgreSQL, o sistema inicializa automaticamente uma instância real **PostgreSQL 16 (PGlite)** persistida em disco (`.data/pglite-suzano-sports`), garantindo transações ACID e persistência real entre reinicializações durante o desenvolvimento e homologação.
- **Segurança & Autenticação:**
  - Sessões HTTP-Only assinadas via `jose` (HS256) com cookie seguro `szs_admin_session`.
  - Senhas protegidas com `scrypt` (`salt` de 16 bytes + comparação em tempo constante `timingSafeEqual`).
  - Controle de Acesso Baseado em Perfis (RBAC): `ADMIN` (Administrador), `MANAGER` (Gerente) e `OPERATOR` (Operador).
  - Rate limiting por IP e bloqueio temporário de conta após 5 tentativas de login inválidas consecutivas.
  - Trilha de auditoria (`audit_logs`) para todas as operações sensíveis.

---

## 2. Instalação e Execução Local

```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente de exemplo
cp .env.example .env

# 3. Inicializar banco de dados (migrações + seed de perfis, categorias e configurações)
npm run db:setup

# 4. Executar suíte de testes automatizados (21 fluxos obrigatórios)
npm test

# 5. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse:
- **Vitrine Pública:** `http://localhost:3000`
- **Catálogo de Produtos:** `http://localhost:3000/catalogo`
- **Localização e Contato:** `http://localhost:3000/localizacao`
- **Painel Administrativo / PDV:** `http://localhost:3000/admin`

### Credenciais de Homologação Local (Desenvolvimento)
*(Em produção, defina `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` nas variáveis de ambiente antes do primeiro seed)*:
- **Administrador:** `admin@suzanosports.com.br` | Senha: `Suzano@Admin2026`
- **Gerente:** `gerente@suzanosports.com.br` | Senha: `Suzano@Gerente2026`
- **Operador (PDV/Pedidos):** `operador@suzanosports.com.br` | Senha: `Suzano@Operador2026`

---

## 3. Variáveis de Ambiente e Credenciais Pendentes para Produção

Configure as seguintes variáveis no painel da **Vercel** antes da publicação definitiva:

| Variável | Obrigatória em Produção | Finalidade |
| :--- | :---: | :--- |
| `DATABASE_URL` | **Sim** | Connection string do **Neon PostgreSQL** (`postgresql://user:pass@ep-...neon.tech/neondb?sslmode=require`). |
| `AUTH_SECRET` | **Sim** | Chave secreta com no mínimo 32 bytes para assinatura das sessões (`openssl rand -base64 32`). |
| `INITIAL_ADMIN_EMAIL` | **Sim** | E-mail do administrador principal criado no primeiro boot. |
| `INITIAL_ADMIN_PASSWORD` | **Sim** | Senha forte inicial do administrador em produção. |
| `NEXT_PUBLIC_STORE_WHATSAPP` | Recomendado | Telefone real da Suzano Sports com DDI+DDD (ex: `5511999999999`). Também editável em `/admin/configuracoes`. |
| `NEXT_PUBLIC_SITE_URL` | Recomendado | Domínio oficial (ex: `https://suzanosports.com.br`) para Sitemap, Canonical e Schema.org. |
| `NEXT_PUBLIC_GA4_ID` | Opcional | ID do Google Analytics 4 (`G-XXXXXXXXXX`). |
| `NEXT_PUBLIC_GSC_VERIFICATION` | Opcional | Código de verificação do Google Search Console. |
| `BLOB_READ_WRITE_TOKEN` | Opcional | Token para Object Storage na nuvem (Vercel Blob / S3 compatível). |

---

## 4. Deploy na Vercel

1. Conecte o repositório GitHub à **Vercel** (região recomendada: `gru1` — São Paulo, já configurada em `vercel.json`).
2. Adicione o banco **Neon PostgreSQL** pelo Marketplace da Vercel ou cole a `DATABASE_URL` do seu projeto Neon.
3. Configure `AUTH_SECRET`, `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`.
4. Após o deploy, acesse `/admin/configuracoes` para:
   - Informar e validar o número oficial de WhatsApp da loja (habilitando links diretos `wa.me`).
   - Confirmar o endereço comercial antes da divulgação definitiva.
   - Cadastrar os produtos reais no modo **Cadastro Rápido** ou **Cadastro Completo**.
