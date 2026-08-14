import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const turmas = await prisma.turma.findMany({
    select: { id: true, nome: true, nivelEnsino: true, _count: { select: { alunos: true } } },
  });
  console.log(JSON.stringify(turmas, null, 2));
}
main().finally(() => prisma.$disconnect());
