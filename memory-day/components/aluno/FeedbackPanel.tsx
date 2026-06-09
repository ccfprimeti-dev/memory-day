"use client";
import { useState } from "react";
import type { FeedbackIA } from "@/types";

export function FeedbackPanel({ feedback, nomeMateria }: { feedback: FeedbackIA; nomeMateria: string }) {
  const [expandido, setExpandido] = useState(true);

  return (
    <div className="border-t border-slate-100 bg-slate-50">
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold uppercase tracking-widest text-amber-700 hover:bg-amber-50 transition"
      >
        <span className="flex items-center gap-2">
          <span className="text-base">🤖</span> Análise da IA — {nomeMateria}
        </span>
        <span className="text-amber-500">{expandido ? "▲" : "▼"}</span>
      </button>

      {expandido && (
        <div className="px-5 pb-5 space-y-3">
          {/* Resumo */}
          <div className="bg-white rounded-lg p-4 border border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-2">
              ✦ O que você demonstrou entender
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">{feedback.resumo}</p>
          </div>

          {/* Lacunas */}
          {feedback.lacunas.length > 0 && (
            <div className="rounded-lg p-4 bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-2">
                ⚠ Pontos que merecem atenção
              </p>
              <ul className="space-y-1.5">
                {feedback.lacunas.map((lacuna, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-amber-500 shrink-0 mt-0.5">›</span>{lacuna}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sugestões */}
          {feedback.sugestoes.length > 0 && (
            <div className="rounded-lg p-4 bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-2">
                → Sugestões de estudo
              </p>
              <ul className="space-y-1.5">
                {feedback.sugestoes.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-emerald-500 shrink-0 mt-0.5">›</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
