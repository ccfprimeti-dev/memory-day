// Componente PDF — Desempenho do aluno comparado à média da turma, por matéria.
// Renderizado no servidor via renderToBuffer.
// Para cada matéria: barra do aluno + barra da turma + linha de auditoria com dados brutos.
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import path from "path";
import { labelNivel, corNivel, larguraBarra } from "@/lib/nivelUtils";
import type { NivelIA } from "@/types";

// ── Registro de fonte (executado uma vez por processo) ────────────────────────
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
  },
  legendaItem:  { flexDirection: "row", alignItems: "center", gap: 5 },
  legendaCor:   { width: 10, height: 10, borderRadius: 2 },
  legendaTexto: { fontSize: 7.5, color: cor.muted },
  // Seção por matéria
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
  // Linha de uma barra (aluno ou turma)
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
  // Linha de auditoria (abaixo das duas barras)
  auditLinha: {
    flexDirection: "row",
    marginTop: 1,
    marginBottom: 5,
    paddingLeft: 66,
    gap: 10,
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

// ── Converte nivelIA string para label abreviado para a linha de auditoria ────
function labelAbrev(nivel: string): string {
  if (nivel === "AVANCADO")      return "Avançado";
  if (nivel === "INTERMEDIARIO") return "Interm.";
  if (nivel === "BASICO")        return "Básico";
  return nivel;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface DadosMateria {
  nomeMateria:       string;
  nivelAluno:        NivelIA | null;
  nivelTurma:        NivelIA | null;
  // Dados brutos para auditoria
  niveisAluno:       string[];  // registros brutos do aluno no período
  totalTurmaContrib: number;    // colegas com pelo menos 1 entrega no período
  totalColegas:      number;    // total de colegas na turma (excluindo o próprio aluno)
}

interface Props {
  nomeAluno: string;
  nomeTurma: string;
  periodo:   number;
  dados:     DadosMateria[];
  geradoEm:  string;
}

// ── Sub-componente barra ──────────────────────────────────────────────────────
function Barra({ rotulo, nivel, corFill }: { rotulo: string; nivel: NivelIA | null; corFill: string }) {
  const largura  = larguraBarra(nivel);
  const semDados = nivel === null;
  return (
    <View style={s.linha}>
      <Text style={s.rotulo}>{rotulo}</Text>
      <View style={s.barraContainer}>
        {largura > 0 && (
          <View style={[s.barraFill, { width: `${largura}%`, backgroundColor: corFill }]} />
        )}
        <Text style={semDados || largura < 30 ? s.barraLabelEscuro : s.barraLabel}>
          {labelNivel(nivel)}
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
          <Text style={[s.legendaTexto, { marginLeft: 8 }]}>
            Cores: Básico = vermelho · Intermediário = âmbar · Avançado = verde · ↳ linha cinza = dados brutos para auditoria
          </Text>
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
          const listaAluno = mat.niveisAluno.length > 0
            ? mat.niveisAluno.map(labelAbrev).join(" · ")
            : "nenhum registro";
          const textoAluno = `${mat.niveisAluno.length} reg. · ${listaAluno}`;
          const textoTurma = mat.totalColegas > 0
            ? `${mat.totalTurmaContrib} de ${mat.totalColegas} colegas com dados`
            : "sem colegas na turma";

          return (
            <View key={mat.nomeMateria} style={s.secao}>
              <Text style={s.secaoTitulo}>{mat.nomeMateria}</Text>
              {/* Barra do aluno — cor conforme nível */}
              <Barra rotulo="Aluno" nivel={mat.nivelAluno} corFill={corNivel(mat.nivelAluno)} />
              {/* Barra da turma — excluindo o próprio aluno */}
              <Barra rotulo="Turma (média)" nivel={mat.nivelTurma} corFill="#64748b" />
              {/* Linha de auditoria: dados brutos que geraram cada barra */}
              <View style={s.auditLinha}>
                <Text style={s.auditTexto}>↳ Aluno: {textoAluno}</Text>
                <Text style={[s.auditTexto, { color: "#b0bec5" }]}>|</Text>
                <Text style={s.auditTexto}>Turma: {textoTurma}</Text>
              </View>
              {/* Separador entre matérias (exceto a última) */}
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
