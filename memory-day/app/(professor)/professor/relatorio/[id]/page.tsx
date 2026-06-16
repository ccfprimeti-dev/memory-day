import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import { RelatorioPanel } from "@/components/professor/RelatorioPanel";
import { ListaAlunos } from "@/components/professor/ListaAlunos";
import type { AlunoComRegistro } from "@/components/professor/ListaAlunos";
import Link from "next/link";
import type { RelatorioIA, FeedbackIA } from "@/types";

interface Props {
  params: { id: string };
}

export default async function RelatorioPage({ params }: Props) {
  const sessao = await getSessao();
  const usuario = sessao.usuario!;

  // Busca o relatório com turma e matéria
  const relatorio = await prisma.classReport.findUnique({
    where: { id: params.id },
    include: {
      turma:   { select: { id: true, nome: true } },
      materia: { select: { nome: true, professorId: true } },
    },
  });

  if (!relatorio || relatorio.materia.professorId !== usuario.id) {
    notFound();
  }

  // Busca todos os alunos da turma com seus registros deste dia/matéria
  const alunosRaw = await prisma.user.findMany({
    where: { papel: "ALUNO", turmaId: relatorio.turmaId },
    orderBy: { nome: "asc" },
    select: {
      id:   true,
      nome: true,
      registros: {
        where: { subjectId: relatorio.subjectId, data: relatorio.data },
        select: { textoDoAluno: true, feedbackIA: true, lacunasIA: true, quantidadeAulas: true },
      },
    },
  });

  // Serializa para o client component
  const alunos: AlunoComRegistro[] = alunosRaw.map((a) => {
    const reg = a.registros[0];
    return {
      id:   a.id,
      nome: a.nome,
      registro: reg ? {
        textoDoAluno: reg.textoDoAluno,
        feedbackIA:   reg.feedbackIA,
        lacunasIA:    reg.lacunasIA as unknown as FeedbackIA | null,
        quantidadeAulas: reg.quantidadeAulas,
      } : null,
    };
  });

  const conteudo = relatorio.conteudoIA as unknown as RelatorioIA;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/professor/dashboard" className="hover:text-amber-600 transition">
          ← Voltar
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium">Relatório</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-500">{relatorio.turma.nome}</span>
      </div>

      {/* Relatório agregado da IA */}
      <RelatorioPanel
        relatorio={conteudo}
        nomeTurma={relatorio.turma.nome}
        nomeMateria={relatorio.materia.nome}
        data={relatorio.data}
        geradoEm={relatorio.geradoEm.toISOString()}
        subjectId={relatorio.subjectId}
        turmaId={relatorio.turmaId}
      />

      {/* Lista individual dos alunos */}
      <ListaAlunos
        alunos={alunos}
        nomeMateria={relatorio.materia.nome}
        data={relatorio.data}
      />
    </div>
  );
}
