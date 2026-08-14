import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TURMA_ID     = "cmqi3gew20006111mxu8wf2cm"; // turma "2º EM"
const SENHA_PADRAO = "PRIME@2026";

const ALUNOS = [
  { nome: "Ana Clara Martin Tavares Vulpini",   email: "anaclaratavares@ccfprimebilingualschool.com.br" },
  { nome: "Ana Júlia de Grande Almeida",        email: "anajuliaalmeida@ccfprimebilingualschool.com.br" },
  { nome: "Beatriz Alves Rocha",                email: "beatrizrocha@ccfprimebilingualschool.com.br" },
  { nome: "Eduardo de Souza Ramos Pereira",     email: "eduardoramos@ccfprimebilingualschool.com.br" },
  { nome: "Isabelly Lima Valadão Oliveira",     email: "isabellyvaladao@ccfprimebilingualschool.com.br" },
  { nome: "Leticia Zanco Torres",               email: "leticiazanco@ccfprimebilingualschool.com.br" },
  { nome: "Luís Filipe Braghirolli Santos",     email: "luisfilipesantos@ccfprimebilingualschool.com.br" },
  { nome: "Manuela Nascimento Quarteiro",       email: "manuelaquarteiro@ccfprimebilingualschool.com.br" },
  { nome: "Maria Eduarda Nishizawa Queiroz",    email: "mariaeduardaqueiroz@ccfprimebilingualschool.com.br" },
  { nome: "Mariana Tauyr Costa da Silva",       email: "marianatauyr@ccfprimebilingualschool.com.br" },
  { nome: "Mariane Valério Sanches",            email: "marianesanches@ccfprimebilingualschool.com.br" },
  { nome: "Victor Bastos Navarro da Cruz Neto", email: "victornavarro@ccfprimebilingualschool.com.br" },
];

async function main() {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  console.log(`Senha hash gerada. Criando ${ALUNOS.length} alunos na turma 2º EM...\n`);

  let criados = 0;
  let duplicados = 0;

  for (const aluno of ALUNOS) {
    const emailNorm = aluno.email.trim().toLowerCase();
    const existente = await prisma.user.findUnique({ where: { email: emailNorm }, select: { id: true } });
    if (existente) {
      console.log(`  ⚠  JÁ EXISTE: ${emailNorm}`);
      duplicados++;
      continue;
    }
    await prisma.user.create({
      data: {
        nome:     aluno.nome,
        email:    emailNorm,
        senhaHash,
        papel:    "ALUNO",
        turmaId:  TURMA_ID,
      },
    });
    console.log(`  ✓  ${aluno.nome}`);
    criados++;
  }

  console.log(`\nConcluído: ${criados} criados, ${duplicados} já existiam.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
