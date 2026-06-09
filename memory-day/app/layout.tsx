import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import "./globals.css";
import { CircuitBackground } from "@/components/CircuitBackground";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Memory Day — Aprenda. Registre. Evolua.",
  description: "Plataforma de registro diário de aprendizado com análise por IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={orbitron.variable}>
      <body className="bg-[#f0f4f8] text-slate-900 min-h-screen overflow-x-hidden">
        <CircuitBackground />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
