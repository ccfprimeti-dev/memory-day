// Página inicial do admin — lista de turmas
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LABEL_NIVEL_ENSINO, type NivelEnsino } from "@/types";

export default async function AdminPage() {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") redirect("/login");

  const turmas = await prisma.turma.findMany({
    include: {
      _count: { select: { alunos: true, materias: true } },
    },
  });

  // Ordem crescente: 1º-5º (EF1) → 6º-9º (EF2) → 1º-2º EM, do menor ano para o maior
  const ORDEM_NIVEL: Record<string, number> = { EF1: 0, EF2: 1, EM: 2 };
  turmas.sort((a, b) => {
    const diffNivel = (ORDEM_NIVEL[a.nivelEnsino] ?? 99) - (ORDEM_NIVEL[b.nivelEnsino] ?? 99);
    if (diffNivel !== 0) return diffNivel;
    return (parseInt(a.nome, 10) || 0) - (parseInt(b.nome, 10) || 0);
  });

  return (
    <div>
      <div className="mb-8">
        <p className="font-orbitron text-[10px] tracking-[0.4em] text-amber-600/70 uppercase mb-1">
          Painel Administrativo
        </p>
        <h1 className="text-2xl font-bold text-slate-800">
          Turmas <span className="text-gradient font-orbitron">cadastradas</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Selecione uma turma para ver os alunos e gerar relatórios.
        </p>
      </div>

      {turmas.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-slate-500 text-sm">Nenhuma turma cadastrada.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {turmas.map((t) => (
          <Link key={t.id} href={`/admin/turma/${t.id}`}
            className="group glass-card rounded-xl p-6 hover:border-amber-300 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800 font-orbitron tracking-wide">
                  {t.nome}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{t.anoLetivo}</p>
              </div>
              <span className={`text-[10px] font-orbitron tracking-widest uppercase px-2 py-1 rounded border
                ${t.nivelEnsino === "EM"
                  ? "text-slate-700 border-slate-300 bg-slate-100"
                  : "text-amber-700 border-amber-200 bg-amber-50"}`}>
                {LABEL_NIVEL_ENSINO[t.nivelEnsino as NivelEnsino] ?? t.nivelEnsino}
              </span>
            </div>
            <div className="flex gap-4 text-sm text-slate-500">
              <span><strong className="text-slate-700">{t._count.alunos}</strong> alunos</span>
              <span><strong className="text-slate-700">{t._count.materias}</strong> matérias</span>
            </div>
            <p className="mt-4 text-xs font-orbitron tracking-widest text-amber-600 uppercase group-hover:text-amber-500 transition">
              Ver turma →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
