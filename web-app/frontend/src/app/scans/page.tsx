"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Clock3, ListChecks, Archive } from "lucide-react";
import { fetchScanHistory, ScanSummary } from "@/services/api";

const statusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-emerald-500 text-slate-950";
    case "scanning":
    case "ai_analyzing":
      return "bg-amber-500 text-slate-950";
    case "failed":
      return "bg-rose-500 text-white";
    default:
      return "bg-slate-700 text-slate-200";
  }
};

export default function ScansPage() {
  const [history, setHistory] = useState<ScanSummary[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const data = await fetchScanHistory();
        setHistory(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger l’historique.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    if (filter === "all") return history;
    return history.filter((item) => item.status === filter);
  }, [filter, history]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 text-slate-100">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Historique</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">Tous les scans</h1>
          <p className="mt-2 text-slate-400">Suivez l’historique des scans, le statut et les scores de sécurité.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-slate-900/80 px-5 py-4">
            <p className="text-sm text-slate-400">Nombre total</p>
            <p className="mt-2 text-2xl font-semibold text-white">{history.length}</p>
          </div>
          <div className="rounded-3xl bg-slate-900/80 px-5 py-4">
            <p className="text-sm text-slate-400">Filtrer</p>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
            >
              <option value="all">Tous</option>
              <option value="pending">Pending</option>
              <option value="scanning">Scanning</option>
              <option value="ai_analyzing">AI Analyzing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">Chargement de l’historique...</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-6 text-rose-200">{error}</div>
      ) : filteredHistory.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-slate-300">Aucun scan trouvé pour ce filtre.</div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((scan) => (
            <article key={scan.scanId} className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 transition hover:border-cyan-500/30">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Scan ID</p>
                  <p className="mt-2 text-lg font-semibold text-white">{scan.scanId}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusBadge(scan.status)}`}>
                    {scan.status}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-950/80 px-3 py-1 text-sm text-slate-300">
                    <Clock3 className="h-4 w-4" />
                    {new Date(scan.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-400">App</p>
                  <p className="mt-2 text-base font-medium text-white">{scan.appInfo?.appName ?? "Inconnu"}</p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-400">Package</p>
                  <p className="mt-2 text-base font-medium text-white">{scan.appInfo?.packageName ?? "N/A"}</p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-400">Score</p>
                  <p className="mt-2 text-base font-medium text-white">{scan.appInfo?.score ?? "N/A"}</p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-300">
                <p className="inline-flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-cyan-400" />
                  {scan.mobsf ? "MobSF disponible" : "MobSF absent"}
                </p>
                <a
                  href={`/scan/${encodeURIComponent(scan.scanId)}`}
                  className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
                >
                  Voir le scan
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
