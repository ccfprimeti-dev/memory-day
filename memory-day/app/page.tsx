import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";

// Página raiz: redireciona para o dashboard correto ou para o login
export default async function Home() {
  const sessao = await getSessao();

  if (sessao.usuario) {
    if (sessao.usuario.papel === "ALUNO")     redirect("/aluno/dashboard");
    if (sessao.usuario.papel === "ADMIN")     redirect("/admin");
    redirect("/professor/dashboard");
  }

  redirect("/login");
}
