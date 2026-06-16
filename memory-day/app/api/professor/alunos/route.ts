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

    // Professor logado — usado para isolar dados por matéria
    const professorId = sessao.usuario.id;

    // Busca todos os alunos da turma, mas apenas os registros das matérias
    // que este professor leciona (isolamento por subjectId → professorId)
    const alunos = await prisma.user.findMany({
      where:   { papel: "ALUNO", turmaId },
      orderBy: { nome: "asc" },
      select: {
        id:   true,
        nome: true,
        registros: {
          where: {
            data,
            materia: { professorId }, // isolamento: só matérias deste professor
          },
          select: {
            id:           true,
            textoDoAluno: true,
            feedbackIA:   true,
            lacunasIA:    true,
            quantidadeAulas: true,
            materia: { select: { id: true, nome: true } },
          },
        },
      },
    });

    // Total de matérias que ESTE professor leciona nesta turma
    const totalMaterias = await prisma.subject.count({
      where: { turmaId, professorId },
    });

    return NextResponse.json({ alunos, totalMaterias });
  } catch (erro) {
    console.error("[/api/professor/alunos]", erro);
    return NextResponse.json({ erro: "Erro ao buscar alunos." }, { status: 500 });
  }
}
