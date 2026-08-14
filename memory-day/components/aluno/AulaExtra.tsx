"use client";
import { useState } from "react";
import { SelectSlot } from "./SelectSlot";

interface Materia { id: string; nome: string; }
interface Props { materias: Materia[]; data: string; }

// Botão fixo no fim da página — abre registros extras além do limite diário do nível.
// Cada clique adiciona um novo card idêntico aos slots normais, marcado como "extra".
export function AulaExtra({ materias, data }: Props) {
  const [extras, setExtras] = useState<number[]>([]);

  return (
    <>
      {extras.map((id) => (
        <SelectSlot key={`extra-${id}`} materias={materias} data={data} numero={id} maxQuantidade={1} extra />
      ))}

      <button
        type="button"
        onClick={() => setExtras((prev) => [...prev, prev.length + 1])}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl
          border-2 border-dashed border-amber-300/60 text-amber-700 text-sm font-semibold tracking-wide
          hover:border-amber-400 hover:bg-amber-50/60 transition"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Extra class
      </button>
    </>
  );
}
