"use client";
import { useState, useRef } from "react";

interface Falha {
  linha:  number;
  email:  string;
  motivo: string;
}

interface Resultado {
  importados: number;
  falhas:     Falha[];
}

export function ImportarAlunos() {
  const inputRef                          = useRef<HTMLInputElement>(null);
  const [arquivo,     setArquivo]         = useState<File | null>(null);
  const [enviando,    setEnviando]         = useState(false);
  const [resultado,   setResultado]       = useState<Resultado | null>(null);
  const [erro,        setErro]            = useState<string | null>(null);

  function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setArquivo(f);
    setResultado(null);
    setErro(null);
  }

  async function enviar() {
    if (!arquivo) return;
    setEnviando(true);
    setErro(null);
    setResultado(null);

    const form = new FormData();
    form.append("arquivo", arquivo);

    try {
      const res  = await fetch("/api/admin/importar-alunos", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) { setErro(json.erro ?? "Erro ao importar."); return; }
      setResultado(json as Resultado);
    } catch {
      setErro("Falha na conexão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Download do template */}
      <div className="glass-card rounded-xl p-5 border border-amber-100">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-3 font-orbitron">
          1. Baixe o modelo de planilha
        </p>
        <p className="text-sm text-slate-600 mb-3">
          Preencha com os dados dos alunos. O campo <strong>Turma</strong> deve ser o nome
          exato da turma cadastrada no sistema (ex.: <code className="bg-slate-100 px-1 rounded">1º A EM</code>).
        </p>
        <a
          href="/template-alunos.csv"
          download
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
            bg-slate-100 border border-slate-200 text-slate-700
            hover:bg-slate-200 transition"
        >
          ↓ Baixar template (.csv)
        </a>
      </div>

      {/* Upload */}
      <div className="glass-card rounded-xl p-5 border border-amber-100">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-3 font-orbitron">
          2. Envie a planilha preenchida
        </p>

        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer
            hover:border-amber-300 hover:bg-amber-50/30 transition"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={onArquivo}
          />
          {arquivo ? (
            <div>
              <p className="text-sm font-semibold text-slate-800">{arquivo.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                {(arquivo.size / 1024).toFixed(1)} KB — clique para trocar
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500">Clique para selecionar ou arraste aqui</p>
              <p className="text-xs text-slate-400 mt-1">.xlsx ou .csv</p>
            </div>
          )}
        </div>

        {arquivo && (
          <button
            onClick={enviar}
            disabled={enviando}
            className="mt-4 w-full py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all
              bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
              hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
              disabled:opacity-40 disabled:cursor-not-allowed text-white"
          >
            {enviando ? "Importando…" : "Importar alunos"}
          </button>
        )}
      </div>

      {/* Erro de comunicação */}
      {erro && (
        <div className="rounded-xl px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          {erro}
        </div>
      )}

      {/* Relatório de resultado */}
      {resultado && (
        <div className="glass-card rounded-xl overflow-hidden border border-slate-200">
          <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-yellow-50/60 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700 font-orbitron">
              Relatório de importação
            </p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{resultado.importados}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">importados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{resultado.falhas.length}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">falhas</p>
              </div>
            </div>

            {resultado.falhas.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Detalhes das falhas
                </p>
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                  {resultado.falhas.map((f, i) => (
                    <div key={i} className="px-3 py-2.5 flex items-start gap-3 text-xs bg-white">
                      <span className="shrink-0 font-orbitron text-slate-400">L{f.linha}</span>
                      <span className="text-slate-600 font-medium truncate">{f.email}</span>
                      <span className="text-red-500 ml-auto shrink-0">{f.motivo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultado.importados > 0 && resultado.falhas.length === 0 && (
              <p className="text-sm text-emerald-700 font-medium">
                Todos os alunos foram importados com sucesso.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
