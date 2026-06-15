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

// ─── Análise do registro individual do aluno ─────────────────────────────────
export async function analisarRegistroAluno(
  textoDoAluno: string,
  nomeMateria: string
): Promise<FeedbackIA> {
  const resposta = await groq.chat.completions.create({
    model: MODELO,
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content: `Você é um tutor educacional especializado em ${nomeMateria}. Responda SEMPRE em JSON válido, sem texto antes ou depois.`,
      },
      {
        role: "user",
        content: `Um aluno escreveu o seguinte relato do que aprendeu hoje:

"""
${textoDoAluno}
"""

Responda EXCLUSIVAMENTE com este JSON:

{
  "resumo": "2-3 frases sobre o que o aluno demonstrou entender",
  "lacunas": ["conceito ausente 1", "conceito ausente 2"],
  "sugestoes": ["sugestão de estudo 1", "sugestão de estudo 2"],
  "nivel": "INTERMEDIARIO"
}

Regras para o campo "nivel":
- "BASICO": aluno demonstrou compreensão superficial, muitas lacunas ou conceitos fundamentais ausentes.
- "INTERMEDIARIO": aluno compreendeu os pontos principais mas tem lacunas relevantes a resolver.
- "AVANCADO": aluno demonstrou domínio claro do conteúdo, com poucas ou nenhuma lacuna significativa.
Use exatamente uma dessas três palavras, sem acentos, em maiúsculas.
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
