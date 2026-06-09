import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import Link from "next/link";
import LogoutButton from "@/components/ui/LogoutButton";

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao();
  if (!sessao.usuario) redirect("/login");
  if (sessao.usuario.papel !== "PROFESSOR") redirect("/aluno/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="glass sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/professor/dashboard" className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="Logo" className="w-7 h-7" />
              <span className="font-orbitron font-bold text-sm tracking-widest text-gradient-gold">
                MEMORY DAY
              </span>
            </Link>
            <Link href="/professor/dashboard"
              className="hidden sm:block px-3 py-1.5 rounded-lg text-xs font-orbitron tracking-widest text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition uppercase">
              Relatórios
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block font-orbitron tracking-wide">
              {sessao.usuario.nome.split(" ")[0]}
            </span>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
