/**
 * DIAGNÓSTICO — registros reais do banco avaliados pelo prompt atual.
 * Busca as entradas mais recentes com textos variados e re-analisa cada uma.
 * NÃO altera nenhum dado.
 *
 * Rode: cd memory-day && npx tsx prisma/diagnostico-real.ts
 */
import { PrismaClient } from "@prisma/client";
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

const prisma        = new PrismaClient();
const groq          = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO        = "llama-3.3-70b-versatile";
const PESO_CONTEUDO = 0.7;
const PESO_ESCRITA  = 0.3;

function nivelDeNota(n: number) {
  if (n >= 71) return "AVANCADO";
  if (n >= 41) return "INTERMEDIARIO";
  return "BASICO";
}

async function avaliar(
  textoDoAluno: string,
  nomeMateria:  string,
  nivelEnsino:  string
) {
  const labelNivel = nivelEnsino === "EF1"
    ? "Ensino Fundamental 1 (1º ao 5º ano)"
    : nivelEnsino === "EF2"
    ? "Ensino Fundamental 2 (6º ao 9º ano)"
    : "Ensino Médio";

  const blocoBncc = `Identifique as habilidades BNCC esperadas para "${nomeMateria}" no ${labelNivel}. Registre em "habilidade_bncc_considerada".`;

  const resposta = await groq.chat.completions.create({
    model: MODELO,
    temperature: 0.2,
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

  const raw = JSON.parse(
    (resposta.choices[0]?.message?.content ?? "{}")
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim()
  );

  const evidencias  = Array.isArray(raw.evidencias_concretas) ? raw.evidencias_concretas as string[] : [];
  const capConteudo = evidencias.length === 0 ? 20 : 100;

  const correcao   = Math.min(raw.conteudo?.correcao_conceitual ?? 0, capConteudo);
  const completude = Math.min(raw.conteudo?.completude          ?? 0, capConteudo);
  const profund    = Math.min(raw.conteudo?.profundidade        ?? 0, capConteudo);
  const clareza    = raw.escrita?.clareza     ?? 0;
  const organizac  = raw.escrita?.organizacao ?? 0;
  const articul    = raw.escrita?.articulacao ?? 0;

  const nota_conteudo  = Math.round((correcao + completude + profund) / 3);
  const nota_escrita   = Math.round((clareza + organizac + articul) / 3);
  const aproveitamento = Math.round(nota_conteudo * PESO_CONTEUDO + nota_escrita * PESO_ESCRITA);

  return {
    evidencias,
    capAtiva: evidencias.length === 0,
    correcao, completude, profund,
    clareza, organizac, articul,
    nota_conteudo, nota_escrita, aproveitamento,
    nivel: nivelDeNota(nota_conteudo),
    just: {
      correcao:   raw.conteudo?.correcao_justificativa   ?? "",
      completude: raw.conteudo?.completude_justificativa ?? "",
      profund:    raw.conteudo?.profundidade_justificativa ?? "",
      clareza:    raw.escrita?.clareza_justificativa     ?? "",
      organizac:  raw.escrita?.organizacao_justificativa ?? "",
      articul:    raw.escrita?.articulacao_justificativa ?? "",
    },
    resumo: raw.resumo ?? "",
  };
}

async function main() {
  // Busca entradas com textos variados — pega as mais longas e as mais curtas
  // para garantir variedade de qualidade
  const todas = await prisma.entry.findMany({
    select: {
      id:           true,
      textoDoAluno: true,
      data:         true,
      aluno: { select: { nome: true } },
      materia: {
        select: {
          nome: true,
          turma: { select: { nivelEnsino: true } },
        },
      },
    },
    orderBy: { criadoEm: "desc" },
    take: 50, // pega as 50 mais recentes para escolher bem
  });

  if (todas.length === 0) {
    console.log("Nenhuma entrada encontrada no banco.");
    await prisma.$disconnect();
    return;
  }

  // Ordena por comprimento do texto para pegar variedade real
  const ordenadas = [...todas].sort((a, b) => a.textoDoAluno.length - b.textoDoAluno.length);

  // Seleciona 5: o mais curto, um curto-médio, um médio, um longo, o mais longo
  const indices   = [0, Math.floor(ordenadas.length * 0.25), Math.floor(ordenadas.length * 0.5),
                     Math.floor(ordenadas.length * 0.75), ordenadas.length - 1];
  const selecionadas = indices.map(i => ordenadas[i]).filter(Boolean);
  // remove duplicatas por id
  const unicas = selecionadas.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i);

  console.log("\n" + "=".repeat(72));
  console.log("DIAGNÓSTICO — registros reais re-avaliados pelo prompt atual");
  console.log(`Total no banco: ${todas.length} | Selecionados: ${unicas.length}`);
  console.log("=".repeat(72));

  const resultados = [];
  for (const entry of unicas) {
    const materia     = entry.materia.nome;
    const nivelEnsino = entry.materia.turma?.nivelEnsino ?? "EM";

    console.log(`\nAvaliando "${entry.aluno.nome}" — ${materia} — ${entry.data}…`);
    const r = await avaliar(entry.textoDoAluno, materia, nivelEnsino);
    resultados.push({ entry, r });

    console.log(`\n${"─".repeat(72)}`);
    console.log(`ALUNO   : ${entry.aluno.nome}`);
    console.log(`MATÉRIA : ${materia}  |  DATA: ${entry.data}`);
    console.log(`TEXTO   : ${entry.textoDoAluno.length} caracteres`);
    console.log(`\n"${entry.textoDoAluno}"`);
    console.log(`\n📋 EVIDÊNCIAS CONCRETAS EXTRAÍDAS (${r.evidencias.length}):`);
    if (r.evidencias.length === 0) {
      console.log(`   ∅ nenhuma — trava ativa, cap=20`);
    } else {
      r.evidencias.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
    }
    console.log(`\n   CONTEÚDO (cap=${r.capAtiva ? "20 ATIVA" : "100 inativa"}):`);
    console.log(`   • correcao_conceitual : ${String(r.correcao).padStart(3)}  — ${r.just.correcao}`);
    console.log(`   • completude          : ${String(r.completude).padStart(3)}  — ${r.just.completude}`);
    console.log(`   • profundidade        : ${String(r.profund).padStart(3)}  — ${r.just.profund}`);
    console.log(`   → nota_conteudo = ${r.nota_conteudo}`);
    console.log(`\n   ESCRITA:`);
    console.log(`   • clareza             : ${String(r.clareza).padStart(3)}  — ${r.just.clareza}`);
    console.log(`   • organizacao         : ${String(r.organizac).padStart(3)}  — ${r.just.organizac}`);
    console.log(`   • articulacao         : ${String(r.articul).padStart(3)}  — ${r.just.articul}`);
    console.log(`   → nota_escrita = ${r.nota_escrita}`);
    console.log(`\n   🎯 APROVEITAMENTO = ${r.aproveitamento}%  |  NÍVEL = ${r.nivel}`);
    console.log(`   📝 ${r.resumo}`);

    await new Promise(res => setTimeout(res, 2500));
  }

  console.log("\n" + "=".repeat(72));
  console.log("TABELA RESUMO:");
  console.log("─".repeat(72));
  console.log(`${"Aluno".padEnd(20)} ${"Matéria".padEnd(18)} ${"nc".padStart(4)} ${"ne".padStart(4)} ${"Final".padStart(6)}  Nível`);
  console.log("─".repeat(72));
  for (const { entry, r } of resultados) {
    const nome    = entry.aluno.nome.slice(0, 19).padEnd(20);
    const materia = entry.materia.nome.slice(0, 17).padEnd(18);
    console.log(`${nome} ${materia} ${String(r.nota_conteudo).padStart(4)} ${String(r.nota_escrita).padStart(4)} ${String(r.aproveitamento).padStart(5)}%  ${r.nivel}`);
  }
  console.log("=".repeat(72) + "\n");

  await prisma.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
