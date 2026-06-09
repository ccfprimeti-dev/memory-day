import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth";

export async function POST() {
  const sessao = await getSessao();
  sessao.destroy();
  return NextResponse.json({ ok: true });
}
