import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  titulo?: string;
  subtitulo?: string;
}

export function Card({ titulo, subtitulo, children, className = "", ...props }: CardProps) {
  return (
    <div className={`glass-card rounded-xl overflow-hidden ${className}`} {...props}>
      {(titulo || subtitulo) && (
        <div className="px-6 py-4 border-b border-slate-100">
          {titulo && <h3 className="text-sm font-semibold text-slate-800 tracking-wide">{titulo}</h3>}
          {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}
