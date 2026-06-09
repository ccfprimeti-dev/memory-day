// GET /api/professor/alunos?turmaId=X&data=YYYY-MM-DD
// Retorna todos os alunos da turma com seus registros do dia informado.
// Usado na visão de relatórios individuais do professor.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessao();
    if (!sessao.usuario || sessao.usuario.papel !== "PROFESSOR") {
      return NextResponse.json({ erro: "Acesso restrito a professores." }, { status: 403 });
    }

    const turmaId = req.nextUrl.searchParams.get("turmaId");
    const data    = req.nextUrl.searchParams.get("data");

    if (!turmaId || !data) {
      return NextResponse.json({ erro: "turmaId e data são obrigatórios." }, { status: 400 });
    }

    // Busca todos os alunos da turma com seus registros do dia
    const alunos = await prisma.user.findMany({
      where:   { papel: "ALUNO", turmaId },
      orderBy: { nome: "asc" },
      select: {
        id:   true,
        nome: true,
        registros: {
          where:   { data },
          select: {
            id:          true,
            textoDoAluno:true,
            feedbackIA:  true,
            lacunasIA:   true,
            materia: { select: { id: true, nome: true } },
          },
        },
      },
    });

    // Total de matérias da turma (para calcular % de completude)
    const totalMaterias = await prisma.subject.count({ where: { turmaId } });

    return NextResponse.json({ alunos, totalMaterias });
  } catch (erro) {
    console.error("[/api/professor/alunos]", erro);
    return NextResponse.json({ erro: "Erro ao buscar alunos." }, { status: 500 });
  }
}
