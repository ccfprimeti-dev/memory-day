/**
 * Lista os textos dos alunos no banco sem chamar a IA — só leitura.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const env = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* ignora */ }

const prisma = new PrismaClient();

async function main() {
  const todas = await prisma.entry.findMany({
    select: {
      id: true, textoDoAluno: true, data: true,
      nivelIA: true, aproveitamento: true,
      aluno:   { select: { nome: true } },
      materia: { select: { nome: true, turma: { select: { nivelEnsino: true } } } },
    },
    orderBy: { criadoEm: "desc" },
    take: 30,
  });

  // ordena por comprimento para mostrar variedade
  const ord = [...todas].sort((a, b) => a.textoDoAluno.length - b.textoDoAluno.length);

  console.log(`\nTotal de entradas recentes: ${todas.length}`);
  console.log("=".repeat(72));
  ord.forEach((e, i) => {
    console.log(`\n[${i + 1}] ${e.aluno.nome} — ${e.materia.nome} — ${e.data}`);
    console.log(`    ${e.textoDoAluno.length} chars | nota salva: ${e.aproveitamento ?? "n/a"}% | nível: ${e.nivelIA ?? "n/a"}`);
    console.log(`    "${e.textoDoAluno}"`);
  });
  console.log("\n" + "=".repeat(72));
  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); });
