"use client";
// Visão do aluno para o admin: seletor de dia, registros do dia e geração de PDF.
import { useState, useEffect } from "react";
import type { FeedbackIA } from "@/types";

interface Registro {
  id:           string;
  textoDoAluno: string;
  feedbackIA:   string | null;
  lacunasIA:    FeedbackIA | null;
  nivelIA:      string | null;
  quantidadeAulas: number;
  materia:      { id: string; nome: string };
}

interface Materia {
  id:   string;
  nome: string;
}

interface Props {
  alunoId:     string;
  nomeAluno:   string;
  nomeTurma:   string;
  turmaId:     string;
  dataInicial: string; // YYYY-MM-DD
}

const PERIODOS = [
  { valor: 15, label: "Últimos 15 dias" },
  { valor: 30, label: "Último mês"      },
  { valor: 60, label: "Último bimestre" },
];

function labelNivel(n: string | null) {
  if (n === "AVANCADO")      return "Avançado";
  if (n === "INTERMEDIARIO") return "Intermediário";
  if (n === "BASICO")        return "Básico";
  return null;
}

function corNivel(n: string | null) {
  if (n === "AVANCADO")      return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (n === "INTERMEDIARIO") return "text-amber-700 bg-amber-50 border-amber-200";
  if (n === "BASICO")        return "text-red-600 bg-red-50 border-red-200";
  return "text-slate-400 bg-slate-50 border-slate-200";
}

export function AlunoAdminView({ alunoId, nomeAluno, nomeTurma, turmaId, dataInicial }: Props) {
  const [data,       setData]       = useState(dataInicial);
  const [registros,  setRegistros]  = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [periodo,    setPeriodo]    = useState(30);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  // Form de novo registro
  const [formAberto,         setFormAberto]         = useState(false);
  const [materias,           setMaterias]           = useState<Materia[]>([]);
  const [carregandoMaterias, setCarregandoMaterias] = useState(false);
  const [novoData,           setNovoData]           = useState(dataInicial);
  const [novoSubjectId,      setNovoSubjectId]      = useState("");
  const [novoTexto,          setNovoTexto]          = useState("");
  const [enviando,           setEnviando]           = useState(false);
  const [mensagem,           setMensagem]           = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Carrega registros sempre que a data muda
  useEffect(() => {
    if (!data) return;
    setCarregando(true);
    fetch(`/api/admin/aluno/${alunoId}?data=${data}`)
      .then((r) => r.json())
      .then((d) => setRegistros(d.registros ?? []))
      .catch(() => setRegistros([]))
      .finally(() => setCarregando(false));
  }, [alunoId, data]);

  function abrirForm() {
    setFormAberto(true);
    setMensagem(null);
    setNovoData(data);
    setNovoSubjectId("");
    setNovoTexto("");

    if (materias.length === 0) {
      setCarregandoMaterias(true);
      fetch(`/api/materias/publicas?turmaId=${turmaId}`)
        .then((r) => r.json())
        .then((d: Materia[]) => setMaterias(d))
        .catch(() => setMaterias([]))
        .finally(() => setCarregandoMaterias(false));
    }
  }

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!novoData || !novoSubjectId || novoTexto.trim().length < 20) return;

    setEnviando(true);
    setMensagem(null);
    try {
      const res = await fetch("/api/admin/registro", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ alunoId, subjectId: novoSubjectId, data: novoData, texto: novoTexto }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMensagem({ tipo: "erro", texto: json.erro ?? "Erro ao salvar registro." });
        return;
      }
      const msg = json.atualizado
        ? "Registro atualizado — IA re-analisou o texto."
        : "Registro criado com sucesso!";
      setMensagem({ tipo: "ok", texto: msg });
      setFormAberto(false);
      setNovoTexto("");
      // Navega para a data do registro criado para exibir na lista
      setData(novoData);
    } catch {
      setMensagem({ tipo: "erro", texto: "Falha na conexão." });
    } finally {
      setEnviando(false);
    }
  }

  async function handlePDF() {
    setGerandoPDF(true);
    try {
      const res = await fetch(`/api/admin/pdf/aluno?alunoId=${alunoId}&periodo=${periodo}`);
      if (!res.ok) {
        const d = await res.json();
        alert(d.erro ?? "Erro ao gerar PDF.");
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `memory-day_aluno_${nomeAluno.replace(/\s+/g, "-")}_${periodo}d.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Falha na conexão ao gerar PDF.");
    } finally {
      setGerandoPDF(false);
    }
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="font-orbitron text-[10px] tracking-[0.4em] text-amber-600/70 uppercase mb-1">
            Aluno
          </p>
          <h1 className="text-2xl font-bold text-slate-800">
            <span className="text-gradient font-orbitron">{nomeAluno}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">{nomeTurma}</p>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Botão adicionar registro */}
          <button
            onClick={abrirForm}
            className="px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all
              bg-amber-50 border border-amber-300 text-amber-700
              hover:bg-amber-100 hover:border-amber-400
              flex items-center gap-2"
          >
            + Adicionar registro
          </button>

          {/* PDF do aluno */}
          <select
            value={periodo}
            onChange={(e) => setPeriodo(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700
              focus:outline-none focus:border-amber-400 transition"
          >
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>{p.label}</option>
            ))}
          </select>
          <button
            onClick={handlePDF}
            disabled={gerandoPDF}
            className="px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all
              bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
              hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white flex items-center gap-2 shadow-sm"
          >
            {gerandoPDF ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Gerando...
              </>
            ) : "Gerar PDF do aluno"}
          </button>
        </div>
      </div>

      {/* Banner de resultado */}
      {mensagem && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium border ${
          mensagem.tipo === "ok"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {mensagem.texto}
        </div>
      )}

      {/* Formulário de novo registro */}
      {formAberto && (
        <div className="glass-card rounded-xl p-5 mb-5 border border-amber-200 bg-amber-50/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-orbitron">
              Novo registro (admin)
            </h2>
            <button
              onClick={() => { setFormAberto(false); setMensagem(null); }}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleEnviar} className="space-y-4">
            {/* Data */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                Data do registro
              </label>
              <input
                type="date"
                value={novoData}
                onChange={(e) => setNovoData(e.target.value)}
                required
                className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-800
                  focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition w-full sm:w-auto"
              />
            </div>

            {/* Matéria */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                Matéria
              </label>
              {carregandoMaterias ? (
                <p className="text-sm text-slate-400">Carregando matérias...</p>
              ) : (
                <select
                  value={novoSubjectId}
                  onChange={(e) => setNovoSubjectId(e.target.value)}
                  required
                  className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-800
                    focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition w-full sm:w-72"
                >
                  <option value="">Selecione uma matéria…</option>
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Texto */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                Texto do registro
                <span className="normal-case font-normal text-slate-400 ml-1">(mín. 20 caracteres)</span>
              </label>
              <textarea
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                required
                rows={5}
                placeholder="Escreva o relato do aluno sobre o que aprendeu nesta aula…"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800
                  focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition
                  resize-y placeholder:text-slate-300"
              />
              <p className="text-xs text-slate-400 mt-1">
                {novoTexto.trim().length} caracteres
                {novoTexto.trim().length > 0 && novoTexto.trim().length < 20 && (
                  <span className="text-red-400 ml-1">— faltam {20 - novoTexto.trim().length}</span>
                )}
              </p>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={enviando || !novoData || !novoSubjectId || novoTexto.trim().length < 20}
                className="px-5 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all
                  bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
                  hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
                  disabled:opacity-40 disabled:cursor-not-allowed
                  text-white flex items-center gap-2 shadow-sm"
              >
                {enviando ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Analisando com IA…
                  </>
                ) : "Salvar e analisar"}
              </button>
              <button
                type="button"
                onClick={() => { setFormAberto(false); setMensagem(null); }}
                className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Seletor de dia */}
      <div className="glass-card rounded-xl px-5 py-4 mb-5 flex items-center gap-4">
        <label className="text-xs font-semibold uppercase tracking-widest text-amber-700/80 shrink-0">
          Ver registros do dia
        </label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-800
            focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        />
      </div>

      {/* Registros do dia */}
      {carregando ? (
        <div className="flex items-center justify-center py-10 gap-3 text-slate-400">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-sm">Carregando registros...</span>
        </div>
      ) : registros.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-slate-500 text-sm">Nenhum registro neste dia.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {registros.map((reg) => {
            const nivel = labelNivel(reg.nivelIA);
            return (
              <div key={reg.id} className="glass-card rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-yellow-50/60 flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    {reg.materia.nome}
                    {reg.quantidadeAulas > 1 && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                        {reg.quantidadeAulas} aulas
                      </span>
                    )}
                  </span>
                  {nivel && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${corNivel(reg.nivelIA)}`}>
                      {nivel}
                    </span>
                  )}
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                      Registro do aluno
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">{reg.textoDoAluno}</p>
                  </div>
                  {reg.lacunasIA && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 leading-relaxed">{reg.lacunasIA.resumo}</p>
                      {reg.lacunasIA.lacunas.length > 0 && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                          <p className="text-[10px] font-orbitron tracking-widest text-amber-600 uppercase mb-1.5">
                            Lacunas
                          </p>
                          <ul className="space-y-1">
                            {reg.lacunasIA.lacunas.map((l, i) => (
                              <li key={i} className="text-xs text-slate-600 flex gap-2">
                                <span className="text-amber-500 shrink-0">{i + 1}.</span>{l}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
