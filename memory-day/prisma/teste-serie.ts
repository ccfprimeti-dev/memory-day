/**
 * Roteiro de validação da proporcionalidade por série.
 * Executa 4 cenários e imprime os resultados comparativos.
 *
 * Uso: npx tsx prisma/teste-serie.ts
 * (requer GROQ_API_KEY no .env)
 */
import * as dotenv from "dotenv";
dotenv.config();

import { analisarRegistroAluno } from "../lib/ai";

// ── Textos de teste ──────────────────────────────────────────────────────────

// Qualidade MÉDIA — mesmo texto usado nos cenários 1a e 1b
const TEXTO_MEDIO = `
Hoje na aula de Física estudamos a Lei de Ohm. O professor explicou que
a tensão elétrica (V) é igual à resistência (R) multiplicada pela corrente (I),
então V = R × I. Fizemos exercícios aplicando essa fórmula em circuitos simples
com resistores em série. Entendi que quando aumentamos a resistência, a corrente
diminui se a tensão ficar igual.
`.trim();

// Texto AVANÇADO — para validar que o 2º EM ainda pode tirar nota alta
const TEXTO_AVANCADO_EM = `
Na aula de Física aprofundamos as Leis de Kirchhoff. A Lei das Correntes
(KCL) diz que a soma das correntes num nó é zero, enquanto a Lei das Tensões
(KVL) afirma que a soma das quedas de tensão em qualquer malha fechada é zero.
Resolvemos um circuito misto com três malhas usando o método das correntes de
malha; montei o sistema de equações e encontrei as correntes em cada ramo.
Percebi que a lei de Ohm é um caso particular das leis de Kirchhoff para
elementos resistivos lineares.
`.trim();

// Texto SIMPLES — para validar que o 6º ano não é punido por critério alto
const TEXTO_SIMPLES_EF = `
Hoje aprendemos sobre frações na aula de Matemática. O professor mostrou
que fração tem numerador e denominador. Fizemos exercícios de somar frações
com o mesmo denominador, tipo 1/4 + 2/4 = 3/4. Achei fácil porque é só
somar o numerador e deixar o denominador igual.
`.trim();

// ── Utilitário de exibição ───────────────────────────────────────────────────

function exibir(titulo: string, r: Awaited<ReturnType<typeof analisarRegistroAluno>>) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📋 ${titulo}`);
  console.log(`${"─".repeat(60)}`);
  console.log(`  Aproveitamento : ${r.aproveitamento}%`);
  console.log(`  Nota conteúdo  : ${r.nota_conteudo}%`);
  console.log(`  Nota escrita   : ${r.nota_escrita}%`);
  console.log(`  Nível          : ${r.nivel}`);
  console.log(`  BNCC           : ${r.habilidade_bncc_considerada ?? "(nenhuma)"}`);
  console.log(`  Justificativa  : ${r.justificativa}`);
  console.log(`  Resumo         : ${r.resumo}`);
}

// ── Execução ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("Iniciando validação de proporcionalidade por série...\n");

  // Cenário 1a — texto médio atribuído a 6º ano EF2
  const r1a = await analisarRegistroAluno(TEXTO_MEDIO, "Física", "EF2", "6º A");
  exibir("Cenário 1a — Texto MÉDIO → 6º ano EF2", r1a);

  // Cenário 1b — MESMO texto atribuído a 2º EM
  const r1b = await analisarRegistroAluno(TEXTO_MEDIO, "Física", "EM", "2º B EM");
  exibir("Cenário 1b — Texto MÉDIO → 2º ano EM", r1b);

  console.log("\n✅ VERIFICAÇÃO 1 — 6º ano deve ter nota MAIOR que 2º EM:");
  const ok1 = (r1a.aproveitamento ?? 0) > (r1b.aproveitamento ?? 0);
  console.log(`   6º ano: ${r1a.aproveitamento}%  |  2º EM: ${r1b.aproveitamento}%  →  ${ok1 ? "✔ CORRETO" : "✘ INVERTIDO"}`);

  // Cenário 2 — texto avançado para 2º EM → deve conseguir nota alta
  const r2 = await analisarRegistroAluno(TEXTO_AVANCADO_EM, "Física", "EM", "2º B EM");
  exibir("Cenário 2 — Texto AVANÇADO → 2º ano EM", r2);

  console.log("\n✅ VERIFICAÇÃO 2 — texto avançado no 2º EM deve ser ≥ 70%:");
  const ok2 = (r2.aproveitamento ?? 0) >= 70;
  console.log(`   Aproveitamento: ${r2.aproveitamento}%  →  ${ok2 ? "✔ CORRETO" : "✘ MUITO BAIXO"}`);

  // Cenário 3 — texto simples para 6º ano → deve ter nota razoável (≥ 55%)
  const r3 = await analisarRegistroAluno(TEXTO_SIMPLES_EF, "Matemática", "EF2", "6º A");
  exibir("Cenário 3 — Texto SIMPLES → 6º ano EF2", r3);

  console.log("\n✅ VERIFICAÇÃO 3 — texto simples no 6º ano deve ser ≥ 55%:");
  const ok3 = (r3.aproveitamento ?? 0) >= 55;
  console.log(`   Aproveitamento: ${r3.aproveitamento}%  →  ${ok3 ? "✔ CORRETO" : "✘ MUITO BAIXO"}`);

  console.log(`\n${"═".repeat(60)}`);
  const passou = [ok1, ok2, ok3].every(Boolean);
  console.log(passou
    ? "🎉 TODOS OS CENÁRIOS PASSARAM"
    : "⚠️  ALGUNS CENÁRIOS FALHARAM — revise o prompt"
  );
  console.log(`${"═".repeat(60)}\n`);
}

main().catch(console.error);
