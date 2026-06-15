"use client";
// Captura erros de runtime nas páginas admin e exibe mensagem em vez de tela branca.
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin Error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center space-y-4">
        <p className="font-orbitron text-[10px] tracking-[0.4em] text-red-500 uppercase">
          Erro na área admin
        </p>
        <h2 className="text-xl font-bold text-slate-800">Algo deu errado</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          {error.message || "Erro inesperado ao carregar a página."}
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono">ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-2 px-5 py-2.5 rounded-lg text-sm font-semibold
            bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
            text-white hover:opacity-90 transition"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
