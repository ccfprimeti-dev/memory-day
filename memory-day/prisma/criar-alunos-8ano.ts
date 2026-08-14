import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TURMA_ID     = "cmqi3gevo0002111m8fglqvr6"; // turma "8º" EF2
const SENHA_PADRAO = "PRIME@2026";

const ALUNOS = [
  { nome: "Alice de Zan Martins",               email: "alicezan@ccfprimebilingualschool.com.br" },
  { nome: "Ana Clara de Almeida Tonetti",       email: "anaclaratonetti@ccfprimebilingualschool.com.br" },
  { nome: "Enzo Fugii Pereira",                 email: "enzofugii@ccfprimebilingualschool.com.br" },
  { nome: "Henrique Ghantous Caires",           email: "henriquecaires@ccfprimebilingualschool.com.br" },
  { nome: "Maria Clara Lacerda Martinelli",     email: "mariaclaramartinelli@ccfprimebilingualschool.com.br" },
  { nome: "Maria Flor Zaiden de Oliveira",      email: "mariaflorzaiden@ccfprimebilingualschool.com.br" },
  { nome: "Sophia Constantino da Cunha Silva",  email: "sophiaconstantino@ccfprimebilingualschool.com.br" },
  { nome: "Vitória Lacerda Teodoro",            email: "vitorialacerda@ccfprimebilingualschool.com.br" },
];

async function main() {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  console.log(`Senha hash gerada. Criando ${ALUNOS.length} alunos na turma 8º...\n`);

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
