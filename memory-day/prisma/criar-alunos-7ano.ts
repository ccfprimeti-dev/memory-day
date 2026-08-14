import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TURMA_ID     = "cmqi3gewa0008111ml21npolq"; // turma "7º" EF2
const SENHA_PADRAO = "PRIME@2026";

const ALUNOS = [
  { nome: "Bárbara dos Santos Ferreira",            email: "barbaraferreira@ccfprimebilingualschool.com.br" },
  { nome: "Bernardo Boeira e Borges",               email: "bernardoborges@ccfprimebilingualschool.com.br" },
  { nome: "Bianca dos Santos Ferreira",             email: "biancaferreira@ccfprimebilingualschool.com.br" },
  { nome: "Fernanda Murad Barganian",               email: "fernandabarganian@ccfprimebilingualschool.com.br" },
  { nome: "Gabriela Faria Rogozyk",                 email: "gabrielarogozyk@ccfprimebilingualschool.com.br" },
  { nome: "Isabela de Mauro Romero",                email: "isabelaromero@ccfprimebilingualschool.com.br" },
  { nome: "Laura Maia Demenciano",                  email: "laurademenciano@ccfprimebilingualschool.com.br" },
  { nome: "Lucas Buck Ruiz Colenghi",               email: "lucasbuck@ccfprimebilingualschool.com.br" },
  { nome: "Manuela de Mauro Romero",                email: "manuelaromero@ccfprimebilingualschool.com.br" },
  { nome: "Maria Fernanda de Giorgio Caetano",      email: "mariafernandacaetano@ccfprimebilingualschool.com.br" },
  { nome: "Maria Luísa Freitas dos Santos",         email: "marialuisafreitas@ccfprimebilingualschool.com.br" },
  { nome: "Maria Sophia Brunca Tomaz Bayerlein",    email: "mariasophiabrunca@ccfprimebilingualschool.com.br" },
  { nome: "Maria Tereza L. Castro Nunes de Lima",   email: "mariaterezacastro@ccfprimebilingualschool.com.br" },
  { nome: "Mariana Villa Longo",                    email: "marianavilla@ccfprimebilingualschool.com.br" },
  { nome: "Raphael Pereira Pradela",                email: "raphaelpradela@ccfprimebilingualschool.com.br" },
  { nome: "Sophia Akemi Pinheiro Vittorel",         email: "sophiaakemi@ccfprimebilingualschool.com.br" },
  { nome: "Sophie Lima Valadão Oliveira",           email: "sophievaladao@ccfprimebilingualschool.com.br" },
  { nome: "Stéfani Luiza Zambon",                   email: "stefaniambon@ccfprimebilingualschool.com.br" },
  { nome: "Valentina Campos de Carvalho",           email: "valentinacampos@ccfprimebilingualschool.com.br" },
];

async function main() {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  console.log(`Senha hash gerada. Criando ${ALUNOS.length} alunos na turma 7º...\n`);

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
