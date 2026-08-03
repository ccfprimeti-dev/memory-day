/**
 * Valida que a proporcionalidade por série está contínua para todas as 7 séries.
 * Executa o MESMO texto nos 7 graus e exibe a tabela comparativa.
 *
 * Uso: npx tsx prisma/teste-serie.ts
 * (requer GROQ_API_KEY no .env)
 */
// Env carregado via: npx tsx --env-file .env prisma/teste-serie.ts

import { analisarRegistroAluno } from "../lib/ai";

// ── Texto de qualidade MÉDIA — o mesmo para todas as 7 séries ──────────────
// Suficientemente específico para não ser "vago", mas sem análise crítica profunda.
// Expectativa: nota alta no 6º ano, decrescendo progressivamente até o 3º EM.
const TEXTO_MEDIO = `
Hoje na aula de História estudamos a Revolução Francesa. O professor explicou
que ela começou em 1789 com a tomada da Bastilha, que era uma prisão-símbolo
do absolutismo. Os principais motivos foram a crise econômica, o poder absoluto
do rei e a influência das ideias iluministas de liberdade e igualdade.
A revolução derrubou a monarquia e resultou na Declaração dos Direitos do
Homem e do Cidadão, que garantia direitos básicos para as pessoas.
`.trim();

// ── Tabela das 7 séries ─────────────────────────────────────────────────────
const SERIES = [
  { nomeTurma: "6º A",    nivelEnsino: "EF2", grau: 1 },
  { nomeTurma: "7º A",    nivelEnsino: "EF2", grau: 2 },
  { nomeTurma: "8º A",    nivelEnsino: "EF2", grau: 3 },
  { nomeTurma: "9º A",    nivelEnsino: "EF2", grau: 4 },
  { nomeTurma: "1º A EM", nivelEnsino: "EM",  grau: 5 },
  { nomeTurma: "2º A EM", nivelEnsino: "EM",  grau: 6 },
  { nomeTurma: "3º A EM", nivelEnsino: "EM",  grau: 7 },
];

// ── Execução ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("\nTexto usado (mesmo para todas as séries):");
  console.log("─".repeat(60));
  console.log(TEXTO_MEDIO);
  console.log("─".repeat(60));
  console.log("\nAnalisando as 7 séries... (aguarde, são 7 chamadas à IA)\n");

  const resultados: Array<{
    grau: number;
    nomeTurma: string;
    conteudo: number;
    escrita: number;
    aproveitamento: number;
    nivel: string;
    profJustif: string;
  }> = [];

  for (const s of SERIES) {
    process.stdout.write(`  [Grau ${s.grau}/7] ${s.nomeTurma}... `);
    try {
      const r = await analisarRegistroAluno(
        TEXTO_MEDIO,
        "História",
        s.nivelEnsino,
        s.nomeTurma,
      );
      resultados.push({
        grau: s.grau,
        nomeTurma: s.nomeTurma,
        conteudo:       r.nota_conteudo  ?? 0,
        escrita:        r.nota_escrita   ?? 0,
        aproveitamento: r.aproveitamento ?? 0,
        nivel:          r.nivel,
        // Extrai só a parte da justificativa de profundidade para auditoria rápida
        profJustif: (r.justificativa ?? "")
          .split(" | ")
          .find(p => p.startsWith("Profundidade")) ?? "",
      });
      console.log(`✓ aproveitamento=${r.aproveitamento}%`);
    } catch (e) {
      console.log(`✘ ERRO: ${e}`);
      resultados.push({ grau: s.grau, nomeTurma: s.nomeTurma, conteudo: -1, escrita: -1, aproveitamento: -1, nivel: "ERRO", profJustif: "" });
    }
  }

  // ── Tabela de resultados ───────────────────────────────────────────────────
  console.log("\n" + "═".repeat(72));
  console.log("TABELA DE PROPORCIONALIDADE POR SÉRIE (mesmo texto)");
  console.log("═".repeat(72));
  console.log(
    "Grau".padEnd(6) +
    "Série".padEnd(12) +
    "Conteúdo".padEnd(12) +
    "Escrita".padEnd(10) +
    "Aproveit.".padEnd(12) +
    "Nível"
  );
  console.log("─".repeat(72));

  for (const r of resultados) {
    const barra = "█".repeat(Math.round((r.aproveitamento > 0 ? r.aproveitamento : 0) / 5));
    console.log(
      `[${r.grau}/7]`.padEnd(6) +
      r.nomeTurma.padEnd(12) +
      `${r.conteudo}%`.padEnd(12) +
      `${r.escrita}%`.padEnd(10) +
      `${r.aproveitamento}%`.padEnd(12) +
      r.nivel
    );
  }

  console.log("─".repeat(72));

  // ── Verificação de progressão decrescente ─────────────────────────────────
  console.log("\nVERIFICAÇÃO — aproveitamento deve DECRESCER do Grau 1 ao 7:");
  let progressaoOk = true;
  for (let i = 1; i < resultados.length; i++) {
    const anterior = resultados[i - 1];
    const atual    = resultados[i];
    const ok       = atual.aproveitamento <= anterior.aproveitamento;
    const seta     = ok ? "↓ ✔" : "↑ ✘ INVERTIDO";
    console.log(
      `  Grau ${anterior.grau} (${anterior.nomeTurma}) ${anterior.aproveitamento}% → ` +
      `Grau ${atual.grau} (${atual.nomeTurma}) ${atual.aproveitamento}%  ${seta}`
    );
    if (!ok) progressaoOk = false;
  }

  // Tolerância: permite empates pontuais (série vizinha pode ter mesma nota)
  // mas a tendência geral (início vs fim) deve ser decrescente
  const tendenciaOk = resultados[resultados.length - 1].aproveitamento < resultados[0].aproveitamento;
  console.log(`\n  Tendência geral (${resultados[0].nomeTurma} vs ${resultados[resultados.length - 1].nomeTurma}): ` +
    `${resultados[0].aproveitamento}% → ${resultados[resultados.length - 1].aproveitamento}% ` +
    (tendenciaOk ? "✔ DECRESCENTE" : "✘ NÃO DECRESCENTE"));

  console.log("\n" + "═".repeat(72));
  console.log(progressaoOk
    ? "🎉 PROGRESSÃO CONTÍNUA E CORRETA EM TODOS OS GRAUS"
    : tendenciaOk
      ? "⚠️  PROGRESSÃO GERAL OK, mas há inversões pontuais entre séries vizinhas"
      : "✘  PROGRESSÃO INCORRETA — revisar prompt ou funções de escala"
  );
  console.log("═".repeat(72) + "\n");

  // ── Auditoria de justificativas de profundidade ───────────────────────────
  console.log("AUDITORIA — justificativa de profundidade por série:");
  console.log("(confirme que cada série cita o Grau correto)\n");
  for (const r of resultados) {
    console.log(`  [Grau ${r.grau}] ${r.nomeTurma}: ${r.profJustif || "(sem justificativa de profundidade)"}`);
  }
  console.log();
}

main().catch(console.error);
