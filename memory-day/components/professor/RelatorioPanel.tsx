"use client";
import { useState } from "react";
import type { RelatorioIA } from "@/types";

const corNivel: Record<string, string> = {
  "Básico":        "bg-red-50 text-red-600 border border-red-200",
  "Intermediário": "bg-orange-50 text-orange-600 border border-orange-200",
  "Avançado":      "bg-emerald-50 text-emerald-600 border border-emerald-200",
};

interface Props {
  relatorio:   RelatorioIA;
  nomeTurma:   string;
  nomeMateria: string;
  data:        string;
  geradoEm:    string;
  subjectId:   string;
  turmaId:     string;
}

export function RelatorioPanel({
  relatorio, nomeTurma, nomeMateria, data, geradoEm, subjectId, turmaId,
}: Props) {
  const [exportando, setExportando] = useState(false);
  const [erroExport, setErroExport] = useState<string | null>(null);

  async function handleExportarPDF() {
    setErroExport(null);
    setExportando(true);
    try {
      const url = `/api/relatorios/${turmaId}/${subjectId}/${data}/pdf`;
      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setErroExport(json.erro ?? "Erro ao gerar PDF.");
        return;
      }
      const blob = await res.blob();
      const nomeSeguro = nomeMateria
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, "-");
      const nomeArquivo = `memory-day_${nomeSeguro}_${nomeTurma.replace(/\s+/g, "-")}_${data}.pdf`;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = nomeArquivo;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch {
      setErroExport("Falha na conexão ao gerar PDF.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-orbitron tracking-widest text-amber-600/70 uppercase">{nomeTurma}</span>
            <span className="text-slate-300">·</span>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{nomeMateria}</h2>
          </div>
          <p className="text-xs text-slate-500 tracking-wide">
            Data: {data} · Gerado em: {new Date(geradoEm).toLocaleString("pt-BR")}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${corNivel[relatorio.nivelGeral] ?? "bg-slate-100 text-slate-600 border border-slate-200"}`}>
            Nível: {relatorio.nivelGeral}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            {relatorio.percentualRegistros}% participaram
          </span>

          <button
            onClick={handleExportarPDF}
            disabled={exportando}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold
              bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
              hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white transition-all duration-200 shadow-sm"
          >
            {exportando ? (
              <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg> Gerando…</>
            ) : (
              <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg> Exportar PDF</>
            )}
          </button>
        </div>
      </div>

      {erroExport && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {erroExport}
        </div>
      )}

      {/* Síntese */}
      <div className="glass-card rounded-xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-3">✦ Síntese da Turma</p>
        <p className="text-sm text-slate-600 leading-relaxed">{relatorio.resumoGeral}</p>
      </div>

      {/* Lacunas */}
      <div className="rounded-xl p-5 bg-amber-50 border border-amber-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-3">
          ⚠ Lacunas mais recorrentes na turma
        </p>
        <ul className="space-y-2">
          {relatorio.lacunasComuns.map((lacuna, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
              <span className="font-bold text-amber-500 shrink-0 w-4">{i + 1}.</span>
              {lacuna}
            </li>
          ))}
        </ul>
      </div>

      {/* Recomendações */}
      <div className="rounded-xl p-5 bg-emerald-50 border border-emerald-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-3">
          → Recomendações para a próxima aula
        </p>
        <ul className="space-y-2">
          {relatorio.recomendacoes.map((rec, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
              <span className="text-emerald-500 shrink-0 mt-0.5">›</span>
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
