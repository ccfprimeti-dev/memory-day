import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TURMA_ID = "cmqi3gew20006111mxu8wf2cm"; // turma "2º EM"

async function main() {
  const alunos = await prisma.user.findMany({
    where:  { turmaId: TURMA_ID, papel: "ALUNO" },
    select: { id: true, nome: true, email: true, _count: { select: { registros: true } } },
  });

  if (alunos.length === 0) {
    console.log("Nenhum aluno encontrado na turma 2º EM.");
    return;
  }

  console.log(`Alunos na turma 2º EM (${alunos.length}):`);
  for (const a of alunos) {
    console.log(`  - ${a.nome} (${a.email}) — ${a._count.registros} registro(s)`);
  }

  const ids = alunos.map(a => a.id);

  // Remove registros (entries) primeiro por restrição de FK
  const delEntries = await prisma.entry.deleteMany({ where: { alunoId: { in: ids } } });
  console.log(`\n✓ ${delEntries.count} registro(s) removido(s)`);

  // Remove os usuários
  const delUsers = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`✓ ${delUsers.count} aluno(s) removido(s)`);

  console.log("\nTurma 2º EM esvaziada. Pronta para os novos cadastros.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
