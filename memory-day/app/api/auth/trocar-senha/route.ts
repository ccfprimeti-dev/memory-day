// POST /api/auth/trocar-senha
// Permite ao próprio usuário logado trocar sua senha informando a senha atual.
// userId vem da sessão assinada pelo servidor — impossível forçar outro usuário.
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // ── Requer sessão ativa ──────────────────────────────────────────────────
  const sessao = await getSessao();
  if (!sessao.usuario) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { senhaAtual, novaSenha } = await req.json() as {
    senhaAtual?: string;
    novaSenha?:  string;
  };

  if (!senhaAtual || !novaSenha) {
    return NextResponse.json(
      { erro: "Senha atual e nova senha são obrigatórias." },
      { status: 400 }
    );
  }
  if (novaSenha.trim().length < 6) {
    return NextResponse.json(
      { erro: "A nova senha deve ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  // userId da sessão — não do body, para impedir troca de senha de outro usuário
  const usuario = await prisma.user.findUnique({
    where:  { id: sessao.usuario.id },
    select: { id: true, senhaHash: true },
  });

  if (!usuario) {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  // Verifica senha atual antes de qualquer alteração
  const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senhaHash);
  if (!senhaCorreta) {
    return NextResponse.json({ erro: "Senha atual incorreta." }, { status: 401 });
  }

  const senhaHash = await bcrypt.hash(novaSenha.trim(), 10);
  await prisma.user.update({
    where: { id: usuario.id },
    data:  { senhaHash },
  });

  return NextResponse.json({ ok: true });
}
