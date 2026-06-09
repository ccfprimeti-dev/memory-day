// GET /api/materias?turmaId=xxx
// Professor: retorna só as matérias que ELE leciona naquela turma.
// Aluno:     retorna as matérias da SUA turma (ignora query param).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessao();
    if (!sessao.usuario) {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    const { usuario } = sessao;

    if (usuario.papel === "PROFESSOR") {
      const turmaId = req.nextUrl.searchParams.get("turmaId");
      if (!turmaId) {
        return NextResponse.json(
          { erro: "Parâmetro turmaId obrigatório para professores." },
          { status: 400 }
        );
      }
      // Só as matérias que este professor leciona nesta turma
      const materias = await prisma.subject.findMany({
        where: { turmaId, professorId: usuario.id },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, turmaId: true },
      });
      return NextResponse.json(materias);
    }

    // Aluno — matérias da própria turma
    if (!usuario.turmaId) {
      return NextResponse.json({ erro: "Aluno sem turma vinculada." }, { status: 400 });
    }
    const materias = await prisma.subject.findMany({
      where: { turmaId: usuario.turmaId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, turmaId: true },
    });
    return NextResponse.json(materias);
  } catch (erro) {
    console.error("[/api/materias]", erro);
    return NextResponse.json({ erro: "Erro ao buscar matérias." }, { status: 500 });
  }
}
