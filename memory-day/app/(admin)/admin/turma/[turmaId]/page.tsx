// Página da turma — lista de alunos + botão de PDF da turma
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { TurmaPDFButton } from "@/components/admin/TurmaPDFButton";
import { CalendarioLetivoForm } from "@/components/admin/CalendarioLetivoForm";
import { LABEL_NIVEL_ENSINO, MAX_AULAS, type NivelEnsino } from "@/types";
import { calcularNotaFinal } from "@/lib/notaFinal";
import { corAproveitamento } from "@/lib/nivelUtils";

interface Props {
  params: { turmaId: string };
}

export default async function AdminTurmaPage({ params }: Props) {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") redirect("/login");

  const turma = await prisma.turma.findUnique({
    where: { id: params.turmaId },
    include: {
      alunos: {
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, email: true },
      },
    },
  });

  if (!turma) notFound();

  // Limite diário de aulas definido pelo nível da turma (ex: 5 para EF2)
  const limiteDiario = MAX_AULAS[turma.nivelEnsino as NivelEnsino] ?? 5;
  const alunoIds = turma.alunos.map((a) => a.id);

  // Agrupa por (alunoId, data) e soma quantidadeAulas —
  // aula dupla = 1 linha com quantidadeAulas=2, não 2 linhas.
  const grupos = alunoIds.length > 0
    ? await prisma.entry.groupBy({
        by: ["alunoId", "data"],
        where: { alunoId: { in: alunoIds } },
        _sum: { quantidadeAulas: true },
      })
    : [];

  // Monta mapa: alunoId → { completos, incompletos }
  // Completo = soma de aulas no dia atingiu o limite do nível
  const statsMap: Record<string, { completos: number; incompletos: number }> = {};
  for (const g of grupos) {
    if (!statsMap[g.alunoId]) statsMap[g.alunoId] = { completos: 0, incompletos: 0 };
    const totalAulas = g._sum.quantidadeAulas ?? 0;
    if (totalAulas >= limiteDiario) {
      statsMap[g.alunoId].completos++;
    } else {
      statsMap[g.alunoId].incompletos++;
    }
  }

  // Nota final = qualidade média do aproveitamento + taxa de entrega (dias com registro / dias letivos decorridos)
  const todosRegistros = alunoIds.length > 0
    ? await prisma.entry.findMany({
        where: { alunoId: { in: alunoIds } },
        select: { alunoId: true, data: true, aproveitamento: true },
      })
    : [];

  const registrosPorAluno: Record<string, { aproveitamentos: (number | null)[]; datas: Set<string> }> = {};
  for (const r of todosRegistros) {
    if (!registrosPorAluno[r.alunoId]) {
      registrosPorAluno[r.alunoId] = { aproveitamentos: [], datas: new Set() };
    }
    registrosPorAluno[r.alunoId].aproveitamentos.push(r.aproveitamento);
    registrosPorAluno[r.alunoId].datas.add(r.data);
  }

  const notaMap: Record<string, ReturnType<typeof calcularNotaFinal>> = {};
  for (const alunoId of alunoIds) {
    const dados = registrosPorAluno[alunoId] ?? { aproveitamentos: [], datas: new Set<string>() };
    notaMap[alunoId] = calcularNotaFinal(dados.aproveitamentos, dados.datas.size, turma.diasLetivosDecorridos);
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin" className="hover:text-amber-600 transition">← Turmas</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium">{turma.nome}</span>
      </div>

      {/* Cabeçalho da turma */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="font-orbitron text-[10px] tracking-[0.4em] text-amber-600/70 uppercase mb-1">
            Turma
          </p>
          <h1 className="text-2xl font-bold text-slate-800">
            <span className="text-gradient font-orbitron">{turma.nome}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {LABEL_NIVEL_ENSINO[turma.nivelEnsino as NivelEnsino] ?? turma.nivelEnsino} · {turma.anoLetivo} · {turma.alunos.length} alunos
          </p>
        </div>
        {/* Ações — calendário letivo e PDF da turma */}
        <div className="flex items-center gap-3 flex-wrap">
          <CalendarioLetivoForm
            turmaId={turma.id}
            diasLetivosTotais={turma.diasLetivosTotais}
            diasLetivosDecorridos={turma.diasLetivosDecorridos}
          />
          <TurmaPDFButton turmaId={turma.id} />
        </div>
      </div>

      {/* Lista de alunos */}
      {turma.alunos.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-slate-500 text-sm">Nenhum aluno matriculado nesta turma.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-yellow-50/60">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
              Alunos matriculados
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {turma.alunos.map((aluno, idx) => {
              const stats = statsMap[aluno.id] ?? { completos: 0, incompletos: 0 };
              const temDados = stats.completos > 0 || stats.incompletos > 0;
              const nota = notaMap[aluno.id];
              return (
                <Link key={aluno.id}
                  href={`/admin/turma/${turma.id}/aluno/${aluno.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-amber-50/50 transition group">
                  {/* Avatar com inicial */}
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100 border border-amber-200 flex items-center justify-center shrink-0">
                    <span className="font-bold text-sm text-amber-800">{aluno.nome.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{aluno.nome}</p>
                    <p className="text-xs text-slate-400 truncate">{aluno.email}</p>
                  </div>
                  {/* Nota final: qualidade média + taxa de entrega */}
                  <div
                    title={nota.notaFinal === null
                      ? "Sem dados suficientes para calcular"
                      : `Qualidade: ${nota.qualidadeMedia ?? "—"}% · Entrega: ${nota.taxaEntrega ?? "—"}%`}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border"
                    style={{
                      backgroundColor: `${corAproveitamento(nota.notaFinal)}14`,
                      borderColor: `${corAproveitamento(nota.notaFinal)}55`,
                    }}
                  >
                    <span className="text-[10px] font-orbitron tracking-widest uppercase text-slate-500">Nota MD</span>
                    <span className="font-bold text-sm" style={{ color: corAproveitamento(nota.notaFinal) }}>
                      {nota.notaFinal === null ? "—" : `${nota.notaFinal}%`}
                    </span>
                  </div>

                  {/* Badges de entregas: amarelo = incompletos, verde = completos */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div title="Incompletos" className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center">
                      <span className="font-bold text-sm text-amber-700">{stats.incompletos}</span>
                    </div>
                    <div title="Completos" className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center">
                      <span className="font-bold text-sm text-emerald-700">{stats.completos}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-orbitron shrink-0">#{idx + 1}</span>
                  <svg className="h-4 w-4 text-amber-400 opacity-0 group-hover:opacity-100 transition shrink-0"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
