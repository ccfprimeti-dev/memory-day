import { NextRequest, NextResponse } from "next/server";
import { prisma, jsonInput } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import { gerarRelatorioTurma } from "@/lib/ai";
import type { RelatorioPayload } from "@/types";

// GET /api/relatorio?turmaId=X&subjectId=Y&data=YYYY-MM-DD
// Retorna o relatório já gerado para turma + matéria + data, se existir
export async function GET(req: NextRequest) {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "PROFESSOR") {
    return NextResponse.json({ erro: "Acesso restrito a professores" }, { status: 403 });
  }

  const turmaId  = req.nextUrl.searchParams.get("turmaId");
  const subjectId = req.nextUrl.searchParams.get("subjectId");
  const data     = req.nextUrl.searchParams.get("data");

  if (!turmaId || !subjectId || !data) {
    return NextResponse.json({ erro: "turmaId, subjectId e data são obrigatórios" }, { status: 400 });
  }

  // Garante que o professor leciona esta matéria nesta turma
  const materia = await prisma.subject.findFirst({
    where: { id: subjectId, turmaId, professorId: sessao.usuario.id },
  });
  if (!materia) {
    return NextResponse.json({ erro: "Matéria não encontrada nesta turma" }, { status: 404 });
  }

  const relatorio = await prisma.classReport.findUnique({
    where: { turmaId_subjectId_data: { turmaId, subjectId, data } },
  });

  if (!relatorio) return NextResponse.json({ relatorio: null });

  return NextResponse.json(relatorio);
}

// POST /api/relatorio
// Gera (ou regenera) o relatório da turma para turmaId + subjectId + data
export async function POST(req: NextRequest) {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "PROFESSOR") {
    return NextResponse.json({ erro: "Acesso restrito a professores" }, { status: 403 });
  }

  const body: RelatorioPayload = await req.json();
  const { turmaId, subjectId, data } = body;

  if (!turmaId || !subjectId || !data) {
    return NextResponse.json({ erro: "turmaId, subjectId e data são obrigatórios" }, { status: 400 });
  }

  // Verifica que o professor leciona esta matéria nesta turma
  const materia = await prisma.subject.findFirst({
    where: { id: subjectId, turmaId, professorId: sessao.usuario.id },
  });
  if (!materia) {
    return NextResponse.json({ erro: "Matéria não encontrada nesta turma" }, { status: 404 });
  }

  // Busca apenas registros de alunos DESTA turma para esta matéria/dia
  const entradas = await prisma.entry.findMany({
    where: {
      subjectId,
      data,
      aluno: { turmaId }, // filtra pela turma do aluno
    },
    include: { aluno: { select: { nome: true } } },
  });

  if (entradas.length === 0) {
    return NextResponse.json(
      { erro: "Nenhum aluno desta turma enviou registro para esta matéria neste dia" },
      { status: 404 }
    );
  }

  // Total de alunos desta turma (para % de participação)
  const totalAlunos = await prisma.user.count({
    where: { papel: "ALUNO", turmaId },
  });

  const registrosForIA = entradas.map((e) => ({
    nomeAluno: e.aluno.nome,
    texto:     e.textoDoAluno,
  }));

  let relatorioIA;
  try {
    relatorioIA = await gerarRelatorioTurma(registrosForIA, materia.nome, totalAlunos);
  } catch (erro) {
    console.error("[/api/relatorio] Erro na IA:", erro);
    return NextResponse.json(
      { erro: "Falha ao gerar relatório com a IA. Tente novamente." },
      { status: 502 }
    );
  }

  // Upsert — turmaId + subjectId + data como chave única
  const relatorio = await prisma.classReport.upsert({
    where: { turmaId_subjectId_data: { turmaId, subjectId, data } },
    update: { conteudoIA: jsonInput(relatorioIA), geradoEm: new Date() },
    create: { turmaId, subjectId, data, conteudoIA: jsonInput(relatorioIA) },
  });

  return NextResponse.json(relatorio, { status: 201 });
}
