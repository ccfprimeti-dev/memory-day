/**
 * Remove TODOS os registros (Entry) do banco.
 * Usuários, turmas e matérias NÃO são afetados.
 *
 * Executar:
 *   cd memory-day
 *   npx tsx prisma/clear-all-entries.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.entry.count();

  if (total === 0) {
    console.log("\nℹ️  Banco já está vazio — nenhuma entry para remover.\n");
    return;
  }

  console.log(`\n⚠️  Serão removidas ${total} entries de TODOS os alunos.`);
  console.log("   Usuários, turmas e matérias NÃO serão afetados.");
  console.log("   Removendo...\n");

  const { count } = await prisma.entry.deleteMany({});

  console.log(`✅ ${count} entries removidas com sucesso.\n`);
}

main()
  .catch((e) => { console.error("❌ Erro:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
