// GET /api/materias/publicas?turmaId=X
// Retorna todas as matérias de uma turma, sem exigir autenticação.
// Usado exclusivamente no formulário de cadastro do professor para
// exibir quais matérias existem na turma selecionada.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const turmaId = req.nextUrl.searchParams.get("turmaId");
    if (!turmaId) {
      return NextResponse.json(
        { erro: "Parâmetro turmaId é obrigatório." },
        { status: 400 }
      );
    }

    const materias = await prisma.subject.findMany({
      where:   { turmaId },
      orderBy: { nome: "asc" },
      select: {
        id:         true,
        nome:       true,
        turmaId:    true,
        // professorId null = matéria disponível; preenchido = já tem professor
        professorId: true,
      },
    });

    return NextResponse.json(materias);
  } catch (erro) {
    console.error("[/api/materias/publicas]", erro);
    return NextResponse.json({ erro: "Erro ao buscar matérias." }, { status: 500 });
  }
}
