// PATCH /api/admin/usuarios/[userId]/senha
// Permite ao admin redefinir a senha de qualquer usuário.
// A nova senha é hasheada com bcrypt(10) — nunca salva em texto puro.
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  // ── Auth: somente ADMIN ──────────────────────────────────────────────────
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  const { novaSenha } = await req.json() as { novaSenha?: string };

  if (!novaSenha || novaSenha.trim().length < 6) {
    return NextResponse.json(
      { erro: "A nova senha deve ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  const usuario = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!usuario) {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  const senhaHash = await bcrypt.hash(novaSenha.trim(), 10);
  await prisma.user.update({
    where: { id: params.userId },
    data:  { senhaHash },
  });

  return NextResponse.json({ ok: true });
}
