"use client";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TurmaResumo, NivelEnsino } from "@/types";
import { MAX_AULAS } from "@/types";

interface MateriaPublica {
  id:          string;
  nome:        string;
  turmaId:     string;
  professorId: string | null;
}

const PREVIEW_EF2 = ["Gramática", "Matemática", "Ciências", "História", "Inglês", "Física", "Álgebra", "+ 6 mais"];
const PREVIEW_EM  = ["Branding", "Chemistry", "Biologia", "Projeto", "Pitch", "+ todas EF2"];

type Etapa = "nivel" | "formulario";

export default function CadastroPage() {
  const router = useRouter();

  const [etapa, setEtapa] = useState<Etapa>("nivel");
  const [papel, setPapel] = useState<"ALUNO" | "PROFESSOR">("ALUNO");
  const [nivel, setNivel] = useState<NivelEnsino | null>(null);

  const [nome, setNome]                     = useState("");
  const [email, setEmail]                   = useState("");
  const [senha, setSenha]                   = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [turmaId, setTurmaId]   = useState("");
  const [turmaIds, setTurmaIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [materiasPorTurma, setMateriasPorTurma]     = useState<Record<string, MateriaPublica[]>>({});
  const [carregandoMaterias, setCarregandoMaterias] = useState<Record<string, boolean>>({});

  const [turmas, setTurmas]                     = useState<TurmaResumo[]>([]);
  const [carregandoTurmas, setCarregandoTurmas] = useState(false);
  const [enviando, setEnviando]                 = useState(false);
  const [erro, setErro]                         = useState<string | null>(null);

  const turmasFiltradas = nivel
    ? turmas.filter((t) => t.nivelEnsino === nivel)
    : turmas;

  useEffect(() => {
    if (etapa !== "formulario") return;
    setCarregandoTurmas(true);
    fetch("/api/turmas")
      .then((r) => r.json())
      .then((d: TurmaResumo[]) => {
        setTurmas(d);
        const filtradas = nivel ? d.filter((t) => t.nivelEnsino === nivel) : d;
        if (filtradas.length > 0) setTurmaId(filtradas[0].id);
      })
      .finally(() => setCarregandoTurmas(false));
  }, [etapa]);

  function toggleTurmaProf(id: string) {
    setTurmaIds((prev) => {
      const next = prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id];
      if (!prev.includes(id) && !materiasPorTurma[id]) {
        setCarregandoMaterias((c) => ({ ...c, [id]: true }));
        fetch(`/api/materias/publicas?turmaId=${id}`)
          .then((r) => r.json())
          .then((d: MateriaPublica[]) => setMateriasPorTurma((m) => ({ ...m, [id]: d })))
          .finally(() => setCarregandoMaterias((c) => ({ ...c, [id]: false })));
      }
      if (prev.includes(id)) {
        const ids = (materiasPorTurma[id] ?? []).map((m) => m.id);
        setSubjectIds((s) => s.filter((sid) => !ids.includes(sid)));
      }
      return next;
    });
  }

  function toggleMateria(id: string) {
    setSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function validar(): string | null {
    if (!nome.trim())  return "Nome é obrigatório.";
    if (!email.trim()) return "E-mail é obrigatório.";
    if (senha.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
    if (senha !== confirmarSenha) return "As senhas não coincidem.";
    if (papel === "ALUNO" && !turmaId) return "Selecione sua turma.";
    if (papel === "PROFESSOR" && turmaIds.length === 0) return "Selecione pelo menos uma turma.";
    if (papel === "PROFESSOR" && subjectIds.length === 0) return "Selecione pelo menos uma matéria.";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const msgErro = validar();
    if (msgErro) { setErro(msgErro); return; }
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          papel === "ALUNO"
            ? { nome, email, senha, papel, turmaId }
            : { nome, email, senha, papel, turmaIds, subjectIds }
        ),
      });
      const dados = await res.json();
      if (!res.ok) { setErro(dados.erro ?? "Erro ao criar conta."); return; }
      router.push(dados.redirectTo);
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  // ── ETAPA 1 — Seleção de nível ─────────────────────────────────────────────
  if (etapa === "nivel") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">

        <div className="text-center mb-10 select-none">
          <Link href="/login"
            className="inline-flex items-center gap-2 mb-6 text-slate-500 hover:text-amber-600 transition text-xs font-orbitron tracking-widest uppercase">
            ← Voltar ao login
          </Link>
          <h1 className="font-orbitron font-black text-4xl tracking-[0.15em] text-gradient">
            MEMORY DAY
          </h1>
          <p className="font-orbitron text-xs tracking-[0.4em] text-amber-600/60 uppercase mt-2 mb-8">
            Criar conta
          </p>

          {/* Seletor de papel */}
          <div className="flex justify-center gap-2 mb-10">
            {(["ALUNO", "PROFESSOR"] as const).map((p) => (
              <button key={p} onClick={() => setPapel(p)}
                className={`px-5 py-2 rounded-full text-xs font-orbitron tracking-widest uppercase transition border
                  ${papel === p
                    ? "bg-amber-50 border-amber-400 text-amber-700"
                    : "bg-white border-slate-200 text-slate-500 hover:border-amber-300"}`}>
                {p === "ALUNO" ? "Sou Aluno" : "Sou Professor"}
              </button>
            ))}
          </div>
        </div>

        {papel === "ALUNO" ? (
          <div className="w-full max-w-2xl">
            <p className="text-center font-orbitron text-xs tracking-[0.4em] text-slate-500 uppercase mb-6">
              Selecione seu nível de ensino
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* EF2 */}
              <button
                onClick={() => { setNivel("EF2"); setEtapa("formulario"); }}
                className="group text-left rounded-2xl border border-amber-200 bg-white/80 p-6
                  hover:border-amber-400 hover:bg-amber-50/50 transition-all duration-200
                  hover:shadow-md shadow-sm relative overflow-hidden">

                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-cyan-100/60 blur-2xl group-hover:bg-cyan-200/60 transition" />

                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200
                      flex items-center justify-center text-amber-800 text-lg font-orbitron font-black">
                      F
                    </div>
                    <div>
                      <p className="text-[10px] font-orbitron tracking-[0.3em] text-amber-600/70 uppercase">
                        Ensino
                      </p>
                      <h2 className="text-base font-bold text-slate-800 font-orbitron tracking-wide leading-tight">
                        Fundamental 2
                      </h2>
                    </div>
                  </div>

                  <div className="flex gap-3 mb-5">
                    <div className="flex-1 rounded-lg bg-cyan-50 border border-cyan-200 px-3 py-2 text-center">
                      <p className="text-xl font-bold text-amber-700 font-orbitron">{MAX_AULAS.EF2}</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">aulas / dia</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-cyan-50 border border-cyan-200 px-3 py-2 text-center">
                      <p className="text-xl font-bold text-amber-700 font-orbitron">13</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">matérias</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {PREVIEW_EF2.map((m) => (
                      <span key={m}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                        {m}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs font-orbitron tracking-widest text-amber-700 uppercase group-hover:text-amber-600 transition">
                    Selecionar →
                  </p>
                </div>
              </button>

              {/* EM */}
              <button
                onClick={() => { setNivel("EM"); setEtapa("formulario"); }}
                className="group text-left rounded-2xl border border-slate-300 bg-white/80 p-6
                  hover:border-slate-400 hover:bg-slate-50/80 transition-all duration-200
                  hover:shadow-md shadow-sm relative overflow-hidden">

                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-slate-200/60 blur-2xl group-hover:bg-amber-100/40 transition" />

                <div className="relative">
                  <span className="absolute top-0 right-0 text-[9px] font-orbitron tracking-widest uppercase
                    bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-300">
                    + conteúdo
                  </span>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700
                      flex items-center justify-center text-amber-400 text-lg font-orbitron font-black">
                      M
                    </div>
                    <div>
                      <p className="text-[10px] font-orbitron tracking-[0.3em] text-slate-500/70 uppercase">
                        Ensino
                      </p>
                      <h2 className="text-base font-bold text-slate-800 font-orbitron tracking-wide leading-tight">
                        Médio
                      </h2>
                    </div>
                  </div>

                  <div className="flex gap-3 mb-5">
                    <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-center">
                      <p className="text-xl font-bold text-slate-800 font-orbitron">{MAX_AULAS.EM}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">aulas / dia</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-center">
                      <p className="text-xl font-bold text-slate-800 font-orbitron">18</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">matérias</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {PREVIEW_EM.map((m) => (
                      <span key={m}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                        {m}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs font-orbitron tracking-widest text-slate-700 uppercase group-hover:text-amber-600 transition">
                    Selecionar →
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <p className="text-center text-sm text-slate-500 mb-6">
              Professores podem lecionar em turmas de qualquer nível.
            </p>
            <button
              onClick={() => { setNivel(null); setEtapa("formulario"); }}
              className="w-full py-3 rounded-xl font-orbitron text-xs font-bold tracking-[0.3em] uppercase
                bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
                hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
                text-white transition-all duration-300">
              Continuar →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── ETAPA 2 — Formulário de cadastro ───────────────────────────────────────
  const labelNivel = nivel === "EM" ? "Ensino Médio" : nivel === "EF2" ? "Fundamental 2" : "";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">

      <div className="text-center mb-8 select-none">
        <button onClick={() => { setEtapa("nivel"); setErro(null); }}
          className="inline-flex items-center gap-2 mb-4 text-slate-500 hover:text-amber-600 transition text-xs font-orbitron tracking-widest uppercase">
          ← Voltar
        </button>
        <h1 className="font-orbitron font-black text-3xl tracking-[0.15em] text-gradient">
          MEMORY DAY
        </h1>
        {nivel && (
          <span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[10px] font-orbitron tracking-widest uppercase
            ${nivel === "EM"
              ? "bg-slate-100 border border-slate-300 text-slate-700"
              : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${nivel === "EM" ? "bg-slate-700" : "bg-amber-500"}`} />
            {labelNivel} · {MAX_AULAS[nivel]} aulas/dia
          </span>
        )}
      </div>

      <div className="w-full max-w-md relative">
        <div className="absolute inset-0 rounded-2xl z-0 opacity-40"
          style={{
            background: "linear-gradient(90deg, #1e293b, #d97706, #f59e0b, #1e293b)",
            backgroundSize: "300% 100%",
            animation: "borderFlow 4s linear infinite",
          }} />

        <div className="relative z-10 m-[1.5px] rounded-[14px] bg-white backdrop-blur-xl p-7 space-y-4 shadow-md shadow-slate-200/70">

          {papel === "PROFESSOR" && (
            <div className="grid grid-cols-2 gap-2">
              {(["ALUNO", "PROFESSOR"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPapel(p)}
                  className={`py-2 rounded-lg text-xs font-orbitron tracking-widest uppercase transition border
                    ${papel === p
                      ? "bg-amber-50 border-amber-400 text-amber-700"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:border-cyan-300"}`}>
                  {p === "ALUNO" ? "Aluno" : "Professor"}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-[10px] font-orbitron tracking-[0.3em] text-slate-500 uppercase mb-1.5">Nome completo</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Seu nome"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400
                  focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition" />
            </div>

            <div>
              <label className="block text-[10px] font-orbitron tracking-[0.3em] text-slate-500 uppercase mb-1.5">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400
                  focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition" />
            </div>

            <div>
              <label className="block text-[10px] font-orbitron tracking-[0.3em] text-slate-500 uppercase mb-1.5">Senha</label>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required
                placeholder="Mínimo 6 caracteres" minLength={6}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400
                  focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition" />
            </div>

            <div>
              <label className="block text-[10px] font-orbitron tracking-[0.3em] text-slate-500 uppercase mb-1.5">Confirmar senha</label>
              <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required
                placeholder="Repita a senha"
                className={`w-full bg-slate-50 border rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400
                  focus:outline-none focus:ring-2 transition
                  ${confirmarSenha && senha !== confirmarSenha
                    ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                    : "border-slate-200 focus:border-cyan-400 focus:ring-cyan-100"}`} />
              {confirmarSenha && senha !== confirmarSenha && (
                <p className="text-[10px] text-red-500 mt-1">As senhas não coincidem.</p>
              )}
            </div>

            {/* ALUNO: dropdown de turma */}
            {papel === "ALUNO" && (
              <div>
                <label className="block text-[10px] font-orbitron tracking-[0.3em] text-slate-500 uppercase mb-1.5">
                  Sua turma
                </label>
                {carregandoTurmas ? (
                  <p className="text-xs text-slate-400">Carregando turmas...</p>
                ) : turmasFiltradas.length === 0 ? (
                  <p className="text-xs text-amber-600">Nenhuma turma disponível para este nível.</p>
                ) : (
                  <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800
                      focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition">
                    {turmasFiltradas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome} — {t.anoLetivo}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* PROFESSOR: turmas + matérias */}
            {papel === "PROFESSOR" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-orbitron tracking-[0.3em] text-slate-500 uppercase mb-2">
                    Turmas em que leciona
                  </label>
                  {carregandoTurmas ? (
                    <p className="text-xs text-slate-400">Carregando...</p>
                  ) : (
                    <div className="space-y-2">
                      {turmas.map((t) => (
                        <label key={t.id}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition
                            ${turmaIds.includes(t.id)
                              ? "bg-amber-50 border-amber-300 text-amber-800"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-200"}`}>
                          <input type="checkbox" checked={turmaIds.includes(t.id)}
                            onChange={() => toggleTurmaProf(t.id)} className="accent-amber-600" />
                          <span className="text-sm flex-1">{t.nome} — {t.anoLetivo}</span>
                          <span className={`text-[9px] font-orbitron px-1.5 py-0.5 rounded border
                            ${t.nivelEnsino === "EM"
                              ? "text-slate-600 border-slate-300 bg-slate-100"
                              : "text-amber-700 border-amber-200 bg-amber-50"}`}>
                            {t.nivelEnsino}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {turmaIds.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-orbitron tracking-[0.3em] text-slate-500 uppercase mb-2">
                      Matérias que vai lecionar
                    </label>
                    {turmaIds.map((tid) => {
                      const turma    = turmas.find((t) => t.id === tid);
                      const materias = materiasPorTurma[tid];
                      const loading  = carregandoMaterias[tid];
                      return (
                        <div key={tid} className="mb-3">
                          <p className="text-[10px] text-slate-500 font-orbitron tracking-widest uppercase mb-1.5 pl-1">
                            {turma?.nome}
                          </p>
                          {loading ? (
                            <p className="text-xs text-slate-400 pl-1">Carregando...</p>
                          ) : !materias || materias.length === 0 ? (
                            <p className="text-xs text-amber-600 pl-1">Nenhuma matéria cadastrada.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {materias.map((m) => (
                                <label key={m.id}
                                  className={`flex items-center gap-3 px-4 py-2 rounded-lg border cursor-pointer transition text-sm
                                    ${subjectIds.includes(m.id)
                                      ? "bg-amber-50 border-amber-300 text-amber-800"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-200"}`}>
                                  <input type="checkbox" checked={subjectIds.includes(m.id)}
                                    onChange={() => toggleMateria(m.id)} className="accent-amber-600" />
                                  <span className="flex-1">{m.nome}</span>
                                  {m.professorId && (
                                    <span className="text-[10px] text-slate-400 shrink-0">já atribuída</span>
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {erro && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-600">
                <span>⚠</span> {erro}
              </div>
            )}

            <button type="submit" disabled={enviando}
              className="w-full py-3 rounded-lg font-orbitron text-xs font-bold tracking-[0.3em] uppercase
                bg-gradient-to-r from-slate-900 via-amber-600 to-amber-400
                hover:from-slate-800 hover:via-amber-500 hover:to-amber-300
                disabled:opacity-40 text-white transition-all duration-300 flex items-center justify-center gap-2">
              {enviando
                ? <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Criando conta...</>
                : "Criar conta →"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            Já tem conta?{" "}
            <Link href="/login" className="text-amber-600 hover:text-amber-500 transition">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
