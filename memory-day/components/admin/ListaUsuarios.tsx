"use client";
import { useState } from "react";
import { RedefinirSenhaModal } from "./RedefinirSenhaModal";

interface Usuario {
  id:       string;
  nome:     string;
  email:    string;
  papel:    string;
  turmaId:  string | null;
  turma:    { nome: string } | null;
}

interface Props {
  usuarios: Usuario[];
}

function labelPapel(p: string) {
  if (p === "ADMIN")     return "Admin";
  if (p === "PROFESSOR") return "Professor";
  return "Aluno";
}

function corPapel(p: string) {
  if (p === "ADMIN")     return "text-purple-700 bg-purple-50 border-purple-200";
  if (p === "PROFESSOR") return "text-blue-700 bg-blue-50 border-blue-200";
  return "text-amber-700 bg-amber-50 border-amber-200";
}

export function ListaUsuarios({ usuarios }: Props) {
  const [modal,   setModal]   = useState<{ userId: string; nome: string } | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [busca,   setBusca]   = useState("");

  const filtrados = usuarios.filter(u =>
    u.nome.toLowerCase().includes(busca.toLowerCase()) ||
    u.email.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      {/* Busca */}
      <input
        type="search"
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por nome ou e-mail…"
        className="w-full mb-4 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm
          focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
      />

      {sucesso && (
        <div className="mb-4 rounded-lg px-4 py-3 text-sm font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
          {sucesso}
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-yellow-50/60">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
            {filtrados.length} usuário{filtrados.length !== 1 ? "s" : ""}
          </p>
        </div>

        {filtrados.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Nenhum usuário encontrado.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtrados.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100 border border-amber-200 flex items-center justify-center shrink-0">
                  <span className="font-bold text-sm text-amber-800">{u.nome.charAt(0)}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{u.nome}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>

                {/* Papel + turma */}
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${corPapel(u.papel)}`}>
                    {labelPapel(u.papel)}
                  </span>
                  {u.turma && (
                    <span className="text-[10px] text-slate-400">{u.turma.nome}</span>
                  )}
                </div>

                {/* Botão redefinir — ADMIN não pode redefinir própria senha aqui */}
                <button
                  onClick={() => { setSucesso(null); setModal({ userId: u.id, nome: u.nome }); }}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border
                    border-slate-200 text-slate-600 bg-white hover:bg-amber-50 hover:text-amber-700
                    hover:border-amber-300 transition"
                >
                  Redefinir senha
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <RedefinirSenhaModal
          userId={modal.userId}
          nomeUsuario={modal.nome}
          onFechar={() => setModal(null)}
          onSucesso={() => {
            setModal(null);
            setSucesso(`Senha de ${modal.nome} redefinida com sucesso.`);
          }}
        />
      )}
    </>
  );
}
