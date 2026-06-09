"use client";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primario" | "secundario" | "perigo";
  tamanho?: "sm" | "md" | "lg";
  carregando?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variante = "primario", tamanho = "md", carregando = false, children, disabled, className = "", ...props },
  ref
) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  const variantes = {
    primario: "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white glow-cyan",
    secundario: "bg-transparent border border-cyan-800 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-900/20",
    perigo: "bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white",
  };

  const tamanhos = {
    sm: "px-3 py-1.5 text-xs tracking-wide",
    md: "px-4 py-2 text-sm tracking-wide",
    lg: "px-6 py-3 text-sm tracking-wider",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || carregando}
      className={`${base} ${variantes[variante]} ${tamanhos[tamanho]} ${className}`}
      {...props}
    >
      {carregando && <Spinner tamanho="sm" />}
      {children}
    </button>
  );
});
