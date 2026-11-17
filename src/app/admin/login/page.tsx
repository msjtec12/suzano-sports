"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, LogIn, ArrowLeft, ShieldAlert } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Credenciais inválidas.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Erro ao efetuar login."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-brand-graphite px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex flex-col items-center justify-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/suzano-sports-logo-original.png"
            alt="Logo Oficial Suzano Sports"
            className="h-24 w-24 rounded-full border-2 border-brand-blue object-contain shadow-lg"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/suzano-sports-logo.svg"
            alt="Suzano Sports"
            className="h-12 w-auto"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
          <div className="flex items-center gap-2.5 text-brand-graphite">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black">Painel Administrativo</h1>
              <p className="text-xs text-slate-500">
                Acesso restrito a colaboradores autorizados
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700">
                E-mail Corporativo
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@suzanosports.com.br"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-brand-graphite focus:border-brand-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700">
                Senha de Acesso
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-brand-graphite focus:border-brand-blue focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-sky-600 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Verificando acesso..." : "Entrar no Sistema"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-blue"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para a Vitrine da Loja
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
