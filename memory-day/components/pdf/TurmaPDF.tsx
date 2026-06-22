// Componente PDF — Desempenho da turma por matéria.
// Renderizado no servidor via renderToBuffer.
// Gráfico de barras horizontal: eixo Y = alunos, barra = nível médio no período.
// Cada linha mostra também a contagem de registros para auditoria.
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
  navy:   "#1e3a5f",
  muted:  "#64748b",
  borda:  "#e2e8f0",
  fundo:  "#f8fafc",
  texto:  "#334155",
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
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendaCor:  { width: 10, height: 10, borderRadius: 2 },
  legendaTexto:{ fontSize: 7.5, color: cor.muted },
  // Seção por matéria
  secao: {
    marginBottom: 14,
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
  // Linha de um aluno
  linha: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 6,
  },
  nomeAluno: {
    width: 110,
    fontSize: 8,
    color: cor.texto,
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
  // Contagem de registros (auditoria)
  regCount: {
    width: 36,
    fontSize: 6.5,
    color: "#94a3b8",
    textAlign: "right",
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

// ── Props ─────────────────────────────────────────────────────────────────────
interface AlunoNaPDF {
  nomeAluno:      string;
  nivel:          NivelIA | null;
  totalRegistros: number; // auditoria: quantas entregas no período
}

interface DadosMateria {
  nomeMateria: string;
  alunos:      AlunoNaPDF[];
}

interface Props {
  nomeTurma: string;
  anoLetivo: number;
  periodo:   number; // 15, 30 ou 60 dias
  dados:     DadosMateria[];
  geradoEm:  string;
}

// ── Componente ────────────────────────────────────────────────────────────────
export function TurmaPDF({ nomeTurma, anoLetivo, periodo, dados, geradoEm }: Props) {
  registrarFonte();

  const labelPeriodo =
    periodo === 15 ? "Últimos 15 dias" :
    periodo === 30 ? "Último mês"      :
    "Último bimestre";

  return (
    <Document title={`Desempenho ${nomeTurma} — ${labelPeriodo}`} author="Memory Day">
      <Page size="A4" style={s.pagina}>

        {/* Cabeçalho */}
        <View style={s.cabecalho}>
          <View>
            <Text style={s.cabecalhoTitulo}>Memory Day — Desempenho da Turma</Text>
            <Text style={s.cabecalhoSub}>{nomeTurma} · {anoLetivo} · {labelPeriodo}</Text>
          </View>
          <Text style={s.cabecalhoDir}>Gerado em {geradoEm}</Text>
        </View>

        {/* Legenda de cores */}
        <View style={s.legenda}>
          {[
            { nivel: "BASICO"        as NivelIA, label: "Básico" },
            { nivel: "INTERMEDIARIO" as NivelIA, label: "Intermediário" },
            { nivel: "AVANCADO"      as NivelIA, label: "Avançado" },
          ].map(({ nivel, label }) => (
            <View key={nivel} style={s.legendaItem}>
              <View style={[s.legendaCor, { backgroundColor: corNivel(nivel) }]} />
              <Text style={s.legendaTexto}>{label}</Text>
            </View>
          ))}
          <View style={s.legendaItem}>
            <View style={[s.legendaCor, { backgroundColor: "#cbd5e1" }]} />
            <Text style={s.legendaTexto}>Sem dados no período</Text>
          </View>
          <Text style={[s.legendaTexto, { marginLeft: 4, color: "#94a3b8" }]}>
            · número à direita = registros entregues no período
          </Text>
        </View>

        {/* Sem dados no período */}
        {dados.length === 0 && (
          <View style={{ marginTop: 32, borderWidth: 1, borderColor: cor.borda, borderRadius: 4, padding: 20, backgroundColor: cor.fundo }}>
            <Text style={{ fontSize: 10, color: cor.muted, textAlign: "center" }}>
              Nenhum aluno registrou atividades neste período.
            </Text>
          </View>
        )}

        {/* Seções por matéria */}
        {dados.map((mat) => (
          <View key={mat.nomeMateria} style={s.secao}>
            <Text style={s.secaoTitulo}>{mat.nomeMateria}</Text>
            {mat.alunos.map(({ nomeAluno, nivel, totalRegistros }) => {
              const largura  = larguraBarra(nivel);
              const cor_fill = corNivel(nivel);
              const semDados = nivel === null;
              return (
                <View key={nomeAluno} style={s.linha}>
                  {/* Nome do aluno — truncado */}
                  <Text style={s.nomeAluno}>{nomeAluno}</Text>
                  {/* Barra de progresso */}
                  <View style={s.barraContainer}>
                    {largura > 0 && (
                      <View style={[s.barraFill, { width: `${largura}%`, backgroundColor: cor_fill }]} />
                    )}
                    <Text style={semDados || largura < 30 ? s.barraLabelEscuro : s.barraLabel}>
                      {labelNivel(nivel)}
                    </Text>
                  </View>
                  {/* Contagem de registros para auditoria */}
                  <Text style={s.regCount}>
                    {totalRegistros > 0 ? `${totalRegistros} reg.` : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}

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
