/**
 * FASE 3 — Validação do novo sistema de subcritérios.
 * Roda 5 textos de qualidades bem diferentes + 2 textos parecidos.
 * Mostra subcritérios, cálculo e nota final para auditoria.
 *
 * Rode: cd memory-day && npx tsx prisma/diagnostico-ia.ts
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

const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO = "llama-3.3-70b-versatile";
const PESO_CONTEUDO = 0.7;
const PESO_ESCRITA  = 0.3;

function nivelDeNota(n: number) {
  if (n >= 71) return "AVANCADO";
  if (n >= 41) return "INTERMEDIARIO";
  return "BASICO";
}

async function analisar(texto: string, label: string) {
  const resposta = await groq.chat.completions.create({
    model: MODELO,
    temperature: 0.2,
    max_tokens: 1600,
    messages: [
      {
        role: "system",
        content: `Você é um avaliador pedagógico especializado em Matemática para o Ensino Médio (BNCC). Responda SEMPRE em JSON válido, sem texto antes ou depois.`,
      },
      {
        role: "user",
        content: `Com base na BNCC, identifique as habilidades esperadas para "Matemática" no Ensino Médio e use-as como gabarito. Informe no campo "habilidade_bncc_considerada".

O aluno escreveu o seguinte relato do que aprendeu hoje:
"""
${texto}
"""

Avalie cada subcritério de 0 a 100 (inteiros). Regras obrigatórias:
- NÃO use apenas múltiplos de 5 ou 10. Use valores como 37, 63, 78, 84.
- Justifique cada subcritério em exatamente UMA frase antes de atribuir a nota.
- Dois textos semelhantes devem receber notas próximas mas distintas (ex.: 61 e 67).

CONTEÚDO — avalie cada dimensão separadamente:
• correcao_conceitual: os conceitos usados estão corretos? (0 = erros conceituais graves; 100 = totalmente correto)
• completude: cobriu o que era esperado para esta aula segundo a BNCC? (0 = quase nada; 100 = cobriu tudo)
• profundidade: demonstrou aplicação e compreensão além da definição? (0 = só copiou termos; 100 = explicou com exemplos e relações)

ESCRITA — avalie cada dimensão separadamente:
• clareza: o texto é compreensível? (0 = incompreensível; 100 = cristalino)
• organizacao: há sequência lógica e estrutura? (0 = caótico; 100 = muito bem organizado)
• articulacao: conectou ideias com as próprias palavras? (0 = colagem de termos; 100 = texto autoral e articulado)

Responda EXCLUSIVAMENTE com este JSON:
{
  "conteudo": {
    "correcao_conceitual": <inteiro 0-100>,
    "correcao_justificativa": "<uma frase>",
    "completude": <inteiro 0-100>,
    "completude_justificativa": "<uma frase>",
    "profundidade": <inteiro 0-100>,
    "profundidade_justificativa": "<uma frase>"
  },
  "escrita": {
    "clareza": <inteiro 0-100>,
    "clareza_justificativa": "<uma frase>",
    "organizacao": <inteiro 0-100>,
    "organizacao_justificativa": "<uma frase>",
    "articulacao": <inteiro 0-100>,
    "articulacao_justificativa": "<uma frase>"
  },
  "habilidade_bncc_considerada": "<código e descrição>",
  "resumo": "<2-3 frases>",
  "lacunas": ["lacuna 1"],
  "sugestoes": ["sugestão 1"]
}
Responda em português do Brasil.`,
      },
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
  const nivel          = nivelDeNota(nota_conteudo);

  console.log(`\n${"─".repeat(70)}`);
  console.log(`📝 [${label}]`);
  console.log(`   Texto: "${texto.slice(0, 80)}${texto.length > 80 ? "…" : ""}"`);
  console.log(`\n   SUBCRITÉRIOS DE CONTEÚDO:`);
  console.log(`   • correcao_conceitual : ${correcao}  — ${raw.conteudo?.correcao_justificativa ?? ""}`);
  console.log(`   • completude          : ${completude}  — ${raw.conteudo?.completude_justificativa ?? ""}`);
  console.log(`   • profundidade        : ${profund}  — ${raw.conteudo?.profundidade_justificativa ?? ""}`);
  console.log(`   → nota_conteudo = round((${correcao}+${completude}+${profund})/3) = ${nota_conteudo}`);
  console.log(`\n   SUBCRITÉRIOS DE ESCRITA:`);
  console.log(`   • clareza             : ${clareza}  — ${raw.escrita?.clareza_justificativa ?? ""}`);
  console.log(`   • organizacao         : ${organizac}  — ${raw.escrita?.organizacao_justificativa ?? ""}`);
  console.log(`   • articulacao         : ${articul}  — ${raw.escrita?.articulacao_justificativa ?? ""}`);
  console.log(`   → nota_escrita = round((${clareza}+${organizac}+${articul})/3) = ${nota_escrita}`);
  console.log(`\n   🎯 RESULTADO FINAL (calculado em código):`);
  console.log(`   aproveitamento = round(${nota_conteudo}×0.7 + ${nota_escrita}×0.3) = ${aproveitamento}%`);
  console.log(`   nivel          = ${nivel}`);

  return aproveitamento;
}

const TEXTOS_5 = [
  { label: "1 — PÉSSIMO",      texto: "Hoje tive aula de matemática. Foi interessante." },
  { label: "2 — FRACO",        texto: "Aprendi sobre funções do segundo grau. Tem a ver com parábola e existe uma fórmula chamada Bhaskara que resolve a equação." },
  { label: "3 — MEDIANO",      texto: "Hoje estudei funções quadráticas. A fórmula geral é ax²+bx+c=0. Uso o delta (b²-4ac) para ver se tem raízes reais. Se delta>0 tem duas raízes, se =0 tem uma, se <0 não tem. Ainda preciso praticar aplicações." },
  { label: "4 — BOM",          texto: "Na aula de hoje aprendi funções quadráticas com profundidade. Entendi que o vértice da parábola é o ponto de máximo ou mínimo e calculei usando xv=-b/2a e yv=-delta/4a. Resolvi problemas onde maximizei a área de um retângulo com perímetro fixo. Percebi que o coeficiente 'a' determina a concavidade e que isso tem aplicação em física (lançamento de projéteis)." },
  { label: "5 — EXCELENTE",    texto: "Aprofundei meu estudo de funções quadráticas hoje. Entendi que f(x)=ax²+bx+c define uma parábola cuja concavidade depende do sinal de 'a'. O vértice V=(-b/2a, -Δ/4a) representa o extremo da função — máximo se a<0, mínimo se a>0. Apliquei isso em um problema real: com 120m de tela e um muro como lado, modelei a área como f(x)=x(120-2x), encontrei xv=30m e área máxima de 1800m². Também relacionei com inequações para determinar os valores de x que geram área acima de 1500m², resolvendo f(x)>1500 graficamente. Percebo a conexão entre funções quadráticas, geometria e análise de otimização." },
];

const TEXTOS_PARECIDOS = [
  { label: "A — parecido (versão 1)", texto: "Aprendi sobre funções de segundo grau. O delta é b²-4ac e serve para descobrir quantas raízes a equação tem. Se delta for positivo tem duas raízes reais, se for zero tem uma raiz e se for negativo não tem raízes reais. Usei a fórmula de Bhaskara para calcular." },
  { label: "B — parecido (versão 2)", texto: "Estudei funções quadráticas. O discriminante delta=b²-4ac indica o número de soluções reais: positivo dá duas, zero dá uma e negativo nenhuma. A fórmula de Bhaskara fornece as raízes quando delta>=0. Entendi como isso se relaciona com o gráfico da parábola." },
];

(async () => {
  console.log("\n" + "=".repeat(70));
  console.log("FASE 3 — VALIDAÇÃO: 5 textos diferentes + 2 parecidos");
  console.log("=".repeat(70));

  console.log("\n── PARTE 1: 5 TEXTOS DE QUALIDADES DIFERENTES ──────────────────────");
  const notas: number[] = [];
  for (const t of TEXTOS_5) {
    const n = await analisar(t.texto, t.label);
    notas.push(n);
    await new Promise((r) => setTimeout(r, 2200));
  }

  console.log("\n── SUMÁRIO PARTE 1 ──────────────────────────────────────────────────");
  TEXTOS_5.forEach((t, i) => console.log(`   ${t.label}: ${notas[i]}%`));
  const todasDiferentes = new Set(notas).size === notas.length;
  console.log(`\n   Notas todas distintas? ${todasDiferentes ? "✅ SIM" : "⚠️  NÃO — algumas iguais"}`);
  const spread = Math.max(...notas) - Math.min(...notas);
  console.log(`   Amplitude (max-min): ${spread} pontos percentuais ${spread >= 40 ? "✅" : "⚠️  esperado >= 40"}`);

  console.log("\n── PARTE 2: 2 TEXTOS PARECIDOS ─────────────────────────────────────");
  const notasP: number[] = [];
  for (const t of TEXTOS_PARECIDOS) {
    const n = await analisar(t.texto, t.label);
    notasP.push(n);
    await new Promise((r) => setTimeout(r, 2200));
  }

  console.log("\n── SUMÁRIO PARTE 2 ──────────────────────────────────────────────────");
  TEXTOS_PARECIDOS.forEach((t, i) => console.log(`   ${t.label}: ${notasP[i]}%`));
  const diff = Math.abs(notasP[0] - notasP[1]);
  console.log(`   Diferença entre os dois: ${diff}%`);
  console.log(`   Próximas e distintas? ${diff > 0 && diff <= 15 ? "✅ SIM" : diff === 0 ? "⚠️  IGUAIS" : "⚠️  muito distantes para textos parecidos"}`);

  console.log("\n" + "=".repeat(70));
  console.log("FIM DA VALIDAÇÃO");
  console.log("=".repeat(70) + "\n");
})();
