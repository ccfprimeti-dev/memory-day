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
import { agregarNiveis, dataInicioPeriodo } from "@/lib/nivelUtils";
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
  if (![15, 30, 60].includes(periodo)) {
    return NextResponse.json({ erro: "periodo deve ser 15, 30 ou 60." }, { status: 400 });
  }

  const dataInicio = dataInicioPeriodo(periodo);

  // Busca o aluno
  const aluno = await prisma.user.findUnique({
    where: { id: alunoId },
    select: { nome: true, turmaId: true, turma: { select: { nome: true } } },
  });
  if (!aluno || !aluno.turmaId) {
    return NextResponse.json({ erro: "Aluno não encontrado." }, { status: 404 });
  }

  const turmaId = aluno.turmaId;

  // Matérias da turma
  const materias = await prisma.subject.findMany({
    where: { turmaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  // Entries do aluno no período
  const entriesAluno = await prisma.entry.findMany({
    where: { alunoId, data: { gte: dataInicio } },
    select: { subjectId: true, nivelIA: true },
  });

  // Todos os colegas de turma
  const colegas = await prisma.user.findMany({
    where: { papel: "ALUNO", turmaId },
    select: { id: true },
  });
  const colegaIds = colegas.map((c) => c.id);

  // Entries da turma inteira no período (para calcular média)
  const entriesTurma = await prisma.entry.findMany({
    where: {
      alunoId: { in: colegaIds },
      data:    { gte: dataInicio },
    },
    select: { subjectId: true, nivelIA: true },
  });

  // Agrupa entries por matéria
  const nivelAlunoMap: Record<string, string[]>  = {};
  for (const e of entriesAluno) {
    if (!nivelAlunoMap[e.subjectId]) nivelAlunoMap[e.subjectId] = [];
    if (e.nivelIA) nivelAlunoMap[e.subjectId].push(e.nivelIA);
  }

  const nivelTurmaMap: Record<string, string[]> = {};
  for (const e of entriesTurma) {
    if (!nivelTurmaMap[e.subjectId]) nivelTurmaMap[e.subjectId] = [];
    if (e.nivelIA) nivelTurmaMap[e.subjectId].push(e.nivelIA);
  }

  // Monta dados do PDF por matéria
  const dados = materias
    .map((mat) => {
      const nivelAluno = agregarNiveis(nivelAlunoMap[mat.id] ?? []);
      const nivelTurma = agregarNiveis(nivelTurmaMap[mat.id] ?? []);
      return {
        nomeMateria: mat.nome,
        nivelAluno:  nivelAluno as NivelIA | null,
        nivelTurma:  nivelTurma as NivelIA | null,
      };
    })
    .filter((m) => m.nivelAluno !== null || m.nivelTurma !== null);

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
