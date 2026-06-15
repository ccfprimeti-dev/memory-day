// GET /api/admin/turmas
// Retorna todas as turmas com contagem de alunos e matérias.
// Restrito a usuários com papel ADMIN.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

export async function GET() {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") {
    return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });
  }

  const turmas = await prisma.turma.findMany({
    orderBy: [{ anoLetivo: "desc" }, { nome: "asc" }],
    include: {
      _count: {
        select: {
          alunos:   true, // alunos matriculados
          materias: true, // matérias da turma
        },
      },
    },
  });

  return NextResponse.json(turmas);
}
