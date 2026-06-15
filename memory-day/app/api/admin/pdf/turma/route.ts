// GET /api/admin/pdf/turma?turmaId=X&periodo=15|30|60
// Gera PDF com desempenho de todos os alunos da turma, por matéria, no período.
// Restrito a ADMIN.
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import { TurmaPDF } from "@/components/pdf/TurmaPDF";
import { agregarNiveis, dataInicioPeriodo } from "@/lib/nivelUtils";
import type { NivelIA } from "@/types";

export async function GET(req: NextRequest) {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") {
    return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });
  }

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  const periodo = Number(req.nextUrl.searchParams.get("periodo") ?? "30");

  if (!turmaId) {
    return NextResponse.json({ erro: "turmaId obrigatório." }, { status: 400 });
  }
  if (![15, 30, 60].includes(periodo)) {
    return NextResponse.json({ erro: "periodo deve ser 15, 30 ou 60." }, { status: 400 });
  }

  const dataInicio = dataInicioPeriodo(periodo);

  // Busca turma
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    select: { nome: true, anoLetivo: true },
  });
  if (!turma) {
    return NextResponse.json({ erro: "Turma não encontrada." }, { status: 404 });
  }

  // Busca matérias da turma que têm ao menos um registro no período
  const materias = await prisma.subject.findMany({
    where: { turmaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  // Busca todos os alunos da turma
  const alunos = await prisma.user.findMany({
    where: { papel: "ALUNO", turmaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  // Busca todos os entries do período para esta turma (via alunos)
  const alunoIds = alunos.map((a) => a.id);
  const entries = await prisma.entry.findMany({
    where: {
      alunoId: { in: alunoIds },
      data:    { gte: dataInicio },
    },
    select: { alunoId: true, subjectId: true, nivelIA: true },
  });

  // Monta estrutura: materia → aluno → [niveis no período]
  type MapaNiveis = Record<string, Record<string, string[]>>; // subjectId → alunoId → niveis[]
  const mapa: MapaNiveis = {};
  for (const e of entries) {
    if (!mapa[e.subjectId]) mapa[e.subjectId] = {};
    if (!mapa[e.subjectId][e.alunoId]) mapa[e.subjectId][e.alunoId] = [];
    if (e.nivelIA) mapa[e.subjectId][e.alunoId].push(e.nivelIA);
  }

  // Constrói dados para o PDF: por matéria, array de { nomeAluno, nivel }
  const dadosPDF = materias
    .map((mat) => {
      const porAluno = alunos.map((aluno) => {
        const niveis = mapa[mat.id]?.[aluno.id] ?? [];
        const nivel  = agregarNiveis(niveis);
        return { nomeAluno: aluno.nome, nivel: nivel as NivelIA | null };
      });
      // Inclui a matéria apenas se houver ao menos um aluno com dado
      const temDados = porAluno.some((a) => a.nivel !== null);
      return { nomeMateria: mat.nome, alunos: porAluno, temDados };
    })
    .filter((m) => m.temDados);

  const geradoEm = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    createElement(TurmaPDF, {
      nomeTurma: turma.nome,
      anoLetivo: turma.anoLetivo,
      periodo,
      dados: dadosPDF,
      geradoEm,
    }) as any
  );

  const nomeArq = `memory-day_turma_${turma.nome.replace(/\s+/g, "-")}_${periodo}d.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArq}"`,
      "Content-Length":      String(buffer.length),
    },
  });
}
