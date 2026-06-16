"use client";
import { useState } from "react";
import type { FeedbackIA } from "@/types";

export interface AlunoComRegistro {
  id:   string;
  nome: string;
  registro: {
    textoDoAluno: string;
    feedbackIA:   string | null;
    lacunasIA:    FeedbackIA | null;
    quantidadeAulas: number;
  } | null;
}

interface Props {
  alunos:      AlunoComRegistro[];
  nomeMateria: string;
  data:        string;
}

export function ListaAlunos({ alunos, nomeMateria, data }: Props) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  function toggleAluno(id: string) {
    setAbertos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const enviaram    = alunos.filter((a) => a.registro !== null).length;
  const naoEnviaram = alunos.length - enviaram;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-orbitron text-[10px] tracking-[0.4em] text-amber-600/70 uppercase mb-1">
            Lista da Turma
          </p>
          <h3 className="text-lg font-bold text-slate-800">
            Registros individuais — {nomeMateria}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{data}</p>
        </div>
        <div className="flex gap-2 text-right">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
            ✓ {enviaram} enviaram
          </span>
          {naoEnviaram > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
              {naoEnviaram} não enviaram
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {alunos.map((aluno) => {
          const aberto = abertos.has(aluno.id);
          const enviou = aluno.registro !== null;
          const feedback = aluno.registro?.lacunasIA ?? null;

          return (
            <div key={aluno.id} className="glass-card rounded-xl overflow-hidden">
              <button
                onClick={() => enviou && toggleAluno(aluno.id)}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition
                  ${enviou ? "hover:bg-amber-50/50 cursor-pointer" : "cursor-default opacity-60"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100
                    border border-amber-200 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-amber-800">
                      {aluno.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{aluno.nome}</span>
                </div>

                <div className="flex items-center gap-3">
                  {enviou ? (
                    <>
                      {aluno.registro && aluno.registro.quantidadeAulas > 1 && (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                          {aluno.registro.quantidadeAulas} aulas
                        </span>
                      )}
                      {feedback ? (
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ✦ IA analisou
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          Enviado
                        </span>
                      )}
                      <svg className={`h-4 w-4 text-amber-500 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                      Não enviou
                    </span>
                  )}
                </div>
              </button>

              {aberto && aluno.registro && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50/60">
                  <div>
                    <p className="text-[10px] font-orbitron tracking-[0.3em] text-amber-600/70 uppercase mb-2">
                      O que o aluno escreveu
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed bg-white rounded-lg px-4 py-3 border border-slate-200">
                      {aluno.registro.textoDoAluno}
                    </p>
                  </div>

                  {feedback ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-orbitron tracking-[0.3em] text-amber-700/70 uppercase mb-2">
                          ✦ Análise da IA
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed">{feedback.resumo}</p>
                      </div>

                      {feedback.lacunas.length > 0 && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                          <p className="text-[10px] font-orbitron tracking-widest text-amber-600 uppercase mb-2">
                            Lacunas identificadas
                          </p>
                          <ul className="space-y-1">
                            {feedback.lacunas.map((l, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                <span className="text-amber-500 shrink-0 font-bold">{i + 1}.</span>{l}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {feedback.sugestoes.length > 0 && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                          <p className="text-[10px] font-orbitron tracking-widest text-emerald-600 uppercase mb-2">
                            Sugestões de estudo
                          </p>
                          <ul className="space-y-1">
                            {feedback.sugestoes.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                <span className="text-emerald-500 shrink-0">›</span>{s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Este registro ainda não foi analisado pela IA.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
