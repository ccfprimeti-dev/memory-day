// GET /api/admin/pdf/aluno?alunoId=X&periodo=15|30|60
// Gera PDF com desempenho do aluno comparado à média da turma, por matéria.
// Restrito a ADMIN.
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import { AlunoPDF } from "@/components/pdf/AlunoPDF";
import { agregarNiveis, agregarAproveitamento, dataInicioPeriodo } from "@/lib/nivelUtils";
import type { NivelIA } from "@/types";

export async function GET(req: NextRequest) {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") {
    return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });
  }

  const alunoId = req.nextUrl.searchParams.get("alunoId");
  const periodo  = Number(req.nextUrl.searchParams.get("periodo") ?? "30");

  if (!alunoId) {
    return NextResponse.json({ erro: "alunoId obrigatório." }, { status: 400 });
  }
  if (![5, 15, 30, 60].includes(periodo)) {
    return NextResponse.json({ erro: "periodo deve ser 5, 15, 30 ou 60." }, { status: 400 });
  }

  const dataInicio = dataInicioPeriodo(periodo);

  const aluno = await prisma.user.findUnique({
    where: { id: alunoId },
    select: { nome: true, turmaId: true, turma: { select: { nome: true } } },
  });
  if (!aluno || !aluno.turmaId) {
    return NextResponse.json({ erro: "Aluno não encontrado." }, { status: 404 });
  }

  const turmaId = aluno.turmaId;

  const materias = await prisma.subject.findMany({
    where: { turmaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  // Entries do aluno — inclui campos BNCC
  const entriesAluno = await prisma.entry.findMany({
    where: { alunoId, data: { gte: dataInicio } },
    select: { subjectId: true, nivelIA: true, aproveitamento: true, habilidadeBncc: true },
  });

  // Colegas da turma excluindo o próprio aluno
  const colegas = await prisma.user.findMany({
    where: { papel: "ALUNO", turmaId },
    select: { id: true },
  });
  const colegaIds = colegas.map((c) => c.id).filter((id) => id !== alunoId);

  // Entries dos colegas — inclui aproveitamento para média da turma
  const entriesTurma = await prisma.entry.findMany({
    where: {
      alunoId: { in: colegaIds },
      data:    { gte: dataInicio },
    },
    select: { alunoId: true, subjectId: true, nivelIA: true, aproveitamento: true },
  });

  // Mapas do aluno por matéria
  const nivelAlunoMap:  Record<string, string[]> = {};
  const aprovAlunoMap:  Record<string, (number | null)[]> = {};
  const bnccAlunoMap:   Record<string, string | null> = {}; // última habilidade BNCC registrada

  for (const e of entriesAluno) {
    if (!nivelAlunoMap[e.subjectId])  nivelAlunoMap[e.subjectId]  = [];
    if (!aprovAlunoMap[e.subjectId])  aprovAlunoMap[e.subjectId]  = [];
    if (e.nivelIA)       nivelAlunoMap[e.subjectId].push(e.nivelIA);
    aprovAlunoMap[e.subjectId].push(e.aproveitamento ?? null);
    if (e.habilidadeBncc) bnccAlunoMap[e.subjectId] = e.habilidadeBncc;
  }

  // Mapas dos colegas por matéria — cada colega contribui 1 valor agregado
  // subjectId → alunoId → [aproveitamentos] e [niveis]
  const porColegaSubjectAprov: Record<string, Record<string, (number | null)[]>> = {};
  const porColegaSubjectNivel: Record<string, Record<string, string[]>> = {};

  for (const e of entriesTurma) {
    if (!porColegaSubjectAprov[e.subjectId])            porColegaSubjectAprov[e.subjectId] = {};
    if (!porColegaSubjectNivel[e.subjectId])            porColegaSubjectNivel[e.subjectId] = {};
    if (!porColegaSubjectAprov[e.subjectId][e.alunoId]) porColegaSubjectAprov[e.subjectId][e.alunoId] = [];
    if (!porColegaSubjectNivel[e.subjectId][e.alunoId]) porColegaSubjectNivel[e.subjectId][e.alunoId] = [];
    porColegaSubjectAprov[e.subjectId][e.alunoId].push(e.aproveitamento ?? null);
    if (e.nivelIA) porColegaSubjectNivel[e.subjectId][e.alunoId].push(e.nivelIA);
  }

  // Agrega turma: % médio de cada colega → média dessas médias
  const aprovTurmaMap: Record<string, number | null> = {};
  const nivelTurmaMap: Record<string, string[]> = {};
  for (const [subjectId, porAluno] of Object.entries(porColegaSubjectAprov)) {
    const mediasColegas = Object.values(porAluno).map((vals) => agregarAproveitamento(vals));
    aprovTurmaMap[subjectId] = agregarAproveitamento(mediasColegas);
  }
  for (const [subjectId, porAluno] of Object.entries(porColegaSubjectNivel)) {
    nivelTurmaMap[subjectId] = [];
    for (const niveis of Object.values(porAluno)) {
      const n = agregarNiveis(niveis);
      if (n) nivelTurmaMap[subjectId].push(n);
    }
  }

  // Monta dados do PDF por matéria
  const dados = materias
    .map((mat) => {
      const niveisAlunoRaw  = nivelAlunoMap[mat.id] ?? [];
      const aprovAluno      = agregarAproveitamento(aprovAlunoMap[mat.id] ?? []);
      const aprovTurma      = aprovTurmaMap[mat.id] ?? null;
      const nivelAluno      = agregarNiveis(niveisAlunoRaw);
      const nivelTurma      = agregarNiveis(nivelTurmaMap[mat.id] ?? []);
      const niveisParaTurma = nivelTurmaMap[mat.id] ?? [];

      return {
        nomeMateria:        mat.nome,
        nivelAluno:         nivelAluno as NivelIA | null,
        nivelTurma:         nivelTurma as NivelIA | null,
        aproveitamentoAluno: aprovAluno,
        aproveitamentoTurma: aprovTurma,
        habilidadeBncc:     bnccAlunoMap[mat.id] ?? null,
        niveisAluno:        niveisAlunoRaw,
        totalTurmaContrib:  niveisParaTurma.length,
        totalColegas:       colegaIds.length,
      };
    })
    .filter((m) => m.nivelAluno !== null || m.nivelTurma !== null || m.aproveitamentoAluno !== null);

  const geradoEm = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    createElement(AlunoPDF, {
      nomeAluno: aluno.nome,
      nomeTurma: aluno.turma?.nome ?? "",
      periodo,
      dados,
      geradoEm,
    }) as any
  );

  const nomeArq = `memory-day_aluno_${aluno.nome.replace(/\s+/g, "-")}_${periodo}d.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArq}"`,
      "Content-Length":      String(buffer.length),
    },
  });
}
