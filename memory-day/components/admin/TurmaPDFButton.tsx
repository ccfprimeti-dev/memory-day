"use client";
// Botão para gerar o PDF da turma com seletor de período.
import { useState } from "react";

interface Props {
  turmaId: string;
}

const PERIODOS = [
  { valor: 15, label: "Últimos 15 dias" },
  { valor: 30, label: "Último mês"      },
  { valor: 60, label: "Último bimestre" },
];

export function TurmaPDFButton({ turmaId }: Props) {
  const [periodo,    setPeriodo]    = useState(30);
  const [carregando, setCarregando] = useState(false);

  async function handleGerar() {
    setCarregando(true);
    try {
      const res = await fetch(`/api/admin/pdf/turma?turmaId=${turmaId}&periodo=${periodo}`);
      if (!res.ok) {
        const d = await res.json();
        alert(d.erro ?? "Erro ao gerar PDF.");
        return;
      }
      // Dispara download
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `memory-day_turma_${periodo}d.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Falha na conexão ao gerar PDF.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={periodo}
        onChange={(e) => setPeriodo(Number(e.target.value))}
        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700
          focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
      >
        {PERIODOS.map((p) => (
          <option key={p.valor} value={p.valor}>{p.label}</option>
        ))}
      </select>
      <button
        onClick={handleGerar}
        disabled={carregando}
        className="px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all
          bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
          hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
          disabled:opacity-40 disabled:cursor-not-allowed
          text-white flex items-center gap-2 shadow-sm"
      >
        {carregando ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Gerando...
          </>
        ) : "Gerar PDF da turma"}
      </button>
    </div>
  );
}
