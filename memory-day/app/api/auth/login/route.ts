import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json();

    if (!email || !senha) {
      return NextResponse.json({ erro: "Email e senha são obrigatórios" }, { status: 400 });
    }

    const usuario = await prisma.user.findUnique({ where: { email } });

    if (!usuario) {
      return NextResponse.json({ erro: "Credenciais inválidas" }, { status: 401 });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaCorreta) {
      return NextResponse.json({ erro: "Credenciais inválidas" }, { status: 401 });
    }

    // Grava a sessão no cookie (turmaId para alunos, null para professores)
    const sessao = await getSessao();
    sessao.usuario = {
      id:      usuario.id,
      nome:    usuario.nome,
      email:   usuario.email,
      papel:   usuario.papel as "ALUNO" | "PROFESSOR",
      turmaId: usuario.turmaId ?? null,
    };
    await sessao.save();

    return NextResponse.json({
      id:      usuario.id,
      nome:    usuario.nome,
      email:   usuario.email,
      papel:   usuario.papel,
      turmaId: usuario.turmaId ?? null,
    });
  } catch (erro) {
    console.error("[/api/auth/login]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
