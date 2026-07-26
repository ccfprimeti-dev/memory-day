/**
 * FASE 3 — Validação do novo prompt anti-vacuous-truth.
 * (A) Vazio/genérico  → deve tirar < 30%
 * (B) Conteúdo real   → deve tirar alto
 * (C) Fluente sem conteúdo → deve tirar baixo de conteúdo
 *
 * Rode: cd memory-day && npx tsx prisma/teste-fase3.ts
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

const groq          = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO        = "llama-3.3-70b-versatile";
const PESO_CONTEUDO = 0.7;
const PESO_ESCRITA  = 0.3;

function nivelDeNota(n: number) {
  if (n >= 71) return "AVANCADO";
  if (n >= 41) return "INTERMEDIARIO";
  return "BASICO";
}

async function analisar(texto: string, label: string, materia = "História", nivel = "EM") {
  const labelNivel = nivel === "EF1" ? "Ensino Fundamental 1 (1º ao 5º ano)"
    : nivel === "EF2" ? "Ensino Fundamental 2 (6º ao 9º ano)"
    : "Ensino Médio";

  const blocoBncc = `Identifique as habilidades BNCC esperadas para "${materia}" no ${labelNivel}. Registre em "habilidade_bncc_considerada".`;

  const resposta = await groq.chat.completions.create({
    model: MODELO,
    temperature: 0.2,
    max_tokens: 1000,
    messages: [
      {
        role: "system",
        content: `Avaliador pedagógico de ${materia} — ${labelNivel} (BNCC). Você avalia O TEXTO DO ALUNO como evidência do aprendizado DELE — não avalia o tema, a aula nem o material didático. Responda SOMENTE em JSON válido.`,
      },
      {
        role: "user",
        content: `${blocoBncc}

Texto do aluno:
"""
${texto}
"""

AVISO CRÍTICO:
- Afirmar que "aprendeu" ou "entendeu" NÃO é evidência de aprendizado.
- Resenhar o material externo ("o documentário foi bom") também NÃO é evidência.
- Apenas conteúdo específico e verificável conta: fatos, datas, nomes, conceitos explicados, exemplos, raciocínios com as palavras do aluno.

PASSO 1 — OBRIGATÓRIO antes de qualquer nota:
Liste em "evidencias_concretas" SOMENTE os fatos, datas, nomes, conceitos ou raciocínios específicos que o aluno EFETIVAMENTE escreveu. Afirmações genéricas não entram. Se não houver nada concreto, a lista fica vazia [].
REGRA INVIOLÁVEL: se "evidencias_concretas" estiver vazia ou tiver apenas afirmações genéricas, as três notas de CONTEÚDO devem ser ≤ 20.

PASSO 2 — Pontue com base no que está em "evidencias_concretas":

CONTEÚDO (use valores irregulares: 37, 63, 78 — nunca só múltiplos de 10):
• correcao_conceitual: dos itens concretos listados, quantos estão factualmente corretos? Lista vazia → 0.
• completude: quantos aspectos esperados pela BNCC foram cobertos pelos itens concretos? Lista vazia → 0.
• profundidade: os itens concretos mostram raciocínio, exemplos ou relações além da definição? Lista vazia ou superficial → ≤ 15.

ESCRITA (avalie a produção escrita independente do conteúdo):
• clareza: texto compreensível? (0=confuso, 100=cristalino)
• organizacao: sequência lógica? (0=caótico, 100=organizado)
• articulacao: palavras próprias? (0=termos colados, 100=texto autoral)

Escreva 1 frase de justificativa por subcritério.

JSON (português do Brasil):
{
  "evidencias_concretas": ["..."],
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
      },
    ],
  });

  const raw = JSON.parse(
    (resposta.choices[0]?.message?.content ?? "{}")
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim()
  );

  // ── trava código: cap em 20 se evidencias_concretas vazia ──
  const evidencias  = Array.isArray(raw.evidencias_concretas) ? raw.evidencias_concretas as unknown[] : [];
  const capConteudo = evidencias.length === 0 ? 20 : 100;

  const correcao   = Math.min(raw.conteudo?.correcao_conceitual ?? 0, capConteudo);
  const completude = Math.min(raw.conteudo?.completude          ?? 0, capConteudo);
  const profund    = Math.min(raw.conteudo?.profundidade        ?? 0, capConteudo);
  const clareza    = raw.escrita?.clareza    ?? 0;
  const organizac  = raw.escrita?.organizacao ?? 0;
  const articul    = raw.escrita?.articulacao ?? 0;

  const nota_conteudo  = Math.round((correcao + completude + profund) / 3);
  const nota_escrita   = Math.round((clareza + organizac + articul) / 3);
  const aproveitamento = Math.round(nota_conteudo * PESO_CONTEUDO + nota_escrita * PESO_ESCRITA);

  console.log(`\n${"─".repeat(72)}`);
  console.log(`📝 [${label}]`);
  console.log(`   Texto: "${texto.slice(0, 110)}${texto.length > 110 ? "…" : ""}"`);
  console.log(`\n   📋 Evidências concretas encontradas (${evidencias.length}):`);
  if (evidencias.length === 0) {
    console.log(`      ∅ nenhuma`);
  } else {
    (evidencias as string[]).forEach((e, i) => console.log(`      ${i + 1}. ${e}`));
  }
  console.log(`   Trava de código: cap = ${capConteudo} (${evidencias.length === 0 ? "ATIVA" : "inativa"})`);
  console.log(`\n   CONTEÚDO (após trava):`);
  console.log(`   • correcao  : ${String(correcao).padStart(3)}  — ${raw.conteudo?.correcao_justificativa ?? ""}`);
  console.log(`   • completude: ${String(completude).padStart(3)}  — ${raw.conteudo?.completude_justificativa ?? ""}`);
  console.log(`   • profund.  : ${String(profund).padStart(3)}  — ${raw.conteudo?.profundidade_justificativa ?? ""}`);
  console.log(`   → nota_conteudo = ${nota_conteudo}`);
  console.log(`\n   ESCRITA:`);
  console.log(`   • clareza   : ${String(clareza).padStart(3)}  — ${raw.escrita?.clareza_justificativa ?? ""}`);
  console.log(`   • organizac : ${String(organizac).padStart(3)}  — ${raw.escrita?.organizacao_justificativa ?? ""}`);
  console.log(`   • articulac : ${String(articul).padStart(3)}  — ${raw.escrita?.articulacao_justificativa ?? ""}`);
  console.log(`   → nota_escrita = ${nota_escrita}`);
  console.log(`\n   🎯 aproveitamento = ${aproveitamento}%  |  nível = ${nivelDeNota(nota_conteudo)}`);

  return { aproveitamento, nota_conteudo };
}

const TEXTOS = [
  {
    label: "(A) VAZIO/GENÉRICO — deve ser < 30%",
    texto: "Aprendi bastante hoje. Foi uma boa aula e achei o conteúdo muito interessante. Entendi tudo o que foi explicado e acho que vou me sair bem nas provas.",
  },
  {
    label: "(C) FLUENTE SEM CONTEÚDO — deve tirar baixo de conteúdo",
    texto: "O documentário sobre a história do comunismo apresentou uma boa compreensão dos conceitos básicos, mas com alguns erros pontuais. No geral foi uma boa aula e aprendi bastante sobre o assunto.",
  },
  {
    label: "(B) CONTEÚDO REAL — deve tirar alto",
    texto: "Hoje estudei a Revolução Russa de 1917. Aprendi que o czar Nicolau II foi deposto em fevereiro e que os bolcheviques, liderados por Lenin, tomaram o poder em outubro com o slogan 'Paz, Terra e Pão'. O comunismo defendia a propriedade coletiva dos meios de produção e a extinção das classes sociais. Me confundiu a diferença entre mencheviques e bolcheviques — os primeiros queriam uma revolução gradual e os segundos uma tomada rápida do poder.",
  },
];

(async () => {
  console.log("\n" + "=".repeat(72));
  console.log("FASE 3 — VALIDAÇÃO: novo prompt anti-vacuous-truth");
  console.log("=".repeat(72));

  const resultados: { label: string; aprov: number; nc: number }[] = [];
  for (const t of TEXTOS) {
    const { aproveitamento, nota_conteudo } = await analisar(t.texto, t.label);
    resultados.push({ label: t.label, aprov: aproveitamento, nc: nota_conteudo });
    await new Promise(r => setTimeout(r, 2500));
  }

  console.log("\n" + "=".repeat(72));
  console.log("SUMÁRIO:");
  resultados.forEach(r => console.log(`  ${r.label}`));
  resultados.forEach(r => console.log(`    → ${r.aprov}%  (nota_conteudo=${r.nc})`));

  const [a, c, b] = resultados;
  console.log("\nCRITÉRIOS:");
  console.log(`  (A) < 30%  ? ${a.aprov < 30  ? "✅ PASSOU" : `❌ FALHOU (${a.aprov}%)`}`);
  console.log(`  (C) conteúdo baixo (nc < 30)? ${c.nc < 30 ? "✅ PASSOU" : `❌ FALHOU (nc=${c.nc})`}`);
  console.log(`  (B) alto (> 60%)? ${b.aprov > 60 ? "✅ PASSOU" : `❌ FALHOU (${b.aprov}%)`}`);
  console.log(`  (B) > (A) e (B) > (C)? ${b.aprov > a.aprov && b.aprov > c.aprov ? "✅ PASSOU" : "❌ FALHOU"}`);
  console.log("=".repeat(72) + "\n");
})();
