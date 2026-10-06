// Utilitários do calendário por bimestre — cada bimestre tem seus próprios
// dias letivos e um intervalo de datas; o "vigente" é escolhido pela data de hoje.
import { prisma } from "@/lib/prisma";

export interface BimestreConfig {
  numero:      number;
  diasLetivos: number;
  dataInicio:  string | null; // YYYY-MM-DD
  dataFim:     string | null; // YYYY-MM-DD
}

export const LABEL_BIMESTRE: Record<number, string> = {
  1: "1º Bimestre",
  2: "2º Bimestre",
  3: "3º Bimestre",
  4: "4º Bimestre",
};

// Bimestre vigente: aquele cujo intervalo [dataInicio, dataFim] contém a data de hoje.
// Se hoje cair "entre" bimestres (ex: recesso, ou fim de ano antes do próximo começar),
// usa o último bimestre que já começou — mantém a nota visível até o próximo abrir.
// Retorna null se nenhum bimestre tem dataInicio cadastrada ainda.
export function bimestreAtual(bimestres: BimestreConfig[], hoje: string): BimestreConfig | null {
  const dentroDoIntervalo = bimestres.find(
    (b) => b.dataInicio && b.dataFim && hoje >= b.dataInicio && hoje <= b.dataFim
  );
  if (dentroDoIntervalo) return dentroDoIntervalo;

  const jaComecaram = bimestres
    .filter((b): b is BimestreConfig & { dataInicio: string } => !!b.dataInicio && hoje >= b.dataInicio)
    .sort((a, b) => (a.dataInicio < b.dataInicio ? 1 : -1)); // mais recente primeiro

  return jaComecaram[0] ?? null;
}

// Garante que as 4 linhas existem e devolve os bimestres em ordem.
export async function buscarBimestres(): Promise<BimestreConfig[]> {
  for (const numero of [1, 2, 3, 4]) {
    await prisma.bimestre.upsert({ where: { numero }, update: {}, create: { numero } });
  }
  return prisma.bimestre.findMany({ orderBy: { numero: "asc" } });
}
