import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TURMA_ID     = "cmqi3gew10005111mkpel9gf2"; // turma "1º EM B"
const SENHA_PADRAO = "PRIME@2026";

const ALUNOS = [
  { nome: "Beatriz de Oliveira Geraldo",          email: "beatrizgeraldo@ccfprimebilingualschool.com.br" },
  { nome: "Beatriz Tridico Euzébio",              email: "beatriztridico@ccfprimebilingualschool.com.br" },
  { nome: "Caio Marquetto del Arco",              email: "caiomarquetto@ccfprimebilingualschool.com.br" },
  { nome: "Catharina Assenheimer Romano",         email: "catharinaromano@ccfprimebilingualschool.com.br" },
  { nome: "Cauê Valentin Faim",                   email: "cauefaim@ccfprimebilingualschool.com.br" },
  { nome: "Falipe Alves de Freitas dos Santos",   email: "felipealves@ccfprimebilingualschool.com.br" },
  { nome: "Felipe de Oliveira Taparo",            email: "felipetaparo@ccfprimebilingualschool.com.br" },
  { nome: "Heitor Zanon Mendes",                  email: "heitorzanon@ccfprimebilingualschool.com.br" },
  { nome: "Isabel Ferreira Lima",                 email: "isabelferreira@ccfprimebilingualschool.com.br" },
  { nome: "José Otávio Angelini Fantini",         email: "josefantini@ccfprimebilingualschool.com.br" },
  { nome: "Julia Tegon Morando",                  email: "juliatego@ccfprimebilingualschool.com.br" },
  { nome: "Kauã Kabbach Hissnawe",                email: "kauakabbach@ccfprimebilingualschool.com.br" },
  { nome: "Laura Queiroz Vianna",                 email: "lauraqueiroz@ccfprimebilingualschool.com.br" },
  { nome: "Leonnardo dos Santos Ferreira",        email: "leonardoferreira@ccfprimebilingualschool.com.br" },
  { nome: "Lorenna dos Santos Ferreira",          email: "lorenaferreira@ccfprimebilingualschool.com.br" },
  { nome: "Manuela Lucena Caravina",              email: "manuelacaravini@ccfprimebilingualschool.com.br" },
  { nome: "Maria Câmara Lacerda",                 email: "marialacerda@ccfprimebilingualschool.com.br" },
  { nome: "Maria Eduarda Fioratti de Oliveira",   email: "mariaeduardafioratti@ccfprimebilingualschool.com.br" },
  { nome: "Maria Valentina Martins Lustoza",      email: "mariavalentinalustoza@ccfprimebilingualschool.com.br" },
  { nome: "Mateus Giacchetto Platzeck Schaer",    email: "mateusplatzeck@ccfprimebilingualschool.com.br" },
  { nome: "Miguel Abrantes Bauab",                email: "miguelbauab@ccfprimebilingualschool.com.br" },
  { nome: "Miguel Alvarenga Ghabril",             email: "miguelalvarenga@ccfprimebilingualschool.com.br" },
  { nome: "Miguel de Oliveira Taparo",            email: "migueltaparo@ccfprimebilingualschool.com.br" },
  { nome: "Pedro Mendonça Gallo",                 email: "pedrogallo@ccfprimebilingualschool.com.br" },
  { nome: "Pietro Albanezi Dourado",              email: "pietroalbanezi@ccfprimebilingualschool.com.br" },
  { nome: "Rafaela Severian Vieira Arruda",       email: "rafaelaseverian@ccfprimebilingualschool.com.br" },
  { nome: "Sofia Gomes da Silva",                 email: "sofiagomes@ccfprimebilingualschool.com.br" },
];

async function main() {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  console.log(`Senha hash gerada. Criando ${ALUNOS.length} alunos na turma 1º EM B...\n`);

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
