"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ParticleText from "@/components/ParticleText";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const dados = await res.json();
      if (!res.ok) { setErro(dados.erro ?? "Credenciais inválidas."); return; }
      router.push(dados.papel === "ALUNO" ? "/aluno/dashboard" : "/professor/dashboard");
    } catch {
      setErro("Falha na conexão.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">

      {/* ── HERO ─────────────────────────────────── */}
      <div className="text-center mb-10 select-none">

        {/* Logo com halo pulsante */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute w-28 h-28 rounded-full bg-amber-400/20 blur-2xl animate-pulse" />
          <div className="absolute w-20 h-20 rounded-full bg-slate-800/10 blur-xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="relative w-20 h-20 rounded-2xl tech-card flex items-center justify-center p-3">
            <img src="/logo.svg" alt="Memory Day" className="w-full h-full animate-float" />
          </div>
        </div>

        {/* Nome principal — partículas interativas */}
        <div className="w-full max-w-lg mx-auto mb-2">
          <ParticleText />
        </div>

        {/* Linha decorativa */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-500" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-500" />
        </div>

        {/* Tagline */}
        <p className="font-orbitron text-[11px] tracking-[0.45em] uppercase"
          style={{
            background: "linear-gradient(90deg, #1e293b, #d97706, #f59e0b, #d97706, #1e293b)",
            backgroundSize: "300% 100%",
            animation: "borderFlow 5s linear infinite",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
          Aprenda · Registre · Evolua
        </p>
      </div>

      {/* ── FORMULÁRIO ───────────────────────────── */}
      <div className="w-full max-w-sm relative">
        {/* Borda fina animada */}
        <div className="absolute inset-0 rounded-2xl z-0 opacity-40"
          style={{ background: "linear-gradient(90deg, #1e293b, #d97706, #f59e0b, #1e293b)", backgroundSize: "300% 100%", animation: "borderFlow 4s linear infinite" }}
        />

        <div className="relative z-10 m-[1.5px] rounded-[14px] bg-white backdrop-blur-xl p-7 shadow-md shadow-slate-200/70">

            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-slate-800 to-amber-500" />
              <p className="font-orbitron text-xs tracking-[0.3em] text-slate-500 uppercase">
                Acesso à plataforma
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[10px] font-orbitron tracking-[0.3em] text-slate-500 uppercase mb-1.5">
                  E-mail
                </label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com" required autoComplete="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400
                    focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                    transition-all duration-200"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-[10px] font-orbitron tracking-[0.3em] text-slate-500 uppercase mb-1.5">
                  Senha
                </label>
                <input
                  type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400
                    focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                    transition-all duration-200"
                />
              </div>

              {erro && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-600">
                  <span>⚠</span> {erro}
                </div>
              )}

              <button type="submit" disabled={carregando}
                className="w-full mt-1 py-3 rounded-lg font-orbitron text-xs font-bold tracking-[0.3em] uppercase
                  bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
                  hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
                  disabled:opacity-40 disabled:cursor-not-allowed
                  text-white transition-all duration-300 shadow-sm
                  flex items-center justify-center gap-2"
              >
                {carregando
                  ? <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Autenticando...</>
                  : "Iniciar Sessão ›"}
              </button>
            </form>

            {/* Contas demo */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-[10px] font-orbitron tracking-[0.3em] text-slate-400 uppercase mb-3">
                Contas demo · senha: senha123
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Alunos", items: ["aluno1@escola.dev", "aluno2@escola.dev"] },
                  { label: "Professores", items: ["prof.mat@escola.dev", "prof.gram@escola.dev"] },
                ].map((col) => (
                  <div key={col.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-[10px] font-orbitron tracking-widest text-amber-600/70 uppercase mb-1.5">{col.label}</p>
                    {col.items.map((item) => (
                      <button key={item} onClick={() => setEmail(item)}
                        className="block text-[11px] text-slate-500 hover:text-amber-600 transition-colors w-full text-left py-0.5">
                        {item}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
        </div>
      </div>

      {/* Link cadastro */}
      <p className="mt-6 text-xs text-slate-600">
        Não tem conta?{" "}
        <Link href="/cadastro" className="text-amber-600 hover:text-amber-500 font-orbitron tracking-wide transition">
          Criar conta
        </Link>
      </p>

      {/* Footer */}
      <p className="mt-4 font-orbitron text-[10px] tracking-[0.3em] text-slate-700 uppercase">
        Memory Day © 2026 · Powered by AI
      </p>
    </div>
  );
}
