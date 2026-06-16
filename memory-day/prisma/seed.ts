/**
 * Seed — Memory Day
 *
 * Níveis de ensino:
 *   EF2 — Ensino Fundamental 2 → 5 aulas/dia · 13 matérias
 *   EM  — Ensino Médio         → 7 aulas/dia · 18 matérias (EF2 + 5 extras)
 *
 * Turmas:
 *   EF2: 9º A, 8º B
 *   EM:  1º A EM, 2º B EM
 *
 * Usuários demo (senha: senha123):
 *   admin@escola.dev        → Admin (acesso total)
 *   aluno1@escola.dev       → Beatriz [9º A]
 *   aluno2@escola.dev       → Rafael  [9º A]
 *   aluno3@escola.dev       → Juliana [8º B]
 *   aluno4@escola.dev       → Lucas   [9º A]
 *   aluno5@escola.dev       → Camila  [9º A]
 *   aluno6@escola.dev       → Pedro   [8º B]
 *   prof.mat@escola.dev     → Carlos  (Matemática, Álgebra, Geometria)
 *   prof.gram@escola.dev    → Ana     (Gramática)
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
  const [turma9A, turma8B, turma1AEM, turma2BEM] = await Promise.all([
    prisma.turma.create({ data: { nome: "9º A",    anoLetivo: 2026, nivelEnsino: "EF2", codigoConvite: "9ANO-A-2026"    } }),
    prisma.turma.create({ data: { nome: "8º B",    anoLetivo: 2026, nivelEnsino: "EF2", codigoConvite: "8ANO-B-2026"    } }),
    prisma.turma.create({ data: { nome: "1º A EM", anoLetivo: 2026, nivelEnsino: "EM",  codigoConvite: "1ANO-A-EM-2026" } }),
    prisma.turma.create({ data: { nome: "2º B EM", anoLetivo: 2026, nivelEnsino: "EM",  codigoConvite: "2ANO-B-EM-2026" } }),
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
  await prisma.turmaProfessor.createMany({
    data: [
      { turmaId: turma9A.id,   professorId: pCarlos.id },
      { turmaId: turma9A.id,   professorId: pAna.id    },
      { turmaId: turma9A.id,   professorId: pMarcos.id },
      { turmaId: turma9A.id,   professorId: pTom.id    },
      { turmaId: turma8B.id,   professorId: pCarlos.id },
      { turmaId: turma8B.id,   professorId: pAna.id    },
      { turmaId: turma8B.id,   professorId: pLucia.id  },
      { turmaId: turma8B.id,   professorId: pTom.id    },
      { turmaId: turma1AEM.id, professorId: pCarlos.id },
      { turmaId: turma1AEM.id, professorId: pAna.id    },
      { turmaId: turma1AEM.id, professorId: pMarcos.id },
      { turmaId: turma1AEM.id, professorId: pTom.id    },
      { turmaId: turma2BEM.id, professorId: pCarlos.id },
      { turmaId: turma2BEM.id, professorId: pAna.id    },
      { turmaId: turma2BEM.id, professorId: pLucia.id  },
      { turmaId: turma2BEM.id, professorId: pTom.id    },
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

  const ids9A = await criarMaterias(turma9A.id,   MATERIAS_EF2, atribuicoesBase(pMarcos.id, null));
  await criarMaterias(turma8B.id,   MATERIAS_EF2, atribuicoesBase(null, pLucia.id));
  await criarMaterias(turma1AEM.id, MATERIAS_EM, { ...atribuicoesBase(pMarcos.id, null), "Branding": null, "Chemistry": null, "Biologia": null, "Projeto": null, "Pitch": null });
  await criarMaterias(turma2BEM.id, MATERIAS_EM, { ...atribuicoesBase(null, pLucia.id), "Branding": null, "Chemistry": null, "Biologia": null, "Projeto": null, "Pitch": null });

  // ── Alunos demo ────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.user.create({ data: { nome: "Beatriz Silva",  email: "aluno1@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma9A.id } }),
    prisma.user.create({ data: { nome: "Rafael Costa",   email: "aluno2@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma9A.id } }),
    prisma.user.create({ data: { nome: "Juliana Ramos",  email: "aluno3@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma8B.id } }),
    prisma.user.create({ data: { nome: "Lucas Mendes",   email: "aluno4@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma9A.id } }),
    prisma.user.create({ data: { nome: "Camila Torres",  email: "aluno5@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma9A.id } }),
    prisma.user.create({ data: { nome: "Pedro Alves",    email: "aluno6@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma8B.id } }),
  ]);

  // ── Relatório de exemplo ───────────────────────────────────────────────────
  await prisma.classReport.create({
    data: {
      turmaId:   turma9A.id,
      subjectId: ids9A["Matemática"],
      data:      diasAtras(1),
      conteudoIA: {
        nivelGeral:           "Intermediário",
        percentualRegistros:  100,
        lacunasComuns:        ["Casos com discriminante = 0", "Falta de exemplos práticos"],
        recomendacoes:        ["Praticar exercícios com raiz dupla", "Revisar problemas contextualizados"],
        resumoGeral: "A turma 9ºA demonstrou compreensão razoável de Bhaskara. A maioria identificou o discriminante.",
      },
    },
  });

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed concluído!\n");
  console.log("── Admin ───────────────────────────────────────────────────────────");
  console.log("  admin@escola.dev  →  Admin Geral  (senha: senha123)");
  console.log("\n── Turmas EF2 (5 aulas/dia · 13 matérias) ─────────────────────────");
  console.log("  9º A  (código: 9ANO-A-2026)  |  8º B  (código: 8ANO-B-2026)");
  console.log("\n── Turmas EM (7 aulas/dia · 18 matérias) ──────────────────────────");
  console.log("  1º A EM  |  2º B EM");
  console.log("\n── Alunos demo (senha: senha123) ───────────────────────────────────");
  console.log("  aluno1@escola.dev  →  Beatriz [9º A]");
  console.log("  aluno2@escola.dev  →  Rafael  [9º A]");
  console.log("  aluno3@escola.dev  →  Juliana [8º B]");
  console.log("  aluno4@escola.dev  →  Lucas   [9º A]");
  console.log("  aluno5@escola.dev  →  Camila  [9º A]");
  console.log("  aluno6@escola.dev  →  Pedro   [8º B]");
  console.log("\n── Professores demo (senha: senha123) ──────────────────────────────");
  console.log("  prof.mat@escola.dev   →  Carlos  (Matemática, Álgebra, Geometria)");
  console.log("  prof.gram@escola.dev  →  Ana     (Gramática)");
  console.log("  prof.his@escola.dev   →  Marcos  (História, Geografia)");
  console.log("  prof.cie@escola.dev   →  Lúcia   (Ciências, Física)");
  console.log("  prof.ing@escola.dev   →  Tom     (Inglês, Writing)");
}

main()
  .catch((e) => { console.error("Erro no seed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
