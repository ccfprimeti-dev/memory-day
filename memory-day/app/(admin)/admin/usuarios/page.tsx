// Gestão de usuários — lista nome, email, papel e turma. Senha NUNCA exibida.
import { getSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ListaUsuarios } from "@/components/admin/ListaUsuarios";

export default async function UsuariosPage() {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") redirect("/login");

  // senhaHash NUNCA incluso — select explícito
  const usuarios = await prisma.user.findMany({
    select: {
      id:      true,
      nome:    true,
      email:   true,
      papel:   true,
      turmaId: true,
      turma:   { select: { nome: true } },
    },
    orderBy: [{ papel: "asc" }, { nome: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin" className="hover:text-amber-600 transition">← Painel</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium">Usuários</span>
      </div>

      <div className="mb-8">
        <p className="font-orbitron text-[10px] tracking-[0.4em] text-amber-600/70 uppercase mb-1">
          Gestão
        </p>
        <h1 className="text-2xl font-bold text-slate-800">
          <span className="text-gradient font-orbitron">Usuários</span> cadastrados
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Senhas não são exibidas — use "Redefinir senha" para alterar.
        </p>
      </div>

      <ListaUsuarios usuarios={usuarios} />
    </div>
  );
}
