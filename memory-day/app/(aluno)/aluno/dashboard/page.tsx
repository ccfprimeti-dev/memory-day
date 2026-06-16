import { getSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AulaCard } from "@/components/aluno/AulaCard";
import { SelectSlot } from "@/components/aluno/SelectSlot";
import type { FeedbackIA, NivelEnsino } from "@/types";
import { LABEL_NIVEL_ENSINO } from "@/types";

function dataHoje(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export default async function AlunoDashboard() {
  const sessao = await getSessao();
  const usuario = sessao.usuario!;
  const hoje = dataHoje();

  // Turma do aluno — determina o nível e o limite de aulas por dia
  const turmaAluno = await prisma.turma.findUnique({
    where:  { id: usuario.turmaId ?? "" },
    select: { nivelEnsino: true },
  });
  const nivelEnsino = turmaAluno?.nivelEnsino ?? "EF2";
  const maxAulas    = nivelEnsino === "EM" ? 7 : 5;

  // Matérias da turma do aluno
  const todasMaterias = await prisma.subject.findMany({
    where: { turmaId: usuario.turmaId ?? "" },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  // Registros feitos hoje
  const registrosHoje = await prisma.entry.findMany({
    where: { alunoId: usuario.id, data: hoje },
    include: { materia: { select: { nome: true } } },
    orderBy: { criadoEm: "asc" },
  });

  // Preenchidos em "aulas": um registro de aula dupla conta como 2, não como 1
  const preenchidos = registrosHoje.reduce((soma, r) => soma + r.quantidadeAulas, 0);
  // Slots vazios: quantas aulas ainda podem ser registradas hoje (até o limite do nível)
  const slotsVazios = Math.max(0, maxAulas - preenchidos);
  const pct = maxAulas > 0 ? Math.round((preenchidos / maxAulas) * 100) : 0;

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-8">
        <p className="font-orbitron text-[10px] tracking-[0.4em] text-amber-600/70 uppercase mb-1">
          Painel do Aluno
        </p>
        <h1 className="text-2xl font-bold text-slate-800">
          Olá, <span className="text-gradient font-orbitron">{usuario.nome.split(" ")[0]}</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1 capitalize">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
            timeZone: "America/Sao_Paulo",
          })}
        </p>
      </div>

      {/* Barra de progresso */}
      <div className="tech-card rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-orbitron text-[10px] tracking-[0.3em] text-slate-500 uppercase">
              Progresso de hoje
            </span>
            <span className={`ml-2 text-[9px] font-orbitron tracking-widest uppercase px-1.5 py-0.5 rounded border
              ${nivelEnsino === "EM"
                ? "text-slate-700 border-slate-300 bg-slate-100"
                : "text-amber-700 border-amber-200 bg-amber-50"}`}>
              {LABEL_NIVEL_ENSINO[nivelEnsino as NivelEnsino] ?? nivelEnsino}
            </span>
          </div>
          <span className="font-orbitron text-xs text-amber-700 font-bold">
            {preenchidos}/{maxAulas} · {pct}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #1e293b, #d97706, #f59e0b)" }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>
        {preenchidos >= maxAulas && maxAulas > 0 && (
          <p className="font-orbitron text-[10px] tracking-widest text-amber-700 mt-3 text-center uppercase">
            ✦ Missão cumprida — todas as aulas registradas
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {/* Aulas já preenchidas */}
        {registrosHoje.map((registro) => (
          <AulaCard
            key={registro.id}
            subjectId={registro.subjectId}
            nomeMateria={registro.materia.nome}
            data={hoje}
            textoInicial={registro.textoDoAluno}
            feedbackInicial={registro.lacunasIA as unknown as FeedbackIA | null}
            quantidadeAulas={registro.quantidadeAulas}
          />
        ))}

        {/* Slots vazios — até o limite de aulas do nível.
            A key usa "numero" (que depende de "preenchidos") em vez do índice puro,
            para que o React nunca reaproveite a instância de um slot já enviado
            (índice 0 antes de um envio não é a mesma "vaga" que o índice 0 depois). */}
        {Array.from({ length: slotsVazios }).map((_, i) => {
          const numero = preenchidos + i + 1;
          return (
            <SelectSlot
              key={`slot-${numero}`}
              materias={todasMaterias}
              data={hoje}
              numero={numero}
              maxQuantidade={slotsVazios}
            />
          );
        })}
      </div>
    </div>
  );
}
