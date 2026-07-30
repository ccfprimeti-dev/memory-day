import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import Link from "next/link";
import LogoutButton from "@/components/ui/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao();
  if (!sessao.usuario)               redirect("/login");
  if (sessao.usuario.papel !== "ADMIN") redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="glass sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-3">
              <img src="/prime-escudo.png" alt="Prime Bilingual School" className="h-8 w-auto" />
              <div className="hidden sm:flex flex-col leading-none">
                <span className="font-orbitron font-bold text-[11px] tracking-widest text-gradient-gold">
                  MEMORY DAY
                </span>
                <span className="text-[9px] tracking-[0.2em] text-slate-400 uppercase mt-0.5">
                  Prime Bilingual School
                </span>
              </div>
            </Link>
            <span className="hidden sm:inline text-[10px] font-orbitron tracking-[0.3em] uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block font-orbitron tracking-wide">
              {sessao.usuario.nome.split(" ")[0]}
            </span>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
