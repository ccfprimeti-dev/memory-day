import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1. 9º ano → EM
  const t9 = await prisma.turma.update({
    where: { id: "cmqi3gew80007111mdksawwtv" },
    data:  { nivelEnsino: "EM" },
    select: { nome: true, nivelEnsino: true },
  });
  console.log(`✓ Turma "${t9.nome}" → nivelEnsino: ${t9.nivelEnsino}`);

  // 2. "1º EM" → "1º EM B"
  const t1b = await prisma.turma.update({
    where: { id: "cmqi3gew10005111mkpel9gf2" },
    data:  { nome: "1º EM B" },
    select: { nome: true, nivelEnsino: true },
  });
  console.log(`✓ Turma renomeada → "${t1b.nome}"`);

  // 3. "1º EM A" — confirmar que está correto (sem alteração)
  const t1a = await prisma.turma.findUnique({
    where:  { id: "cmqqkcqob0000f9vc2chqnc2d" },
    select: { nome: true, nivelEnsino: true },
  });
  console.log(`✓ Turma "${t1a?.nome}" — sem alteração`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
