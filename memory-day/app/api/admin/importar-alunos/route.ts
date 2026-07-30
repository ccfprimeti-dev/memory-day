// POST /api/admin/importar-alunos
// Recebe um arquivo .xlsx ou .csv, valida cada linha e cria os usuários alunos.
// Emails duplicados são pulados e reportados — nunca sobrescritos silenciosamente.
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/lib/auth";

interface LinhaErro {
  linha:  number;
  email:  string;
  motivo: string;
}

function emailValido(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export async function POST(req: NextRequest) {
  // ── Auth: somente ADMIN ──────────────────────────────────────────────────
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  // ── Leitura do arquivo (multipart/form-data) ─────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido. Envie multipart/form-data." }, { status: 400 });
  }

  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo) {
    return NextResponse.json({ erro: "Campo 'arquivo' não encontrado." }, { status: 400 });
  }

  const nome = arquivo.name.toLowerCase();
  if (!nome.endsWith(".xlsx") && !nome.endsWith(".csv")) {
    return NextResponse.json({ erro: "Formato inválido. Envie .xlsx ou .csv." }, { status: 400 });
  }

  // ── Parse com SheetJS ────────────────────────────────────────────────────
  const buffer    = Buffer.from(await arquivo.arrayBuffer());
  const workbook  = XLSX.read(buffer, { type: "buffer" });
  const sheet     = workbook.Sheets[workbook.SheetNames[0]];
  // header:1 retorna array de arrays; defval:"" garante células vazias como string vazia
  const linhas    = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });

  if (linhas.length < 2) {
    return NextResponse.json({ erro: "Planilha vazia ou sem dados após o cabeçalho." }, { status: 400 });
  }

  // Pula a linha de cabeçalho (índice 0)
  const dados = linhas.slice(1).filter(row => row.some(c => String(c).trim() !== ""));

  // ── Cache de turmas (evita N queries) ───────────────────────────────────
  const todasTurmas = await prisma.turma.findMany({ select: { id: true, nome: true } });
  const turmasPorNome = new Map(todasTurmas.map(t => [t.nome.trim().toLowerCase(), t.id]));

  // ── Cache de emails já existentes ───────────────────────────────────────
  const emailsExistentes = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map(u => u.email.toLowerCase())
  );

  // ── Processamento linha a linha ──────────────────────────────────────────
  let importados = 0;
  const falhas: LinhaErro[] = [];

  for (let i = 0; i < dados.length; i++) {
    const numLinha = i + 2; // +2 porque pulamos o cabeçalho e é 1-indexed
    const row      = dados[i];

    const nome  = String(row[0] ?? "").trim();
    const email = String(row[1] ?? "").trim().toLowerCase();
    const senha = String(row[2] ?? "").trim();
    const turma = String(row[3] ?? "").trim();

    // Validações
    if (!nome) {
      falhas.push({ linha: numLinha, email: email || "(vazio)", motivo: "Nome em branco." });
      continue;
    }
    if (!email || !emailValido(email)) {
      falhas.push({ linha: numLinha, email: email || "(vazio)", motivo: "E-mail inválido ou em branco." });
      continue;
    }
    if (!senha || senha.length < 6) {
      falhas.push({ linha: numLinha, email, motivo: "Senha em branco ou com menos de 6 caracteres." });
      continue;
    }
    if (!turma) {
      falhas.push({ linha: numLinha, email, motivo: "Nome da turma em branco." });
      continue;
    }

    const turmaId = turmasPorNome.get(turma.toLowerCase());
    if (!turmaId) {
      falhas.push({ linha: numLinha, email, motivo: `Turma "${turma}" não encontrada no sistema.` });
      continue;
    }

    if (emailsExistentes.has(email)) {
      falhas.push({ linha: numLinha, email, motivo: "E-mail já cadastrado — pulado." });
      continue;
    }

    // Criação do usuário
    try {
      const senhaHash = await bcrypt.hash(senha, 10);
      await prisma.user.create({
        data: { nome, email, senhaHash, papel: "ALUNO", turmaId },
      });
      emailsExistentes.add(email); // evita duplicata dentro da mesma planilha
      importados++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      falhas.push({ linha: numLinha, email, motivo: `Erro interno: ${msg}` });
    }
  }

  return NextResponse.json({ importados, falhas }, { status: 200 });
}
