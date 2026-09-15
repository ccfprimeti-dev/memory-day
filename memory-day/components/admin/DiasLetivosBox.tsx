"use client";
// Caixa da Home do admin — um único número global de dias letivos decorridos,
// usado para calcular a nota de entrega de todos os alunos.
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  diasLetivos: number;
}

export function DiasLetivosBox({ diasLetivos }: Props) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor]       = useState(diasLetivos);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  async function handleSalvar() {
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/configuracao", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diasLetivos: valor }),
      });
      const dados = await res.json();
      if (!res.ok) { setErro(dados.erro ?? "Erro ao salvar."); return; }
      setEditando(false);
      router.refresh();
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="glass-card rounded-xl p-5 flex items-center gap-5 flex-wrap mb-6">
      <div className="shrink-0">
        <p className="font-orbitron text-[10px] tracking-[0.3em] text-slate-500 uppercase mb-1">
          Dias letivos decorridos
        </p>
        <p className="text-xs text-slate-400">
          Usado para calcular a nota de entrega de todos os alunos.
        </p>
      </div>

      {!editando ? (
        <div className="flex items-center gap-3 ml-auto">
          <span className="font-orbitron text-2xl font-bold text-amber-700">{diasLetivos}</span>
          <button
            onClick={() => { setValor(diasLetivos); setEditando(true); }}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide
              bg-slate-50 border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700 transition"
          >
            Editar
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-3 ml-auto flex-wrap">
          <input
            type="number"
            min={0}
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            autoFocus
            className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700
              focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
          />
          {erro && <p className="text-xs text-red-500 basis-full">{erro}</p>}
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all
              bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
              hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
              disabled:opacity-40 disabled:cursor-not-allowed text-white"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          <button
            onClick={() => { setEditando(false); setErro(null); }}
            disabled={salvando}
            className="px-4 py-2 rounded-lg text-xs font-semibold tracking-wide text-slate-500 hover:text-slate-700 transition"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
