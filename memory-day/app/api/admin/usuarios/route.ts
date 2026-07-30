// GET /api/admin/usuarios
// Lista todos os usuários. senhaHash NUNCA é incluído na resposta.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

export async function GET() {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  const usuarios = await prisma.user.findMany({
    select: {
      id:       true,
      nome:     true,
      email:    true,
      papel:    true,
      turmaId:  true,
      criadoEm: true,
      turma:    { select: { nome: true } },
    },
    orderBy: [{ papel: "asc" }, { nome: "asc" }],
  });

  return NextResponse.json(usuarios);
}
