"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, Shield, Database, Eye, FileText } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSocket } from "@/hooks/useSocket";
import { downloadReport, fetchScanDetails, ScanSummary } from "@/services/api";

const severityColor = (severity: string) => {
  switch (severity) {
    case "high":
      return "bg-rose-500 text-white";
    case "medium":
      return "bg-amber-500 text-slate-950";
    case "low":
      return "bg-emerald-500 text-slate-950";
    default:
      return "bg-slate-700 text-slate-200";
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-emerald-500 text-slate-950";
    case "ai_analyzing":
    case "scanning":
      return "bg-amber-500 text-slate-950";
    case "failed":
      return "bg-rose-500 text-white";
    default:
      return "bg-slate-700 text-slate-200";
  }
};

export default function ScanPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const [scan, setScan] = useState<ScanSummary | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const { latestUpdate } = useSocket(id);

  const chartData = useMemo(() => {
    const vulnerabilities = (scan?.mobsf?.vulnerabilities ?? {}) as Record<string, number>;
    return [
      { name: "High", value: Number(vulnerabilities.high ?? 0) },
      { name: "Medium", value: Number(vulnerabilities.medium ?? 0) },
      { name: "Low", value: Number(vulnerabilities.low ?? 0) },
    ];
  }, [scan]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchScanDetails(id);
        setScan(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger le scan.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  useEffect(() => {
    if (!latestUpdate) {
      return;
    }

    setScan((current) => {
      if (!current) return current;
      return {
        ...current,
        status: latestUpdate.scanStatus ?? latestUpdate.status,
        appInfo: { ...current.appInfo, ...latestUpdate.appInfo },
        mobsf: { ...current.mobsf, ...latestUpdate.mobsf },
        aiAnalysis: { ...current.aiAnalysis, ...latestUpdate.aiAnalysis },
        reportUrl: latestUpdate.reportUrl ?? current.reportUrl,
      };
    });
  }, [latestUpdate]);

  const handleDownload = async () => {
    if (!scan) return;
    setDownloadLoading(true);
    setDownloadSuccess(null);
    try {
      const blob = await downloadReport(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDownloadSuccess("Téléchargement lancé.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du téléchargement.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const permissions = Array.isArray(scan?.mobsf?.permissions) ? scan.mobsf.permissions : [];
  const findings = (scan?.aiAnalysis ?? {}) as Record<string, unknown>;
  const liveLogs = useMemo(() => {
    if (!latestUpdate?.logs) {
      return [];
    }
    return latestUpdate.logs
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-8)
      .reverse();
  }, [latestUpdate?.logs]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 text-slate-100">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Résultats du scan</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">Détails de sécurité</h1>
          <p className="mt-2 text-slate-400">Consultez le statut, les permissions, les vulnérabilités et les conclusions IA.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={scan?.status !== "completed" || downloadLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Télécharger le PDF
          </button>
          <div className="rounded-3xl bg-slate-900/80 px-5 py-4">
            <p className="text-sm text-slate-400">Statut du scan</p>
            <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusBadge(scan?.status ?? "pending")}`}>
              {scan?.status ?? "pending"}
            </p>
          </div>
        </div>
      </div>

      {scan && scan.status !== "completed" && scan.status !== "failed" ? (
        <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-amber-500/30 bg-amber-950/20 px-5 py-4 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <p>Le scan est encore en cours. Pour suivre les états et les logs, revenez à la page d’attente.</p>
          <button
            type="button"
            onClick={() => router.push(`/workflow/${encodeURIComponent(id)}`)}
            className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            Ouvrir la page d’attente
          </button>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <div className="space-y-3 rounded-3xl bg-slate-950/80 p-5">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Vue globale</p>
            <p className="text-lg font-semibold text-white">{String(scan?.appInfo?.appName ?? "Aucune donnée")}</p>
            <p className="text-sm text-slate-400">{String(scan?.appInfo?.packageName ?? "Package inconnu")}</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Version</span>
                <span>{String(scan?.appInfo?.version ?? "N/A")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Score de sécurité</span>
                <span>{String(scan?.appInfo?.score ?? "N/A")}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-3xl bg-slate-950/80 p-5">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Navigation</p>
            <div className="space-y-2">
              {[
                { id: "overview", label: "Overview" },
                { id: "manifest", label: "Manifest" },
                { id: "binary", label: "Binary" },
                { id: "ai", label: "AI Findings" },
                { id: "report", label: "PDF Report" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${activeTab === tab.id ? "bg-cyan-500 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-3xl bg-slate-950/80 p-5">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Live events</p>
            <div className="mt-4 space-y-3 rounded-3xl bg-slate-900/80 p-4 text-sm text-slate-300">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Nœud actif</p>
                  <p className="mt-1 font-semibold text-white">{latestUpdate?.node ?? "Aucun"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Statut</p>
                  <p className="mt-1 font-semibold text-white">{latestUpdate?.status ?? scan?.status ?? "N/A"}</p>
                </div>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-3">
                {liveLogs.length === 0 ? (
                  <p className="text-slate-500">Aucun log reçu récemment.</p>
                ) : (
                  <ul className="space-y-2 text-slate-200">
                    {liveLogs.map((line, index) => (
                      <li key={index} className="truncate text-sm">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <p>Chargement des détails du scan...</p>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-6 text-rose-200">{error}</div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Overview</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">Analyse de la sécurité mobile</h2>
                    </div>
                    <div className="rounded-3xl bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
                      Îlot de confiance en temps réel
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-950/80 p-5">
                      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Permissions sensibles</p>
                      <div className="mt-4 space-y-2">
                        {permissions.length === 0 ? (
                          <p className="text-slate-300">Aucune permission détaillée disponible.</p>
                        ) : (
                          permissions.slice(0, 5).map((permission, index) => (
                            <p key={index} className="rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-200">
                              {String(permission.name ?? permission)}
                            </p>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl bg-slate-950/80 p-5">
                      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Résumé des résultats</p>
                      <div className="mt-4 space-y-3 text-sm text-slate-300">
                        <p>
                          <span className="font-semibold text-white">Etat :</span>{" "}
                          {scan?.status ?? "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold text-white">Rapport PDF :</span>{" "}
                          {scan?.reportUrl ? "Disponible" : "En attente"}
                        </p>
                        <p>
                          <span className="font-semibold text-white">Taille d’analyse :</span>{" "}
                          {String(scan?.mobsf?.analysisSize ?? "N/A")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "manifest" && (
                <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
                  <div className="flex items-center gap-3 text-white">
                    <Shield className="h-5 w-5 text-cyan-400" />
                    <h2 className="text-2xl font-semibold">Manifest & permissions</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {permissions.length === 0 ? (
                      <div className="rounded-3xl bg-slate-950/80 p-6 text-slate-300">Aucune permission ou données de manifest disponibles.</div>
                    ) : (
                      permissions.map((permission, index) => (
                        <div key={index} className="rounded-3xl bg-slate-950/80 p-5">
                          <p className="font-semibold text-white">{String(permission.name ?? permission)}</p>
                          <p className="mt-2 text-sm text-slate-400">{String(permission.severity ?? "Niveau non défini")}</p>
                        </div>
                      ))
                    )}
                  </div>
                  {scan?.mobsf?.manifest ? (
                    <div className="rounded-3xl bg-slate-950/80 p-5">
                      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Raw manifest</p>
                      <pre className="mt-4 max-h-64 overflow-auto rounded-3xl bg-slate-900/90 p-4 text-xs text-slate-200">
                        {JSON.stringify(scan.mobsf.manifest, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === "binary" && (
                <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
                  <div className="flex items-center gap-3 text-white">
                    <Database className="h-5 w-5 text-cyan-400" />
                    <h2 className="text-2xl font-semibold">Binary Analysis</h2>
                  </div>
                  <div className="rounded-3xl bg-slate-950/80 p-5">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid stroke="#334155" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip formatter={(value) => [`${Number(value ?? 0)} issues`, "Issues"]} />
                          <Bar dataKey="value" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "ai" && (
                <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
                  <div className="flex items-center gap-3 text-white">
                    <Eye className="h-5 w-5 text-cyan-400" />
                    <h2 className="text-2xl font-semibold">AI Findings</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Object.entries({
                      Manifest: findings.manifest,
                      "Reverse Eng": findings.reverseEngineering,
                      "Risk Scoring": findings.riskScoring,
                      Recommendation: findings.recommendations,
                    }).map(([section, content]) => (
                      <div key={section} className="rounded-3xl bg-slate-950/80 p-5">
                        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{section}</p>
                        {Array.isArray(content) && content.length > 0 ? (
                          <ul className="mt-3 space-y-2 text-sm text-slate-200">
                            {content.map((item, index) => (
                              <li key={`${section}-${index}`} className="rounded-2xl bg-slate-900 px-3 py-2">
                                {String(item)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-sm text-slate-400">Aucune donnée disponible.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "report" && (
                <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
                  <div className="flex items-center gap-3 text-white">
                    <FileText className="h-5 w-5 text-cyan-400" />
                    <h2 className="text-2xl font-semibold">PDF Report</h2>
                  </div>
                  <div className="rounded-3xl bg-slate-950/80 p-6 text-slate-300">
                    <p className="text-white">Rapport généré par Gotenberg</p>
                    <p className="mt-3 text-sm">Vous pouvez télécharger le rapport une fois qu’il est disponible.</p>
                    <p className="mt-3 truncate text-sm text-slate-400">{scan?.reportUrl ?? "Aucun rapport trouvé."}</p>
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={scan?.status !== "completed" || downloadLoading}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" />
                      Télécharger via l’app
                    </button>
                    {downloadSuccess ? <p className="mt-3 text-sm text-emerald-300">{downloadSuccess}</p> : null}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
