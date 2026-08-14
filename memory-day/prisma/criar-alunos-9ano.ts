import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TURMA_ID     = "cmqi3gew80007111mdksawwtv"; // turma "9º"
const SENHA_PADRAO = "PRIME@2026";

const ALUNOS = [
  { nome: "Anna Luísa Bonardi Macedo",              email: "analuisamacedo@ccfprimebilingualschool.com.br" },
  { nome: "Daniel Faria Rogozyk",                   email: "danielrogozyk@ccfprimebilingualschool.com.br" },
  { nome: "Felipe Ramazzini Braga Mariani",         email: "feliperamazzini@ccfprimebilingualschool.com.br" },
  { nome: "Julia Silveira Agostinelli",             email: "juliaagostinelli@ccfprimebilingualschool.com.br" },
  { nome: "Julia Angioletto Ananias",               email: "juliaananias@ccfprimebilingualschool.com.br" },
  { nome: "Julia Valentina Taino Primo",            email: "juliataino@ccfprimebilingualschool.com.br" },
  { nome: "Juliana Liedtke Kaiser",                 email: "julianakaiser@ccfprimebilingualschool.com.br" },
  { nome: "Lorenzo de Souza Angotti",               email: "lorenzoangotti@ccfprimebilingualschool.com.br" },
  { nome: "Manuela de Marqui Milani",               email: "manuelamilani@ccfprimebilingualschool.com.br" },
  { nome: "Maria Beatriz Basso Xavier",             email: "mariabeatrizbasso@ccfprimebilingualschool.com.br" },
  { nome: "Maria Fernanda Martin Tavares Vulpini",  email: "mariafernandatavares@ccfprimebilingualschool.com.br" },
  { nome: "Maria Júlia Caires Colombo",             email: "mariajuliacaires@ccfprimebilingualschool.com.br" },
  { nome: "Maria Rita de Marqui Milani",            email: "mariaritamilani@ccfprimebilingualschool.com.br" },
  { nome: "Melissa Carla Marsso Fiamengui",         email: "melissamarsso@ccfprimebilingualschool.com.br" },
  { nome: "Milena Clemente Manzoli",                email: "milenamanzoli@ccfprimebilingualschool.com.br" },
  { nome: "Olívia Castro Barros",                   email: "olivabarros@ccfprimebilingualschool.com.br" },
  { nome: "Rafael Vitor Guimarães Pereira",         email: "rafaelguimaraes@ccfprimebilingualschool.com.br" },
  { nome: "Raquel Vitória Guimarães Pereira",       email: "raquelguimaraes@ccfprimebilingualschool.com.br" },
  { nome: "Roberto Liedtke Kaiser",                 email: "robertokaiser@ccfprimebilingualschool.com.br" },
  { nome: "Samuel Souza Pires",                     email: "samuelpires@ccfprimebilingualschool.com.br" },
];

async function main() {
  // Corrige nivelEnsino da turma 9º (estava "EM", deve ser "EF2")
  const turma = await prisma.turma.findUnique({ where: { id: TURMA_ID }, select: { nivelEnsino: true, nome: true } });
  if (turma?.nivelEnsino !== "EF2") {
    await prisma.turma.update({ where: { id: TURMA_ID }, data: { nivelEnsino: "EF2" } });
    console.log(`  ✓ nivelEnsino da turma "${turma?.nome}" corrigido: ${turma?.nivelEnsino} → EF2\n`);
  }

  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  console.log(`Senha hash gerada. Criando ${ALUNOS.length} alunos na turma 9º...\n`);

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
