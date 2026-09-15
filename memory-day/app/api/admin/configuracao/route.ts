// GET/PATCH /api/admin/configuracao
// Configuração global da escola — hoje só os dias letivos já decorridos no ano,
// usados para calcular a taxa de entrega de todos os alunos.
// Restrito a ADMIN.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

async function checarAdmin() {
  const sessao = await getSessao();
  return sessao.usuario?.papel === "ADMIN";
}

export async function GET() {
  if (!(await checarAdmin())) {
    return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });
  }

  const config = await prisma.configuracao.upsert({
    where:  { id: "global" },
    update: {},
    create: { id: "global" },
  });

  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  if (!(await checarAdmin())) {
    return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });
  }

  const body = await req.json() as { diasLetivos?: number };
  const diasLetivos = body.diasLetivos;

  if (!Number.isInteger(diasLetivos) || (diasLetivos as number) < 0) {
    return NextResponse.json({ erro: "diasLetivos deve ser um número inteiro ≥ 0." }, { status: 400 });
  }

  const config = await prisma.configuracao.upsert({
    where:  { id: "global" },
    update: { diasLetivos },
    create: { id: "global", diasLetivos },
  });

  return NextResponse.json(config);
}
