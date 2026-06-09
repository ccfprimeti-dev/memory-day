// Tipos compartilhados entre front-end e back-end

// ─── Sessão ───────────────────────────────────────────────────────────────────
export type PapelUsuario = "ALUNO" | "PROFESSOR";

export interface SessaoUsuario {
  id:      string;
  nome:    string;
  email:   string;
  papel:   PapelUsuario;
  turmaId: string | null; // preenchido para ALUNO; null para PROFESSOR
}

// ─── Turma ────────────────────────────────────────────────────────────────────
export type NivelEnsino = "EF2" | "EM";

export interface TurmaResumo {
  id:            string;
  nome:          string;
  anoLetivo:     number;
  codigoConvite: string;
  nivelEnsino:   NivelEnsino;
}

// Máximo de aulas por dia para cada nível
export const MAX_AULAS: Record<NivelEnsino, number> = {
  EF2: 5,
  EM:  7,
};

// ─── Matéria (com contexto de turma) ─────────────────────────────────────────
export interface MateriaResumo {
  id:      string;
  nome:    string;
  turmaId: string;
}

// ─── Resposta da IA — análise do aluno ───────────────────────────────────────
export interface FeedbackIA {
  resumo:    string;      // o que o aluno demonstrou entender
  lacunas:   string[];    // pontos que parecem estar faltando
  sugestoes: string[];    // 2-3 sugestões de estudo
}

// ─── Resposta da IA — relatório da turma ─────────────────────────────────────
export interface RelatorioIA {
  nivelGeral:          "Básico" | "Intermediário" | "Avançado";
  percentualRegistros: number;    // % de alunos que enviaram registro
  lacunasComuns:       string[];  // lacunas que aparecem na maioria
  recomendacoes:       string[];  // sugestões para o professor
  resumoGeral:         string;    // parágrafo de síntese
}

// ─── Payload POST /api/registro ──────────────────────────────────────────────
export interface RegistroPayload {
  subjectId: string;
  texto:     string;
  data:      string; // YYYY-MM-DD
}

// ─── Payload POST /api/relatorio ─────────────────────────────────────────────
export interface RelatorioPayload {
  turmaId:   string; // NEW — relatório agora exige turmaId
  subjectId: string;
  data:      string; // YYYY-MM-DD
}
