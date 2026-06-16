// Tipos compartilhados entre front-end e back-end

// ─── Sessão ───────────────────────────────────────────────────────────────────
export type PapelUsuario = "ALUNO" | "PROFESSOR" | "ADMIN";

export interface SessaoUsuario {
  id:      string;
  nome:    string;
  email:   string;
  papel:   PapelUsuario;
  turmaId: string | null; // preenchido para ALUNO; null para PROFESSOR
}

// ─── Turma ────────────────────────────────────────────────────────────────────
export type NivelEnsino = "EF1" | "EF2" | "EM";

export interface TurmaResumo {
  id:            string;
  nome:          string;
  anoLetivo:     number;
  codigoConvite: string;
  nivelEnsino:   NivelEnsino;
}

// Máximo de aulas por dia para cada nível
export const MAX_AULAS: Record<NivelEnsino, number> = {
  EF1: 5,
  EF2: 5,
  EM:  7,
};

// Rótulo legível para cada nível de ensino
export const LABEL_NIVEL_ENSINO: Record<NivelEnsino, string> = {
  EF1: "Fundamental 1",
  EF2: "Fundamental 2",
  EM:  "Ensino Médio",
};

// ─── Matéria (com contexto de turma) ─────────────────────────────────────────
export interface MateriaResumo {
  id:      string;
  nome:    string;
  turmaId: string;
}

// ─── Nível de desempenho classificado pela IA ────────────────────────────────
export type NivelIA = "BASICO" | "INTERMEDIARIO" | "AVANCADO";

// ─── Resposta da IA — análise do aluno ───────────────────────────────────────
export interface FeedbackIA {
  resumo:    string;      // o que o aluno demonstrou entender
  lacunas:   string[];    // pontos que parecem estar faltando
  sugestoes: string[];    // 2-3 sugestões de estudo
  nivel:     NivelIA;     // classificação automática da IA
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
