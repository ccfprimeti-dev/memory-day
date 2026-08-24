// PATCH /api/admin/turmas/[turmaId]
// Atualiza o calendário letivo da turma (dias letivos totais e decorridos).
// Restrito a ADMIN.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

interface Params {
  params: { turmaId: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") {
    return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });
  }

  const { turmaId } = params;
  const body = await req.json() as { diasLetivosTotais?: number; diasLetivosDecorridos?: number };

  const totais     = body.diasLetivosTotais;
  const decorridos = body.diasLetivosDecorridos;

  if (
    !Number.isInteger(totais) || (totais as number) < 0 ||
    !Number.isInteger(decorridos) || (decorridos as number) < 0
  ) {
    return NextResponse.json(
      { erro: "diasLetivosTotais e diasLetivosDecorridos devem ser números inteiros ≥ 0." },
      { status: 400 }
    );
  }
  if ((decorridos as number) > (totais as number)) {
    return NextResponse.json(
      { erro: "Dias letivos decorridos não pode ser maior que o total do ano." },
      { status: 400 }
    );
  }

  const turma = await prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true } });
  if (!turma) {
    return NextResponse.json({ erro: "Turma não encontrada." }, { status: 404 });
  }

  const atualizada = await prisma.turma.update({
    where: { id: turmaId },
    data:  { diasLetivosTotais: totais, diasLetivosDecorridos: decorridos },
    select: { id: true, diasLetivosTotais: true, diasLetivosDecorridos: true },
  });

  return NextResponse.json(atualizada);
}
