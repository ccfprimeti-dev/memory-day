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

  // ── Turmas ─────────────────────────────────────────────────────────────────
  const [turma9A, turma8B, turma1AEM, turma2BEM] = await Promise.all([
    prisma.turma.create({ data: { nome: "9º A",    anoLetivo: 2026, nivelEnsino: "EF2", codigoConvite: "9ANO-A-2026"   } }),
    prisma.turma.create({ data: { nome: "8º B",    anoLetivo: 2026, nivelEnsino: "EF2", codigoConvite: "8ANO-B-2026"   } }),
    prisma.turma.create({ data: { nome: "1º A EM", anoLetivo: 2026, nivelEnsino: "EM",  codigoConvite: "1ANO-A-EM-2026"} }),
    prisma.turma.create({ data: { nome: "2º B EM", anoLetivo: 2026, nivelEnsino: "EM",  codigoConvite: "2ANO-B-EM-2026"} }),
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
      // EF2
      { turmaId: turma9A.id,    professorId: pCarlos.id },
      { turmaId: turma9A.id,    professorId: pAna.id    },
      { turmaId: turma9A.id,    professorId: pMarcos.id },
      { turmaId: turma9A.id,    professorId: pTom.id    },
      { turmaId: turma8B.id,    professorId: pCarlos.id },
      { turmaId: turma8B.id,    professorId: pAna.id    },
      { turmaId: turma8B.id,    professorId: pLucia.id  },
      { turmaId: turma8B.id,    professorId: pTom.id    },
      // EM — mesmos professores
      { turmaId: turma1AEM.id,  professorId: pCarlos.id },
      { turmaId: turma1AEM.id,  professorId: pAna.id    },
      { turmaId: turma1AEM.id,  professorId: pMarcos.id },
      { turmaId: turma1AEM.id,  professorId: pTom.id    },
      { turmaId: turma2BEM.id,  professorId: pCarlos.id },
      { turmaId: turma2BEM.id,  professorId: pAna.id    },
      { turmaId: turma2BEM.id,  professorId: pLucia.id  },
      { turmaId: turma2BEM.id,  professorId: pTom.id    },
    ],
  });

  // ── Helper: cria as matérias de uma turma e retorna mapa nome→id ──────────
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

  // Atribuições padrão para matérias EF2 (usadas em todas as turmas)
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

  // ── EF2: 9º A ─────────────────────────────────────────────────────────────
  const ids9A = await criarMaterias(turma9A.id, MATERIAS_EF2,
    atribuicoesBase(pMarcos.id, null));   // Marcos em 9ºA; Lúcia não

  // ── EF2: 8º B ─────────────────────────────────────────────────────────────
  const ids8B = await criarMaterias(turma8B.id, MATERIAS_EF2,
    atribuicoesBase(null, pLucia.id));    // Lúcia em 8ºB; Marcos não

  // ── EM: 1º A EM ──────────────────────────────────────────────────────────
  await criarMaterias(turma1AEM.id, MATERIAS_EM, {
    ...atribuicoesBase(pMarcos.id, null),
    "Branding":  null,
    "Chemistry": null,
    "Biologia":  null,
    "Projeto":   null,
    "Pitch":     null,
  });

  // ── EM: 2º B EM ──────────────────────────────────────────────────────────
  await criarMaterias(turma2BEM.id, MATERIAS_EM, {
    ...atribuicoesBase(null, pLucia.id),
    "Branding":  null,
    "Chemistry": null,
    "Biologia":  null,
    "Projeto":   null,
    "Pitch":     null,
  });

  // ── Alunos demo ────────────────────────────────────────────────────────────
  const [aBeatriz, aRafael, aJuliana] = await Promise.all([
    prisma.user.create({ data: { nome: "Beatriz Silva", email: "aluno1@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma9A.id } }),
    prisma.user.create({ data: { nome: "Rafael Costa",  email: "aluno2@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma9A.id } }),
    prisma.user.create({ data: { nome: "Juliana Ramos", email: "aluno3@escola.dev", senhaHash, papel: "ALUNO", turmaId: turma8B.id } }),
  ]);

  // ── Registros de ontem ─────────────────────────────────────────────────────
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const dataOntem = ontem.toISOString().split("T")[0];

  const amostras9A = [
    { mat: "Matemática", texto: "Estudamos equações do segundo grau e a fórmula de Bhaskara. Entendi o papel do discriminante para determinar o número de raízes reais." },
    { mat: "Gramática",  texto: "Vimos verbos transitivos e intransitivos. Ainda confundo complemento nominal com objeto indireto." },
    { mat: "História",   texto: "Estudamos a Revolução Industrial e a migração do campo para as cidades. O impacto ambiental ficou pouco claro." },
    { mat: "Inglês",     texto: "Aprendi o Present Perfect e quando usá-lo em vez do Simple Past. A diferença de contexto ainda parece difusa." },
    { mat: "Álgebra",    texto: "Revisamos expressões algébricas e fatoração. Tive dificuldade nos casos de fatoração por agrupamento." },
  ];

  for (const aluno of [aBeatriz, aRafael]) {
    for (const { mat, texto } of amostras9A) {
      await prisma.entry.create({
        data: { alunoId: aluno.id, subjectId: ids9A[mat], data: dataOntem, textoDoAluno: texto },
      });
    }
  }

  const amostras8B = [
    { mat: "Matemática", texto: "Revisamos frações e operações com números racionais. Tive dificuldade nos casos de divisão de frações mistas." },
    { mat: "Gramática",  texto: "Estudamos concordância verbal e nominal. Os casos de sujeito composto ainda geram dúvidas." },
    { mat: "Ciências",   texto: "Vimos o sistema digestório e as funções das enzimas. A parte de absorção intestinal ficou confusa." },
    { mat: "Inglês",     texto: "Trabalhamos o uso do Simple Past com verbos irregulares. Ainda erro a pronúncia de alguns." },
    { mat: "Física",     texto: "Estudamos as leis de Newton. A terceira lei (ação e reação) ficou clara, mas apliquei errado no exercício." },
  ];

  for (const { mat, texto } of amostras8B) {
    await prisma.entry.create({
      data: { alunoId: aJuliana.id, subjectId: ids8B[mat], data: dataOntem, textoDoAluno: texto },
    });
  }

  // ── Relatório de exemplo ───────────────────────────────────────────────────
  await prisma.classReport.create({
    data: {
      turmaId:    turma9A.id,
      subjectId:  ids9A["Matemática"],
      data:       dataOntem,
      conteudoIA: {
        nivelGeral:           "Intermediário",
        percentualRegistros:  100,
        lacunasComuns:        ["Casos com discriminante = 0", "Falta de exemplos práticos"],
        recomendacoes:        ["Praticar exercícios com raiz dupla", "Revisar problemas contextualizados"],
        resumoGeral: "A turma 9ºA demonstrou compreensão razoável de Bhaskara. A maioria identificou o discriminante, mas poucos exploraram o caso de raiz dupla.",
      },
    },
  });

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed concluído!\n");
  console.log("── Turmas EF2 (5 aulas/dia · 13 matérias) ─────────────────────────");
  console.log("  9º A  (código: 9ANO-A-2026)  |  8º B  (código: 8ANO-B-2026)");
  console.log("\n── Turmas EM (7 aulas/dia · 18 matérias) ──────────────────────────");
  console.log("  1º A EM  (código: 1ANO-A-EM-2026)  |  2º B EM  (código: 2ANO-B-EM-2026)");
  console.log("\n── Matérias EF2 ────────────────────────────────────────────────────");
  console.log(" ", MATERIAS_EF2.join(" · "));
  console.log("\n── Matérias extras EM ──────────────────────────────────────────────");
  console.log(" ", MATERIAS_EM_EXTRAS.join(" · "));
  console.log("\n── Alunos demo (senha: senha123) ───────────────────────────────────");
  console.log("  aluno1@escola.dev  →  Beatriz [9º A · EF2]");
  console.log("  aluno2@escola.dev  →  Rafael  [9º A · EF2]");
  console.log("  aluno3@escola.dev  →  Juliana [8º B · EF2]");
  console.log("\n── Professores demo (senha: senha123) ──────────────────────────────");
  console.log("  prof.mat@escola.dev   →  Carlos  (Matemática, Álgebra, Geometria)");
  console.log("  prof.gram@escola.dev  →  Ana     (Gramática)");
  console.log("  prof.his@escola.dev   →  Marcos  (História, Geografia — EF2 9ºA e EM 1ºA)");
  console.log("  prof.cie@escola.dev   →  Lúcia   (Ciências, Física — EF2 8ºB e EM 2ºB)");
  console.log("  prof.ing@escola.dev   →  Tom     (Inglês, Writing)");
}

main()
  .catch((e) => { console.error("Erro no seed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
