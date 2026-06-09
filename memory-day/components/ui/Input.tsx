import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  erro?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, erro, id, className = "", ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`bg-slate-50 border rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition
          ${erro
            ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
            : "border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          } ${className}`}
        {...props}
      />
      {erro && <span className="text-xs text-red-400">{erro}</span>}
    </div>
  );
});
