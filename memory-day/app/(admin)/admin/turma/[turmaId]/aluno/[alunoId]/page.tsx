// Página de detalhe do aluno — seletor de dia + registros do dia + PDF do aluno
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AlunoAdminView } from "@/components/admin/AlunoAdminView";

interface Props {
  params: { turmaId: string; alunoId: string };
}

export default async function AdminAlunoPage({ params }: Props) {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") redirect("/login");

  // Verifica que o aluno pertence à turma
  const aluno = await prisma.user.findFirst({
    where: { id: params.alunoId, turmaId: params.turmaId, papel: "ALUNO" },
    select: {
      id:   true,
      nome: true,
      turma: { select: { nome: true } },
    },
  });

  if (!aluno) notFound();

  // Data de hoje para pré-popular o seletor
  const hoje = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500 flex-wrap">
        <Link href="/admin" className="hover:text-amber-600 transition">← Turmas</Link>
        <span className="text-slate-300">/</span>
        <Link href={`/admin/turma/${params.turmaId}`} className="hover:text-amber-600 transition">
          {aluno.turma?.nome}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium">{aluno.nome}</span>
      </div>

      {/* Componente client — seletor de dia, registros e PDF */}
      <AlunoAdminView
        alunoId={aluno.id}
        nomeAluno={aluno.nome}
        nomeTurma={aluno.turma?.nome ?? ""}
        turmaId={params.turmaId}
        dataInicial={hoje}
      />
    </div>
  );
}
