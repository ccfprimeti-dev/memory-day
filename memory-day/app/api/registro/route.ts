import { NextRequest, NextResponse } from "next/server";
import { prisma, jsonInput } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import { analisarRegistroAluno } from "@/lib/ai";
import type { RegistroPayload, FeedbackIA, NivelEnsino } from "@/types";
import { MAX_AULAS } from "@/types";

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

  // Quantidade de aulas que este registro cobre (ex: aula dupla = 2). Padrão: 1.
  const quantidadeAulasInformada =
    Number.isInteger(body.quantidadeAulas) && (body.quantidadeAulas as number) > 0
      ? (body.quantidadeAulas as number)
      : undefined;
  let quantidadeAulas = quantidadeAulasInformada ?? 1;

  // Conta apenas entradas existentes (upsert em entrada já criada é sempre permitido)
  const jaExiste = await prisma.entry.findUnique({
    where: { alunoId_subjectId_data: { alunoId: sessao.usuario.id, subjectId, data } },
  });

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
    const maxAulas = MAX_AULAS[(turmaAluno?.nivelEnsino ?? "EF2") as NivelEnsino] ?? 5;
    quantidadeAulas = Math.min(quantidadeAulas, maxAulas);

    if (!jaExiste) {
      const entriesHoje = await prisma.entry.findMany({
        where: { alunoId: sessao.usuario.id, data },
        select: { quantidadeAulas: true },
      });
      const totalAulasHoje = entriesHoje.reduce((soma, e) => soma + e.quantidadeAulas, 0);
      if (totalAulasHoje + quantidadeAulas > maxAulas) {
        const restantes = Math.max(0, maxAulas - totalAulasHoje);
        return NextResponse.json(
          {
            erro: restantes === 0
              ? `Você já atingiu o limite de ${maxAulas} aulas por dia para o seu nível de ensino.`
              : `Esse registro cobre ${quantidadeAulas} aula(s), mas só restam ${restantes} aula(s) hoje.`,
          },
          { status: 400 }
        );
      }
    }
  }

  // Chama a IA para análise
  let feedbackIA: string;
  let lacunasIA: FeedbackIA;
  let nivelIA: string;
  try {
    const analise = await analisarRegistroAluno(texto.trim(), materia.nome);
    feedbackIA = analise.resumo;
    lacunasIA  = analise;
    nivelIA    = analise.nivel ?? "BASICO"; // fallback defensivo caso a IA omita o campo
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
      nivelIA,
      ...(quantidadeAulasInformada !== undefined ? { quantidadeAulas } : {}),
    },
    create: {
      alunoId: sessao.usuario.id,
      subjectId,
      data,
      textoDoAluno: texto.trim(),
      feedbackIA,
      lacunasIA: jsonInput(lacunasIA),
      nivelIA,
      quantidadeAulas,
    },
  });

  return NextResponse.json(registro, { status: 201 });
}
