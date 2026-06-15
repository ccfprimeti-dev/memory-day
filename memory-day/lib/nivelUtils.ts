// Funções utilitárias para agregação de níveis de desempenho da IA.
// Usadas tanto nas rotas de PDF quanto nas páginas admin.
import type { NivelIA } from "@/types";

/** Converte nível textual em score numérico para cálculo de média. */
export function nivelParaScore(nivel: string | null | undefined): number {
  if (nivel === "AVANCADO")     return 3;
  if (nivel === "INTERMEDIARIO") return 2;
  if (nivel === "BASICO")        return 1;
  return 0; // sem registro
}

/** Converte score médio de volta para NivelIA. Retorna null se não há dados. */
export function scoreParaNivel(media: number): NivelIA | null {
  if (media >= 2.5) return "AVANCADO";
  if (media >= 1.5) return "INTERMEDIARIO";
  if (media > 0)    return "BASICO";
  return null;
}

/** Agrega uma lista de níveis em um único NivelIA representativo. */
export function agregarNiveis(niveis: (string | null | undefined)[]): NivelIA | null {
  const scores = niveis
    .map(nivelParaScore)
    .filter((s) => s > 0);
  if (scores.length === 0) return null;
  const media = scores.reduce((a, b) => a + b, 0) / scores.length;
  return scoreParaNivel(media);
}

/** Label legível para exibição no PDF. */
export function labelNivel(nivel: NivelIA | null): string {
  if (nivel === "AVANCADO")     return "Avançado";
  if (nivel === "INTERMEDIARIO") return "Intermediário";
  if (nivel === "BASICO")        return "Básico";
  return "Sem dados";
}

/** Cor de preenchimento da barra conforme o nível. */
export function corNivel(nivel: NivelIA | null): string {
  if (nivel === "AVANCADO")     return "#059669"; // verde
  if (nivel === "INTERMEDIARIO") return "#d97706"; // âmbar
  if (nivel === "BASICO")        return "#dc2626"; // vermelho
  return "#cbd5e1"; // cinza — sem dados
}

/** Largura percentual da barra (0–100) proporcional ao score. */
export function larguraBarra(nivel: NivelIA | null): number {
  if (nivel === "AVANCADO")     return 100;
  if (nivel === "INTERMEDIARIO") return 60;
  if (nivel === "BASICO")        return 30;
  return 0;
}

/** Data de corte para um período em dias a partir de hoje (America/Sao_Paulo). */
export function dataInicioPeriodo(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(d);
}
