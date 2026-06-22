/**
 * Script de adição SEGURA da turma "1º A" (EF1, 2026).
 * NÃO apaga nenhum dado existente — apenas insere o que falta.
 * Idempotente: pode ser executado mais de uma vez sem duplicar.
 *
 * Executar UMA VEZ:
 *   cd memory-day
 *   npx tsx prisma/add-turma-1A.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MATERIAS_EF1 = [
  "Português", "Matemática", "Ciências", "Arte",
  "Educação Física", "Inglês", "História", "Geografia",
];

async function main() {
  console.log("🔍 Verificando se a turma já existe...");

  const jaExiste = await prisma.turma.findFirst({
    where: { nome: "1º A", anoLetivo: 2026 },
  });

  if (jaExiste) {
    console.log("⚠️  Turma '1º A' (2026) já existe. Nenhuma alteração feita.");
    return;
  }

  // Cria a turma
  const turma = await prisma.turma.create({
    data: {
      nome:          "1º A",
      anoLetivo:     2026,
      nivelEnsino:   "EF1",
      codigoConvite: "1ANO-A-2026",
    },
  });
  console.log(`✅ Turma criada: "${turma.nome}" (id: ${turma.id})`);

  // Busca professores demo pelo e-mail (não falha se não existirem)
  const [pAna, pCarlos, pLucia, pTom, pMarcos] = await Promise.all([
    prisma.user.findUnique({ where: { email: "prof.gram@escola.dev" }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "prof.mat@escola.dev"  }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "prof.cie@escola.dev"  }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "prof.ing@escola.dev"  }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "prof.his@escola.dev"  }, select: { id: true } }),
  ]);

  // Atribuições de matéria → professor (null se o professor não existir no banco)
  const atribuicoes: Record<string, string | null> = {
    "Português":        pAna?.id    ?? null,
    "Matemática":       pCarlos?.id ?? null,
    "Ciências":         pLucia?.id  ?? null,
    "Arte":             null,
    "Educação Física":  null,
    "Inglês":           pTom?.id    ?? null,
    "História":         pMarcos?.id ?? null,
    "Geografia":        pMarcos?.id ?? null,
  };

  // Cria as matérias
  for (const nome of MATERIAS_EF1) {
    await prisma.subject.create({
      data: { nome, turmaId: turma.id, professorId: atribuicoes[nome] ?? null },
    });
  }
  console.log(`✅ ${MATERIAS_EF1.length} matérias criadas.`);

  // Vincula os professores que existem no banco à turma (skipDuplicates = seguro)
  const profsEncontrados = [pAna, pCarlos, pLucia, pTom, pMarcos]
    .filter((p): p is { id: string } => p !== null);

  if (profsEncontrados.length > 0) {
    await prisma.turmaProfessor.createMany({
      data: profsEncontrados.map((p) => ({ turmaId: turma.id, professorId: p.id })),
      skipDuplicates: true,
    });
    console.log(`✅ ${profsEncontrados.length} professores vinculados.`);
  } else {
    console.log("ℹ️  Nenhum professor demo encontrado — vincule manualmente no admin.");
  }

  console.log("\n✅ Concluído!");
  console.log(`   Turma: 1º A  |  Nível: EF1  |  Código de convite: 1ANO-A-2026`);
}

main()
  .catch((e) => { console.error("Erro:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
