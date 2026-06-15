// Rota: GET /api/relatorios/[turmaId]/[subjectId]/[data]/pdf
// Gera e devolve o relatório diário da turma em PDF.
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, Font } from "@react-pdf/renderer";
import { createElement } from "react";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";
import { RelatorioPDF } from "@/components/pdf/RelatorioPDF";
import type { RelatorioIA } from "@/types";

// ── Registro de fonte (uma vez por processo) ──────────────────────────────────
let fonteOk = false;
function registrarFonte() {
  if (fonteOk) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Roboto",
    fonts: [
      { src: path.join(dir, "roboto-400.woff"), fontWeight: 400 },
      { src: path.join(dir, "roboto-700.woff"), fontWeight: 700 },
    ],
  });
  fonteOk = true;
}

interface Params {
  params: { turmaId: string; subjectId: string; data: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const sessao = await getSessao();
    if (!sessao.usuario) {
      return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });
    }
    if (sessao.usuario.papel !== "PROFESSOR") {
      return NextResponse.json({ erro: "Acesso restrito a professores." }, { status: 403 });
    }

    const { turmaId, subjectId, data } = params;

    // Busca relatório com turma + matéria + professor
    const relatorio = await prisma.classReport.findUnique({
      where: { turmaId_subjectId_data: { turmaId, subjectId, data } },
      include: {
        turma:  { select: { nome: true } },
        materia: {
          select: {
            nome: true,
            professorId: true,
            professor: { select: { nome: true } },
          },
        },
      },
    });

    if (!relatorio) {
      return NextResponse.json(
        { erro: "Relatorio nao encontrado. Gere o relatorio primeiro." },
        { status: 404 }
      );
    }

    // Apenas o professor dono da matéria pode exportar
    if (relatorio.materia.professorId !== sessao.usuario.id) {
      return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
    }

    // Participação: alunos desta turma
    const [totalAlunos, alunosRegistraram] = await Promise.all([
      prisma.user.count({ where: { papel: "ALUNO", turmaId } }),
      prisma.entry.count({ where: { subjectId, data, aluno: { turmaId } } }),
    ]);

    const geradoEm = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const conteudo = relatorio.conteudoIA as unknown as RelatorioIA;

    registrarFonte();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      createElement(RelatorioPDF, {
        relatorio:        conteudo,
        nomeTurma:        relatorio.turma.nome,
        nomeMateria:      relatorio.materia.nome,
        nomeProfessor:    relatorio.materia.professor?.nome ?? "—",
        data,
        totalAlunos,
        alunosRegistraram,
        geradoEm,
      }) as any
    );

    const nomeSeguro = relatorio.materia.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "-");
    const nomeArquivo = `memory-day_${nomeSeguro}_${relatorio.turma.nome.replace(/\s+/g, "-")}_${data}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
        "Content-Length":      String(buffer.length),
      },
    });
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    console.error("[/api/relatorios/pdf]", msg);
    return NextResponse.json({ erro: `Erro interno ao gerar o PDF: ${msg}` }, { status: 500 });
  }
}
