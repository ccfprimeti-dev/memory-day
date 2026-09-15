// Cálculo da nota final do aluno: taxa de entrega + qualidade média dos registros,
// relativa aos dias letivos já decorridos (número único, cadastrado pelo admin na Home).

const PESO_ENTREGA    = 0.75;
const PESO_QUALIDADE  = 0.25;

export interface NotaFinalAluno {
  qualidadeMedia: number | null; // 0-100 — média do aproveitamento dos registros. null = sem registros
  taxaEntrega:    number | null; // 0-100 — % dos dias letivos em que o aluno registrou algo. null = dias letivos ainda não cadastrados
  notaFinal:      number | null; // 0-100 — null se não há dados suficientes para calcular
}

// aproveitamentos: todos os valores de Entry.aproveitamento do aluno (qualquer período)
// diasComRegistro: quantos dias distintos o aluno tem pelo menos 1 registro
// diasLetivos: número global cadastrado na Home do admin (0 = ainda não configurado)
export function calcularNotaFinal(
  aproveitamentos: (number | null | undefined)[],
  diasComRegistro: number,
  diasLetivos: number
): NotaFinalAluno {
  const validos = aproveitamentos.filter((v): v is number => typeof v === "number" && !isNaN(v));
  const qualidadeMedia = validos.length > 0
    ? Math.round(validos.reduce((a, b) => a + b, 0) / validos.length)
    : null;

  const diasLetivosConfigurados = diasLetivos > 0;
  const taxaEntrega = diasLetivosConfigurados
    ? Math.min(100, Math.round((diasComRegistro / diasLetivos) * 100))
    : null;

  let notaFinal: number | null = null;
  if (qualidadeMedia !== null && taxaEntrega !== null) {
    notaFinal = Math.round(taxaEntrega * PESO_ENTREGA + qualidadeMedia * PESO_QUALIDADE);
  } else if (qualidadeMedia !== null) {
    // Dias letivos ainda não cadastrados — usa só a qualidade até o admin configurar
    notaFinal = qualidadeMedia;
  }

  return { qualidadeMedia, taxaEntrega, notaFinal };
}
