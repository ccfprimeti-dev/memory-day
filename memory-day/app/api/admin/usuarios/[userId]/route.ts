// DELETE /api/admin/usuarios/[userId]
// Remove um usuário e todos os seus registros. Admins não podem ser removidos.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  const alvo = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!alvo) {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  if (alvo.papel === "ADMIN") {
    return NextResponse.json({ erro: "Não é possível remover um administrador." }, { status: 400 });
  }

  // Entry não tem cascade — deleta registros antes do usuário
  await prisma.$transaction([
    prisma.entry.deleteMany({ where: { alunoId: params.userId } }),
    prisma.user.delete({ where: { id: params.userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
