"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TrocarSenhaPage() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha,  setNovaSenha]  = useState("");
  const [confirmar,  setConfirmar]  = useState("");
  const [salvando,   setSalvando]   = useState(false);
  const [erro,       setErro]       = useState<string | null>(null);
  const [sucesso,    setSucesso]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (novaSenha.length < 6) {
      setErro("New password must be at least 6 characters.");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("Passwords do not match.");
      return;
    }

    setSalvando(true);
    try {
      const res  = await fetch("/api/auth/trocar-senha", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ senhaAtual, novaSenha }),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.erro ?? "Error changing password."); return; }
      setSucesso(true);
      // Redireciona para o dashboard após 2 segundos
      setTimeout(() => router.push("/aluno/dashboard"), 2000);
    } catch {
      setErro("Connection failed.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-amber-50/30">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img
            src="/prime-logo.png"
            alt="Prime Bilingual School"
            className="h-10 w-auto mx-auto mb-4 drop-shadow-sm"
          />
          <h1 className="text-2xl font-bold text-slate-800">Change password</h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter your current password to set a new one.
          </p>
        </div>

        {sucesso ? (
          <div className="glass-card rounded-2xl p-6 text-center border border-emerald-200">
            <p className="text-emerald-700 font-semibold text-sm">Password changed successfully!</p>
            <p className="text-slate-400 text-xs mt-1">Redirecting…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4 border border-amber-100">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                Current password
              </label>
              <input
                type="password"
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm
                  focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm
                  focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repeat new password"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm
                  focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
              />
            </div>

            {erro && (
              <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={salvando}
              className="w-full py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all
                bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
                hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
                disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              {salvando ? "Saving…" : "Change password"}
            </button>

            <p className="text-center text-xs text-slate-400">
              <Link href="/aluno/dashboard" className="hover:text-amber-600 transition">
                ← Back to dashboard
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
