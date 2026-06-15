// Esqueleto de carregamento exibido enquanto o server component do admin renderiza.
// Aparece dentro do <main> do AdminLayout enquanto a query Prisma executa.
export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="mb-8 space-y-2">
        <div className="w-24 h-3 rounded bg-amber-100 animate-pulse" />
        <div className="w-56 h-8 rounded bg-slate-200 animate-pulse" />
        <div className="w-80 h-4 rounded bg-slate-100 animate-pulse" />
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card rounded-xl p-6 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="w-24 h-6 rounded bg-slate-200 animate-pulse" />
                <div className="w-12 h-3 rounded bg-slate-100 animate-pulse" />
              </div>
              <div className="w-16 h-6 rounded bg-amber-100 animate-pulse" />
            </div>
            <div className="flex gap-4">
              <div className="w-20 h-4 rounded bg-slate-100 animate-pulse" />
              <div className="w-20 h-4 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="w-16 h-3 rounded bg-amber-50 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
