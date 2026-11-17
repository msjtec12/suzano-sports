"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Plus,
  Database,
  ShieldCheck,
  AlertTriangle,
  X,
} from "lucide-react";
import { validateWhatsAppNumber } from "@/lib/utils";
import type { RoleCode } from "@/services/auth-service";

interface StoreSettingsData {
  storeName: string;
  legalName: string | null;
  segment: string;
  logoUrl: string | null;
  heroBannerUrl: string | null;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCtaText: string;
  heroSecondaryCtaText: string;
  topBarText: string;
  topBarActive: boolean;
  instagramUrl: string;
  whatsappShortLink: string;
  whatsappPhone: string | null;
  addressStreet: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  addressConfirmed: boolean;
  openingHours: string;
  mapEmbedUrl: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryNotes: string | null;
  showNumericStockToCustomer: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  promoColor: string;
  seoTitle: string;
  seoDescription: string;
  ga4Id: string | null;
  gscVerification: string | null;
  diagnostics: {
    driverMode: string;
    neonConfigured: boolean;
    description: string;
  };
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  roleCode: string;
  roleName: string;
  active: boolean;
}

export function SettingsAdminClient({
  initialSettings,
  initialUsers,
  isAdmin,
}: {
  initialSettings: StoreSettingsData;
  initialUsers: UserItem[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<StoreSettingsData>(initialSettings);
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [activeTab, setActiveTab] = useState<
    "STORE" | "HOME_SEO" | "USERS" | "DIAGNOSTICS"
  >("STORE");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Novo usuário
  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState<RoleCode>("OPERATOR");

  const waCheck = validateWhatsAppNumber(form.whatsappPhone);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar configurações.");
      }

      setForm(data.settings);
      setFeedback({
        type: "success",
        text: "Configurações da loja atualizadas com sucesso!",
      });
      router.refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao salvar.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "USER",
          name: uName,
          email: uEmail,
          password: uPassword,
          roleCode: uRole,
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar usuário.");
      }

      const listRes = await fetch("/api/admin/settings");
      if (listRes.ok) {
        const lData = await listRes.json();
        setUsers(lData.users);
      }

      setUName("");
      setUEmail("");
      setUPassword("");
      setFeedback({
        type: "success",
        text: "Colaborador cadastrado com sucesso!",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao salvar usuário.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <h1 className="text-2xl font-black text-brand-graphite">
          Configurações da Loja, SEO, Usuários & Integrações
        </h1>
        <p className="text-xs text-slate-500">
          Personalize dados comerciais, WhatsApp oficial, textos da vitrine,
          SEO, cores da marca e colaboradores.
        </p>
      </div>

      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-bold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Abas */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-extrabold">
        <button
          type="button"
          onClick={() => setActiveTab("STORE")}
          className={`rounded-xl px-4 py-2 ${
            activeTab === "STORE"
              ? "bg-brand-graphite text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Dados Comerciais, WhatsApp & Endereço
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("HOME_SEO")}
          className={`rounded-xl px-4 py-2 ${
            activeTab === "HOME_SEO"
              ? "bg-brand-graphite text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Textos da Home, Banner, SEO & Cores
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("USERS")}
            className={`rounded-xl px-4 py-2 ${
              activeTab === "USERS"
                ? "bg-brand-graphite text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Colaboradores & Perfis ({users.length})
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab("DIAGNOSTICS")}
          className={`rounded-xl px-4 py-2 ${
            activeTab === "DIAGNOSTICS"
              ? "bg-brand-graphite text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Status de Credenciais & Produção
        </button>
      </div>

      {(activeTab === "STORE" || activeTab === "HOME_SEO") && (
        <form
          onSubmit={handleSaveSettings}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
        >
          {activeTab === "STORE" ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Nome Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.storeName}
                    onChange={(e) =>
                      setForm({ ...form, storeName: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Segmento
                  </label>
                  <input
                    type="text"
                    required
                    value={form.segment}
                    onChange={(e) =>
                      setForm({ ...form, segment: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* WhatsApp Oficial com Validação */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase text-emerald-900">
                    Número Real do WhatsApp Oficial (Para links diretos wa.me)
                  </label>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                      waCheck.valid
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {waCheck.valid
                      ? `wa.me habilitado (${waCheck.normalized})`
                      : "Usando link institucional (whats.link/suzanosports)"}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <input
                      type="tel"
                      value={form.whatsappPhone || ""}
                      onChange={(e) =>
                        setForm({ ...form, whatsappPhone: e.target.value })
                      }
                      placeholder="Ex: 5511999999999 (DDI 55 + DDD 11 + Número)"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      O sistema nunca tenta adivinhar o número a partir do link
                      encurtado. Configure o número real acima para habilitar{" "}
                      <code>wa.me</code> com mensagem preenchida.
                    </p>
                  </div>
                  <div>
                    <input
                      type="url"
                      required
                      value={form.whatsappShortLink}
                      onChange={(e) =>
                        setForm({ ...form, whatsappShortLink: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Link institucional divulgado (usado enquanto o número não
                      for informado).
                    </p>
                  </div>
                </div>
              </div>

              {/* Endereço e Horários */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Rua e Número
                  </label>
                  <input
                    type="text"
                    required
                    value={form.addressStreet}
                    onChange={(e) =>
                      setForm({ ...form, addressStreet: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Bairro
                  </label>
                  <input
                    type="text"
                    required
                    value={form.addressDistrict}
                    onChange={(e) =>
                      setForm({ ...form, addressDistrict: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Cidade
                  </label>
                  <input
                    type="text"
                    required
                    value={form.addressCity}
                    onChange={(e) =>
                      setForm({ ...form, addressCity: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Estado
                  </label>
                  <input
                    type="text"
                    required
                    value={form.addressState}
                    onChange={(e) =>
                      setForm({ ...form, addressState: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    CEP
                  </label>
                  <input
                    type="text"
                    required
                    value={form.addressZip}
                    onChange={(e) =>
                      setForm({ ...form, addressZip: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Horário de Atendimento
                  </label>
                  <input
                    type="text"
                    required
                    value={form.openingHours}
                    onChange={(e) =>
                      setForm({ ...form, openingHours: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Instagram Oficial
                  </label>
                  <input
                    type="url"
                    required
                    value={form.instagramUrl}
                    onChange={(e) =>
                      setForm({ ...form, instagramUrl: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Observações de Retirada / Entrega
                  </label>
                  <input
                    type="text"
                    value={form.deliveryNotes || ""}
                    onChange={(e) =>
                      setForm({ ...form, deliveryNotes: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 rounded-xl bg-slate-50 p-4 text-xs font-bold">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.addressConfirmed}
                    onChange={(e) =>
                      setForm({ ...form, addressConfirmed: e.target.checked })
                    }
                  />
                  Endereço confirmado para publicação definitiva
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.showNumericStockToCustomer}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        showNumericStockToCustomer: e.target.checked,
                      })
                    }
                  />
                  Exibir quantidade numérica de estoque aos clientes na vitrine
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Título do Banner Principal (Hero)
                  </label>
                  <input
                    type="text"
                    required
                    value={form.heroTitle}
                    onChange={(e) =>
                      setForm({ ...form, heroTitle: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Imagem do Banner Principal (URL)
                  </label>
                  <input
                    type="text"
                    value={form.heroBannerUrl || ""}
                    onChange={(e) =>
                      setForm({ ...form, heroBannerUrl: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Subtítulo do Banner Principal
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.heroSubtitle}
                  onChange={(e) =>
                    setForm({ ...form, heroSubtitle: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Texto da Barra Superior de Campanha
                  </label>
                  <input
                    type="text"
                    value={form.topBarText}
                    onChange={(e) =>
                      setForm({ ...form, topBarText: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={form.topBarActive}
                      onChange={(e) =>
                        setForm({ ...form, topBarActive: e.target.checked })
                      }
                    />
                    Exibir barra informativa no topo do site
                  </label>
                </div>
              </div>

              {/* SEO e Google Analytics / Search Console */}
              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    SEO Title Padrão
                  </label>
                  <input
                    type="text"
                    required
                    value={form.seoTitle}
                    onChange={(e) =>
                      setForm({ ...form, seoTitle: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    SEO Description Padrão
                  </label>
                  <input
                    type="text"
                    required
                    value={form.seoDescription}
                    onChange={(e) =>
                      setForm({ ...form, seoDescription: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Google Analytics 4 ID (Opcional — Ex: G-XXXXXXXX)
                  </label>
                  <input
                    type="text"
                    value={form.ga4Id || ""}
                    onChange={(e) =>
                      setForm({ ...form, ga4Id: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Google Search Console Verification Code
                  </label>
                  <input
                    type="text"
                    value={form.gscVerification || ""}
                    onChange={(e) =>
                      setForm({ ...form, gscVerification: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Paleta de Cores Oficial da Marca */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Grafite Escuro
                  </label>
                  <input
                    type="text"
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm({ ...form, primaryColor: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Azul Esportivo
                  </label>
                  <input
                    type="text"
                    value={form.secondaryColor}
                    onChange={(e) =>
                      setForm({ ...form, secondaryColor: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Laranja Destaque
                  </label>
                  <input
                    type="text"
                    value={form.accentColor}
                    onChange={(e) =>
                      setForm({ ...form, accentColor: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Vermelho Promo
                  </label>
                  <input
                    type="text"
                    value={form.promoColor}
                    onChange={(e) =>
                      setForm({ ...form, promoColor: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-md hover:bg-sky-600"
            >
              <Save className="h-4 w-4" />
              {loading ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </form>
      )}

      {/* ABA 3: COLABORADORES E PERFIS */}
      {activeTab === "USERS" && isAdmin && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-7">
            <h2 className="text-sm font-extrabold uppercase text-brand-graphite">
              Usuários com Acesso ao Painel
            </h2>
            <div className="mt-4 space-y-2.5">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                >
                  <div>
                    <p className="font-extrabold text-brand-graphite">
                      {u.name}
                    </p>
                    <p className="text-slate-500">{u.email}</p>
                  </div>
                  <span className="rounded-full bg-brand-graphite px-3 py-1 text-[10px] font-bold text-white">
                    {u.roleName} ({u.roleCode})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-5">
            <h2 className="text-sm font-extrabold uppercase text-brand-graphite">
              Adicionar Novo Colaborador
            </h2>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-700">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-700">
                  Senha Inicial (Mín. 6 caracteres) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-700">
                  Perfil de Permissão *
                </label>
                <select
                  value={uRole}
                  onChange={(e) => setURole(e.target.value as RoleCode)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  <option value="OPERATOR">
                    Operador (PDV, Pedidos e Consulta)
                  </option>
                  <option value="MANAGER">
                    Gerente (Produtos, Estoque, Vendas, Financeiro)
                  </option>
                  <option value="ADMIN">Administrador (Acesso Completo)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-orange py-2.5 font-extrabold uppercase text-white hover:bg-orange-600"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Colaborador
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ABA 4: DIAGNÓSTICO DE CREDENCIAIS E PRODUÇÃO */}
      {activeTab === "DIAGNOSTICS" && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs text-xs">
          <h2 className="text-base font-black text-brand-graphite">
            Checklist de Integrações e Credenciais de Produção
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 font-extrabold text-brand-graphite">
                <Database className="h-4 w-4 text-brand-blue" />
                <span>Banco de Dados PostgreSQL</span>
              </div>
              <p className="mt-1 text-slate-600">
                {form.diagnostics.description}
              </p>
              {!form.diagnostics.neonConfigured && (
                <p className="mt-2 font-bold text-amber-700">
                  Pendente para Produção: Preencha <code>DATABASE_URL</code> com
                  a connection string do Neon PostgreSQL nas variáveis da Vercel.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 font-extrabold text-brand-graphite">
                {waCheck.valid ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                <span>Integração WhatsApp Oficial</span>
              </div>
              <p className="mt-1 text-slate-600">
                {waCheck.valid
                  ? `Número validado (${waCheck.normalized}) ativo para envio direto wa.me.`
                  : "Utilizando link institucional https://whats.link/suzanosports. Informe o telefone real na primeira aba para abrir conversas wa.me com resumo automático."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
