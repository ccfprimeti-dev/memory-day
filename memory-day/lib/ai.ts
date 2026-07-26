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
    ? `Habilidades BNCC desta aula: "${habilidadesEsperadas}". Use como gabarito exclusivo.`
    : `Identifique as habilidades BNCC esperadas para "${nomeMateria}" no ${labelNivel}. Registre em "habilidade_bncc_considerada".`;

  const resposta = await groq.chat.completions.create({
    model: MODELO,
    temperature: TEMPERATURE,
    max_tokens: 1000,
    messages: [
      {
        role: "system",
        content: `Avaliador pedagógico de ${nomeMateria} — ${labelNivel} (BNCC). Você avalia O TEXTO DO ALUNO como evidência do aprendizado DELE — não avalia o tema, a aula nem o material didático. Responda SOMENTE em JSON válido.`,
      },
      {
        role: "user",
        content: `${blocoBncc}

Texto do aluno:
"""
${textoDoAluno}
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
