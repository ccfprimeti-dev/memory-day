// Centraliza todas as chamadas de IA — usa Groq (gratuito)
import Groq from "groq-sdk";
import type { FeedbackIA, RelatorioIA, NivelIA } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODELO = "llama-3.3-70b-versatile";

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

// Régua de profundidade calibrada à série — evita exigir do 6º ano o que se espera do 2º EM
function profundidadeEsperada(nivelEnsino: string, nomeTurma?: string): string {
  const num = nomeTurma ? (parseInt(nomeTurma.match(/^(\d+)/)?.[1] ?? "0") || 0) : 0;
  if (nivelEnsino === "EM") {
    if (num >= 3) return "domínio sólido dos conceitos + relações entre eles + análise crítica ou comparativa";
    if (num >= 2) return "domínio conceitual + relações entre conceitos + algum raciocínio analítico";
    return "definição correta + relações entre conceitos + exemplo ou aplicação prática";
  }
  if (num >= 9) return "definição + relação entre conceitos + exemplos aplicados ao cotidiano";
  if (num >= 7) return "definição + pelo menos uma relação ou exemplo contextualizado";
  // 6º ano (e fallback EF1/EF2 sem número)
  return "definição simples + um exemplo ou relação básica — já é boa elaboração para essa série";
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

  const serie      = labelSerie(nivelEnsino, nomeTurma);      // "6º ano do Fundamental 2"
  const profDepth  = profundidadeEsperada(nivelEnsino, nomeTurma);

  const blocoBncc = habilidadesEsperadas
    ? `Habilidades BNCC desta aula: "${habilidadesEsperadas}". Use como gabarito exclusivo.`
    : `Identifique as habilidades BNCC esperadas para "${nomeMateria}" especificamente no ${serie} (use as competências do ${serie} na BNCC, não do nível inteiro). Registre em "habilidade_bncc_considerada".`;

  const resposta = await groq.chat.completions.create({
    model: MODELO,
    temperature: TEMPERATURE,
    max_tokens: 1000,
    messages: [
      {
        role: "system",
        content:
`Você avalia diários de aula de alunos do ${serie}.
CRITÉRIO CENTRAL: o aluno descreveu bem o que viveu e aprendeu na aula de hoje?
PROPORCIONALIDADE POR SÉRIE: avalie o que é ESPERADO para um aluno do ${serie}. Ajuste o rigor exatamente a essa série — não exija de um 6º ano o que se espera de um 2º EM, e não seja leniente com um 2º EM aplicando critérios de anos anteriores. O mesmo texto deve receber nota MAIOR quando escrito por aluno de série menor (atende bem a expectativa da série) e nota MENOR para aluno de série maior (para a série dele, é raso).
Responda SOMENTE em JSON válido.`,
      },
      {
        role: "user",
        content: `${blocoBncc}

Texto do aluno (${serie}):
"""
${textoDoAluno}
"""

CONTEXTO: Este é um diário de aula, não uma prova. Avalie a qualidade do registro considerando o que é esperado de um aluno do ${serie}. Não exija rigor acadêmico formal — exija que o aluno tenha descrito a aula com especificidade proporcional à sua série.

RÉGUA CENTRAL (calibrada para o ${serie}):
• Descreveu bem a aula → conteúdo ALTO (nomeou tópicos, conceitos, fórmulas, atividades ou exemplos específicos E elaborou minimamente, no nível esperado para o ${serie})
• Descreveu parcialmente → conteúdo MÉDIO (nomeou tópicos mas explicou pouco, ou explicou bem mas cobriu pouca coisa)
• Não descreveu ou foi vago → conteúdo BAIXO ("aprendi bastante", "foi boa aula" sem nada específico)

PASSO 1 — OBRIGATÓRIO antes de pontuar:
Liste em "evidencias_concretas" os elementos ESPECÍFICOS que o aluno mencionou: nomes de tópicos, conceitos, fórmulas, atividades, obras, autores, exemplos. Qualquer menção específica ao conteúdo da aula conta. Afirmações puramente genéricas não entram.
REGRA INVIOLÁVEL: lista vazia → as três notas de CONTEÚDO devem ser ≤ 20.

PASSO 2 — Pontue (valores irregulares: ex. 37, 63, 78 — nunca só múltiplos de 10):

CONTEÚDO (avalie sempre em relação ao que é esperado do ${serie}):
• correcao_conceitual: o que o aluno mencionou está correto no contexto da matéria? Lista vazia → 0. Erros graves → baixo. Correto e específico → alto.
• completude: considerando o que o PRÓPRIO TEXTO sugere que foi a aula de hoje, o aluno cobriu bem? Lista vazia → 0. Cobriu pouco → baixo/médio. Cobriu bem a aula → alto.
• profundidade: o aluno foi além de apenas listar tópicos? Para o ${serie}: ${profDepth}. Lista vazia → 0. Só listou nomes → baixo. Atingiu o esperado para a série → médio/alto. Superou o esperado → alto.

ESCRITA (avalie independente do conteúdo):
• clareza: texto compreensível? (0=confuso, 100=cristalino)
• organizacao: sequência lógica? (0=caótico, 100=organizado)
• articulacao: palavras próprias? (0=termos colados, 100=texto autoral)

1 frase de justificativa por subcritério — mencione a série avaliada quando relevante.

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

  const textoResposta = resposta.choices[0]?.message?.content ?? "{}";
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

  const resposta = await groq.chat.completions.create({
    model: MODELO,
    max_tokens: 2048,
    messages: [
      {
        role: "system",
        content: `Você é um assistente pedagógico. Analise registros de alunos e responda SEMPRE em JSON válido, sem texto antes ou depois.`,
      },
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

  const texto = resposta.choices[0]?.message?.content ?? "{}";
  return JSON.parse(extrairJSON(texto)) as RelatorioIA;
}
