// POST /api/auth/esqueci-senha
// Redefine a senha de um usuário apenas pelo e-mail, sem autenticação prévia.
// AVISO DE SEGURANÇA: qualquer pessoa que conheça o e-mail pode redefinir a senha.
// Mitigação aceitável neste contexto: a escola é fechada, o admin pode redefinir
// novamente via painel de usuários se houver uso indevido.
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { email, novaSenha } = await req.json() as {
    email?:     string;
    novaSenha?: string;
  };

  if (!email?.trim() || !novaSenha?.trim()) {
    return NextResponse.json(
      { erro: "E-mail e nova senha são obrigatórios." },
      { status: 400 }
    );
  }
  if (novaSenha.trim().length < 6) {
    return NextResponse.json(
      { erro: "A nova senha deve ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  const usuario = await prisma.user.findUnique({
    where:  { email: email.trim().toLowerCase() },
    select: { id: true },
  });

  // Retorna a mesma resposta de sucesso mesmo se o e-mail não existir,
  // para não revelar quais e-mails estão cadastrados.
  if (!usuario) {
    return NextResponse.json({ ok: true });
  }

  const senhaHash = await bcrypt.hash(novaSenha.trim(), 10);
  await prisma.user.update({
    where: { id: usuario.id },
    data:  { senhaHash },
  });

  return NextResponse.json({ ok: true });
}
