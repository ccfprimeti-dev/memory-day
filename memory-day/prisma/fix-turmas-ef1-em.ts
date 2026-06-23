/**
 * Remove as turmas 1º, 1º A, 2º, 3º e 4º (EF1)
 * e adiciona a turma "1º EM A" (EM) sem apagar nenhum outro dado.
 *
 * Executar UMA VEZ:
 *   cd memory-day
 *   npx tsx prisma/fix-turmas-ef1-em.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TURMAS_REMOVER = ["1º", "1º A", "2º", "3º", "4º"];

const MATERIAS_EM = [
  "Grammar", "Science", "Writing", "STEM",
  "Geography", "Art", "History", "English",
  "Algebra", "Geometry", "Soft Skills",
  "Biology 1", "Biology 2",
  "Physics 1", "Physics 2",
  "Chemistry 1", "Chemistry 2",
  "Project",
];

async function main() {
  // ── 1. Remove turmas EF1 ──────────────────────────────────────────────────
  for (const nome of TURMAS_REMOVER) {
    const turma = await prisma.turma.findFirst({
      where: { nome, anoLetivo: 2026 },
      select: { id: true, nome: true },
    });

    if (!turma) {
      console.log(`ℹ️  Turma "${nome}" não encontrada — pulando.`);
      continue;
    }

    // Alunos vinculados a esta turma
    const alunos = await prisma.user.findMany({
      where: { turmaId: turma.id },
      select: { id: true, nome: true },
    });

    if (alunos.length > 0) {
      const nomes = alunos.map((a) => a.nome).join(", ");
      console.log(`  ↳ Removendo ${alunos.length} aluno(s): ${nomes}`);
      const ids = alunos.map((a) => a.id);
      await prisma.entry.deleteMany({ where: { alunoId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }

    // Remove dados dependentes da turma
    await prisma.classReport.deleteMany({ where: { turmaId: turma.id } });
    await prisma.subject.deleteMany({ where: { turmaId: turma.id } });
    await prisma.turmaProfessor.deleteMany({ where: { turmaId: turma.id } });
    await prisma.turma.delete({ where: { id: turma.id } });

    console.log(`✅ Turma "${nome}" removida.`);
  }

  // ── 2. Cria "1º EM A" ─────────────────────────────────────────────────────
  const jaExiste = await prisma.turma.findFirst({
    where: { nome: "1º EM A", anoLetivo: 2026 },
  });

  if (jaExiste) {
    console.log(`\nℹ️  Turma "1º EM A" já existe — nenhuma criação necessária.`);
    return;
  }

  const nova = await prisma.turma.create({
    data: {
      nome:          "1º EM A",
      anoLetivo:     2026,
      nivelEnsino:   "EM",
      codigoConvite: "1ANO-EM-A-2026",
    },
  });
  console.log(`\n✅ Turma "1º EM A" criada (id: ${nova.id})`);

  // Busca professores demo pelo e-mail (não falha se não existirem)
  const [pAna, pCarlos, pLucia, pTom, pMarcos] = await Promise.all([
    prisma.user.findUnique({ where: { email: "prof.gram@escola.dev" }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "prof.mat@escola.dev"  }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "prof.cie@escola.dev"  }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "prof.ing@escola.dev"  }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "prof.his@escola.dev"  }, select: { id: true } }),
  ]);

  const atribuicoes: Record<string, string | null> = {
    "Grammar":     pAna?.id    ?? null,
    "Science":     pLucia?.id  ?? null,
    "Writing":     pTom?.id    ?? null,
    "STEM":        null,
    "Geography":   pMarcos?.id ?? null,
    "Art":         null,
    "History":     pMarcos?.id ?? null,
    "English":     pTom?.id    ?? null,
    "Algebra":     pCarlos?.id ?? null,
    "Geometry":    pCarlos?.id ?? null,
    "Soft Skills": null,
    "Biology 1":   pLucia?.id  ?? null,
    "Biology 2":   pLucia?.id  ?? null,
    "Physics 1":   pLucia?.id  ?? null,
    "Physics 2":   pLucia?.id  ?? null,
    "Chemistry 1": null,
    "Chemistry 2": null,
    "Project":     null,
  };

  for (const nome of MATERIAS_EM) {
    await prisma.subject.create({
      data: { nome, turmaId: nova.id, professorId: atribuicoes[nome] ?? null },
    });
  }
  console.log(`✅ ${MATERIAS_EM.length} matérias criadas.`);

  // Vincula professores que existem no banco
  const profs = [pAna, pCarlos, pLucia, pTom, pMarcos]
    .filter((p): p is { id: string } => p !== null);

  if (profs.length > 0) {
    await prisma.turmaProfessor.createMany({
      data: profs.map((p) => ({ turmaId: nova.id, professorId: p.id })),
      skipDuplicates: true,
    });
    console.log(`✅ ${profs.length} professores vinculados.`);
  }

  console.log("\n✅ Concluído! Código de convite: 1ANO-EM-A-2026");
}

main()
  .catch((e) => { console.error("Erro:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
