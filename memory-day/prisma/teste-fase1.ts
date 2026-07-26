/**
 * FASE 1 — Diagnóstico do prompt atual.
 * Roda 3 textos: vago fluente, vago genérico, e conteúdo real.
 * Mostra subcritérios + nota final para auditoria.
 *
 * Rode: cd memory-day && npx tsx prisma/teste-fase1.ts
 */
import Groq from "groq-sdk";
import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const env = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* ignora */ }

const groq            = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO          = "llama-3.3-70b-versatile";
const PESO_CONTEUDO   = 0.7;
const PESO_ESCRITA    = 0.3;

function nivelDeNota(n: number) {
  if (n >= 71) return "AVANCADO";
  if (n >= 41) return "INTERMEDIARIO";
  return "BASICO";
}

// ── PROMPT ATUAL (copiado literalmente de lib/ai.ts) ─────────────────────────
function buildPromptAtual(textoDoAluno: string, nomeMateria: string, nivelEnsino: string) {
  const labelNivel = nivelEnsino === "EF1" ? "Ensino Fundamental 1 (1º ao 5º ano)"
    : nivelEnsino === "EF2" ? "Ensino Fundamental 2 (6º ao 9º ano)"
    : "Ensino Médio";

  const blocoBncc = `Identifique as habilidades BNCC esperadas para "${nomeMateria}" no ${labelNivel}. Registre em "habilidade_bncc_considerada".`;

  return {
    system: `Avaliador pedagógico de ${nomeMateria} — ${labelNivel} (BNCC). Responda SOMENTE em JSON válido.`,
    user: `${blocoBncc}

Relato do aluno:
"""
${textoDoAluno}
"""

Avalie 6 subcritérios de 0–100 (inteiro). Use valores irregulares (ex: 37, 63, 78) — nunca apenas múltiplos de 10. Escreva 1 frase de justificativa por subcritério.

CONTEÚDO:
• correcao_conceitual: conceitos corretos? (0=erros graves, 100=correto)
• completude: cobriu o esperado pela BNCC? (0=nada, 100=tudo)
• profundidade: vai além da definição? (0=só termos, 100=exemplos e relações)

ESCRITA:
• clareza: texto compreensível? (0=confuso, 100=cristalino)
• organizacao: sequência lógica? (0=caótico, 100=organizado)
• articulacao: palavras próprias? (0=termos colados, 100=texto autoral)

JSON (português do Brasil):
{
  "conteudo": {
    "correcao_conceitual": N, "correcao_justificativa": "...",
    "completude": N, "completude_justificativa": "...",
    "profundidade": N, "profundidade_justificativa": "..."
  },
  "escrita": {
    "clareza": N, "clareza_justificativa": "...",
    "organizacao": N, "organizacao_justificativa": "...",
    "articulacao": N, "articulacao_justificativa": "..."
  },
  "habilidade_bncc_considerada": "...",
  "resumo": "2-3 frases",
  "lacunas": ["..."],
  "sugestoes": ["..."]
}`,
  };
}

async function analisar(texto: string, label: string, materia = "História", nivel = "EM") {
  const p = buildPromptAtual(texto, materia, nivel);
  const resposta = await groq.chat.completions.create({
    model: MODELO,
    temperature: 0.2,
    max_tokens: 900,
    messages: [
      { role: "system", content: p.system },
      { role: "user",   content: p.user   },
    ],
  });

  const raw = JSON.parse(
    (resposta.choices[0]?.message?.content ?? "{}")
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim()
  );

  const correcao   = raw.conteudo?.correcao_conceitual ?? 0;
  const completude = raw.conteudo?.completude          ?? 0;
  const profund    = raw.conteudo?.profundidade        ?? 0;
  const clareza    = raw.escrita?.clareza              ?? 0;
  const organizac  = raw.escrita?.organizacao          ?? 0;
  const articul    = raw.escrita?.articulacao          ?? 0;

  const nota_conteudo  = Math.round((correcao + completude + profund) / 3);
  const nota_escrita   = Math.round((clareza + organizac + articul) / 3);
  const aproveitamento = Math.round(nota_conteudo * PESO_CONTEUDO + nota_escrita * PESO_ESCRITA);

  console.log(`\n${"─".repeat(72)}`);
  console.log(`📝 [${label}]`);
  console.log(`   Texto: "${texto.slice(0, 100)}${texto.length > 100 ? "…" : ""}"`);
  console.log(`\n   CONTEÚDO:`);
  console.log(`   • correcao_conceitual : ${String(correcao).padStart(3)}  — ${raw.conteudo?.correcao_justificativa ?? ""}`);
  console.log(`   • completude          : ${String(completude).padStart(3)}  — ${raw.conteudo?.completude_justificativa ?? ""}`);
  console.log(`   • profundidade        : ${String(profund).padStart(3)}  — ${raw.conteudo?.profundidade_justificativa ?? ""}`);
  console.log(`   → nota_conteudo = ${nota_conteudo}`);
  console.log(`\n   ESCRITA:`);
  console.log(`   • clareza             : ${String(clareza).padStart(3)}  — ${raw.escrita?.clareza_justificativa ?? ""}`);
  console.log(`   • organizacao         : ${String(organizac).padStart(3)}  — ${raw.escrita?.organizacao_justificativa ?? ""}`);
  console.log(`   • articulacao         : ${String(articul).padStart(3)}  — ${raw.escrita?.articulacao_justificativa ?? ""}`);
  console.log(`   → nota_escrita = ${nota_escrita}`);
  console.log(`\n   🎯 aproveitamento = ${aproveitamento}%  |  nível = ${nivelDeNota(nota_conteudo)}`);
  console.log(`   📋 Resumo: ${raw.resumo ?? ""}`);

  return aproveitamento;
}

const TEXTOS = [
  {
    label: "PROBLEMÁTICO — vago mas fluente (o bug relatado)",
    texto: "O documentário sobre a história do comunismo apresentou uma boa compreensão dos conceitos básicos, mas com alguns erros pontuais. No geral foi uma boa aula e aprendi bastante sobre o assunto.",
  },
  {
    label: "GENÉRICO PURO — não diz nada",
    texto: "Aprendi bastante hoje. Foi uma boa aula e achei o conteúdo muito interessante. Entendi tudo o que foi explicado e acho que vou me sair bem nas provas.",
  },
  {
    label: "CONTEÚDO REAL — aluno demonstra aprendizado",
    texto: "Hoje estudei a Revolução Russa de 1917. Aprendi que o czar Nicolau II foi deposto em fevereiro e que os bolcheviques, liderados por Lenin, tomaram o poder em outubro com o slogan 'Paz, Terra e Pão'. O comunismo defendia a propriedade coletiva dos meios de produção e a extinção das classes sociais. Me confundiu a diferença entre mencheviques e bolcheviques — os primeiros queriam uma revolução gradual e os segundos uma tomada rápida do poder.",
  },
];

(async () => {
  console.log("\n" + "=".repeat(72));
  console.log("FASE 1 — DIAGNÓSTICO: prompt atual aplicado a 3 textos");
  console.log("=".repeat(72));

  const notas: number[] = [];
  for (const t of TEXTOS) {
    notas.push(await analisar(t.texto, t.label));
    await new Promise(r => setTimeout(r, 2500));
  }

  console.log("\n" + "=".repeat(72));
  console.log("SUMÁRIO:");
  TEXTOS.forEach((t, i) => console.log(`  ${t.label}: ${notas[i]}%`));
  console.log("=".repeat(72) + "\n");
})();
