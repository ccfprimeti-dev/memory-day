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
  habilidadesEsperadas?: string
): Promise<FeedbackIA> {

  const labelNivel = labelNivelEnsino(nivelEnsino);

  const blocoBncc = habilidadesEsperadas
    ? `As habilidades da BNCC a avaliar nesta aula são:\n"${habilidadesEsperadas}"\nUse esse gabarito como referência exclusiva.`
    : `Com base na BNCC, identifique as habilidades esperadas para "${nomeMateria}" no ${labelNivel} e use-as como gabarito. Informe no campo "habilidade_bncc_considerada".`;

  const resposta = await groq.chat.completions.create({
    model: MODELO,
    temperature: TEMPERATURE,
    max_tokens: 1600,
    messages: [
      {
        role: "system",
        content: `Você é um avaliador pedagógico especializado em ${nomeMateria} para o ${labelNivel} (BNCC). Avalie com precisão e rigor. Responda SEMPRE em JSON válido, sem texto antes ou depois.`,
      },
      {
        role: "user",
        content: `${blocoBncc}

O aluno escreveu o seguinte relato do que aprendeu hoje:
"""
${textoDoAluno}
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

Responda EXCLUSIVAMENTE com este JSON (sem texto fora dele):
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
  "habilidade_bncc_considerada": "<código BNCC e descrição resumida>",
  "resumo": "<2-3 frases sobre o que o aluno demonstrou entender>",
  "lacunas": ["conceito ausente 1", "conceito ausente 2"],
  "sugestoes": ["sugestão de estudo 1", "sugestão de estudo 2"]
}

Responda em português do Brasil.`,
      },
    ],
  });

  const textoResposta = resposta.choices[0]?.message?.content ?? "{}";
  const raw = JSON.parse(extrairJSON(textoResposta));

  // ── CÁLCULO EM CÓDIGO — a IA fornece os subcritérios, o código calcula tudo ──
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

  // Justificativa consolidada dos 6 subcritérios — usada para auditoria no PDF
  const justificativa = [
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
