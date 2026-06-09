"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { FeedbackPanel } from "./FeedbackPanel";
import type { FeedbackIA } from "@/types";

interface Materia { id: string; nome: string; }
interface Props { materias: Materia[]; data: string; numero: number; }
interface DropPos { top: number; left: number; width: number; }

export function SelectSlot({ materias, data, numero }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [dropPos, setDropPos] = useState<DropPos>({ top: 0, left: 0, width: 0 });
  const [subjectId, setSubjectId] = useState("");
  const [texto, setTexto] = useState("");
  const [feedback, setFeedback] = useState<FeedbackIA | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);

  const materiaSelecionada = materias.find((m) => m.id === subjectId);

  function handleToggle() {
    if (!aberto && botaoRef.current) {
      const r = botaoRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setAberto((v) => !v);
  }

  useEffect(() => {
    if (!aberto) return;
    const fechar = () => setAberto(false);
    document.addEventListener("mousedown", fechar);
    window.addEventListener("scroll", fechar, true);
    return () => {
      document.removeEventListener("mousedown", fechar);
      window.removeEventListener("scroll", fechar, true);
    };
  }, [aberto]);

  function handleDropdownMouseDown(e: React.MouseEvent) { e.stopPropagation(); }

  async function handleEnviar() {
    if (!subjectId) { setErro("Selecione a aula primeiro."); return; }
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
      router.refresh();
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  // Dropdown via portal para escapar de stacking context
  const listaOpcoes = aberto && typeof document !== "undefined"
    ? createPortal(
        <div
          onMouseDown={handleDropdownMouseDown}
          style={{ position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="rounded-xl overflow-hidden bg-white border border-slate-200 shadow-lg shadow-slate-200/60"
        >
          {materias.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">
              Nenhuma matéria disponível
            </div>
          ) : (
            materias.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setSubjectId(m.id); setAberto(false); setErro(null); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center gap-3
                  ${subjectId === m.id
                    ? "bg-amber-50 text-amber-800"
                    : "text-slate-700 hover:bg-slate-50"}
                  ${i < materias.length - 1 ? "border-b border-slate-100" : ""}`}
              >
                <span className="w-1.5 h-4 rounded-full shrink-0"
                  style={{ background: `hsl(${(i * 47 + 180) % 360},60%,55%)` }} />
                {m.nome}
                {subjectId === m.id && (
                  <svg className="ml-auto h-3.5 w-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-amber-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-orbitron text-[10px] tracking-[0.4em] text-slate-400 uppercase">
            Aula {numero}
          </span>
          {enviado && materiaSelecionada && (
            <>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-slate-700 text-sm">{materiaSelecionada.nome}</span>
            </>
          )}
        </div>
        {enviado && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
            ✓ Enviado
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Seletor de matéria */}
        {!enviado && (
          <div>
            <label className="block text-[10px] font-orbitron tracking-[0.3em] text-slate-500 uppercase mb-2">
              Selecione a matéria
            </label>
            <button
              ref={botaoRef}
              type="button"
              onClick={handleToggle}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg
                bg-slate-50 border border-slate-200 text-sm transition
                hover:border-amber-300 focus:outline-none focus:border-amber-400
                focus:ring-2 focus:ring-amber-100"
            >
              <span className={materiaSelecionada ? "text-slate-700" : "text-slate-400"}>
                {materiaSelecionada ? materiaSelecionada.nome : "Escolha a aula de hoje…"}
              </span>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {listaOpcoes}
          </div>
        )}

        {/* Textarea */}
        {(subjectId || enviado) && (
          <div>
            <label className="block text-[10px] font-orbitron tracking-[0.3em] text-slate-500 uppercase mb-2">
              O que você aprendeu hoje?
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              placeholder="Descreva com suas próprias palavras o que foi ensinado, o que você entendeu e o que ficou com dúvida…"
              disabled={carregando || enviado}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700
                placeholder-slate-400 focus:outline-none focus:border-amber-400
                focus:ring-2 focus:ring-amber-100 resize-none transition disabled:opacity-60"
            />
          </div>
        )}

        {erro && <p className="text-xs text-red-500">{erro}</p>}

        {subjectId && !enviado && (
          <div className="flex justify-end">
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
              {carregando ? "Analisando…" : "Enviar e analisar"}
            </button>
          </div>
        )}
      </div>

      {feedback && materiaSelecionada && (
        <FeedbackPanel feedback={feedback} nomeMateria={materiaSelecionada.nome} />
      )}
    </div>
  );
}
