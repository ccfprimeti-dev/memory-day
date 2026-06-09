// POST /api/auth/cadastro
// Cria um novo usuário (aluno ou professor) com vínculos de turma.
// Aluno:     turmaId obrigatório.
// Professor: turmaIds[] + subjectIds[] obrigatórios (≥1 de cada).
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, email, senha, papel, turmaId, turmaIds, subjectIds } = body as {
      nome:        string;
      email:       string;
      senha:       string;
      papel:       "ALUNO" | "PROFESSOR";
      turmaId?:    string;     // apenas para ALUNO
      turmaIds?:   string[];   // apenas para PROFESSOR
      subjectIds?: string[];   // apenas para PROFESSOR — matérias que vai lecionar
    };

    // ── Validação de campos obrigatórios ─────────────────────────────────────
    if (!nome?.trim() || !email?.trim() || !senha || !papel) {
      return NextResponse.json(
        { erro: "Nome, e-mail, senha e papel são obrigatórios." },
        { status: 400 }
      );
    }
    if (!["ALUNO", "PROFESSOR"].includes(papel)) {
      return NextResponse.json({ erro: "Papel inválido." }, { status: 400 });
    }
    if (senha.length < 6) {
      return NextResponse.json(
        { erro: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }
    if (papel === "ALUNO" && !turmaId) {
      return NextResponse.json(
        { erro: "Aluno precisa selecionar uma turma." },
        { status: 400 }
      );
    }
    if (papel === "PROFESSOR") {
      if (!turmaIds || turmaIds.length === 0) {
        return NextResponse.json(
          { erro: "Professor precisa selecionar pelo menos uma turma." },
          { status: 400 }
        );
      }
      if (!subjectIds || subjectIds.length === 0) {
        return NextResponse.json(
          { erro: "Professor precisa selecionar pelo menos uma matéria." },
          { status: 400 }
        );
      }
    }

    // ── E-mail duplicado ──────────────────────────────────────────────────────
    const existe = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existe) {
      return NextResponse.json(
        { erro: "Este e-mail já está cadastrado." },
        { status: 409 }
      );
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    // ── ALUNO ─────────────────────────────────────────────────────────────────
    if (papel === "ALUNO") {
      const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
      if (!turma) {
        return NextResponse.json({ erro: "Turma não encontrada." }, { status: 404 });
      }

      const usuario = await prisma.user.create({
        data: { nome: nome.trim(), email: email.trim(), senhaHash, papel, turmaId },
      });

      const sessao = await getSessao();
      sessao.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email, papel, turmaId };
      await sessao.save();

      return NextResponse.json({ papel, redirectTo: "/aluno/dashboard" }, { status: 201 });
    }

    // ── PROFESSOR ─────────────────────────────────────────────────────────────
    // Confirma que todas as turmas selecionadas existem
    const turmasEncontradas = await prisma.turma.findMany({
      where: { id: { in: turmaIds } },
    });
    if (turmasEncontradas.length !== turmaIds!.length) {
      return NextResponse.json(
        { erro: "Uma ou mais turmas selecionadas não foram encontradas." },
        { status: 404 }
      );
    }

    // Confirma que todas as matérias selecionadas pertencem às turmas escolhidas
    const materiasEncontradas = await prisma.subject.findMany({
      where: { id: { in: subjectIds }, turmaId: { in: turmaIds } },
    });
    if (materiasEncontradas.length !== subjectIds!.length) {
      return NextResponse.json(
        { erro: "Uma ou mais matérias selecionadas são inválidas." },
        { status: 400 }
      );
    }

    // Cria o professor com os vínculos de turma
    const usuario = await prisma.user.create({
      data: {
        nome:  nome.trim(),
        email: email.trim(),
        senhaHash,
        papel,
        turmas: {
          create: turmaIds!.map((tid) => ({ turmaId: tid })),
        },
      },
    });

    // Atribui o professor às matérias selecionadas
    await prisma.subject.updateMany({
      where: { id: { in: subjectIds } },
      data:  { professorId: usuario.id },
    });

    const sessao = await getSessao();
    sessao.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email, papel, turmaId: null };
    await sessao.save();

    return NextResponse.json({ papel, redirectTo: "/professor/dashboard" }, { status: 201 });
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    console.error("[/api/auth/cadastro]", msg);
    return NextResponse.json({ erro: "Erro interno no servidor." }, { status: 500 });
  }
}
