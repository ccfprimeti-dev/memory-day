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
  const [modal,          setModal]          = useState<{ userId: string; nome: string } | null>(null);
  const [confirmDelete,  setConfirmDelete]  = useState<{ userId: string; nome: string } | null>(null);
  const [removendo,      setRemovendo]      = useState(false);
  const [lista,          setLista]          = useState(usuarios);
  const [sucesso,        setSucesso]        = useState<string | null>(null);
  const [erro,           setErro]           = useState<string | null>(null);
  const [busca,          setBusca]          = useState("");

  async function handleRemover(userId: string, nome: string) {
    setRemovendo(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${userId}`, { method: "DELETE" });
      const d   = await res.json();
      if (!res.ok) { setErro(d.erro ?? "Erro ao remover usuário."); return; }
      setLista(prev => prev.filter(u => u.id !== userId));
      setSucesso(`${nome} removido com sucesso.`);
      setConfirmDelete(null);
    } catch {
      setErro("Falha na conexão.");
    } finally {
      setRemovendo(false);
    }
  }

  const filtrados = lista.filter(u =>
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
      {erro && (
        <div className="mb-4 rounded-lg px-4 py-3 text-sm font-medium bg-red-50 border border-red-200 text-red-700">
          {erro}
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

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setSucesso(null); setErro(null); setModal({ userId: u.id, nome: u.nome }); }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                      border-slate-200 text-slate-600 bg-white hover:bg-amber-50 hover:text-amber-700
                      hover:border-amber-300 transition"
                  >
                    Redefinir senha
                  </button>
                  {u.papel !== "ADMIN" && (
                    <button
                      onClick={() => { setSucesso(null); setErro(null); setConfirmDelete({ userId: u.id, nome: u.nome }); }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                        border-red-200 text-red-600 bg-white hover:bg-red-50 hover:border-red-300 transition"
                    >
                      Remover
                    </button>
                  )}
                </div>
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

      {/* Modal de confirmação de remoção */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Remover usuário</h2>
            <p className="text-sm text-slate-600 mb-1">
              Tem certeza que deseja remover <strong>{confirmDelete.nome}</strong>?
            </p>
            <p className="text-xs text-red-500 mb-5">
              Todos os registros e diários deste usuário serão apagados permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={removendo}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-slate-200
                  text-slate-600 bg-white hover:bg-slate-50 transition disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRemover(confirmDelete.userId, confirmDelete.nome)}
                disabled={removendo}
                className="flex-1 py-2 rounded-lg text-sm font-semibold
                  bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-40"
              >
                {removendo ? "Removendo..." : "Confirmar remoção"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
