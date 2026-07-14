/**
 * Seed de teste: gera registros de Memory Day para os 13 alunos da 2º EM.
 * Distribui os alunos em 3 grupos de qualidade de texto (básico/médio/avançado).
 * Cada registro passa pela mesma IA do sistema real (analisarRegistroAluno).
 *
 * Executar:
 *   cd memory-day
 *   npx tsx prisma/seed-test-entries.ts
 *
 * Para limpar depois:
 *   npx tsx prisma/clean-test-entries.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient, Prisma } from "@prisma/client";

// Carrega o .env manualmente (dotenv não está instalado como dependência direta)
try {
  const env = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* .env não encontrado */ }
import { analisarRegistroAluno } from "../lib/ai";

const prisma = new PrismaClient();

// Atraso entre chamadas de IA para respeitar o rate limit do Groq (30 req/min)
const DELAY_MS = 2200;

// ── Alunos e níveis pretendidos ───────────────────────────────────────────────
type NivelGrupo = "BASICO" | "MEDIO" | "AVANCADO";

const ALUNOS: { id: string; nome: string; nivel: NivelGrupo }[] = [
  // Básico (~4 alunos) — textos curtos, rasos, com erros conceituais
  { id: "cmr0jnnf90005huybq755q8x0", nome: "Eduardo",           nivel: "BASICO"   },
  { id: "cmqif1l9q0003wz61vpmta04i", nome: "Guilherme",         nivel: "BASICO"   },
  { id: "cmr0jof040007huybjrjianiu", nome: "Luís Felipe",       nivel: "BASICO"   },
  { id: "cmr0j8i0x0007gxxim60zqm3y", nome: "Mariana",          nivel: "BASICO"   },
  // Médio (~5 alunos) — corretos mas sem profundidade, algumas lacunas
  { id: "cmr0j41j80001gxxi5vwp3ehl", nome: "Ana Clara Martin",   nivel: "MEDIO"   },
  { id: "cmr0j5z6t0005gxxijhp2vffh", nome: "Isabelly Lima",      nivel: "MEDIO"   },
  { id: "cmr0jm50s0001huybb95bf4fi", nome: "Manuela Nascimento", nivel: "MEDIO"   },
  { id: "cmr0j4yys0003gxxit25mlxu2", nome: "Mariane Sanches",    nivel: "MEDIO"   },
  { id: "cmr0jch26000bgxxilnrzu158", nome: "Victor Bastos",      nivel: "MEDIO"   },
  // Avançado (~4 alunos) — completos, corretos, com aplicação
  { id: "cmr0jbh790009gxxi5rrc02l7", nome: "Ana Julia de Grande",  nivel: "AVANCADO" },
  { id: "cmr0jmwbj0003huybbdwtep9s", nome: "Beatriz Alves Rocha",  nivel: "AVANCADO" },
  { id: "cmqpcqmcb000hz6mc7u5i75uf", nome: "Letícia Zanco Torres", nivel: "AVANCADO" },
  { id: "cmr0jd733000dgxxipvvgjxo9", nome: "Maria Eduarda",        nivel: "AVANCADO" },
];

// As 5 matérias da grade diária — IDs confirmados no banco
const MATERIAS = [
  { id: "cmqi3gslo006k111mfncdse7x", nome: "Grammar"   }, // Português → Grammar
  { id: "cmqi3gti00070111mu3azhnb4", nome: "Algebra"   }, // Álgebra
  { id: "cmqi3gu2i007a111mrxr3sua8", nome: "Physics 1" }, // Física → Physics 1
  { id: "cmqi3gtuf0076111m4ovvuda8", nome: "Biology 1" }, // Biologia 1
  { id: "cmqi3gtm00072111mxsnylf7n", nome: "Geometry"  }, // Geometria
];

// ── Textos por matéria e nível (3 variantes — rotacionam pelos 10 dias) ───────
// Cada aluno mantém o mesmo padrão de qualidade em todos os dias/matérias.
const TEXTOS: Record<string, Record<NivelGrupo, string[]>> = {
  Grammar: {
    BASICO: [
      "Tivemos aula de gramática. Aprendemos sobre verbos e substantivos. Achei difícil entender a diferença entre eles mas tentei prestar atenção.",
      "A aula foi sobre classes gramaticais. Tem vários tipos de palavras no português. Não lembro direito a diferença entre pronome e artigo.",
      "Estudamos adjetivos e advérbios hoje. Acho que adjetivo é o que qualifica o substantivo. A professora explicou mas ainda fiquei confuso sobre quando usar cada um.",
    ],
    MEDIO: [
      "Estudamos os verbos transitivos e intransitivos. Verbos transitivos precisam de complemento para fazer sentido, enquanto os intransitivos não. Tenho dúvida sobre os verbos de ligação e quando usar crase após certos verbos.",
      "A aula foi sobre concordância verbal e nominal. O verbo concorda com o sujeito em número e pessoa, e o adjetivo concorda com o substantivo em gênero e número. Ainda tenho dificuldade com sujeito coletivo e expressões partitivas.",
      "Aprendemos análise sintática: sujeito, predicado, objeto direto e indireto. Consigo identificar sujeito simples e composto. Ainda confundo objeto direto e indireto em orações com dois complementos.",
    ],
    AVANCADO: [
      "Estudamos orações subordinadas adjetivas restritivas e explicativas. As restritivas delimitam o sentido do antecedente sem vírgulas e são essenciais ao significado; as explicativas acrescentam informação acessória com vírgulas. Apliquei essa distinção na reescrita de um parágrafo e percebi como a escolha entre as duas muda a precisão e o estilo. Domino a diferença e sei aplicar em produção textual com segurança.",
      "Aprofundamos os mecanismos de coesão textual: referenciação, substituição, elipse e conjunção. Identifiquei como pronomes relativos funcionam como elos coesivos, evitando repetições. Apliquei 'o qual', 'cujo' e 'onde' corretamente num texto dissertativo próprio, garantindo fluidez sem ambiguidade. A análise de texto jornalístico foi útil para perceber os usos mais sofisticados.",
      "A aula foi sobre regência verbal e nominal. Analisei pares como 'obedecer a' (objeto indireto) vs usos coloquiais incorretos, e 'informar alguém de algo' (bitransitivo). Relacionei a regência com o uso da crase e analisei trechos de redações do ENEM para identificar desvios. Consigo corrigir esses desvios com fundamento gramatical claro e justificativa precisa.",
    ],
  },
  Algebra: {
    BASICO: [
      "Álgebra foi difícil hoje. Aprendi que x é um número que a gente não sabe. Resolvi x + 3 = 7 e encontrei x = 4 mas não entendi bem o processo todo.",
      "Tivemos exercícios de equações. Tentei resolver mas errei algumas porque confundo os sinais quando passo o número pro outro lado da equação.",
      "A aula foi de equações do primeiro grau. Sei que preciso encontrar o valor de x. Quando a conta é simples consigo, mas com frações fico perdido.",
    ],
    MEDIO: [
      "Resolvemos sistemas de equações de primeiro grau. Usei o método da substituição: isolar uma variável e substituir na outra equação. Encontrei os pares (x, y) corretamente na maioria dos exercícios. Tenho dificuldade no método da adição quando os coeficientes não são opostos.",
      "Estudamos fatoração de polinômios: fator comum, agrupamento e diferença de quadrados. Consigo fatorar ax² + bx e identificar a² - b² = (a+b)(a-b). Tenho dificuldade com trinômios e fatorações por agrupamento com quatro termos.",
      "Aprendemos funções afins: y = ax + b representa uma reta no plano, 'a' é o coeficiente angular e 'b' o intercepto. Calculei a função dados dois pontos e tracei o gráfico. Ainda confundo quando a função é crescente ou decrescente e tenho dificuldade em problemas de interseção de retas.",
    ],
    AVANCADO: [
      "Estudamos funções quadráticas com foco em otimização. Deduzi as coordenadas do vértice V = (-b/2a, -Δ/4a) a partir da forma canônica e interpretei geometricamente o discriminante: Δ > 0 (duas raízes reais), Δ = 0 (raiz dupla), Δ < 0 (sem raízes reais). Resolvi um problema de maximização de lucro e outro de minimização de custo, encontrando o ponto ótimo algebricamente e verificando graficamente.",
      "Aprofundamos progressões geométricas e suas aplicações. Deduzi a fórmula da soma de uma PG infinita convergente a partir do limite da soma parcial quando n→∞. Apliquei em dízimas periódicas para convertê-las em frações exatas e em problemas de juros compostos. Calculei o montante M = C(1+i)^n e o tempo para dobrar capital usando logaritmos.",
      "Estudamos logaritmos: definição, propriedades (produto, quociente e potência) e equações logarítmicas e exponenciais. Demonstrei as três propriedades a partir da definição e as apliquei para simplificar expressões. Resolvi log₂(x²-1) = 3 verificando as condições de existência. Relacionei logaritmos com a escala Richter e com o cálculo de pH.",
    ],
  },
  "Physics 1": {
    BASICO: [
      "Física foi sobre velocidade. Aprendi que velocidade é a distância dividida pelo tempo. Não entendi muito bem o que acontece quando a velocidade muda ao longo do tempo.",
      "A aula foi sobre cinemática. O professor falou de MRU e MRUV. Sei que MRU é movimento com velocidade constante mas não lembro a diferença para o MRUV.",
      "Estudamos força e movimento. Newton tem três leis. Só lembro que a segunda é F = ma mas não sei como usar direito quando tem mais de uma força.",
    ],
    MEDIO: [
      "Estudamos o MRUV. Aprendi a equação horária da posição s = s₀ + v₀t + ½at² e a equação de Torricelli v² = v₀² + 2aΔs. Calculei a distância de frenagem de um carro corretamente, mas ainda fico em dúvida sobre quando a aceleração deve ter sinal negativo.",
      "Aplicamos as Leis de Newton com atrito. Calculei a força de atrito cinético como μN e encontrei a aceleração resultante. Entendi que a força normal nem sempre é igual ao peso. Tenho dificuldade em decompor forças em planos inclinados usando seno e cosseno.",
      "Estudamos energia mecânica: cinética (Ec = mv²/2) e potencial gravitacional (Ep = mgh). Entendi a conservação da energia em sistemas sem atrito e calculei a velocidade de uma bola em queda livre. Ainda confundo quando a energia mecânica não se conserva, especialmente com atrito.",
    ],
    AVANCADO: [
      "Analisamos sistemas de corpos em contato e no fio: sistema de Atwood e blocos em plano inclinado. Para cada corpo apliquei a segunda lei de Newton com todas as forças corretas (peso, normal, tensão, atrito). Calculei a tensão no fio do sistema de Atwood e verifiquei que ela é a mesma nos dois lados (fio inextensível sem massa). Resolvi um sistema com três corpos conectados, encontrando aceleração e tensões internas.",
      "Aprofundamos conservação de momento linear em colisões. Diferenciei colisões elásticas (conservam p e Ec) de inelásticas (conservam apenas p). Calculei as velocidades pós-colisão em ambos os casos e verifiquei algebricamente a conservação. Apliquei em uma explosão: corpo em repouso se fragmenta em dois — encontrei as velocidades apenas pela conservação de momento.",
      "Estudamos gravitação universal e órbitas circulares. Deduzi a expressão g = GM/R² e calculei g em diferentes altitudes. Relacionei a força gravitacional como força centrípeta para obter a velocidade orbital e o período. Calculei a velocidade de escape v = √(2GM/R) da condição de energia mecânica total igual a zero e verifiquei a Lei de Kepler (T² ∝ a³) numericamente.",
    ],
  },
  "Biology 1": {
    BASICO: [
      "Biologia foi sobre células. A célula tem membrana, núcleo e citoplasma. Não lembro o que cada parte faz direito. Achei interessante mas a aula foi difícil.",
      "A aula foi sobre DNA. O professor disse que o DNA fica no núcleo e guarda as informações genéticas. Não entendi como o DNA vira proteína ou como funciona.",
      "Estudamos as organelas. Sei que a mitocôndria produz energia. Das outras organelas não lembro o nome nem a função. A aula foi bem rápida.",
    ],
    MEDIO: [
      "Estudamos a divisão celular: a mitose e suas fases. Prófase é quando os cromossomos condensam e o fuso se forma. Metáfase é o alinhamento. Anáfase é a separação das cromátides. Telófase finaliza com a citocinese. Entendo o processo geral mas ainda confundo com meiose nos detalhes das fases finais.",
      "A aula foi sobre metabolismo celular: respiração aeróbica em três etapas. Glicólise no citoplasma (2 ATP), ciclo de Krebs na matriz mitocondrial e cadeia respiratória na membrana interna (saldo final ~36-38 ATP). Sei que fermentação rende apenas 2 ATP. Tenho dificuldade em detalhar o ciclo de Krebs.",
      "Estudamos os tecidos animais. Epitelial: cobertura e absorção. Conjuntivo: sustentação e preenchimento (ósseo, cartilaginoso, sanguíneo). Muscular: contração (liso, estriado esquelético, cardíaco). Nervoso: condução de impulsos. Entendo as funções gerais mas tenho dificuldade em diferenciar os subtipos do tecido conjuntivo.",
    ],
    AVANCADO: [
      "Aprofundamos a replicação do DNA e seus mecanismos de fidelidade. O modelo semiconservativo foi comprovado pelo experimento de Meselson-Stahl com isótopos de nitrogênio. As enzimas: helicase (abre a hélice), primase (sintetiza o primer), DNA polimerase III (sintetiza 5'→3') e ligase (une fragmentos de Okazaki). A fita retardatária é descontínua por restrição direcional da polimerase. A exonuclease corretora reduz erros a ~1 em 10⁹ pares de base.",
      "Estudamos o operon lac como modelo de regulação gênica em procariotos. Sem lactose, o repressor se liga ao operador e bloqueia os genes lacZ, lacY, lacA. Com lactose, a alolactose inativa o repressor, liberando a transcrição das enzimas. Esse mecanismo é energeticamente eficiente: a célula só produz as enzimas quando o substrato está disponível. Relacionei com o conceito geral de repressão negativa e com a regulação positiva pelo AMPc-CAP.",
      "Aprofundamos meiose com foco na geração de variabilidade genética. O crossing-over na prófase I troca segmentos entre cromossomos homólogos, criando combinações alélicas novas. A segregação independente na anáfase I gera 2²³ ≈ 8 milhões de combinações por gameta humano. Calculei a probabilidade de dois irmãos receberem a mesma combinação alélica e mostrei que é praticamente nula. Relacionei com adaptação evolutiva das populações.",
    ],
  },
  Geometry: {
    BASICO: [
      "Geometria foi sobre formas geométricas. Aprendi que triângulo tem 3 lados e quadrado tem 4 lados iguais. Tentei calcular a área mas errei na do círculo.",
      "A aula foi sobre perímetro e área. Sei que perímetro é a soma dos lados. Não lembro a fórmula de área do retângulo sem olhar no caderno.",
      "Estudamos ângulos hoje. Ângulo reto é 90 graus. Não entendi bem a diferença entre ângulos complementares e suplementares. Preciso revisar.",
    ],
    MEDIO: [
      "Estudamos trigonometria no triângulo retângulo: seno, cosseno e tangente. As razões são sen = op/hip, cos = adj/hip, tan = op/adj. Usei Pitágoras para encontrar o lado faltante antes de calcular. Tenho dificuldade em identificar qual razão usar dependendo dos dados e do ângulo desconhecido.",
      "Calculamos áreas e volumes de sólidos: cilindro (πr²h), cone (πr²h/3) e esfera (4πr³/3). Entendo que o volume do cone é 1/3 do cilindro de mesma base e altura. Tenho dificuldade em calcular volumes de sólidos compostos quando duas formas se sobrepõem.",
      "Vimos geometria analítica: equação da reta, coeficiente angular e ponto de interseção. Calculei m = (y₂-y₁)/(x₂-x₁) e a equação reduzida y = mx + n. Resolvi interseção de duas retas por substituição. Tenho dificuldade em interpretar o coeficiente linear geometricamente e em tratar retas paralelas e perpendiculares.",
    ],
    AVANCADO: [
      "Aprofundamos cônicas: circunferência, parábola, elipse e hipérbole. Deduzi a equação da circunferência a partir da definição de lugar geométrico e identifiquei o tipo de cônica pela forma geral Ax² + Cy² + Dx + Ey + F = 0 usando os coeficientes A e C. Resolvi problemas de tangência entre reta e circunferência comparando a distância do centro à reta com o raio, e determinei pontos de interseção algebricamente.",
      "Estudamos transformações isométricas: translação, rotação e reflexão. Representei cada uma como função T: ℝ² → ℝ² e verifiquei que preservam distâncias e ângulos. Compus duas reflexões em eixos paralelos e demonstrei algebricamente que o resultado equivale a uma translação de módulo duplo da distância entre os eixos. Relacionei com grupos de simetria de polígonos regulares e pavimentações do plano.",
      "Estudamos vetores no espaço R³: produto escalar e produto vetorial. Calculei u × v pelo determinante 3×3 com os versores i, j, k e verifiquei que é perpendicular a ambos (produto escalar nulo). Usei o produto vetorial para calcular a área do paralelogramo formado pelos vetores e para determinar a equação do plano por três pontos não colineares. Resolvi a distância entre retas reversas no espaço usando o produto misto.",
    ],
  },
};

// ── Utilitários ───────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// Gera strings YYYY-MM-DD para os últimos N dias no fuso de São Paulo
function ultimosDias(n: number): string[] {
  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" });
  const datas: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    datas.push(fmt.format(d));
  }
  return datas;
}

// Replica o critério de agregação do sistema (lib/nivelUtils.ts): MODA, desempate = mais alto
function agregarNiveis(niveis: (string | null)[]): string | null {
  const ORDEM = ["AVANCADO", "INTERMEDIARIO", "BASICO"] as const;
  const validos = niveis.filter((n): n is string =>
    n === "BASICO" || n === "INTERMEDIARIO" || n === "AVANCADO"
  );
  if (validos.length === 0) return null;
  const contagem: Record<string, number> = { BASICO: 0, INTERMEDIARIO: 0, AVANCADO: 0 };
  for (const n of validos) contagem[n]++;
  const maxCount = Math.max(...Object.values(contagem));
  return ORDEM.find((n) => contagem[n] === maxCount) ?? null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const NIVEIS_VALIDOS = ["BASICO", "INTERMEDIARIO", "AVANCADO"] as const;
  const datas = ultimosDias(10);
  const total = ALUNOS.length * datas.length * MATERIAS.length; // 650
  let feitos = 0;

  // Rastreia todos os nivelIA por aluno para a tabela final
  const nivelPorAluno: Record<string, (string | null)[]> = {};
  for (const a of ALUNOS) nivelPorAluno[a.id] = [];

  console.log(`\n🚀 Iniciando geração de ${total} registros`);
  console.log(`   ${ALUNOS.length} alunos × ${datas.length} dias × ${MATERIAS.length} matérias`);
  console.log(`   Período: ${datas[0]} → ${datas[datas.length - 1]}`);
  console.log(`   Delay entre chamadas de IA: ${DELAY_MS}ms`);
  console.log(`   Estimativa: ~${Math.ceil((total * DELAY_MS) / 60000)} minutos\n`);

  for (const aluno of ALUNOS) {
    console.log(`\n👤 ${aluno.nome} [pretendido: ${aluno.nivel}]`);

    for (let dIdx = 0; dIdx < datas.length; dIdx++) {
      const data = datas[dIdx];

      for (let mIdx = 0; mIdx < MATERIAS.length; mIdx++) {
        const materia = MATERIAS[mIdx];

        // Rotaciona as 3 variantes de texto pelo índice do dia
        const variantes = TEXTOS[materia.nome][aluno.nivel];
        const texto = variantes[dIdx % variantes.length];

        feitos++;

        // Pula se já existe no banco com nivelIA preenchido (retomada após interrupção)
        const jaExiste = await prisma.entry.findUnique({
          where: { alunoId_subjectId_data: { alunoId: aluno.id, subjectId: materia.id, data } },
          select: { nivelIA: true },
        });
        if (jaExiste?.nivelIA) {
          nivelPorAluno[aluno.id].push(jaExiste.nivelIA);
          process.stdout.write(
            `  [${String(feitos).padStart(3)}/${total}] ${data} · ${materia.nome.padEnd(10)} → ${jaExiste.nivelIA} (já existe — pulando)\n`
          );
          continue;
        }

        process.stdout.write(
          `  [${String(feitos).padStart(3)}/${total}] ${data} · ${materia.nome.padEnd(10)} → `
        );

        // Chama IA com uma tentativa de retry em caso de falha
        let nivelIA: string | null = null;
        let feedbackIA = "";
        let lacunasIA: object = {};

        try {
          const analise = await analisarRegistroAluno(texto, materia.nome);
          feedbackIA = analise.resumo ?? "";
          lacunasIA  = analise;
          nivelIA    = (NIVEIS_VALIDOS as readonly string[]).includes(analise.nivel)
            ? analise.nivel
            : null;
        } catch {
          // Espera 5s e tenta mais uma vez antes de desistir
          await sleep(5000);
          try {
            const analise = await analisarRegistroAluno(texto, materia.nome);
            feedbackIA = analise.resumo ?? "";
            lacunasIA  = analise;
            nivelIA    = (NIVEIS_VALIDOS as readonly string[]).includes(analise.nivel)
              ? analise.nivel
              : null;
          } catch (e2) {
            process.stdout.write("❌ IA falhou após retry (salvo sem nível)\n");
            console.error("   Erro:", e2);
          }
        }

        nivelPorAluno[aluno.id].push(nivelIA);
        process.stdout.write(`${nivelIA ?? "null"}\n`);

        await prisma.entry.upsert({
          where: {
            alunoId_subjectId_data: { alunoId: aluno.id, subjectId: materia.id, data },
          },
          update: {
            textoDoAluno: texto,
            feedbackIA,
            lacunasIA:    lacunasIA as Prisma.InputJsonValue,
            nivelIA,
          },
          create: {
            alunoId:         aluno.id,
            subjectId:       materia.id,
            data,
            textoDoAluno:    texto,
            feedbackIA,
            lacunasIA:       lacunasIA as Prisma.InputJsonValue,
            nivelIA,
            quantidadeAulas: 1,
          },
        });

        // Aguarda para respeitar o rate limit do Groq
        if (feitos < total) await sleep(DELAY_MS);
      }
    }
  }

  // ── Tabela de resultados ───────────────────────────────────────────────────
  console.log("\n\n═══════════════════════════════════════════════════════════════════════════");
  console.log("  RESULTADO FINAL — Nível pretendido vs classificado pela IA");
  console.log("═══════════════════════════════════════════════════════════════════════════");
  console.log(
    "  " + "Nome".padEnd(26) +
    "Pretendido".padEnd(18) +
    "IA Classificou".padEnd(18) +
    "Bateu?"
  );
  console.log("  " + "─".repeat(73));

  let acertos = 0;
  for (const aluno of ALUNOS) {
    const classif = agregarNiveis(nivelPorAluno[aluno.id]);
    // "MEDIO" pretendido equivale a "INTERMEDIARIO" da IA
    const pretendidoIA = aluno.nivel === "MEDIO" ? "INTERMEDIARIO" : aluno.nivel;
    const bateu = classif === pretendidoIA;
    if (bateu) acertos++;
    console.log(
      "  " + aluno.nome.padEnd(26) +
      pretendidoIA.padEnd(18) +
      (classif ?? "null").padEnd(18) +
      (bateu ? "✅ Sim" : "❌ Não")
    );
  }

  console.log("  " + "─".repeat(73));
  console.log(`  Acertos: ${acertos}/${ALUNOS.length}`);
  console.log("═══════════════════════════════════════════════════════════════════════════\n");
  console.log("✅ Concluído!");
  console.log("   Para limpar esses dados de teste: npx tsx prisma/clean-test-entries.ts\n");
}

main()
  .catch((e) => { console.error("\n❌ Erro fatal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
