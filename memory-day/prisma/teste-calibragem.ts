/**
 * Validação da calibragem — 5 textos reais do banco em faixas distintas.
 * Rode: cd memory-day && npx tsx prisma/teste-calibragem.ts
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

async function analisar(texto: string, label: string, materia: string, nivel = "EM") {
  const labelNivel = nivel === "EF1" ? "Ensino Fundamental 1 (1º ao 5º ano)"
    : nivel === "EF2" ? "Ensino Fundamental 2 (6º ao 9º ano)"
    : "Ensino Médio";

  const resposta = await groq.chat.completions.create({
    model: MODELO, temperature: 0.2, max_tokens: 1000,
    messages: [
      {
        role: "system",
        content: `Você avalia diários de aula de alunos do ${labelNivel}. O critério central é: o aluno descreveu bem o que viveu e aprendeu na aula de hoje? Responda SOMENTE em JSON válido.`,
      },
      {
        role: "user",
        content: `Identifique as habilidades BNCC esperadas para "${materia}" no ${labelNivel}. Registre em "habilidade_bncc_considerada".

Texto do aluno:
"""
${texto}
"""

CONTEXTO: Este é um diário de aula, não uma prova. O aluno registrou o que aconteceu/aprendeu hoje. Avalie a qualidade desse registro. Não exija rigor acadêmico formal — exija que o aluno tenha descrito a aula com especificidade.

RÉGUA CENTRAL (use para calibrar todas as notas de CONTEÚDO):
• Descreveu bem a aula → conteúdo ALTO (o aluno nomeou tópicos, conceitos, fórmulas, atividades ou exemplos específicos E elaborou minimamente o que são ou como funcionam)
• Descreveu parcialmente → conteúdo MÉDIO (nomeou tópicos mas explicou pouco, ou explicou bem mas cobriu pouca coisa)
• Não descreveu ou foi vago → conteúdo BAIXO ("aprendi bastante", "foi boa aula", "entendi o conteúdo" sem nada específico)

PASSO 1 — OBRIGATÓRIO antes de pontuar:
Liste em "evidencias_concretas" os elementos ESPECÍFICOS que o aluno mencionou: nomes de tópicos, conceitos, fórmulas, atividades, obras, autores, exemplos. Qualquer menção específica ao conteúdo da aula conta. Afirmações puramente genéricas ("aprendi bastante", "foi interessante") não entram.
REGRA INVIOLÁVEL: lista vazia → as três notas de CONTEÚDO devem ser ≤ 20.

PASSO 2 — Pontue (valores irregulares: ex. 37, 63, 78 — nunca só múltiplos de 10):

CONTEÚDO:
• correcao_conceitual: o que o aluno mencionou está correto no contexto da matéria? Lista vazia → 0. Erros graves → baixo. Tudo correto e específico → alto.
• completude: considerando o que o PRÓPRIO TEXTO sugere que foi a aula de hoje (não o currículo inteiro), o aluno cobriu bem o que foi visto? Lista vazia → 0. Cobriu só uma parte pequena → baixo/médio. Cobriu bem a aula → alto.
• profundidade: o aluno foi além de apenas listar tópicos? Para o ${labelNivel}, uma definição correta + uma relação ou exemplo já é boa elaboração. Lista vazia → 0. Só listou nomes sem explicar → baixo. Explicou o que são ou como funcionam → médio/alto. Relacionou conceitos com exemplos → alto.

ESCRITA (avalie independente do conteúdo):
• clareza: texto compreensível? (0=confuso, 100=cristalino)
• organizacao: sequência lógica? (0=caótico, 100=organizado)
• articulacao: palavras próprias? (0=termos colados, 100=texto autoral)

1 frase de justificativa por subcritério.

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
      .replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"").trim()
  );

  const evidencias  = Array.isArray(raw.evidencias_concretas) ? raw.evidencias_concretas as string[] : [];
  const cap         = evidencias.length === 0 ? 20 : 100;
  const correcao    = Math.min(raw.conteudo?.correcao_conceitual ?? 0, cap);
  const completude  = Math.min(raw.conteudo?.completude ?? 0, cap);
  const profund     = Math.min(raw.conteudo?.profundidade ?? 0, cap);
  const clareza     = raw.escrita?.clareza ?? 0;
  const organizac   = raw.escrita?.organizacao ?? 0;
  const articul     = raw.escrita?.articulacao ?? 0;
  const nc          = Math.round((correcao + completude + profund) / 3);
  const ne          = Math.round((clareza + organizac + articul) / 3);
  const aprov       = Math.round(nc * PESO_CONTEUDO + ne * PESO_ESCRITA);

  console.log(`\n${"─".repeat(72)}`);
  console.log(`📝 [${label}] — ${materia}`);
  console.log(`   "${texto.slice(0, 120)}${texto.length > 120 ? "…" : ""}"`);
  console.log(`\n   Evidências (${evidencias.length}): ${evidencias.length === 0 ? "∅ nenhuma" : evidencias.join(" | ")}`);
  console.log(`   Cap: ${cap === 20 ? "20 ATIVA" : "inativa"}`);
  console.log(`\n   correcao=${correcao}  completude=${completude}  profund=${profund}  → nc=${nc}`);
  console.log(`   clareza=${clareza}  organizac=${organizac}  articul=${articul}  → ne=${ne}`);
  console.log(`\n   🎯 ${aprov}%  |  ${nivelDeNota(nc)}`);
  console.log(`   ${raw.resumo ?? ""}`);

  return { label, aprov, nc };
}

// 5 textos representativos das faixas que existem no banco real
const CASOS = [
  {
    label: "VAGO — não descreve nada",
    materia: "Soft Skills",
    texto: "Houve a continuação da aplicação da avaliação de redação.",
  },
  {
    label: "TÍTULO — só nomeou a atividade",
    materia: "Chemistry 1",
    texto: "Nomenclatura de compostos orgânicos e entrega de provas corrigidas",
  },
  {
    label: "LISTA — tópicos nomeados sem explicar",
    materia: "Geography",
    texto: "Na aula do dia de hose da matéria de geografia realizamos a aplicação da prova avaliativa bimestral, em que foram abordadas os conteúdos de fontes de energia, como renováveis, não renováveis, primárias, secundárias, convencionais ou alternativas, podendo ser: solar, eólica, hidráulica, geotérmica, biomassa, combustíveis fósseis ou de carvão mineral.",
  },
  {
    label: "MÉDIO — descreve com alguma explicação",
    materia: "Chemistry 2",
    texto: "Na aula do dia de hoje da matéria de química da frente A realizamos em sala exercícios teóricos de aprendizagem da apostila sobre entalpia, que é uma grandeza termodinâmica cuja variação é igual à energia térmica trocada entre sistema e meio a pressão constante, processos endotérmicos, que absorvem o calor (ΔH>0, sensação de frio), e processsos exotérmicos, que liberam calor (ΔH<0, sensação de quente)",
  },
  {
    label: "BOM — descreve bem com fórmula e variáveis",
    materia: "Algebra",
    texto: "Na aula de hoje de álgebra houve a aplicação da avaliação sobre funções senoidais e cossenoidais definidas por f(x) = B+A. sen/cos.(Kx±C), onde B é a linha base, A é a amplitude, K é a constante que multiplica o X e o C é o que define se é uma função de seno ou cosseno.",
  },
];

(async () => {
  console.log("\n" + "=".repeat(72));
  console.log("CALIBRAGEM — 5 faixas reais do banco");
  console.log("=".repeat(72));

  const res: { label: string; aprov: number; nc: number }[] = [];
  for (const c of CASOS) {
    res.push(await analisar(c.texto, c.label, c.materia));
    await new Promise(r => setTimeout(r, 2500));
  }

  console.log("\n" + "=".repeat(72));
  console.log("TABELA FINAL:");
  console.log("─".repeat(72));
  res.forEach(r => console.log(`  ${r.label.padEnd(42)} nc=${String(r.nc).padStart(3)}  → ${r.aprov}%`));
  console.log("\nESPERADO: VAGO < TÍTULO < LISTA < MÉDIO < BOM, todos com valores distintos");

  const crescente = res.every((r, i) => i === 0 || r.aprov >= res[i - 1].aprov);
  console.log(`Ordem crescente? ${crescente ? "✅" : "⚠️  verificar"}`);
  const distintos = new Set(res.map(r => r.aprov)).size === res.length;
  console.log(`Todos distintos? ${distintos ? "✅" : "⚠️  alguns iguais"}`);
  console.log("=".repeat(72) + "\n");
})();
