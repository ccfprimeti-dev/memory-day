// GET /api/turmas
// Comportamento condicional baseado na sessão:
//   - Professor autenticado → retorna apenas as turmas em que ele leciona (via TurmaProfessor)
//   - Sem sessão ou aluno  → retorna todas as turmas (usado no formulário de cadastro)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

export async function GET() {
  try {
    const sessao = await getSessao();
    const usuario = sessao.usuario;

    // Professor logado vê apenas suas turmas
    if (usuario?.papel === "PROFESSOR") {
      const vinculos = await prisma.turmaProfessor.findMany({
        where:   { professorId: usuario.id },
        include: { turma: { select: { id: true, nome: true, anoLetivo: true, codigoConvite: true, nivelEnsino: true } } },
        orderBy: [{ turma: { anoLetivo: "desc" } }, { turma: { nome: "asc" } }],
      });
      return NextResponse.json(vinculos.map((v) => v.turma));
    }

    // Sem sessão (cadastro) ou aluno: todas as turmas
    const turmas = await prisma.turma.findMany({
      orderBy: [{ anoLetivo: "desc" }, { nome: "asc" }],
      select: { id: true, nome: true, anoLetivo: true, codigoConvite: true, nivelEnsino: true },
    });
    return NextResponse.json(turmas);
  } catch (erro) {
    console.error("[/api/turmas]", erro);
    return NextResponse.json({ erro: "Erro ao buscar turmas." }, { status: 500 });
  }
}
