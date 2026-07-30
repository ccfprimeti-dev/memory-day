"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [email,     setEmail]     = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [salvando,  setSalvando]  = useState(false);
  const [erro,      setErro]      = useState<string | null>(null);
  const [sucesso,   setSucesso]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setSalvando(true);
    try {
      const res  = await fetch("/api/auth/esqueci-senha", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, novaSenha }),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.erro ?? "Erro ao redefinir senha."); return; }
      setSucesso(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setErro("Falha na conexão.");
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
          <h1 className="text-2xl font-bold text-slate-800">Redefinir senha</h1>
          <p className="text-slate-500 text-sm mt-1">
            Informe seu e-mail e escolha uma nova senha.
          </p>
        </div>

        {sucesso ? (
          <div className="glass-card rounded-2xl p-6 text-center border border-emerald-200">
            <p className="text-emerald-700 font-semibold text-sm">Senha redefinida com sucesso!</p>
            <p className="text-slate-400 text-xs mt-1">Redirecionando para o login…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4 border border-amber-100">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                E-mail da conta
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm
                  focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                Nova senha
              </label>
              <input
                type="password"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                required
                autoComplete="new-password"
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
                required
                autoComplete="new-password"
                placeholder="Repita a nova senha"
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
              {salvando ? "Redefinindo…" : "Redefinir senha"}
            </button>

            <p className="text-center text-xs text-slate-400">
              <Link href="/login" className="hover:text-amber-600 transition">
                ← Voltar ao login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
