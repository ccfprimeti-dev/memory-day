"use client";
import { useState, useEffect } from "react";
import type { FeedbackIA } from "@/types";

interface Registro {
  id:           string;
  textoDoAluno: string;
  feedbackIA:   string | null;
  lacunasIA:    FeedbackIA | null;
  materia:      { id: string; nome: string };
}

interface Aluno {
  id:        string;
  nome:      string;
  registros: Registro[];
}

interface Props {
  turmaId: string;
  data:    string;
}

export function ListaAlunosDetalhada({ turmaId, data }: Props) {
  const [alunos, setAlunos]              = useState<Aluno[]>([]);
  const [totalMaterias, setTotalMaterias] = useState(0);
  const [carregando, setCarregando]       = useState(false);
  const [erro, setErro]                  = useState<string | null>(null);
  const [abertos, setAbertos]            = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!turmaId || !data) return;
    setCarregando(true);
    setErro(null);
    fetch(`/api/professor/alunos?turmaId=${turmaId}&data=${data}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) { setErro(d.erro); return; }
        setAlunos(d.alunos);
        setTotalMaterias(d.totalMaterias);
      })
      .catch(() => setErro("Falha ao carregar alunos."))
      .finally(() => setCarregando(false));
  }, [turmaId, data]);

  function toggle(id: string) {
    setAbertos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-slate-500">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-sm">Carregando alunos...</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
        {erro}
      </div>
    );
  }

  if (alunos.length === 0) {
    return (
      <p className="text-center text-slate-500 text-sm py-8">
        Nenhum aluno matriculado nesta turma.
      </p>
    );
  }

  const enviaram    = alunos.filter((a) => a.registros.length > 0).length;
  const naoEnviaram = alunos.length - enviaram;

  return (
    <div className="space-y-3">
      {/* Resumo rápido */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{enviaram}</p>
          <p className="text-xs text-emerald-500 mt-0.5">Enviaram registro</p>
        </div>
        <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-slate-500">{naoEnviaram}</p>
          <p className="text-xs text-slate-400 mt-0.5">Não enviaram</p>
        </div>
        <div className="flex-1 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{alunos.length}</p>
          <p className="text-xs text-amber-600 mt-0.5">Total de alunos</p>
        </div>
      </div>

      {/* Lista de alunos */}
      {alunos.map((aluno) => {
        const aberto     = abertos.has(aluno.id);
        const fez        = aluno.registros.length > 0;
        const completude = totalMaterias > 0
          ? Math.round((aluno.registros.length / totalMaterias) * 100)
          : 0;

        return (
          <div key={aluno.id} className="glass-card rounded-xl overflow-hidden">
            {/* Linha principal */}
            <button
              onClick={() => fez && toggle(aluno.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left transition
                ${fez ? "hover:bg-amber-50/50 cursor-pointer" : "cursor-default"}`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold
                ${fez
                  ? "bg-gradient-to-br from-amber-100 to-yellow-100 border border-amber-200 text-amber-800"
                  : "bg-slate-100 border border-slate-200 text-slate-400"}`}>
                {aluno.nome.charAt(0).toUpperCase()}
              </div>

              {/* Nome + barra de progresso */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${fez ? "text-slate-800" : "text-slate-400"}`}>
                  {aluno.nome}
                </p>
                {fez ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${completude}%`,
                          background: completude === 100
                            ? "linear-gradient(90deg,#059669,#34d399)"
                            : "linear-gradient(90deg,#1e293b,#d97706)",
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {aluno.registros.length}/{totalMaterias} matérias
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">Não enviou nenhum registro</p>
                )}
              </div>

              {/* Badge de status */}
              <div className="shrink-0 flex items-center gap-2">
                {fez ? (
                  <>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold
                      ${completude === 100
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                      {completude === 100 ? "✓ Completo" : `${completude}%`}
                    </span>
                    <svg className={`h-4 w-4 text-amber-500 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                    Ausente
                  </span>
                )}
              </div>
            </button>

            {/* Expansão — registros do aluno */}
            {aberto && (
              <div className="border-t border-slate-100">
                {aluno.registros.map((reg, idx) => {
                  const feedback = reg.lacunasIA ?? null;

                  return (
                    <div key={reg.id}
                      className={`px-5 py-4 space-y-3 ${idx < aluno.registros.length - 1 ? "border-b border-slate-100" : ""} bg-slate-50/60`}>

                      {/* Cabeçalho da matéria */}
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-4 rounded-full shrink-0"
                          style={{ background: `hsl(${(idx * 60 + 200) % 360},65%,55%)` }} />
                        <p className="text-xs font-orbitron tracking-widest text-amber-700/70 uppercase">
                          {reg.materia.nome}
                        </p>
                        {feedback && (
                          <span className="ml-auto text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            ✦ IA analisou
                          </span>
                        )}
                      </div>

                      {/* O que o aluno escreveu */}
                      <p className="text-sm text-slate-700 leading-relaxed bg-white rounded-lg px-4 py-3 border border-slate-200">
                        {reg.textoDoAluno}
                      </p>

                      {/* Feedback da IA */}
                      {feedback && (
                        <div className="space-y-2 pl-2">
                          <p className="text-xs text-slate-500 leading-relaxed">{feedback.resumo}</p>

                          {feedback.lacunas.length > 0 && (
                            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                              <p className="text-[10px] font-orbitron tracking-widest text-amber-600 uppercase mb-1.5">
                                Lacunas
                              </p>
                              <ul className="space-y-1">
                                {feedback.lacunas.map((l, i) => (
                                  <li key={i} className="text-xs text-slate-600 flex gap-2">
                                    <span className="text-amber-500 shrink-0">{i + 1}.</span>{l}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {feedback.sugestoes.length > 0 && (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                              <p className="text-[10px] font-orbitron tracking-widest text-emerald-600 uppercase mb-1.5">
                                Sugestões
                              </p>
                              <ul className="space-y-1">
                                {feedback.sugestoes.map((s, i) => (
                                  <li key={i} className="text-xs text-slate-600 flex gap-2">
                                    <span className="text-emerald-500 shrink-0">›</span>{s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {!feedback && (
                        <p className="text-xs text-slate-400 italic pl-2">
                          Registro enviado mas ainda não analisado pela IA.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
