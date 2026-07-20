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
import { agregarNiveis, agregarAproveitamento, dataInicioPeriodo } from "@/lib/nivelUtils";
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

  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    select: { nome: true, anoLetivo: true },
  });
  if (!turma) {
    return NextResponse.json({ erro: "Turma não encontrada." }, { status: 404 });
  }

  const materias = await prisma.subject.findMany({
    where: { turmaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  const alunos = await prisma.user.findMany({
    where: { papel: "ALUNO", turmaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  const alunoIds = alunos.map((a) => a.id);
  const entries = await prisma.entry.findMany({
    where: {
      alunoId: { in: alunoIds },
      data:    { gte: dataInicio },
    },
    select: { alunoId: true, subjectId: true, nivelIA: true, aproveitamento: true },
  });

  // subjectId → alunoId → [niveis]
  const mapaNiveis: Record<string, Record<string, string[]>> = {};
  // subjectId → alunoId → [aproveitamentos]
  const mapaAprov: Record<string, Record<string, (number | null)[]>> = {};
  // subjectId → alunoId → contagem de registros
  const contagem: Record<string, Record<string, number>> = {};

  for (const e of entries) {
    if (!mapaNiveis[e.subjectId])  mapaNiveis[e.subjectId]  = {};
    if (!mapaAprov[e.subjectId])   mapaAprov[e.subjectId]   = {};
    if (!contagem[e.subjectId])    contagem[e.subjectId]    = {};

    if (!mapaNiveis[e.subjectId][e.alunoId])  mapaNiveis[e.subjectId][e.alunoId]  = [];
    if (!mapaAprov[e.subjectId][e.alunoId])   mapaAprov[e.subjectId][e.alunoId]   = [];

    contagem[e.subjectId][e.alunoId] = (contagem[e.subjectId][e.alunoId] ?? 0) + 1;
    if (e.nivelIA)    mapaNiveis[e.subjectId][e.alunoId].push(e.nivelIA);
    mapaAprov[e.subjectId][e.alunoId].push(e.aproveitamento ?? null);
  }

  const dadosPDF = materias
    .map((mat) => {
      const porAluno = alunos.map((aluno) => {
        const niveis        = mapaNiveis[mat.id]?.[aluno.id] ?? [];
        const aprovs        = mapaAprov[mat.id]?.[aluno.id]  ?? [];
        const nivel         = agregarNiveis(niveis) as NivelIA | null;
        const aproveitamento = agregarAproveitamento(aprovs);
        return {
          nomeAluno:      aluno.nome,
          nivel,
          aproveitamento,
          totalRegistros: contagem[mat.id]?.[aluno.id] ?? 0,
        };
      });
      const temDados = porAluno.some((a) => a.nivel !== null || a.aproveitamento !== null);
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
