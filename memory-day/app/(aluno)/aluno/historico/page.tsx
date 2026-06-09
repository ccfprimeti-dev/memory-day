import { getSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { FeedbackIA } from "@/types";

export default async function AlunoHistorico() {
  const sessao = await getSessao();
  const usuario = sessao.usuario!;

  const registros = await prisma.entry.findMany({
    where: { alunoId: usuario.id },
    orderBy: [{ data: "desc" }, { materia: { nome: "asc" } }],
    include: { materia: { select: { nome: true } } },
  });

  const porData = registros.reduce<Record<string, typeof registros>>((acc, r) => {
    if (!acc[r.data]) acc[r.data] = [];
    acc[r.data].push(r);
    return acc;
  }, {});

  const datas = Object.keys(porData).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Meu <span className="text-gradient font-orbitron">histórico</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Seus registros diários e feedbacks gerados pela IA.
        </p>
      </div>

      {datas.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-slate-500 text-sm">Você ainda não tem registros.</p>
          <p className="text-slate-400 text-xs mt-1">Vá ao Dashboard e registre sua primeira aula!</p>
        </div>
      )}

      <div className="space-y-8">
        {datas.map((data) => (
          <div key={data}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {new Date(data + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "long", day: "numeric", month: "long",
                })}
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-3">
              {porData[data].map((registro) => {
                const feedback = registro.lacunasIA as unknown as FeedbackIA | null;

                const foiAnalisado = feedback !== null;

                return (
                  <div key={registro.id} className="glass-card rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-yellow-50/60 flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-sm">{registro.materia.nome}</span>
                      {foiAnalisado ? (
                        <span className="text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
                          ✓ Analisado pela IA
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                          ○ Não analisado ainda
                        </span>
                      )}
                    </div>

                    <div className="px-5 py-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                          Seu registro
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed">{registro.textoDoAluno}</p>
                      </div>

                      {foiAnalisado && feedback ? (
                        <div className="space-y-3">
                          <div className="rounded-lg p-4 bg-white border border-slate-100">
                            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-2">
                              ✦ O que você demonstrou entender
                            </p>
                            <p className="text-sm text-slate-600 leading-relaxed">{feedback.resumo}</p>
                          </div>

                          {feedback.lacunas.length > 0 && (
                            <div className="rounded-lg p-4 bg-amber-50 border border-amber-200">
                              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-2">
                                ⚠ Pontos de atenção
                              </p>
                              <ul className="space-y-1.5">
                                {feedback.lacunas.map((l, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                    <span className="text-amber-500 shrink-0">›</span>{l}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {feedback.sugestoes.length > 0 && (
                            <div className="rounded-lg p-4 bg-emerald-50 border border-emerald-200">
                              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-2">
                                → Sugestões de estudo
                              </p>
                              <ul className="space-y-1.5">
                                {feedback.sugestoes.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                    <span className="text-emerald-500 shrink-0">›</span>{s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg p-4 bg-slate-50 border border-slate-200 text-center">
                          <p className="text-xs text-slate-500">
                            Você preencheu o texto mas ainda não enviou para análise.
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Vá ao <span className="text-amber-600">Dashboard → {registro.materia.nome}</span> e clique em &quot;Enviar e analisar&quot;.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
