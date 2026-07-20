/**
 * Remove os registros criados pelo seed de teste (seed-test-entries.ts).
 * Apaga apenas as entries dos 13 alunos da 2º EM dentro dos últimos 10 dias.
 * NÃO apaga nenhum outro dado do banco.
 *
 * Executar:
 *   cd memory-day
 *   npx tsx prisma/clean-test-entries.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// IDs dos 13 alunos da 2º EM que foram populados pelo seed de teste
const ALUNO_IDS = [
  "cmr0jnnf90005huybq755q8x0", // Eduardo
  "cmqif1l9q0003wz61vpmta04i", // Guilherme
  "cmr0jof040007huybjrjianiu", // Luís Felipe
  "cmr0j8i0x0007gxxim60zqm3y", // Mariana
  "cmr0j41j80001gxxi5vwp3ehl", // Ana Clara Martin
  "cmr0j5z6t0005gxxijhp2vffh", // Isabelly Lima
  "cmr0jm50s0001huybb95bf4fi", // Manuela Nascimento
  "cmr0j4yys0003gxxit25mlxu2", // Mariane Sanches
  "cmr0jch26000bgxxilnrzu158", // Victor Bastos
  "cmr0jbh790009gxxi5rrc02l7", // Ana Julia de Grande
  "cmr0jmwbj0003huybbdwtep9s", // Beatriz Alves Rocha
  "cmqpcqmcb000hz6mc7u5i75uf", // Letícia Zanco Torres
  "cmr0jd733000dgxxipvvgjxo9", // Maria Eduarda
];

function dataMinima(): string {
  const d = new Date();
  d.setDate(d.getDate() - 9); // 10 dias atrás inclusive
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(d);
}

async function main() {
  const minData = dataMinima();
  console.log(`\n🔍 Procurando entries dos 13 alunos com data >= ${minData}...`);

  const count = await prisma.entry.count({
    where: {
      alunoId: { in: ALUNO_IDS },
      data:    { gte: minData },
    },
  });

  if (count === 0) {
    console.log("ℹ️  Nenhuma entry encontrada para remover.\n");
    return;
  }

  console.log(`   Encontradas ${count} entries. Removendo...`);

  const { count: removidas } = await prisma.entry.deleteMany({
    where: {
      alunoId: { in: ALUNO_IDS },
      data:    { gte: minData },
    },
  });

  console.log(`✅ ${removidas} entries removidas com sucesso.\n`);
}

main()
  .catch((e) => { console.error("❌ Erro:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
