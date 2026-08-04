import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sessionOptionsLogin } from "@/lib/auth";
import type { SessaoUsuario } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { email, senha, lembrarMe } = await req.json() as {
      email?: string; senha?: string; lembrarMe?: boolean;
    };

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

    // Grava a sessão com duração correta: 30 dias se lembrarMe, session cookie se não
    const cookieStore = await cookies();
    const sessao = await getIronSession<{ usuario?: SessaoUsuario }>(cookieStore, sessionOptionsLogin(!!lembrarMe));
    sessao.usuario = {
      id:      usuario.id,
      nome:    usuario.nome,
      email:   usuario.email,
      papel:   usuario.papel as "ALUNO" | "PROFESSOR" | "ADMIN",
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
