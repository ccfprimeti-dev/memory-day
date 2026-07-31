import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import Link from "next/link";
import LogoutButton from "@/components/ui/LogoutButton";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao();
  if (!sessao.usuario) redirect("/login");
  if (sessao.usuario.papel === "PROFESSOR") redirect("/professor/dashboard");
  if (sessao.usuario.papel === "ADMIN")     redirect("/admin");
  if (sessao.usuario.papel !== "ALUNO")     redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="glass sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/aluno/dashboard" className="flex items-center gap-3">
              <div className="h-8 w-9 overflow-hidden flex-shrink-0">
                <img src="/prime-logo.png" alt="Prime Bilingual School" className="h-8 w-auto" />
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="font-orbitron font-bold text-[11px] tracking-widest text-gradient-gold">
                  MEMORY DAY
                </span>
                <span className="text-[9px] tracking-[0.2em] text-slate-400 uppercase mt-0.5">
                  Prime Bilingual School
                </span>
              </div>
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {[
                { href: "/aluno/dashboard", label: "Hoje" },
                { href: "/aluno/historico", label: "Histórico" },
              ].map((link) => (
                <Link key={link.href} href={link.href}
                  className="px-3 py-1.5 rounded-lg text-xs font-orbitron tracking-widest text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition uppercase">
                  {link.label}
                </Link>
              ))}
            </div>
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
