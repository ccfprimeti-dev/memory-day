// GET /api/admin/aluno/[alunoId]?data=YYYY-MM-DD
// Retorna os registros de um aluno em uma data específica (todas as matérias).
// Restrito a ADMIN.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import type { FeedbackIA } from "@/types";

interface Params {
  params: { alunoId: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") {
    return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });
  }

  const { alunoId } = params;
  const data = req.nextUrl.searchParams.get("data");

  if (!data) {
    return NextResponse.json({ erro: "Parâmetro 'data' obrigatório (YYYY-MM-DD)." }, { status: 400 });
  }

  // Busca o aluno com seus registros no dia (sem filtro de matéria — admin vê tudo)
  const aluno = await prisma.user.findUnique({
    where: { id: alunoId },
    select: {
      id:     true,
      nome:   true,
      turmaId:true,
      turma:  { select: { nome: true } },
      registros: {
        where: { data },
        select: {
          id:           true,
          textoDoAluno: true,
          feedbackIA:   true,
          lacunasIA:    true,
          nivelIA:      true,
          materia: { select: { id: true, nome: true } },
        },
        orderBy: { materia: { nome: "asc" } },
      },
    },
  });

  if (!aluno) {
    return NextResponse.json({ erro: "Aluno não encontrado." }, { status: 404 });
  }

  // Converte lacunasIA de Json para o tipo correto antes de serializar
  const registros = aluno.registros.map((r) => ({
    ...r,
    lacunasIA: r.lacunasIA as unknown as FeedbackIA | null,
  }));

  return NextResponse.json({ ...aluno, registros });
}
