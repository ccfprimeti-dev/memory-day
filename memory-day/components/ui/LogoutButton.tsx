"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function handleLogout() {
    setCarregando(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button onClick={handleLogout} disabled={carregando}
      className="px-3 py-1.5 rounded-lg font-orbitron text-[10px] tracking-[0.2em] uppercase border border-cyan-900/40 text-slate-600 hover:border-cyan-600/60 hover:text-cyan-400 hover:bg-cyan-900/10 transition disabled:opacity-40">
      {carregando ? "..." : "Sair"}
    </button>
  );
}
