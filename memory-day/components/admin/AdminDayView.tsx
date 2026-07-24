"use client";
// Painel do dia completo para o admin — mostra todas as matérias da turma
// de uma vez, com textarea por matéria, pré-preenchida se já houver entrega.
import { useState, useEffect } from "react";

interface Materia { id: string; nome: string }

type Estado = "idle" | "loading" | "done" | "erro";

interface EntradaLocal {
  texto:          string;
  estado:         Estado;
  nivel:          string | null;
  aproveitamento: number | null;
  erro:           string | null;
}

interface Props {
  alunoId:  string;
  turmaId:  string;
  dataHoje: string;
  onSalvo:  (data: string) => void;
  onFechar: () => void;
}

function labelNivel(n: string | null) {
  if (n === "AVANCADO")      return "Avançado";
  if (n === "INTERMEDIARIO") return "Intermediário";
  if (n === "BASICO")        return "Básico";
  return null;
}

function corNivel(n: string | null) {
  if (n === "AVANCADO")      return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (n === "INTERMEDIARIO") return "text-amber-700 bg-amber-50 border-amber-200";
  if (n === "BASICO")        return "text-red-600 bg-red-50 border-red-200";
  return "text-slate-400 bg-slate-50 border-slate-200";
}

export function AdminDayView({ alunoId, turmaId, dataHoje, onSalvo, onFechar }: Props) {
  const [data,        setData]        = useState(dataHoje);
  const [materias,    setMaterias]    = useState<Materia[]>([]);
  const [entradas,    setEntradas]    = useState<Record<string, EntradaLocal>>({});
  const [carregando,  setCarregando]  = useState(false);
  const [analisando,  setAnalisando]  = useState(false);
  const [salvou,      setSalvou]      = useState(false);

  // Busca matérias da turma uma vez
  useEffect(() => {
    fetch(`/api/materias/publicas?turmaId=${turmaId}`)
      .then(r => r.json())
      .then((d: Materia[]) => setMaterias(d))
      .catch(() => setMaterias([]));
  }, [turmaId]);

  // Quando data ou matérias mudam, pré-preenche com entregas existentes
  useEffect(() => {
    if (!data || materias.length === 0) return;
    setCarregando(true);
    fetch(`/api/admin/aluno/${alunoId}?data=${data}`)
      .then(r => r.json())
      .then(d => {
        const mapa: Record<string, EntradaLocal> = {};
        for (const mat of materias) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const existente = (d.registros ?? []).find((r: any) => r.materia?.id === mat.id);
          mapa[mat.id] = {
            texto:          existente?.textoDoAluno  ?? "",
            estado:         existente              ? "done" : "idle",
            nivel:          existente?.nivelIA      ?? null,
            aproveitamento: existente?.aproveitamento ?? null,
            erro:           null,
          };
        }
        setEntradas(mapa);
        setSalvou(false);
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [alunoId, data, materias]);

  function atualizarTexto(subjectId: string, valor: string) {
    setEntradas(prev => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], texto: valor, estado: "idle", erro: null },
    }));
  }

  async function analisarUma(subjectId: string): Promise<boolean> {
    const entrada = entradas[subjectId];
    if (!entrada || entrada.texto.trim().length < 20) return false;

    setEntradas(prev => ({ ...prev, [subjectId]: { ...prev[subjectId], estado: "loading", erro: null } }));

    try {
      const res  = await fetch("/api/admin/registro", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ alunoId, subjectId, data, texto: entrada.texto.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro ?? "Erro ao salvar");

      setEntradas(prev => ({
        ...prev,
        [subjectId]: {
          ...prev[subjectId],
          estado:         "done",
          nivel:          json.nivelIA        ?? null,
          aproveitamento: json.aproveitamento ?? null,
          erro:           null,
        },
      }));
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      setEntradas(prev => ({ ...prev, [subjectId]: { ...prev[subjectId], estado: "erro", erro: msg } }));
      return false;
    }
  }

  async function analisarTodas() {
    const pendentes = materias.filter(m => {
      const e = entradas[m.id];
      return e && e.texto.trim().length >= 20 && e.estado !== "loading";
    });
    if (pendentes.length === 0) return;

    setAnalisando(true);
    let algumSalvo = false;
    for (const mat of pendentes) {
      const ok = await analisarUma(mat.id);
      if (ok) algumSalvo = true;
    }
    if (algumSalvo) { onSalvo(data); setSalvou(true); }
    setAnalisando(false);
  }

  const totalPreenchidas = materias.filter(m => (entradas[m.id]?.texto.trim().length ?? 0) >= 20).length;
  const totalFeitas      = materias.filter(m => entradas[m.id]?.estado === "done").length;

  return (
    <div className="glass-card rounded-xl overflow-hidden border border-amber-200 mb-5">

      {/* ── Cabeçalho ── */}
      <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-yellow-50/60 border-b border-amber-200 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700 font-orbitron">
            Preencher dia completo
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalFeitas} de {materias.length} matéria{materias.length !== 1 ? "s" : ""} analisada{totalFeitas !== 1 ? "s" : ""}
            {salvou && <span className="text-emerald-600 ml-2">· Salvo ✓</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-sm text-slate-800
              focus:outline-none focus:border-amber-400 transition"
          />
          <button
            onClick={analisarTodas}
            disabled={analisando || totalPreenchidas === 0}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all
              bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
              hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
              disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-2"
          >
            {analisando ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Analisando…
              </>
            ) : (
              `Analisar todas ${totalPreenchidas > 0 ? `(${totalPreenchidas})` : ""}`
            )}
          </button>
          <button
            onClick={onFechar}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1"
            aria-label="Fechar"
          >×</button>
        </div>
      </div>

      {/* ── Cards das matérias ── */}
      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-sm">Carregando entradas do dia…</span>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {materias.map(mat => {
            const e       = entradas[mat.id];
            if (!e) return null;
            const nivel    = labelNivel(e.nivel);
            const temResult = e.estado === "done" && nivel;

            return (
              <div key={mat.id} className="px-5 py-4">
                {/* Linha do título da matéria */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    {mat.nome}
                  </span>
                  <div className="flex items-center gap-2">
                    {temResult && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${corNivel(e.nivel)}`}>
                        {nivel}{e.aproveitamento !== null ? ` · ${e.aproveitamento}%` : ""}
                      </span>
                    )}
                    {e.estado === "done"    && <span className="text-emerald-500 text-sm font-bold">✓</span>}
                    {e.estado === "loading" && (
                      <svg className="animate-spin h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    )}
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  value={e.texto}
                  onChange={ev => atualizarTexto(mat.id, ev.target.value)}
                  rows={3}
                  placeholder={`O que o aluno aprendeu em ${mat.nome}…`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800
                    focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition
                    resize-y placeholder:text-slate-300"
                />

                {/* Rodapé do card */}
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-[10px] ${
                    e.erro ? "text-red-400" :
                    e.texto.trim().length > 0 && e.texto.trim().length < 20 ? "text-red-400" :
                    "text-slate-300"
                  }`}>
                    {e.erro
                      ? `Erro: ${e.erro}`
                      : `${e.texto.trim().length} car. ${e.texto.trim().length > 0 && e.texto.trim().length < 20 ? `— faltam ${20 - e.texto.trim().length}` : ""}`
                    }
                  </span>
                  <button
                    onClick={() => analisarUma(mat.id)}
                    disabled={e.estado === "loading" || e.texto.trim().length < 20}
                    className="text-xs font-semibold px-3 py-1 rounded-lg transition-all border
                      bg-white hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300
                      disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 border-slate-200"
                  >
                    {e.estado === "loading" ? "Analisando…" : e.estado === "done" ? "Reanalisar" : "Analisar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
