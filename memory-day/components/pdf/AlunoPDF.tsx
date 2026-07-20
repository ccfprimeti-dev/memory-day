// Componente PDF — Desempenho do aluno comparado à média da turma, por matéria.
// Barras proporcionais a 0-100% quando aproveitamento BNCC disponível;
// fallback para barras por nível (Básico/Intermediário/Avançado) em registros antigos.
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import path from "path";
import { labelNivel, corNivel, larguraBarra, corAproveitamento } from "@/lib/nivelUtils";
import type { NivelIA } from "@/types";

// ── Registro de fonte ─────────────────────────────────────────────────────────
let fonteOk = false;
function registrarFonte() {
  if (fonteOk) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Roboto",
    fonts: [
      { src: path.join(dir, "roboto-400.woff"), fontWeight: 400 },
      { src: path.join(dir, "roboto-700.woff"), fontWeight: 700 },
    ],
  });
  fonteOk = true;
}

// ── Paleta ────────────────────────────────────────────────────────────────────
const cor = {
  navy:  "#1e3a5f",
  muted: "#64748b",
  borda: "#e2e8f0",
  fundo: "#f8fafc",
  texto: "#334155",
};

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  pagina: {
    fontFamily: "Roboto",
    fontSize: 9,
    color: cor.texto,
    backgroundColor: "#ffffff",
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 44,
  },
  cabecalho: {
    backgroundColor: cor.navy,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cabecalhoTitulo: { color: "#ffffff", fontSize: 13, fontWeight: 700 },
  cabecalhoSub:    { color: "#93c5fd", fontSize: 8,  marginTop: 2 },
  cabecalhoDir:    { color: "#bfdbfe", fontSize: 8,  textAlign: "right" },
  legenda: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
    backgroundColor: cor.fundo,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexWrap: "wrap",
  },
  legendaItem:  { flexDirection: "row", alignItems: "center", gap: 5 },
  legendaCor:   { width: 10, height: 10, borderRadius: 2 },
  legendaTexto: { fontSize: 7.5, color: cor.muted },
  secao: {
    marginBottom: 12,
    breakInside: "avoid",
  },
  secaoTitulo: {
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1,
    color: "#2563eb",
    textTransform: "uppercase",
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 6,
  },
  rotulo: {
    width: 60,
    fontSize: 7.5,
    color: cor.muted,
    fontWeight: 700,
  },
  barraContainer: {
    flex: 1,
    height: 14,
    backgroundColor: cor.fundo,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: cor.borda,
    overflow: "hidden",
    position: "relative",
  },
  barraFill: {
    height: "100%",
    borderRadius: 2,
  },
  barraLabel: {
    position: "absolute",
    right: 4,
    top: 2,
    fontSize: 7,
    color: "#ffffff",
    fontWeight: 700,
  },
  barraLabelEscuro: {
    position: "absolute",
    right: 4,
    top: 2,
    fontSize: 7,
    color: cor.muted,
    fontWeight: 700,
  },
  auditLinha: {
    flexDirection: "row",
    marginTop: 1,
    marginBottom: 5,
    paddingLeft: 66,
    gap: 10,
    flexWrap: "wrap",
  },
  auditTexto: {
    fontSize: 6.5,
    color: "#94a3b8",
  },
  separador: {
    height: 1,
    backgroundColor: cor.borda,
    marginBottom: 4,
    marginTop: 2,
  },
  rodape: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: cor.borda,
    paddingTop: 5,
  },
  rodapeTexto: { fontSize: 7, color: cor.muted },
});

function labelAbrev(nivel: string): string {
  if (nivel === "AVANCADO")      return "Avançado";
  if (nivel === "INTERMEDIARIO") return "Interm.";
  if (nivel === "BASICO")        return "Básico";
  return nivel;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface DadosMateria {
  nomeMateria:         string;
  nivelAluno:          NivelIA | null;
  nivelTurma:          NivelIA | null;
  // BNCC (presentes em entradas novas; null em entradas antigas)
  aproveitamentoAluno: number | null;
  aproveitamentoTurma: number | null;
  habilidadeBncc:      string | null;
  // Dados brutos para auditoria
  niveisAluno:         string[];
  totalTurmaContrib:   number;
  totalColegas:        number;
}

interface Props {
  nomeAluno: string;
  nomeTurma: string;
  periodo:   number;
  dados:     DadosMateria[];
  geradoEm:  string;
}

// ── Barra — usa % quando aproveitamento disponível, senão usa nível ───────────
function Barra({
  rotulo,
  nivel,
  corFill,
  aproveitamento,
}: {
  rotulo:         string;
  nivel:          NivelIA | null;
  corFill:        string;
  aproveitamento: number | null;
}) {
  const usarPct  = aproveitamento !== null;
  const largura  = usarPct ? aproveitamento! : larguraBarra(nivel);
  const fill     = usarPct ? corAproveitamento(aproveitamento) : corFill;
  const semDados = !usarPct && nivel === null;
  const label    = usarPct ? `${aproveitamento}%` : labelNivel(nivel);

  return (
    <View style={s.linha}>
      <Text style={s.rotulo}>{rotulo}</Text>
      <View style={s.barraContainer}>
        {largura > 0 && (
          <View style={[s.barraFill, { width: `${largura}%`, backgroundColor: fill }]} />
        )}
        <Text style={semDados || largura < 30 ? s.barraLabelEscuro : s.barraLabel}>
          {label}
        </Text>
      </View>
    </View>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function AlunoPDF({ nomeAluno, nomeTurma, periodo, dados, geradoEm }: Props) {
  registrarFonte();

  const labelPeriodo =
    periodo === 15 ? "Últimos 15 dias" :
    periodo === 30 ? "Último mês"      :
    "Último bimestre";

  // Detecta se ao menos uma matéria tem aproveitamento % (novo modo BNCC)
  const temAproveitamento = dados.some((d) => d.aproveitamentoAluno !== null);

  return (
    <Document title={`Desempenho ${nomeAluno} — ${labelPeriodo}`} author="Memory Day">
      <Page size="A4" style={s.pagina}>

        {/* Cabeçalho */}
        <View style={s.cabecalho}>
          <View>
            <Text style={s.cabecalhoTitulo}>Memory Day — Desempenho do Aluno</Text>
            <Text style={s.cabecalhoSub}>{nomeAluno} · {nomeTurma} · {labelPeriodo}</Text>
          </View>
          <Text style={s.cabecalhoDir}>Gerado em {geradoEm}</Text>
        </View>

        {/* Legenda */}
        <View style={s.legenda}>
          <View style={s.legendaItem}>
            <View style={[s.legendaCor, { backgroundColor: "#1e3a5f" }]} />
            <Text style={s.legendaTexto}>Aluno</Text>
          </View>
          <View style={s.legendaItem}>
            <View style={[s.legendaCor, { backgroundColor: "#94a3b8" }]} />
            <Text style={s.legendaTexto}>Média da turma</Text>
          </View>
          {temAproveitamento ? (
            <Text style={[s.legendaTexto, { marginLeft: 8 }]}>
              Cores: Vermelho ≤40% · Âmbar 41–70% · Verde ≥71% · Barras = aproveitamento BNCC (0-100%)
            </Text>
          ) : (
            <Text style={[s.legendaTexto, { marginLeft: 8 }]}>
              Cores: Básico = vermelho · Intermediário = âmbar · Avançado = verde
            </Text>
          )}
        </View>

        {/* Sem dados no período */}
        {dados.length === 0 && (
          <View style={{ marginTop: 32, borderWidth: 1, borderColor: cor.borda, borderRadius: 4, padding: 20, backgroundColor: cor.fundo }}>
            <Text style={{ fontSize: 10, color: cor.muted, textAlign: "center" }}>
              Nenhum registro encontrado para este aluno neste período.
            </Text>
          </View>
        )}

        {/* Seções por matéria */}
        {dados.map((mat, idx) => {
          const usarPct = mat.aproveitamentoAluno !== null;

          const listaAluno = mat.niveisAluno.length > 0
            ? mat.niveisAluno.map(labelAbrev).join(" · ")
            : "nenhum registro";
          const textoAluno = usarPct
            ? `${mat.aproveitamentoAluno}% (${mat.niveisAluno.length} reg.)`
            : `${mat.niveisAluno.length} reg. · ${listaAluno}`;
          const textoTurma = mat.totalColegas > 0
            ? (mat.aproveitamentoTurma !== null
                ? `${mat.aproveitamentoTurma}% · ${mat.totalTurmaContrib} de ${mat.totalColegas} colegas`
                : `${mat.totalTurmaContrib} de ${mat.totalColegas} colegas com dados`)
            : "sem colegas na turma";

          return (
            <View key={mat.nomeMateria} style={s.secao}>
              <Text style={s.secaoTitulo}>{mat.nomeMateria}</Text>

              <Barra
                rotulo="Aluno"
                nivel={mat.nivelAluno}
                corFill={corNivel(mat.nivelAluno)}
                aproveitamento={mat.aproveitamentoAluno}
              />
              <Barra
                rotulo="Turma (média)"
                nivel={mat.nivelTurma}
                corFill="#64748b"
                aproveitamento={mat.aproveitamentoTurma}
              />

              {/* Linha de auditoria */}
              <View style={s.auditLinha}>
                <Text style={s.auditTexto}>↳ Aluno: {textoAluno}</Text>
                <Text style={[s.auditTexto, { color: "#b0bec5" }]}>|</Text>
                <Text style={s.auditTexto}>Turma: {textoTurma}</Text>
                {mat.habilidadeBncc && (
                  <>
                    <Text style={[s.auditTexto, { color: "#b0bec5" }]}>|</Text>
                    <Text style={s.auditTexto}>BNCC: {mat.habilidadeBncc}</Text>
                  </>
                )}
              </View>

              {idx < dados.length - 1 && <View style={s.separador} />}
            </View>
          );
        })}

        {/* Rodapé */}
        <View style={s.rodape} fixed>
          <Text style={s.rodapeTexto}>Memory Day — Relatório gerado em {geradoEm}</Text>
          <Text style={s.rodapeTexto} render={({ pageNumber, totalPages }) =>
            `Pág. ${pageNumber} / ${totalPages}`
          } />
        </View>

      </Page>
    </Document>
  );
}
