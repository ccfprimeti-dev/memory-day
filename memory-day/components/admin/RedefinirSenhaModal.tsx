"use client";
import { useState } from "react";

interface Props {
  userId: string;
  nomeUsuario: string;
  onFechar: () => void;
  onSucesso: () => void;
}

export function RedefinirSenhaModal({ userId, nomeUsuario, onFechar, onSucesso }: Props) {
  const [novaSenha,    setNovaSenha]    = useState("");
  const [confirmar,    setConfirmar]    = useState("");
  const [salvando,     setSalvando]     = useState(false);
  const [erro,         setErro]         = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    if (novaSenha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setSalvando(true);
    try {
      const res  = await fetch(`/api/admin/usuarios/${userId}/senha`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ novaSenha }),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.erro ?? "Erro ao redefinir senha."); return; }
      onSucesso();
    } catch {
      setErro("Falha na conexão.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}
    >
      <div className="glass-card rounded-2xl p-6 w-full max-w-sm mx-4 border border-amber-200 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-orbitron tracking-widest text-amber-700 uppercase">
              Redefinir senha
            </p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{nomeUsuario}</p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Nova senha
            </label>
            <input
              type="password"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm
                focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repita a senha"
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm
                focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
            />
          </div>
        </div>

        {erro && (
          <p className="mt-3 text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {erro}
          </p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all
              bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
              hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
              disabled:opacity-40 disabled:cursor-not-allowed text-white"
          >
            {salvando ? "Salvando…" : "Salvar nova senha"}
          </button>
          <button
            onClick={onFechar}
            className="px-4 py-2.5 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition border border-slate-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
