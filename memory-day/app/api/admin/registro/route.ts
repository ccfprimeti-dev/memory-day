import { NextRequest, NextResponse } from "next/server";
import { prisma, jsonInput } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import { analisarRegistroAluno } from "@/lib/ai";
import type { FeedbackIA } from "@/types";

// POST /api/admin/registro
// Admin cria/substitui um registro em nome de um aluno (sem limite de aulas/dia).
// Indistinguível de um registro real para fins de agregação.
export async function POST(req: NextRequest) {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") {
    return NextResponse.json({ erro: "Acesso restrito a administradores" }, { status: 403 });
  }

  const body = await req.json() as {
    alunoId:   string;
    subjectId: string;
    data:      string;
    texto:     string;
  };
  const { alunoId, subjectId, data, texto } = body;

  if (!alunoId || !subjectId || !data || !texto?.trim()) {
    return NextResponse.json(
      { erro: "alunoId, subjectId, data e texto são obrigatórios" },
      { status: 400 }
    );
  }

  if (texto.trim().length < 20) {
    return NextResponse.json(
      { erro: "O texto deve ter pelo menos 20 caracteres" },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json(
      { erro: "Data inválida. Use o formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const aluno = await prisma.user.findFirst({
    where:  { id: alunoId, papel: "ALUNO" },
    select: { id: true, turmaId: true },
  });
  if (!aluno) {
    return NextResponse.json({ erro: "Aluno não encontrado" }, { status: 404 });
  }

  const materia = await prisma.subject.findFirst({
    where:  { id: subjectId, turmaId: aluno.turmaId ?? undefined },
    select: { id: true, nome: true },
  });
  if (!materia) {
    return NextResponse.json(
      { erro: "Matéria não pertence à turma do aluno" },
      { status: 400 }
    );
  }

  const jaExiste = await prisma.entry.findUnique({
    where:  { alunoId_subjectId_data: { alunoId, subjectId, data } },
    select: { id: true },
  });

  let feedbackIA: string;
  let lacunasIA: FeedbackIA;
  let nivelIA: string | null;
  try {
    const analise = await analisarRegistroAluno(texto.trim(), materia.nome);
    feedbackIA = analise.resumo;
    lacunasIA  = analise;
    const NIVEIS_VALIDOS = ["BASICO", "INTERMEDIARIO", "AVANCADO"] as const;
    nivelIA = (NIVEIS_VALIDOS as readonly string[]).includes(analise.nivel)
      ? analise.nivel
      : null;
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error("[/api/admin/registro] Erro na IA:", mensagem);
    return NextResponse.json({ erro: `Erro na IA: ${mensagem}` }, { status: 502 });
  }

  const registro = await prisma.entry.upsert({
    where: { alunoId_subjectId_data: { alunoId, subjectId, data } },
    update: {
      textoDoAluno: texto.trim(),
      feedbackIA,
      lacunasIA:    jsonInput(lacunasIA),
      nivelIA,
    },
    create: {
      alunoId,
      subjectId,
      data,
      textoDoAluno: texto.trim(),
      feedbackIA,
      lacunasIA:    jsonInput(lacunasIA),
      nivelIA,
      quantidadeAulas: 1,
    },
  });

  return NextResponse.json({ ...registro, atualizado: jaExiste !== null }, { status: 201 });
}
