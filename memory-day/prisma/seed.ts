/**
 * Seed — Memory Day
 *
 * Níveis de ensino:
 *   EF1 — Ensino Fundamental 1 (1º-5º ano) → 5 aulas/dia · 5 matérias
 *   EF2 — Ensino Fundamental 2 (6º-9º ano) → 5 aulas/dia · 13 matérias
 *   EM  — Ensino Médio                      → 7 aulas/dia · 18 matérias (EF2 + 5 extras)
 *
 * Turmas:
 *   EF1: 1º, 2º, 3º, 4º, 5º
 *   EF2: 6º, 7º, 8º, 9º
 *   EM:  1º EM, 2º EM
 *
 * Usuários demo (senha: senha123):
 *   admin@escola.dev        → Admin (acesso total)
 *   aluno1@escola.dev       → Beatriz [9º]
 *   aluno2@escola.dev       → Rafael  [9º]
 *   aluno3@escola.dev       → Juliana [8º]
 *   aluno4@escola.dev       → Lucas   [9º]
 *   aluno5@escola.dev       → Camila  [9º]
 *   aluno6@escola.dev       → Pedro   [8º]
 *   prof.mat@escola.dev     → Carlos  (Matemática, Álgebra, Geometria)
 *   prof.gram@escola.dev    → Ana     (Gramática/Português)
 *   prof.his@escola.dev     → Marcos  (História, Geografia)
 *   prof.cie@escola.dev     → Lúcia   (Ciências, Física)
 *   prof.ing@escola.dev     → Tom     (Inglês, Writing)
 *
 * Executar: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Matérias por nível ────────────────────────────────────────────────────────
const MATERIAS_EF1 = ["Português", "Matemática", "Ciências", "Artes", "Educação Física"];

const MATERIAS_EF2 = [
  "Gramática", "Matemática", "Ciências", "Writing", "STEM",
  "Geografia", "Artes", "História", "Inglês", "Física",
  "Álgebra", "Geometria", "LSP",
];

const MATERIAS_EM_EXTRAS = [
  "Branding", "Chemistry", "Biologia", "Projeto", "Pitch",
];

const MATERIAS_EM = [...MATERIAS_EF2, ...MATERIAS_EM_EXTRAS];

// ── Helper: formata data YYYY-MM-DD para N dias atrás ─────────────────────────
function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

async function main() {
  console.log("🌱 Iniciando seed...");

  // ── Limpa na ordem correta das FK ─────────────────────────────────────────
  await prisma.classReport.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.turmaProfessor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.turma.deleteMany();

  const senhaHash = await bcrypt.hash("senha123", 10);

  // ── Admin ──────────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      nome:      "Admin Geral",
      email:     "admin@escola.dev",
      senhaHash,
      papel:     "ADMIN",
    },
  });

  // ── Turmas ─────────────────────────────────────────────────────────────────
  const [
    turma1, turma2, turma3, turma4, turma5,
    turma6, turma7, turma8, turma9,
    turma1EM, turma2EM,
  ] = await Promise.all([
    prisma.turma.create({ data: { nome: "1º",    anoLetivo: 2026, nivelEnsino: "EF1", codigoConvite: "1ANO-2026"    } }),
    prisma.turma.create({ data: { nome: "2º",    anoLetivo: 2026, nivelEnsino: "EF1", codigoConvite: "2ANO-2026"    } }),
    prisma.turma.create({ data: { nome: "3º",    anoLetivo: 2026, nivelEnsino: "EF1", codigoConvite: "3ANO-2026"    } }),
    prisma.turma.create({ data: { nome: "4º",    anoLetivo: 2026, nivelEnsino: "EF1", codigoConvite: "4ANO-2026"    } }),
    prisma.turma.create({ data: { nome: "5º",    anoLetivo: 2026, nivelEnsino: "EF1", codigoConvite: "5ANO-2026"    } }),
    prisma.turma.create({ data: { nome: "6º",    anoLetivo: 2026, nivelEnsino: "EF2", codigoConvite: "6ANO-2026"    } }),
    prisma.turma.create({ data: { nome: "7º",    anoLetivo: 2026, nivelEnsino: "EF2", codigoConvite: "7ANO-2026"    } }),
    prisma.turma.create({ data: { nome: "8º",    anoLetivo: 2026, nivelEnsino: "EF2", codigoConvite: "8ANO-2026"    } }),
    prisma.turma.create({ data: { nome: "9º",    anoLetivo: 2026, nivelEnsino: "EF2", codigoConvite: "9ANO-2026"    } }),
    prisma.turma.create({ data: { nome: "1º EM", anoLetivo: 2026, nivelEnsino: "EM",  codigoConvite: "1ANO-EM-2026" } }),
    prisma.turma.create({ data: { nome: "2º EM", anoLetivo: 2026, nivelEnsino: "EM",  codigoConvite: "2ANO-EM-2026" } }),
  ]);

  // ── Professores demo ───────────────────────────────────────────────────────
  const [pCarlos, pAna, pMarcos, pLucia, pTom] = await Promise.all([
    prisma.user.create({ data: { nome: "Carlos Lima",     email: "prof.mat@escola.dev",  senhaHash, papel: "PROFESSOR" } }),
    prisma.user.create({ data: { nome: "Ana Souza",       email: "prof.gram@escola.dev", senhaHash, papel: "PROFESSOR" } }),
    prisma.user.create({ data: { nome: "Marcos Oliveira", email: "prof.his@escola.dev",  senhaHash, papel: "PROFESSOR" } }),
    prisma.user.create({ data: { nome: "Lúcia Ferreira",  email: "prof.cie@escola.dev",  senhaHash, papel: "PROFESSOR" } }),
    prisma.user.create({ data: { nome: "Tom Wilson",      email: "prof.ing@escola.dev",  senhaHash, papel: "PROFESSOR" } }),
  ]);

  // ── Vínculos Professor <-> Turma ───────────────────────────────────────────
  const turmasEF1 = [turma1, turma2, turma3, turma4, turma5];
  await prisma.turmaProfessor.createMany({
    data: [
      ...turmasEF1.flatMap((t) => [
        { turmaId: t.id, professorId: pAna.id    },
        { turmaId: t.id, professorId: pCarlos.id },
        { turmaId: t.id, professorId: pLucia.id  },
      ]),
      { turmaId: turma6.id,    professorId: pCarlos.id },
      { turmaId: turma6.id,    professorId: pAna.id    },
      { turmaId: turma6.id,    professorId: pMarcos.id },
      { turmaId: turma6.id,    professorId: pTom.id    },
      { turmaId: turma7.id,    professorId: pCarlos.id },
      { turmaId: turma7.id,    professorId: pAna.id    },
      { turmaId: turma7.id,    professorId: pLucia.id  },
      { turmaId: turma7.id,    professorId: pTom.id    },
      { turmaId: turma9.id,    professorId: pCarlos.id },
      { turmaId: turma9.id,    professorId: pAna.id    },
      { turmaId: turma9.id,    professorId: pMarcos.id },
      { turmaId: turma9.id,    professorId: pTom.id    },
      { turmaId: turma8.id,    professorId: pCarlos.id },
      { turmaId: turma8.id,    professorId: pAna.id    },
      { turmaId: turma8.id,    professorId: pLucia.id  },
      { turmaId: turma8.id,    professorId: pTom.id    },
      { turmaId: turma1EM.id,  professorId: pCarlos.id },
      { turmaId: turma1EM.id,  professorId: pAna.id    },
      { turmaId: turma1EM.id,  professorId: pMarcos.id },
      { turmaId: turma1EM.id,  professorId: pTom.id    },
      { turmaId: turma2EM.id,  professorId: pCarlos.id },
      { turmaId: turma2EM.id,  professorId: pAna.id    },
      { turmaId: turma2EM.id,  professorId: pLucia.id  },
      { turmaId: turma2EM.id,  professorId: pTom.id    },
    ],
  });

  // ── Helper: cria matérias de uma turma ────────────────────────────────────
  async function criarMaterias(
    turmaId: string,
    nomes: string[],
    atribuicoes: Record<string, string | null>
  ): Promise<Record<string, string>> {
    const mapa: Record<string, string> = {};
    for (const nome of nomes) {
      const s = await prisma.subject.create({
        data: { nome, turmaId, professorId: atribuicoes[nome] ?? null },
      });
      mapa[nome] = s.id;
    }
    return mapa;
  }

  const atribuicoesEF1: Record<string, string | null> = {
    "Português":        pAna.id,
    "Matemática":       pCarlos.id,
    "Ciências":         pLucia.id,
    "Artes":            null,
    "Educação Física":  null,
  };

  function atribuicoesBase(marcos: string | null, lucia: string | null) {
    return {
      "Gramática":  pAna.id,
      "Matemática": pCarlos.id,
      "Ciências":   lucia,
      "Writing":    pTom.id,
      "STEM":       null,
      "Geografia":  marcos,
      "Artes":      null,
      "História":   marcos,
      "Inglês":     pTom.id,
      "Física":     lucia,
      "Álgebra":    pCarlos.id,
      "Geometria":  pCarlos.id,
      "LSP":        null,
    };
  }

  for (const t of turmasEF1) {
    await criarMaterias(t.id, MATERIAS_EF1, atribuicoesEF1);
  }
  await criarMaterias(turma6.id, MATERIAS_EF2, atribuicoesBase(pMarcos.id, null));
  await criarMaterias(turma7.id, MATERIAS_EF2, atribuicoesBase(null, pLucia.id));
  const ids9 = await criarMaterias(turma9.id, MATERIAS_EF2, atribuicoesBase(pMarcos.id, null));
  await criarMaterias(turma8.id, MATERIAS_EF2, atribuicoesBase(null, pLucia.id));
  await criarMaterias(turma1EM.id, MATERIAS_EM, { ...atribuicoesBase(pMarcos.id, null), "Branding": null, "Chemistry": null, "Biologia": null, "Projeto": null, "Pitch": null });
  await criarMaterias(turma2EM.id, MATERIAS_EM, { ...atribuicoesBase(null, pLucia.id), "Branding": null, "Chemistry": null, "Biologia": null, "Projeto": null, "Pitch": null });

  // ── Alunos demo ────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.user.create({ data: { nome: "Beatriz Silva",  email: "aluno1@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma9.id } }),
    prisma.user.create({ data: { nome: "Rafael Costa",   email: "aluno2@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma9.id } }),
    prisma.user.create({ data: { nome: "Juliana Ramos",  email: "aluno3@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma8.id } }),
    prisma.user.create({ data: { nome: "Lucas Mendes",   email: "aluno4@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma9.id } }),
    prisma.user.create({ data: { nome: "Camila Torres",  email: "aluno5@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma9.id } }),
    prisma.user.create({ data: { nome: "Pedro Alves",    email: "aluno6@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma8.id } }),
  ]);

  // ── Relatório de exemplo ───────────────────────────────────────────────────
  await prisma.classReport.create({
    data: {
      turmaId:   turma9.id,
      subjectId: ids9["Matemática"],
      data:      diasAtras(1),
      conteudoIA: {
        nivelGeral:           "Intermediário",
        percentualRegistros:  100,
        lacunasComuns:        ["Casos com discriminante = 0", "Falta de exemplos práticos"],
        recomendacoes:        ["Praticar exercícios com raiz dupla", "Revisar problemas contextualizados"],
        resumoGeral: "A turma 9º demonstrou compreensão razoável de Bhaskara. A maioria identificou o discriminante.",
      },
    },
  });

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed concluído!\n");
  console.log("── Admin ───────────────────────────────────────────────────────────");
  console.log("  admin@escola.dev  →  Admin Geral  (senha: senha123)");
  console.log("\n── Turmas EF1 (5 aulas/dia · 5 matérias) ───────────────────────────");
  console.log("  1º · 2º · 3º · 4º · 5º");
  console.log("\n── Turmas EF2 (5 aulas/dia · 13 matérias) ──────────────────────────");
  console.log("  6º · 7º · 8º · 9º");
  console.log("\n── Turmas EM (7 aulas/dia · 18 matérias) ───────────────────────────");
  console.log("  1º EM · 2º EM");
  console.log("\n── Alunos demo (senha: senha123) ───────────────────────────────────");
  console.log("  aluno1@escola.dev  →  Beatriz [9º]");
  console.log("  aluno2@escola.dev  →  Rafael  [9º]");
  console.log("  aluno3@escola.dev  →  Juliana [8º]");
  console.log("  aluno4@escola.dev  →  Lucas   [9º]");
  console.log("  aluno5@escola.dev  →  Camila  [9º]");
  console.log("  aluno6@escola.dev  →  Pedro   [8º]");
  console.log("\n── Professores demo (senha: senha123) ──────────────────────────────");
  console.log("  prof.mat@escola.dev   →  Carlos  (Matemática, Álgebra, Geometria)");
  console.log("  prof.gram@escola.dev  →  Ana     (Gramática/Português)");
  console.log("  prof.his@escola.dev   →  Marcos  (História, Geografia)");
  console.log("  prof.cie@escola.dev   →  Lúcia   (Ciências, Física)");
  console.log("  prof.ing@escola.dev   →  Tom     (Inglês, Writing)");
}

main()
  .catch((e) => { console.error("Erro no seed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
