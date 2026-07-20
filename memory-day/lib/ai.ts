// Centraliza todas as chamadas de IA — usa Groq (gratuito)
import Groq from "groq-sdk";
import type { FeedbackIA, RelatorioIA } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODELO = "llama-3.3-70b-versatile";

function extrairJSON(texto: string): string {
  return texto
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// Pesos da nota final — ajuste aqui para calibrar sem mexer no prompt
const PESO_CONTEUDO = 0.7;
const PESO_ESCRITA  = 0.3;

// Rótulo legível do nível de ensino para o prompt da IA
function labelNivelEnsino(nivelEnsino: string): string {
  if (nivelEnsino === "EF1") return "Ensino Fundamental 1 (1º ao 5º ano)";
  if (nivelEnsino === "EF2") return "Ensino Fundamental 2 (6º ao 9º ano)";
  return "Ensino Médio";
}

// ─── Análise do registro individual do aluno (com ancoragem BNCC) ─────────────
//
// habilidadesEsperadas:
//   AGORA (vazio): a IA deduz as habilidades BNCC pelo tema + série e avalia contra elas.
//   FUTURO (preenchido): texto oficial da BNCC cadastrado no banco — a IA usa como gabarito
//   exato, sem depender da própria memória. O prompt funciona nos dois casos.
export async function analisarRegistroAluno(
  textoDoAluno: string,
  nomeMateria: string,
  nivelEnsino: string = "EM",
  habilidadesEsperadas?: string
): Promise<FeedbackIA> {

  const labelNivel = labelNivelEnsino(nivelEnsino);

  // Bloco BNCC: muda conforme o parâmetro habilidadesEsperadas estar preenchido ou não
  const blocoBncc = habilidadesEsperadas
    ? `As habilidades da BNCC a avaliar nesta aula são:\n"${habilidadesEsperadas}"\nUse esse gabarito como referência exclusiva.`
    : `Com base na BNCC, identifique as habilidades esperadas para "${nomeMateria}" no ${labelNivel} e use-as como gabarito de avaliação. Informe a habilidade escolhida no campo "habilidade_bncc_considerada".`;

  const resposta = await groq.chat.completions.create({
    model: MODELO,
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content: `Você é um tutor educacional especializado em ${nomeMateria} para o ${labelNivel} (BNCC). Responda SEMPRE em JSON válido, sem texto antes ou depois.`,
      },
      {
        role: "user",
        content: `${blocoBncc}

O aluno escreveu o seguinte relato do que aprendeu hoje:
"""
${textoDoAluno}
"""

Avalie usando a régua abaixo.

NOTA DE CONTEÚDO (0-100) — domínio e profundidade em relação à BNCC:
  0-20  → texto ausente, sem sentido ou com erros conceituais graves e fundamentais
  21-40 → noções iniciais presentes mas com erros conceituais relevantes
  41-60 → nível básico esperado para a série, com lacunas mas sem erros graves
  61-80 → bom domínio do conteúdo, poucas lacunas, profundidade compatível com a série
  81-100 → domínio completo e aprofundado, sem lacunas significativas

NOTA DE ESCRITA (0-100) — clareza, organização e articulação:
  0-20  → incompreensível ou sem estrutura
  21-40 → compreensível mas muito desorganizado
  41-60 → claro mas simples, sem articulação entre ideias
  61-80 → bem estruturado e articulado, linguagem adequada
  81-100 → excelente clareza, coesão e precisão

Responda EXCLUSIVAMENTE com este JSON (sem texto fora dele):
{
  "aproveitamento": <inteiro 0-100; calcule: round(nota_conteudo × ${PESO_CONTEUDO} + nota_escrita × ${PESO_ESCRITA})>,
  "nota_conteudo": <inteiro 0-100>,
  "nota_escrita": <inteiro 0-100>,
  "habilidade_bncc_considerada": "<código BNCC (ex: EM13CNT201) e descrição resumida da habilidade usada como gabarito>",
  "justificativa": "<2-3 frases: o que o aluno acertou e o que faltou — obrigatório para auditoria>",
  "resumo": "<2-3 frases sobre o que o aluno demonstrou entender>",
  "lacunas": ["conceito ausente 1", "conceito ausente 2"],
  "sugestoes": ["sugestão de estudo 1", "sugestão de estudo 2"],
  "nivel": "<BASICO|INTERMEDIARIO|AVANCADO>"
}

Regra para "nivel" (baseada em nota_conteudo):
  0-40  → BASICO
  41-70 → INTERMEDIARIO
  71-100 → AVANCADO

Seja construtivo. Responda em português do Brasil.`,
      },
    ],
  });

  const texto = resposta.choices[0]?.message?.content ?? "{}";
  return JSON.parse(extrairJSON(texto)) as FeedbackIA;
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
