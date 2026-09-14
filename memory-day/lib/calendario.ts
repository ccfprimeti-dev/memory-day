// Verifica se uma data (YYYY-MM-DD) cai em um fim de semana (sábado ou domingo).
export function ehFimDeSemana(data: string): boolean {
  // Meio-dia evita que o fuso horário empurre a data pro dia anterior/seguinte.
  const dia = new Date(`${data}T12:00:00`).getDay();
  return dia === 0 || dia === 6; // 0 = domingo, 6 = sábado
}
