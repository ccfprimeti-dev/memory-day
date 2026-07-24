/**
 * Remove TODOS os registros (Entry) e TODOS os alunos (User com papel=ALUNO).
 * Admins, professores, turmas e matérias NÃO são afetados.
 *
 * Executar:
 *   cd memory-day
 *   npx tsx prisma/reset-alunos.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const totalEntries = await prisma.entry.count();
  const totalAlunos  = await prisma.user.count({ where: { papel: "ALUNO" } });

  console.log(`\n⚠️  Serão removidos:`);
  console.log(`   • ${totalEntries} registros (entries)`);
  console.log(`   • ${totalAlunos} alunos`);
  console.log(`   Admins, turmas e matérias ficam intactos.\n`);

  if (totalEntries === 0 && totalAlunos === 0) {
    console.log("ℹ️  Banco já está vazio — nada para remover.\n");
    return;
  }

  // Entries primeiro (FK para User)
  const { count: entriesRemovidas } = await prisma.entry.deleteMany({});
  console.log(`✅ ${entriesRemovidas} entries removidas.`);

  // Alunos
  const { count: alunosRemovidos } = await prisma.user.deleteMany({
    where: { papel: "ALUNO" },
  });
  console.log(`✅ ${alunosRemovidos} alunos removidos.\n`);
}

main()
  .catch((e) => { console.error("❌ Erro:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
