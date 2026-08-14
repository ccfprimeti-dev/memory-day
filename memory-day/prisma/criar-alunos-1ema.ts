import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TURMA_ID     = "cmqqkcqob0000f9vc2chqnc2d"; // turma "1º EM A"
const SENHA_PADRAO = "PRIME@2026";

const ALUNOS = [
  { nome: "Alexandre Tomé da Silveira",              email: "alexandretome@ccfprimebilingualschool.com.br" },
  { nome: "Arthur Vargas Arroyo Barbosa",            email: "arthurvargas@ccfprimebilingualschool.com.br" },
  { nome: "Benício Cavalcanti Domingues Ugatti",     email: "beniciocavalcanti@ccfprimebilingualschool.com.br" },
  { nome: "Carolina Meirelles da Rocha",             email: "carolinameirelles@ccfprimebilingualschool.com.br" },
  { nome: "Daniel Felipe de Queiroz Fornazaro",      email: "danielqueiroz@ccfprimebilingualschool.com.br" },
  { nome: "Davi Vartanian da Silveira",              email: "davivartanian@ccfprimebilingualschool.com.br" },
  { nome: "Eduarda de Souza Paulozzi",               email: "eduardapaulozzi@ccfprimebilingualschool.com.br" },
  { nome: "Eduardo Ismael Rodrigues Ferri",          email: "eduardoismael@ccfprimebilingualschool.com.br" },
  { nome: "Gabriel Barbour Coti",                    email: "gabrielbarbour@ccfprimebilingualschool.com.br" },
  { nome: "Gabriel Piffer Crepaldi",                 email: "gabrielcrepaldi@ccfprimebilingualschool.com.br" },
  { nome: "Gabriela Pegorer Navarro da Cruz",        email: "gabrielapegorer@ccfprimebilingualschool.com.br" },
  { nome: "Guilherme Ismael Rodrigues Ferri",        email: "guilhermeismael@ccfprimebilingualschool.com.br" },
  { nome: "Heitor de Moraes Homsi",                  email: "heitorhomsi@ccfprimebilingualschool.com.br" },
  { nome: "Isadora Caceres Gonçalves de Marchi",     email: "isadoracaceres@ccfprimebilingualschool.com.br" },
  { nome: "Julia Anselmo de Moura",                  email: "juliaanselmo@ccfprimebilingualschool.com.br" },
  { nome: "Laura Curti Gama da Silva",               email: "lauracurti@ccfprimebilingualschool.com.br" },
  { nome: "Lorenzo Barbaresi Setokuchi",             email: "lorenzobarbaresi@ccfprimebilingualschool.com.br" },
  { nome: "Lucas Azevo Longhini",                    email: "lucasazevedo@ccfprimebilingualschool.com.br" },
  { nome: "Luís Felipe Casseb Frederico",            email: "luisfelipecasseb@ccfprimebilingualschool.com.br" },
  { nome: "Luiz Felipe Zambon",                      email: "luisfelipezambon@ccfprimebilingualschool.com.br" },
  { nome: "Maria Eduarda Ferreira Maciel",           email: "mariaeduardamaciel@ccfprimebilingualschool.com.br" },
  { nome: "Maria Eduarda Droppé Godoy",              email: "mariaeduardagodoy@ccfprimebilingualschool.com.br" },
  { nome: "Maria Eduarda Campos Tonelli",            email: "mariaeduardatonelli@ccfprimebilingualschool.com.br" },
  { nome: "Maria Fernanda de Moraes Piccolo",        email: "mariafernandapiccolo@ccfprimebilingualschool.com.br" },
  { nome: "Nicole Longhi Trajano",                   email: "nicoletrajano@ccfprimebilingualschool.com.br" },
  { nome: "Pedro Lucas Macêdo",                      email: "pedromacedo@ccfprimebilingualschool.com.br" },
  { nome: "Pietro de Paula Cannizza",                email: "pedrocannizza@ccfprimebilingualschool.com.br" },
  { nome: "Rafaela Martins Sizenando",               email: "rafaelasizenando@ccfprimebilingualschool.com.br" },
  { nome: "Sara Nassif",                             email: "saranassif@ccfprimebilingualschool.com.br" },
  { nome: "Thomaz Marinho Oliveira",                 email: "thomazmarinho@ccfprimebilingualschool.com.br" },
];

async function main() {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  console.log(`Senha hash gerada. Criando ${ALUNOS.length} alunos na turma 1º EM A...\n`);

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
