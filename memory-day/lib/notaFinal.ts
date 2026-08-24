// Cálculo da nota final do aluno: qualidade média dos registros + taxa de entrega
// relativa aos dias letivos já decorridos (cadastrados manualmente pelo admin na turma).

const PESO_QUALIDADE = 0.5;
const PESO_ENTREGA    = 0.5;

export interface NotaFinalAluno {
  qualidadeMedia: number | null; // 0-100 — média do aproveitamento dos registros. null = sem registros
  taxaEntrega:    number | null; // 0-100 — % dos dias letivos decorridos em que o aluno registrou algo. null = calendário não cadastrado
  notaFinal:      number | null; // 0-100 — null se não há dados suficientes para calcular
}

// aproveitamentos: todos os valores de Entry.aproveitamento do aluno (any período)
// diasComRegistro: quantos dias distintos o aluno tem pelo menos 1 registro
// diasLetivosDecorridos: valor cadastrado manualmente na Turma (0 = calendário ainda não configurado)
export function calcularNotaFinal(
  aproveitamentos: (number | null | undefined)[],
  diasComRegistro: number,
  diasLetivosDecorridos: number
): NotaFinalAluno {
  const validos = aproveitamentos.filter((v): v is number => typeof v === "number" && !isNaN(v));
  const qualidadeMedia = validos.length > 0
    ? Math.round(validos.reduce((a, b) => a + b, 0) / validos.length)
    : null;

  const calendarioConfigurado = diasLetivosDecorridos > 0;
  const taxaEntrega = calendarioConfigurado
    ? Math.min(100, Math.round((diasComRegistro / diasLetivosDecorridos) * 100))
    : null;

  let notaFinal: number | null = null;
  if (qualidadeMedia !== null && taxaEntrega !== null) {
    notaFinal = Math.round(qualidadeMedia * PESO_QUALIDADE + taxaEntrega * PESO_ENTREGA);
  } else if (qualidadeMedia !== null) {
    // Calendário ainda não cadastrado — usa só a qualidade até o admin configurar os dias letivos
    notaFinal = qualidadeMedia;
  }

  return { qualidadeMedia, taxaEntrega, notaFinal };
}
