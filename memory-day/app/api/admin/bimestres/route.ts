// GET/PATCH /api/admin/bimestres
// Calendário dos 4 bimestres (dias letivos + data início/fim), cadastrado na Home.
// Restrito a ADMIN.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

async function checarAdmin() {
  const sessao = await getSessao();
  return sessao.usuario?.papel === "ADMIN";
}

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  if (!(await checarAdmin())) {
    return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });
  }

  // Garante que as 4 linhas existem
  for (const numero of [1, 2, 3, 4]) {
    await prisma.bimestre.upsert({ where: { numero }, update: {}, create: { numero } });
  }
  const bimestres = await prisma.bimestre.findMany({ orderBy: { numero: "asc" } });

  return NextResponse.json(bimestres);
}

export async function PATCH(req: NextRequest) {
  if (!(await checarAdmin())) {
    return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });
  }

  const body = await req.json() as {
    numero?: number; diasLetivos?: number; dataInicio?: string | null; dataFim?: string | null;
  };
  const { numero, diasLetivos, dataInicio, dataFim } = body;

  if (!Number.isInteger(numero) || (numero as number) < 1 || (numero as number) > 4) {
    return NextResponse.json({ erro: "numero deve ser 1, 2, 3 ou 4." }, { status: 400 });
  }
  if (!Number.isInteger(diasLetivos) || (diasLetivos as number) < 0) {
    return NextResponse.json({ erro: "diasLetivos deve ser um número inteiro ≥ 0." }, { status: 400 });
  }
  if (dataInicio && !DATA_REGEX.test(dataInicio)) {
    return NextResponse.json({ erro: "dataInicio inválida (use YYYY-MM-DD)." }, { status: 400 });
  }
  if (dataFim && !DATA_REGEX.test(dataFim)) {
    return NextResponse.json({ erro: "dataFim inválida (use YYYY-MM-DD)." }, { status: 400 });
  }
  if (dataInicio && dataFim && dataInicio > dataFim) {
    return NextResponse.json({ erro: "dataInicio não pode ser depois de dataFim." }, { status: 400 });
  }

  const atualizado = await prisma.bimestre.upsert({
    where:  { numero: numero as number },
    update: { diasLetivos, dataInicio: dataInicio ?? null, dataFim: dataFim ?? null },
    create: { numero: numero as number, diasLetivos, dataInicio: dataInicio ?? null, dataFim: dataFim ?? null },
  });

  return NextResponse.json(atualizado);
}
