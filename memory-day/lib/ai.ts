// Centraliza todas as chamadas de IA — usa Anthropic Claude
import Anthropic from "@anthropic-ai/sdk";
import type { FeedbackIA, RelatorioIA, NivelIA } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODELO = "claude-haiku-4-5-20251001";

// Temperature 0.2: baixa o suficiente para respostas focadas e consistentes,
// mas não zero — evita que textos idênticos travem em exatamente a mesma nota.
const TEMPERATURE = 0.2;

function extrairJSON(texto: string): string {
  return texto
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// Pesos da nota final — ajuste aqui sem mexer no prompt
const PESO_CONTEUDO = 0.7;
const PESO_ESCRITA  = 0.3;

function labelNivelEnsino(nivelEnsino: string): string {
  if (nivelEnsino === "EF1") return "Ensino Fundamental 1 (1º ao 5º ano)";
  if (nivelEnsino === "EF2") return "Ensino Fundamental 2 (6º ao 9º ano)";
  return "Ensino Médio";
}

// Resolve "EF2 + 9º A" → "9º ano do Ensino Fundamental 2"
// Sem nomeTurma cai no labelNivelEnsino genérico (sem regressão para registros antigos)
function labelSerie(nivelEnsino: string, nomeTurma?: string): string {
  if (nomeTurma) {
    const num = nomeTurma.match(/^(\d+)/)?.[1];
    if (num) {
      if (nivelEnsino === "EM")  return `${num}º ano do Ensino Médio`;
      if (nivelEnsino === "EF1") return `${num}º ano do Ensino Fundamental 1`;
      return `${num}º ano do Ensino Fundamental 2`;
    }
  }
  return labelNivelEnsino(nivelEnsino);
}

// Posição do aluno na escala de exigência crescente: 1 (6º ano) → 7 (3º EM).
// Usada para ancoragem relativa no prompt — a IA sabe exatamente onde o aluno
// está na progressão sem depender de referências fixas como "6º ano" ou "2º EM".
function posicaoNaEscala(nivelEnsino: string, nomeTurma?: string): number {
  const num = nomeTurma ? (parseInt(nomeTurma.match(/^(\d+)/)?.[1] ?? "0") || 0) : 0;
  if (nivelEnsino === "EM") {
    if (num >= 3) return 7;  // 3º EM
    if (num >= 2) return 6;  // 2º EM
    return 5;                 // 1º EM
  }
  // EF2: 6º→1, 7º→2, 8º→3, 9º→4
  if (num >= 9) return 4;
  if (num >= 8) return 3;
  if (num >= 7) return 2;
  return 1;  // 6º ano (padrão EF2 sem número)
}

// Régua de profundidade com âncoras LOW/MÉDIO/ALTO para cada grau.
// Os âncoras negativos nos graus altos são essenciais: sem eles a IA trata
// "descrição factual correta" como profundidade média mesmo no 3º EM.
function profundidadeEsperada(pos: number): string {
  switch (pos) {
    case 1: // 6º ano
      return "BAIXO: frases puramente genéricas sem nenhum conceito. "
           + "MÉDIO: nomeou conceito mas não explicou. "
           + "ALTO: definiu o conceito + deu um exemplo ou relação básica — isso já é excelente para o 6º ano.";
    case 2: // 7º ano
      return "BAIXO: só listou nomes de tópicos sem nenhuma explicação. "
           + "MÉDIO: definiu conceitos mas não conectou entre si. "
           + "ALTO: definiu + conectou pelo menos dois conceitos com algum exemplo.";
    case 3: // 8º ano
      return "BAIXO: listagem de fatos/causas sem nenhuma relação entre eles. "
           + "MÉDIO: definiu e fez alguma relação parcial. "
           + "ALTO: definiu + relacionou conceitos + trouxe exemplo contextualizado ao cotidiano.";
    case 4: // 9º ano
      return "BAIXO: lista de causas/fatos sem analisar por que ou como se relacionam. "
           + "MÉDIO: explicou relações causais básicas. "
           + "ALTO: mostrou relações causais com algum raciocínio inferencial (ex: 'X causou Y porque...').";
    case 5: // 1º EM
      return "BAIXO (0-35): descrição factual básica sem análise — mesmo que correta e completa, listar causas/consequências sem analisá-las é profundidade BAIXA para o 1º EM. "
           + "MÉDIO (36-65): relacionou causas e efeitos com alguma explicação analítica explícita. "
           + "ALTO (66-100): analisou relações + trouxe raciocínio analítico inicial ou aplicação prática.";
    case 6: // 2º EM
      return "BAIXO (0-35): qualquer descrição factual sem análise — listar causas e consequências corretamente ainda é BAIXO para o 2º EM, pois a série exige raciocínio analítico. "
           + "MÉDIO (36-65): analisou relações causais de forma explícita. "
           + "ALTO (66-100): raciocínio analítico claro, relações multifatoriais, alguma perspectiva crítica.";
    case 7: // 3º EM
      return "BAIXO (0-25): descrição factual — mesmo completa e correta, é profundidade MUITO BAIXA para o 3º EM. "
           + "MÉDIO (26-60): análise presente mas sem perspectiva crítica ou comparativa. "
           + "ALTO (61-100): análise crítica aprofundada + perspectiva comparativa ou historiográfica + síntese conceitual.";
    default:
      return "definição correta + relação entre conceitos + exemplo ou aplicação";
  }
}

// Nivel derivado de nota_conteudo em CÓDIGO — a IA não decide mais o nível final
function nivelDeNota(nota: number): NivelIA {
  if (nota >= 71) return "AVANCADO";
  if (nota >= 41) return "INTERMEDIARIO";
  return "BASICO";
}

// ─── Análise do registro individual do aluno ──────────────────────────────────
//
// ARQUITETURA ANTI-ANCORAGEM:
//   • Sem faixas numéricas no prompt — a IA avalia 6 subcritérios independentes.
//   • nota_conteudo, nota_escrita, aproveitamento e nivel são calculados em CÓDIGO.
//   • A IA nunca "escolhe" a nota final; ela apenas pontua cada dimensão.
//
// habilidadesEsperadas:
//   AGORA (vazio): IA deduz as habilidades BNCC pelo tema + série.
//   FUTURO (preenchido): usa como gabarito exato.
export async function analisarRegistroAluno(
  textoDoAluno: string,
  nomeMateria: string,
  nivelEnsino: string = "EM",
  nomeTurma?: string,          // ex: "6º A", "2º B EM" — necessário para proporcionalidade por série
  habilidadesEsperadas?: string
): Promise<FeedbackIA> {

  const serie     = labelSerie(nivelEnsino, nomeTurma);   // ex: "7º ano do Ensino Fundamental 2"
  const pos       = posicaoNaEscala(nivelEnsino, nomeTurma); // 1 (6º ano) a 7 (3º EM)
  const profDepth = profundidadeEsperada(pos);

  const blocoBncc = habilidadesEsperadas
    ? `Habilidades BNCC desta aula: "${habilidadesEsperadas}". Use como gabarito exclusivo.`
    : `Identifique as habilidades BNCC esperadas para "${nomeMateria}" especificamente no ${serie} `
    + `(use as habilidades da BNCC para o ${serie}, não do nível de ensino inteiro). `
    + `Registre em "habilidade_bncc_considerada".`;

  const resposta = await client.messages.create({
    model: MODELO,
    temperature: TEMPERATURE,
    max_tokens: 1000,
    system:
`Você avalia diários de aula.
CRITÉRIO CENTRAL: o aluno descreveu bem o que viveu e aprendeu na aula de hoje?
ESCALA DE EXIGÊNCIA (7 graus, crescente de rigor e profundidade):
  Grau 1: 6º ano EF → Grau 2: 7º ano EF → Grau 3: 8º ano EF → Grau 4: 9º ano EF → Grau 5: 1º EM → Grau 6: 2º EM → Grau 7: 3º EM
Este aluno é do ${serie} — Grau ${pos} de 7.
REGRA: calibre o rigor EXATAMENTE para o Grau ${pos}. A exigência deve ser maior que o Grau ${pos - 1} e menor que o Grau ${pos + 1}. O mesmo texto deve receber nota progressivamente menor conforme a série sobe — porque a expectativa da série sobe junto.
Responda SOMENTE em JSON válido.`,
    messages: [
      {
        role: "user",
        content:
`${blocoBncc}

Texto do aluno (${serie} — Grau ${pos}/7 na escala de exigência):
"""
${textoDoAluno}
"""

CONTEXTO: Diário de aula — o aluno registrou o que viveu e aprendeu hoje. Avalie a qualidade desse registro considerando o que é esperado de um aluno do Grau ${pos}/7 (${serie}). Não exija rigor acadêmico formal — exija especificidade proporcional ao Grau ${pos}.

RÉGUA CENTRAL (aplicada ao Grau ${pos} — ${serie}):
• Descreveu bem a aula para o Grau ${pos} → conteúdo ALTO
• Descreveu parcialmente → conteúdo MÉDIO
• Vago ou genérico ("aprendi bastante", "foi interessante") → conteúdo BAIXO

PASSO 1 — OBRIGATÓRIO antes de pontuar:
Liste em "evidencias_concretas" os elementos ESPECÍFICOS mencionados: tópicos, conceitos, fórmulas, atividades, obras, autores, exemplos concretos. Afirmações puramente genéricas não entram.
REGRA INVIOLÁVEL: lista vazia → as três notas de CONTEÚDO devem ser ≤ 20.

PASSO 2 — Pontue com valores irregulares (ex: 37, 63, 78 — nunca só múltiplos de 10):

CONTEÚDO (avalie em relação ao esperado para o Grau ${pos} — ${serie}):
• correcao_conceitual: o que mencionou está correto no contexto da matéria? Lista vazia → 0. Erros graves → baixo. Correto e específico → alto.
• completude: o aluno cobriu bem o que o texto sugere que foi a aula? Lembre: uma aula de Grau ${pos} sobre qualquer tema costuma abordar o conteúdo com profundidade e abrangência proporcionais ao Grau ${pos}. Um texto que só cobre aspectos introdutórios — típicos de séries muito mais jovens — representa completude BAIXA para o Grau ${pos}, mesmo que correto. Lista vazia → 0. Cobriu só o básico introdutório para a série → baixo. Cobriu de forma proporcional ao Grau ${pos} → médio/alto.
• profundidade: Âncoras para o Grau ${pos} (${serie}): ${profDepth} Lista vazia → 0.

ESCRITA (independente do conteúdo):
• clareza: texto compreensível? (0=confuso, 100=cristalino)
• organizacao: sequência lógica? (0=caótico, 100=organizado)
• articulacao: palavras próprias? (0=colagem de termos, 100=texto autoral)

1 frase de justificativa por subcritério — cite o Grau ${pos} (${serie}) para rastreabilidade.

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

  const textoResposta = resposta.content[0]?.type === "text" ? resposta.content[0].text : "{}";
  const raw = JSON.parse(extrairJSON(textoResposta));

  // ── CÁLCULO EM CÓDIGO — a IA fornece os subcritérios, o código calcula tudo ──
  // Trava de conteúdo: se a IA não encontrou evidências concretas, cap em 20.
  // Defesa em profundidade — cobre casos em que o modelo ignora a regra inviolável do prompt.
  const evidencias  = Array.isArray(raw.evidencias_concretas) ? raw.evidencias_concretas as unknown[] : [];
  const capConteudo = evidencias.length === 0 ? 20 : 100;

  const correcao   = Math.min(raw.conteudo?.correcao_conceitual ?? 0, capConteudo);
  const completude = Math.min(raw.conteudo?.completude          ?? 0, capConteudo);
  const profund    = Math.min(raw.conteudo?.profundidade        ?? 0, capConteudo);
  const clareza    = raw.escrita?.clareza              ?? 0;
  const organizac  = raw.escrita?.organizacao          ?? 0;
  const articul    = raw.escrita?.articulacao          ?? 0;

  const nota_conteudo  = Math.round((correcao + completude + profund) / 3);
  const nota_escrita   = Math.round((clareza + organizac + articul) / 3);
  const aproveitamento = Math.round(nota_conteudo * PESO_CONTEUDO + nota_escrita * PESO_ESCRITA);
  const nivel          = nivelDeNota(nota_conteudo);

  // Justificativa consolidada — inclui a série para rastrear que a proporcionalidade foi aplicada
  const justificativa = [
    `[Série: ${serie}]`,
    `Correção (${correcao}): ${raw.conteudo?.correcao_justificativa ?? ""}`,
    `Completude (${completude}): ${raw.conteudo?.completude_justificativa ?? ""}`,
    `Profundidade (${profund}): ${raw.conteudo?.profundidade_justificativa ?? ""}`,
    `Clareza (${clareza}): ${raw.escrita?.clareza_justificativa ?? ""}`,
    `Organização (${organizac}): ${raw.escrita?.organizacao_justificativa ?? ""}`,
    `Articulação (${articul}): ${raw.escrita?.articulacao_justificativa ?? ""}`,
  ].join(" | ");

  return {
    resumo:                      raw.resumo   ?? "",
    lacunas:                     raw.lacunas  ?? [],
    sugestoes:                   raw.sugestoes ?? [],
    nivel,
    aproveitamento,
    nota_conteudo,
    nota_escrita,
    habilidade_bncc_considerada: raw.habilidade_bncc_considerada ?? null,
    justificativa,
  } as FeedbackIA;
}

// ─── Geração do relatório agregado da turma ──────────────────────────────────
export async function gerarRelatorioTurma(
  registros: { nomeAluno: string; texto: string }[],
  nomeMateria: string,
  totalAlunos: number
): Promise<RelatorioIA> {
  const percentual = Math.round((registros.length / totalAlunos) * 100);

  const registrosFormatados = registros
    .map((r, i) => `Aluno ${i + 1} (${r.nomeAluno}):\n${r.texto}`)
    .join("\n\n---\n\n");

  const resposta = await client.messages.create({
    model: MODELO,
    max_tokens: 2048,
    system: `Você é um assistente pedagógico. Analise registros de alunos e responda SEMPRE em JSON válido, sem texto antes ou depois.`,
    messages: [
      {
        role: "user",
        content: `Analise os registros de ${registros.length} alunos (de ${totalAlunos} no total) na matéria de ${nomeMateria}:

${registrosFormatados}

Responda EXCLUSIVAMENTE com este JSON:

{
  "nivelGeral": "Básico",
  "percentualRegistros": ${percentual},
  "lacunasComuns": ["lacuna recorrente 1", "lacuna recorrente 2"],
  "recomendacoes": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "resumoGeral": "3-4 frases de síntese para o professor"
}

Para "nivelGeral" use exatamente: "Básico", "Intermediário" ou "Avançado".
Responda em português do Brasil.`,
      },
    ],
  });

  const texto = resposta.content[0]?.type === "text" ? resposta.content[0].text : "{}";
  return JSON.parse(extrairJSON(texto)) as RelatorioIA;
}
