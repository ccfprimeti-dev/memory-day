// Componente PDF do relatório diário da turma.
// Renderizado no servidor via renderToBuffer — nunca importado no cliente.
// O registro de fontes é feito na rota de API (route.ts) antes de renderToBuffer.
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { RelatorioIA } from "@/types";

// ── Paleta ────────────────────────────────────────────────────────────────────
const cor = {
  navy:    "#1e3a5f",
  azul:    "#2563eb",
  muted:   "#64748b",
  borda:   "#e2e8f0",
  fundo:   "#f8fafc",
  amarelo: "#d97706",
  verde:   "#059669",
  texto:   "#334155",
};

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  pagina: {
    fontFamily: "Roboto",
    fontSize: 9.5,
    color: cor.texto,
    backgroundColor: "#ffffff",
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 48,
  },

  // Faixa de cabeçalho azul escuro
  cabecalho: {
    backgroundColor: cor.navy,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cabecalhoTitulo: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0.4,
  },
  cabecalhoSub: {
    color: "#93c5fd",
    fontSize: 9,
    marginTop: 3,
  },
  cabecalhoData: {
    color: "#bfdbfe",
    fontSize: 9,
    textAlign: "right",
  },

  // Linha de badges abaixo do cabeçalho
  linhasBadge: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    backgroundColor: cor.fundo,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 8,
    color: cor.muted,
  },

  // Seção genérica
  secao: {
    marginBottom: 14,
  },
  secaoTitulo: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.2,
    color: cor.azul,
    textTransform: "uppercase",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  textoCorpo: {
    fontSize: 9.5,
    lineHeight: 1.65,
    color: cor.texto,
  },

  // Item de lista genérico
  itemLista: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 5,
    alignItems: "flex-start",
  },
  marcador: {
    fontSize: 9.5,
    color: cor.azul,
    lineHeight: 1.65,
    width: 14,
  },
  textoLista: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.65,
    color: cor.texto,
  },

  // Bloco de lacunas (fundo amarelado)
  blocoLacunas: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 5,
    padding: 12,
    marginBottom: 14,
  },
  lacunasTitulo: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.2,
    color: cor.amarelo,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  lacunasMarcador: {
    fontSize: 9.5,
    color: cor.amarelo,
    lineHeight: 1.65,
    width: 16,
  },

  // Bloco de recomendações (fundo verde)
  blocoRec: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 5,
    padding: 12,
    marginBottom: 14,
  },
  recTitulo: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.2,
    color: cor.verde,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  recMarcador: {
    fontSize: 9.5,
    color: cor.verde,
    lineHeight: 1.65,
    width: 16,
  },

  // Indicadores em 3 colunas
  linhaIndicadores: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  cardIndicador: {
    flex: 1,
    backgroundColor: cor.fundo,
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: 5,
    padding: 10,
    alignItems: "center",
  },
  indicadorValor: {
    fontSize: 22,
    fontWeight: 700,
    color: cor.navy,
    lineHeight: 1.2,
  },
  indicadorLabel: {
    fontSize: 7.5,
    color: cor.muted,
    textAlign: "center",
    marginTop: 3,
    letterSpacing: 0.2,
  },

  // Rodapé fixo
  rodape: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: cor.borda,
    paddingTop: 6,
  },
  rodapeTexto: {
    fontSize: 7.5,
    color: cor.muted,
  },
});

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  relatorio: RelatorioIA;
  nomeTurma: string;        // NEW
  nomeMateria: string;
  nomeProfessor: string;
  data: string;             // YYYY-MM-DD
  totalAlunos: number;
  alunosRegistraram: number;
  geradoEm: string;
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// ── Documento ─────────────────────────────────────────────────────────────────
export function RelatorioPDF({
  relatorio,
  nomeTurma,
  nomeMateria,
  nomeProfessor,
  data,
  totalAlunos,
  alunosRegistraram,
  geradoEm,
}: Props) {
  const taxaParticipacao =
    totalAlunos > 0 ? Math.round((alunosRegistraram / totalAlunos) * 100) : 0;

  return (
    <Document
      title={`Relatorio ${nomeMateria} - ${data}`}
      author="Memory Day"
      creator="Memory Day"
    >
      <Page size="A4" style={s.pagina}>

        {/* ── Cabeçalho ── */}
        <View style={s.cabecalho}>
          <View>
            <Text style={s.cabecalhoTitulo}>Memory Day — Relatorio Diario</Text>
            <Text style={s.cabecalhoSub}>
              Turma: {nomeTurma}  ·  {nomeMateria}  ·  Prof. {nomeProfessor}
            </Text>
          </View>
          <Text style={s.cabecalhoData}>Data: {formatarData(data)}</Text>
        </View>

        {/* ── Badges de nível / participação ── */}
        <View style={s.linhasBadge}>
          <Text style={s.badge}>Nivel geral: {relatorio.nivelGeral}</Text>
          <Text style={s.badge}>
            {alunosRegistraram} de {totalAlunos} alunos registraram
          </Text>
        </View>

        {/* ── Resumo geral ── */}
        <View style={s.secao}>
          <Text style={s.secaoTitulo}>Resumo Geral</Text>
          <Text style={s.textoCorpo}>{relatorio.resumoGeral}</Text>
        </View>

        {/* ── Lacunas mais comuns ── */}
        <View style={s.blocoLacunas}>
          <Text style={s.lacunasTitulo}>Lacunas mais comuns</Text>
          {relatorio.lacunasComuns.map((lacuna, i) => (
            <View key={i} style={s.itemLista}>
              <Text style={s.lacunasMarcador}>{i + 1}.</Text>
              <Text style={s.textoLista}>{lacuna}</Text>
            </View>
          ))}
        </View>

        {/* ── Recomendações ── */}
        <View style={s.blocoRec}>
          <Text style={s.recTitulo}>Recomendacoes para a proxima aula</Text>
          {relatorio.recomendacoes.map((rec, i) => (
            <View key={i} style={s.itemLista}>
              <Text style={s.recMarcador}>›</Text>
              <Text style={s.textoLista}>{rec}</Text>
            </View>
          ))}
        </View>

        {/* ── Indicadores ── */}
        <View style={s.secao}>
          <Text style={s.secaoTitulo}>Indicadores de Participacao</Text>
          <View style={s.linhaIndicadores}>
            <View style={s.cardIndicador}>
              <Text style={s.indicadorValor}>{totalAlunos}</Text>
              <Text style={s.indicadorLabel}>Total de alunos</Text>
            </View>
            <View style={s.cardIndicador}>
              <Text style={s.indicadorValor}>{alunosRegistraram}</Text>
              <Text style={s.indicadorLabel}>Registraram no dia</Text>
            </View>
            <View style={s.cardIndicador}>
              <Text style={s.indicadorValor}>{taxaParticipacao}%</Text>
              <Text style={s.indicadorLabel}>Taxa de participacao</Text>
            </View>
          </View>
        </View>

        {/* ── Rodapé fixo ── */}
        <View style={s.rodape} fixed>
          <Text style={s.rodapeTexto}>Gerado por Memory Day em {geradoEm}</Text>
          <Text
            style={s.rodapeTexto}
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} de ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  );
}
