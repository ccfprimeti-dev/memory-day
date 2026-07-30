// Página de importação de alunos em massa via planilha Excel/CSV.
import { getSessao } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ImportarAlunos } from "@/components/admin/ImportarAlunos";

export default async function ImportarAlunosPage() {
  const sessao = await getSessao();
  if (!sessao.usuario || sessao.usuario.papel !== "ADMIN") redirect("/login");

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin" className="hover:text-amber-600 transition">← Painel</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium">Importar alunos</span>
      </div>

      <div className="mb-8">
        <p className="font-orbitron text-[10px] tracking-[0.4em] text-amber-600/70 uppercase mb-1">
          Importação em massa
        </p>
        <h1 className="text-2xl font-bold text-slate-800">
          Importar <span className="text-gradient font-orbitron">alunos</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Cadastre vários alunos de uma vez via planilha .xlsx ou .csv.
        </p>
      </div>

      <div className="max-w-xl">
        <ImportarAlunos />
      </div>
    </div>
  );
}
