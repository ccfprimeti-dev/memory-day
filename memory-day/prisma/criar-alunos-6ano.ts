import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TURMA_ID    = "cmqi3gewb0009111msuedb41a"; // turma "6º" EF2
const SENHA_PADRAO = "PRIME@2026";

const ALUNOS = [
  { nome: "Allana Salomão Ternero",              email: "allanaternero@ccfprimebilingualschool.com.br" },
  { nome: "Arthur Sacchetin Teixeira da Costa",  email: "arthursacchetin@ccfprimebilingualschool.com.br" },
  { nome: "Beatriz Giacchetto Platzeck Schaer",  email: "beatrizschaer@ccfprimebilingualschool.com.br" },
  { nome: "Carolina Bíscaro Farias",             email: "carolinafarias@ccfprimebilingualschool.com.br" },
  { nome: "David Tudesco Berger",                email: "davidtudesco@ccfprimebilingualschool.com.br" },
  { nome: "Heloisa Numer Verde",                 email: "heloisaverde@ccfprimebilingualschool.com.br" },
  { nome: "Isabela Tarraf Conte",                email: "isabelatarraf@ccfprimebilingualschool.com.br" },
  { nome: "João Henrique Lacerda Martinelli",    email: "joaohenriquelacerda@ccfprimebilingualschool.com.br" },
  { nome: "Júlia Sarraceni da Silveira",         email: "juliasilveira@ccfprimebilingualschool.com.br" },
  { nome: "Julio Freire Pellinzzon Filho",       email: "juliofreire@ccfprimebilingualschool.com.br" },
  { nome: "Lucas Guerra Rodrigues",              email: "lucasguerra@ccfprimebilingualschool.com.br" },
  { nome: "Luísa Ceron Fratea Leal",             email: "luisaleal@ccfprimebilingualschool.com.br" },
  { nome: "Luiza Nassif Dias Ribeiro",           email: "luisanassif@ccfprimebilingualschool.com.br" },
  { nome: "Luíza Sarraceni da Silveira",         email: "luizasilveira@ccfprimebilingualschool.com.br" },
  { nome: "Manuela Tauyr Costa da Silva",        email: "manuelatauyr@ccfprimebilingualschool.com.br" },
  { nome: "Manuela Silveira Tsuchikiri",         email: "manuelasilveira@ccfprimebilingualschool.com.br" },
  { nome: "Maria Clara Lima Pechini",            email: "mariaclarapechini@ccfprimebilingualschool.com.br" },
  { nome: "Maria Clara Silva Vieira",            email: "mariaclaravieira@ccfprimebilingualschool.com.br" },
  { nome: "Maria Fernanda Cotrim Dias Siqueira", email: "mariafernandacotrim@ccfprimebilingualschool.com.br" },
  { nome: "Maria Olívia Godoy Roversi",          email: "mariaoliviagodoy@ccfprimebilingualschool.com.br" },
  { nome: "Otávio Luiz de Marchi",              email: "otaviomarchi@ccfprimebilingualschool.com.br" },
  { nome: "Theo Henrique Fim Silva",             email: "theohenrique@ccfprimebilingualschool.com.br" },
  { nome: "Valentina Brassolatti",               email: "valentinabrassolatti@ccfprimebilingualschool.com.br" },
  { nome: "Valentina Silva Fleury",              email: "valentinafleury@ccfprimebilingualschool.com.br" },
  { nome: "Valentina David Silveira",            email: "valentinasilveira@ccfprimebilingualschool.com.br" },
];

async function main() {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  console.log(`Senha hash gerada. Criando ${ALUNOS.length} alunos na turma 6º...\n`);

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
        nome:      aluno.nome,
        email:     emailNorm,
        senhaHash,
        papel:     "ALUNO",
        turmaId:   TURMA_ID,
      },
    });
    console.log(`  ✓  ${aluno.nome}`);
    criados++;
  }

  console.log(`\nConcluído: ${criados} criados, ${duplicados} já existiam.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
