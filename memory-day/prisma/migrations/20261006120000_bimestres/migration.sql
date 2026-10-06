-- DropTable
DROP TABLE "Configuracao";

-- CreateTable
CREATE TABLE "Bimestre" (
    "numero" INTEGER NOT NULL,
    "diasLetivos" INTEGER NOT NULL DEFAULT 0,
    "dataInicio" TEXT,
    "dataFim" TEXT,

    CONSTRAINT "Bimestre_pkey" PRIMARY KEY ("numero")
);

-- Semeia os 4 bimestres; o 1º herda o valor que estava em Configuracao.diasLetivos
-- (datas ficam em aberto para o admin preencher na Home).
INSERT INTO "Bimestre" ("numero", "diasLetivos") VALUES (1, 79), (2, 0), (3, 0), (4, 0);
