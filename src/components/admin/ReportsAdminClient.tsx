"use client";

import React, { useState } from "react";
import { Download, Printer, FileBarChart } from "lucide-react";
import type { ReportType } from "@/services/finance-and-reports-service";

const REPORT_TYPES: { code: ReportType; label: string }[] = [
  { code: "DAILY_SALES", label: "Relatório Diário de Vendas" },
  { code: "SALES_BY_PRODUCT", label: "Vendas por Produto" },
  { code: "SALES_BY_CATEGORY", label: "Vendas por Categoria" },
  { code: "CURRENT_STOCK", label: "Estoque Atual Completo" },
  { code: "LOW_STOCK", label: "Estoque Abaixo do Mínimo" },
  { code: "STOCK_VALUATION", label: "Valor de Estoque a Custo" },
  { code: "MONTHLY_REVENUE_EXPENSES", label: "Receita e Despesas Mensais" },
  { code: "CASH_FLOW", label: "Fluxo de Caixa" },
  { code: "MANAGERIAL_RESULT", label: "Resultado Gerencial (DRE)" },
  { code: "PENDING_RECEIVABLES", label: "Recebimentos Pendentes" },
];

export function ReportsAdminClient({
  initialReport,
}: {
  initialReport: {
    title: string;
    generatedAt: string;
    headers: string[];
    rows: (string | number)[][];
  };
}) {
  const [selectedType, setSelectedType] = useState<ReportType>("DAILY_SALES");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);

  const loadReport = async (type: ReportType) => {
    setSelectedType(type);
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCsvUrl = () => {
    const params = new URLSearchParams({
      type: selectedType,
      format: "csv",
    });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return `/api/admin/reports?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-black text-brand-graphite">
            Relatórios Gerenciais — Exportação CSV & PDF
          </h1>
          <p className="text-xs text-slate-500">
            Relatórios de vendas, estoque, receitas, despesas, fluxo de caixa e
            resultado gerencial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={getCsvUrl()}
            download
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-xs hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            Exportar CSV (Excel)
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-graphite px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-brand-blue"
          >
            <Printer className="h-4 w-4" />
            Exportar PDF / Imprimir
          </button>
        </div>
      </div>

      {/* Seletor de Relatórios e Período */}
      <div className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="mb-4 flex flex-wrap items-end gap-3 border-b border-slate-100 pb-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => loadReport(selectedType)}
            className="rounded-lg bg-brand-blue px-4 py-1.5 text-xs font-bold text-white hover:bg-sky-600"
          >
            Atualizar Relatório
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.code}
              type="button"
              onClick={() => loadReport(rt.code)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-bold transition ${
                selectedType === rt.code
                  ? "border-brand-blue bg-brand-blue text-white shadow-xs"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <FileBarChart className="h-4 w-4 shrink-0" />
              <span>{rt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Visualização Imprimível (PDF) / Tabela do Relatório */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">
              Suzano Sports — Relatório Oficial Gerencial
            </p>
            <h2 className="text-xl font-black text-brand-graphite">
              {report.title}
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Gerado em: {new Date(report.generatedAt).toLocaleString("pt-BR")}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-bold text-slate-500">
            Carregando dados do relatório...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-extrabold uppercase text-slate-600">
                <tr>
                  {report.headers.map((h, idx) => (
                    <th key={idx} className="px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={report.headers.length}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Nenhum registro encontrado para este relatório no período
                      selecionado.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-4 py-3 font-medium text-slate-700"
                        >
                          {typeof cell === "number" &&
                          report.headers[cIdx]?.includes("R$")
                            ? new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(cell)
                            : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
