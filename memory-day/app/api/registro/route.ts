import { NextRequest, NextResponse } from "next/server";
import { prisma, jsonInput } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import { analisarRegistroAluno } from "@/lib/ai";
import type { RegistroPayload, FeedbackIA } from "@/types";

// GET /api/registro?data=YYYY-MM-DD
// Retorna todos os registros do aluno logado na data informada
export async function GET(req: NextRequest) {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ALUNO") {
    return NextResponse.json({ erro: "Acesso restrito a alunos" }, { status: 403 });
  }

  const data = req.nextUrl.searchParams.get("data");
  if (!data) {
    return NextResponse.json({ erro: "Parâmetro 'data' é obrigatório (YYYY-MM-DD)" }, { status: 400 });
  }

  const registros = await prisma.entry.findMany({
    where: { alunoId: sessao.usuario.id, data },
    include: { materia: { select: { id: true, nome: true } } },
    orderBy: { materia: { nome: "asc" } },
  });

  return NextResponse.json(registros);
}

// POST /api/registro
// Recebe texto do aluno, chama a IA, salva e retorna o feedback
export async function POST(req: NextRequest) {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ALUNO") {
    return NextResponse.json({ erro: "Acesso restrito a alunos" }, { status: 403 });
  }

  const body: RegistroPayload = await req.json();
  const { subjectId, texto, data } = body;

  if (!subjectId || !texto?.trim() || !data) {
    return NextResponse.json({ erro: "subjectId, texto e data são obrigatórios" }, { status: 400 });
  }

  if (texto.trim().length < 20) {
    return NextResponse.json({ erro: "O texto deve ter pelo menos 20 caracteres" }, { status: 400 });
  }

  const materia = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!materia) {
    return NextResponse.json({ erro: "Matéria não encontrada" }, { status: 404 });
  }

  // Verifica se o aluno ainda pode registrar mais aulas hoje (limite por nível)
  const aluno = await prisma.user.findUnique({
    where:  { id: sessao.usuario.id },
    select: { turmaId: true },
  });
  if (aluno?.turmaId) {
    const turmaAluno = await prisma.turma.findUnique({
      where:  { id: aluno.turmaId },
      select: { nivelEnsino: true },
    });
    const maxAulas = turmaAluno?.nivelEnsino === "EM" ? 7 : 5;

    // Conta apenas entradas existentes (upsert em entrada já criada é sempre permitido)
    const jaExiste = await prisma.entry.findUnique({
      where: { alunoId_subjectId_data: { alunoId: sessao.usuario.id, subjectId, data } },
    });
    if (!jaExiste) {
      const totalHoje = await prisma.entry.count({
        where: { alunoId: sessao.usuario.id, data },
      });
      if (totalHoje >= maxAulas) {
        return NextResponse.json(
          { erro: `Você já atingiu o limite de ${maxAulas} aulas por dia para o seu nível de ensino.` },
          { status: 400 }
        );
      }
    }
  }

  // Chama a IA para análise
  let feedbackIA: string;
  let lacunasIA: FeedbackIA;
  try {
    const analise = await analisarRegistroAluno(texto.trim(), materia.nome);
    feedbackIA = analise.resumo;
    lacunasIA = analise;
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error("[/api/registro] Erro na IA:", mensagem);
    return NextResponse.json(
      { erro: `Erro na IA: ${mensagem}` },
      { status: 502 }
    );
  }

  // Upsert: atualiza se já existe, cria se não existe
  const registro = await prisma.entry.upsert({
    where: {
      alunoId_subjectId_data: {
        alunoId: sessao.usuario.id,
        subjectId,
        data,
      },
    },
    update: {
      textoDoAluno: texto.trim(),
      feedbackIA,
      lacunasIA: jsonInput(lacunasIA),
    },
    create: {
      alunoId: sessao.usuario.id,
      subjectId,
      data,
      textoDoAluno: texto.trim(),
      feedbackIA,
      lacunasIA: jsonInput(lacunasIA),
    },
  });

  return NextResponse.json(registro, { status: 201 });
}
