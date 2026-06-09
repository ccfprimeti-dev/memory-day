"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ListaAlunosDetalhada } from "@/components/professor/ListaAlunosDetalhada";
import type { TurmaResumo, MateriaResumo } from "@/types";

type Modo = "escolha" | "alunos" | "turma";

function dataHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ProfessorDashboard() {
  const router = useRouter();
  const [modo, setModo]               = useState<Modo>("escolha");
  const [turmas, setTurmas]           = useState<TurmaResumo[]>([]);
  const [materias, setMaterias]       = useState<MateriaResumo[]>([]);
  const [turmaId, setTurmaId]         = useState("");
  const [subjectId, setSubjectId]     = useState("");
  const [data, setData]               = useState(dataHoje());
  const [carregandoTurmas, setCarregandoTurmas]     = useState(true);
  const [carregandoMaterias, setCarregandoMaterias] = useState(false);
  const [carregando, setCarregando]   = useState(false);
  const [erro, setErro]               = useState<string | null>(null);

  // Carrega turmas ao montar
  useEffect(() => {
    fetch("/api/turmas")
      .then((r) => r.json())
      .then((d: TurmaResumo[]) => {
        setTurmas(d);
        if (d.length > 0) setTurmaId(d[0].id);
      })
      .finally(() => setCarregandoTurmas(false));
  }, []);

  // Recarrega matérias ao trocar de turma (só no modo "turma")
  useEffect(() => {
    if (!turmaId || modo !== "turma") return;
    setSubjectId("");
    setMaterias([]);
    setCarregandoMaterias(true);
    fetch(`/api/materias?turmaId=${turmaId}`)
      .then((r) => r.json())
      .then((d: MateriaResumo[]) => {
        setMaterias(d);
        if (d.length > 0) setSubjectId(d[0].id);
      })
      .finally(() => setCarregandoMaterias(false));
  }, [turmaId, modo]);

  async function handleGerar() {
    if (!turmaId || !subjectId || !data) return;
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/relatorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turmaId, subjectId, data }),
      });
      const dados = await res.json();
      if (!res.ok) { setErro(dados.erro ?? "Erro ao gerar relatório."); return; }
      router.push(`/professor/relatorio/${dados.id}`);
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  // ── Tela de escolha ───────────────────────────────────────────────────────
  if (modo === "escolha") {
    return (
      <div>
        <div className="mb-8">
          <p className="font-orbitron text-[10px] tracking-[0.4em] text-amber-600/70 uppercase mb-1">
            Painel do Professor
          </p>
          <h1 className="text-2xl font-bold text-slate-800">
            O que deseja visualizar?
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Escolha entre ver os registros individuais dos alunos ou gerar um relatório agregado da turma.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card — Alunos */}
          <button
            onClick={() => setModo("alunos")}
            className="group text-left rounded-2xl border border-amber-200 bg-white/80 p-6
              hover:border-amber-400 hover:bg-amber-50/50 transition-all duration-200
              hover:shadow-md shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200
              flex items-center justify-center mb-4 group-hover:bg-amber-200/60 transition">
              <svg className="h-6 w-6 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1 font-orbitron tracking-wide">
              Alunos
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Veja a lista completa de alunos da turma, quem enviou e quem não enviou, e leia os registros individuais com o feedback da IA.
            </p>
            <p className="mt-4 text-xs font-orbitron tracking-widest text-amber-700 uppercase">
              Ver alunos →
            </p>
          </button>

          {/* Card — Turma */}
          <button
            onClick={() => setModo("turma")}
            className="group text-left rounded-2xl border border-slate-300 bg-white/80 p-6
              hover:border-slate-400 hover:bg-slate-50/80 transition-all duration-200
              hover:shadow-md shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200
              flex items-center justify-center mb-4 group-hover:bg-amber-100/60 transition">
              <svg className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1 font-orbitron tracking-wide">
              Relatório da Turma
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Gere um relatório agregado pela IA com o desempenho geral da turma, lacunas comuns e recomendações para a próxima aula.
            </p>
            <p className="mt-4 text-xs font-orbitron tracking-widest text-slate-700 uppercase group-hover:text-amber-600 transition">
              Gerar relatório →
            </p>
          </button>
        </div>
      </div>
    );
  }

  // ── Modo Alunos ────────────────────────────────────────────────────────────
  if (modo === "alunos") {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setModo("escolha")}
            className="text-slate-500 hover:text-amber-600 transition text-sm">
            ← Voltar
          </button>
          <span className="text-slate-700">/</span>
          <h1 className="text-xl font-bold text-slate-800">Registros dos Alunos</h1>
        </div>

        {carregandoTurmas ? (
          <p className="text-sm text-slate-500">Carregando turmas...</p>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Filtros</p>
            </div>
            <div className="px-6 py-4 flex flex-col sm:flex-row gap-4">
              {/* Turma */}
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-amber-700/80">Turma</label>
                <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800
                    focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition">
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome} — {t.anoLetivo}</option>
                  ))}
                </select>
              </div>
              {/* Data */}
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-amber-700/80">Data</label>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800
                    focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition" />
              </div>
            </div>
          </div>
        )}

        {turmaId && data && <ListaAlunosDetalhada turmaId={turmaId} data={data} />}
      </div>
    );
  }

  // ── Modo Turma (relatório IA) ──────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setModo("escolha")}
          className="text-slate-500 hover:text-amber-600 transition text-sm">
          ← Voltar
        </button>
        <span className="text-slate-700">/</span>
        <h1 className="text-xl font-bold text-slate-800">Relatório da Turma</h1>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
            Parâmetros do relatório
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {carregandoTurmas ? (
            <p className="text-sm text-slate-500">Carregando turmas...</p>
          ) : (
            <>
              {/* Turma */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-amber-700/80">Turma</label>
                <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800
                    focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition">
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome} — {t.anoLetivo}</option>
                  ))}
                </select>
              </div>

              {/* Matéria */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-amber-700/80">Matéria</label>
                {carregandoMaterias ? (
                  <p className="text-xs text-slate-500 py-2">Carregando matérias...</p>
                ) : materias.length === 0 ? (
                  <p className="text-xs text-amber-500/80 py-2">Você não leciona nenhuma matéria nesta turma.</p>
                ) : (
                  <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800
                      focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition">
                    {materias.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Data */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-amber-700/80">Data</label>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800
                    focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition" />
              </div>

              {erro && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{erro}</div>
              )}

              <button onClick={handleGerar}
                disabled={carregando || !turmaId || !subjectId || !data || materias.length === 0}
                className="w-full py-3 rounded-lg text-sm font-semibold tracking-wide transition-all
                  bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
                  hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
                  disabled:opacity-40 disabled:cursor-not-allowed
                  text-white flex items-center justify-center gap-2"
                style={{ boxShadow: "0 0 18px rgba(217,119,6,0.25),0 0 40px rgba(217,119,6,0.08)" }}>
                {carregando && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                {carregando ? "Analisando registros da turma..." : "Gerar relatório com IA"}
              </button>
              <p className="text-xs text-slate-600 text-center">
                A IA analisa os registros dos alunos desta turma e gera um relatório agregado.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
