"use client";
// Caixa da Home do admin — 4 blocos, um por bimestre. Cada um guarda seus
// próprios dias letivos + data de início/fim; o bimestre vigente (pela data
// de hoje) é destacado e é o que entra no cálculo da nota de todos os alunos.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LABEL_BIMESTRE, type BimestreConfig } from "@/lib/bimestre";

interface Props {
  bimestres:   BimestreConfig[];
  numeroAtual: number | null;
}

export function BimestresBox({ bimestres, numeroAtual }: Props) {
  const router = useRouter();
  const [editando, setEditando] = useState<number | null>(null);
  const [diasLetivos, setDiasLetivos] = useState(0);
  const [dataInicio, setDataInicio]   = useState("");
  const [dataFim, setDataFim]         = useState("");
  const [salvando, setSalvando]       = useState(false);
  const [erro, setErro]               = useState<string | null>(null);

  function abrirEdicao(b: BimestreConfig) {
    setEditando(b.numero);
    setDiasLetivos(b.diasLetivos);
    setDataInicio(b.dataInicio ?? "");
    setDataFim(b.dataFim ?? "");
    setErro(null);
  }

  async function handleSalvar(numero: number) {
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/bimestres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero,
          diasLetivos,
          dataInicio: dataInicio || null,
          dataFim: dataFim || null,
        }),
      });
      const dados = await res.json();
      if (!res.ok) { setErro(dados.erro ?? "Erro ao salvar."); return; }
      setEditando(null);
      router.refresh();
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mb-6">
      <p className="font-orbitron text-[10px] tracking-[0.3em] text-slate-500 uppercase mb-1">
        Calendário por bimestre
      </p>
      <p className="text-xs text-slate-400 mb-3">
        O bimestre vigente (pela data de hoje) define os dias letivos usados na nota de entrega dos alunos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {bimestres.map((b) => {
          const vigente = b.numero === numeroAtual;
          const aberto  = editando === b.numero;

          return (
            <div
              key={b.numero}
              className={`glass-card rounded-xl p-4 ${vigente ? "border-2 border-amber-400" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-orbitron text-xs font-bold text-slate-700">
                  {LABEL_BIMESTRE[b.numero]}
                </span>
                {vigente && (
                  <span className="text-[9px] font-orbitron tracking-widest uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300">
                    Vigente
                  </span>
                )}
              </div>

              {!aberto ? (
                <button onClick={() => abrirEdicao(b)} className="w-full text-left">
                  <p className="font-orbitron text-xl font-bold text-amber-700">{b.diasLetivos} dias</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {b.dataInicio && b.dataFim
                      ? `${b.dataInicio} → ${b.dataFim}`
                      : "Datas não configuradas"}
                  </p>
                  <p className="text-[11px] text-amber-600 mt-1.5 hover:underline">Editar</p>
                </button>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                      Dias letivos
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={diasLetivos}
                      onChange={(e) => setDiasLetivos(Number(e.target.value))}
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700
                        focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                      Início
                    </label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700
                        focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                      Fim
                    </label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700
                        focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                    />
                  </div>
                  {erro && <p className="text-[11px] text-red-500">{erro}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleSalvar(b.numero)}
                      disabled={salvando}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all
                        bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
                        hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
                        disabled:opacity-40 disabled:cursor-not-allowed text-white"
                    >
                      {salvando ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => setEditando(null)}
                      disabled={salvando}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
