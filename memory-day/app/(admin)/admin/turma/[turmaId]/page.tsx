// Página da turma — lista de alunos + botão de PDF da turma
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { TurmaPDFButton } from "@/components/admin/TurmaPDFButton";
import { LABEL_NIVEL_ENSINO, type NivelEnsino } from "@/types";

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
        {/* Botão PDF da turma — componente client para seleção de período */}
        <TurmaPDFButton turmaId={turma.id} />
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
            {turma.alunos.map((aluno, idx) => (
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
                <span className="text-xs text-slate-400 font-orbitron shrink-0">#{idx + 1}</span>
                <svg className="h-4 w-4 text-amber-400 opacity-0 group-hover:opacity-100 transition shrink-0"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
