"use client";
import { useState } from "react";
import { FeedbackPanel } from "./FeedbackPanel";
import type { FeedbackIA } from "@/types";

interface AulaCardProps {
  subjectId:    string;
  nomeMateria:  string;
  data:         string;
  textoInicial?: string;
  feedbackInicial?: FeedbackIA | null;
  quantidadeAulas?: number;
}

export function AulaCard({ subjectId, nomeMateria, data, textoInicial = "", feedbackInicial = null, quantidadeAulas = 1 }: AulaCardProps) {
  const [texto, setTexto] = useState(textoInicial);
  const [feedback, setFeedback] = useState<FeedbackIA | null>(feedbackInicial);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(!!feedbackInicial);

  async function handleEnviar() {
    if (texto.trim().length < 20) { setErro("Escreva pelo menos 20 caracteres."); return; }
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, texto, data }),
      });
      const dados = await res.json();
      if (!res.ok) { setErro(dados.erro ?? "Erro ao enviar."); return; }
      setFeedback(dados.lacunasIA);
      setEnviado(true);
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-yellow-50/60">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-800">{nomeMateria}</h3>
          {quantidadeAulas > 1 && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
              {quantidadeAulas} aulas
            </span>
          )}
        </div>
        {enviado && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
            ✓ Enviado
          </span>
        )}
      </div>

      {/* Textarea */}
      <div className="px-5 py-4">
        <label className="block text-xs font-semibold uppercase tracking-widest text-amber-600/80 mb-2">
          O que você aprendeu hoje?
        </label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          placeholder="Descreva com suas próprias palavras o que foi ensinado, o que você entendeu e o que ficou com dúvida..."
          disabled={carregando}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700
            placeholder-slate-400 focus:outline-none focus:border-amber-400
            focus:ring-2 focus:ring-amber-100 resize-none transition"
        />
        {erro && <p className="text-xs text-red-500 mt-1">{erro}</p>}

        <div className="mt-3 flex justify-end">
          <button
            onClick={handleEnviar}
            disabled={carregando || !texto.trim()}
            className="px-5 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all
              bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
              hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white flex items-center gap-2 shadow-sm"
          >
            {carregando && (
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            {carregando ? "Analisando..." : enviado ? "Reanalisar" : "Enviar e analisar"}
          </button>
        </div>
      </div>

      {feedback && <FeedbackPanel feedback={feedback} nomeMateria={nomeMateria} />}
    </div>
  );
}
