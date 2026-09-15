-- AlterTable
ALTER TABLE "Turma" DROP COLUMN "diasLetivosDecorridos",
DROP COLUMN "diasLetivosTotais";

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "diasLetivos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);
