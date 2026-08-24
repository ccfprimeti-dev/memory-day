"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  turmaId:               string;
  diasLetivosTotais:     number;
  diasLetivosDecorridos: number;
}

export function CalendarioLetivoForm({ turmaId, diasLetivosTotais, diasLetivosDecorridos }: Props) {
  const router = useRouter();
  const [editando, setEditando]     = useState(false);
  const [totais, setTotais]         = useState(diasLetivosTotais);
  const [decorridos, setDecorridos] = useState(diasLetivosDecorridos);
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState<string | null>(null);

  async function handleSalvar() {
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch(`/api/admin/turmas/${turmaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diasLetivosTotais: totais, diasLetivosDecorridos: decorridos }),
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

  if (!editando) {
    return (
      <button
        onClick={() => setEditando(true)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide
          bg-slate-50 border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700 transition"
      >
        📅 Calendário letivo: {diasLetivosDecorridos}/{diasLetivosTotais} dias
      </button>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4 flex items-end gap-3 flex-wrap">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
          Total de dias letivos no ano
        </label>
        <input
          type="number"
          min={0}
          value={totais}
          onChange={(e) => setTotais(Number(e.target.value))}
          className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700
            focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
          Dias letivos já decorridos
        </label>
        <input
          type="number"
          min={0}
          value={decorridos}
          onChange={(e) => setDecorridos(Number(e.target.value))}
          className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700
            focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        />
      </div>
      {erro && <p className="text-xs text-red-500 basis-full">{erro}</p>}
      <div className="flex gap-2">
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
          onClick={() => { setEditando(false); setErro(null); setTotais(diasLetivosTotais); setDecorridos(diasLetivosDecorridos); }}
          disabled={salvando}
          className="px-4 py-2 rounded-lg text-xs font-semibold tracking-wide text-slate-500 hover:text-slate-700 transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
