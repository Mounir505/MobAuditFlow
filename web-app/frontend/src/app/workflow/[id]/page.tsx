"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Upload,
  Shield,
  Cpu,
  Layers,
  FileCheck,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { useSocket, type ScanSocketUpdate } from "@/hooks/useSocket";
import {
  fetchBackendConfig,
  fetchScanDetails,
  postWorkflowProgress,
  type BackendConfig,
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const workflowNodes = [
  { key: "Uploader", label: "Upload APK", icon: Upload, aliases: ["Upload APK", "Uploader"] },
  { key: "Scanner", label: "MobSF Scanner", icon: Shield, aliases: ["MobSF Scanner", "Scanner"] },
  {
    key: "AI Agents",
    label: "AI Agents (Parallel)",
    icon: Cpu,
    subNodes: ["AI_Agent_Network", "AI_Agent_Manifest", "AI_Agent_Resource", "Ollama"],
    aliases: ["AI Agents", "AI Agents (Parallel)"],
    maxProgress: 75,
  },
  {
    key: "Merge",
    label: "Merge, PDF (Gotenberg)",
    icon: Layers,
    aliases: ["Merge & PDF Generation", "Merge", "Gotenberg"],
    subNodes: ["CVSS", "Code", "Gotenberg"],
    maxProgress: 85,
  },
  {
    key: "Gmail",
    label: "Envoi e-mail & rapport",
    icon: FileCheck,
    aliases: ["Gmail", "Email", "Send Email", "Send a message", "Notify 100%"],
    maxProgress: 100,
  },
];

const UI_PHASE_MAX: Record<string, number> = {
  Uploader: 25,
  Scanner: 40,
  "AI Agents": 75,
  Merge: 85,
  Gmail: 100,
};

const GMAIL_NODE_KEYS = ["Gmail", "Email", "Send Email", "Send a message"];

const isGmailPhaseDone = (
  nodeStatuses: Record<string, { status: string; progress: number; logs?: string; updatedAt: string }>
) =>
  GMAIL_NODE_KEYS.some((key) => nodeStatuses[key]?.status === "completed");

const statusClasses = {
  pending: "bg-slate-800 text-slate-300 border-slate-700",
  running: "bg-blue-500 text-white shadow-[0_0_0_4px_rgba(59,130,246,0.15)] animate-pulse",
  scanning: "bg-cyan-500 text-slate-950",
  ai_analyzing: "bg-violet-500 text-white",
  completed: "bg-emerald-500 text-slate-950",
  failed: "bg-rose-500 text-white",
};

const normalizeNodeStatus = (
  nodeStatuses: Record<string, { status: string; progress: number; logs?: string; updatedAt: string }> | null,
  key: string,
  subKeys?: string[],
  aliases?: string[],
  maxProgress?: number
) => {
  const phaseMax = maxProgress ?? UI_PHASE_MAX[key] ?? 100;
  const clamp = (value: number) => Math.min(phaseMax, Math.max(0, value));
  if (!nodeStatuses) {
    return { status: "pending", progress: 0 };
  }

  if (!subKeys) {
    const node = nodeStatuses[key] ?? aliases?.map((alias) => nodeStatuses[alias]).find(Boolean);
    const rawProgress = node?.progress ?? 0;
    const isDone = node?.status === "completed";
    return {
      status: node?.status ?? "pending",
      progress: isDone ? phaseMax : clamp(rawProgress),
    };
  }

  const extraAiKeys =
    key === "AI Agents"
      ? Object.keys(nodeStatuses).filter(
          (k) => k.startsWith("AI_") || k === "Ollama" || k.includes("Resource")
        )
      : [];
  const extraMergeKeys =
    key === "Merge"
      ? Object.keys(nodeStatuses).filter((k) => k === "CVSS" || k === "Code" || k === "Gotenberg")
      : [];
  const laterPhaseStarted =
    key === "AI Agents"
      ? ["Merge", "CVSS", "Code", "Gotenberg", "Gmail", "Email"].some((k) => nodeStatuses[k])
      : key === "Merge"
        ? ["Gmail", "Email", "Send Email"].some((k) => nodeStatuses[k])
        : false;

  if (laterPhaseStarted) {
    return { status: "completed", progress: phaseMax };
  }

  const allSubKeys = [...new Set([...(subKeys ?? []), ...extraAiKeys, ...extraMergeKeys])];
  const activeSubKeys = allSubKeys.filter((subKey) => nodeStatuses[subKey]);
  if (activeSubKeys.length === 0) {
    return { status: "pending", progress: 0 };
  }

  const statuses = activeSubKeys.map((subKey) => nodeStatuses[subKey]);
  const maxSubProgress = Math.max(...statuses.map((item) => item.progress ?? 0), 0);

  if (statuses.some((item) => item.status === "failed")) {
    return { status: "failed", progress: clamp(maxSubProgress) };
  }
  if (statuses.some((item) => item.status === "running" || item.status === "scanning" || item.status === "ai_analyzing")) {
    return { status: "running", progress: clamp(maxSubProgress) };
  }
  if (statuses.every((item) => item.status === "completed")) {
    return { status: "completed", progress: phaseMax };
  }
  if (
    key === "AI Agents" &&
    activeSubKeys.includes("Ollama") &&
    nodeStatuses.Ollama?.status === "completed"
  ) {
    return { status: "completed", progress: phaseMax };
  }
  if (maxSubProgress > 0) {
    return { status: "running", progress: clamp(maxSubProgress) };
  }
  return { status: "pending", progress: 0 };
};

export default function WorkflowPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const [scanName, setScanName] = useState<string>("");
  const [scanStatus, setScanStatus] = useState<string>("pending");
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [latestLogs, setLatestLogs] = useState<string[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, { status: string; progress: number; logs?: string; updatedAt: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [n8nHint, setN8nHint] = useState<string | null>(null);
  const [backendConfig, setBackendConfig] = useState<BackendConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [testingCallback, setTestingCallback] = useState(false);

  const { latestUpdate, isConnected, error: socketError } = useSocket(id);

  const goToReport = useCallback(() => {
    if (!id) return;
    router.replace(`/scan/${encodeURIComponent(id)}`);
  }, [id, router]);

  useEffect(() => {
    if (latestUpdate) {
      const updateNode = latestUpdate.node ?? latestUpdate.latestNode;
      const globalStatus = latestUpdate.scanStatus;
      if (globalStatus) {
        setScanStatus(globalStatus);
      }
      if (typeof latestUpdate.progress === "number") {
        setScanProgress(latestUpdate.progress);
      }
      if (latestUpdate.nodeStatuses && Object.keys(latestUpdate.nodeStatuses).length > 0) {
        setNodeStatuses(latestUpdate.nodeStatuses);
      } else if (updateNode) {
        const nodeStatus =
          (latestUpdate as { nodeStatus?: string }).nodeStatus ?? latestUpdate.status;
        setNodeStatuses((current) => ({
          ...current,
          [updateNode]: {
            status: nodeStatus,
            progress: latestUpdate.progress,
            logs: latestUpdate.logs ?? "",
            updatedAt: new Date().toISOString(),
          },
        }));
      }
      if (latestUpdate.logs) {
        setLatestLogs((current) => [
          ...current.slice(-9),
          `${updateNode ?? "Workflow"}: ${latestUpdate.logs}`,
        ]);
      }
      if (latestUpdate.scanStatus === "completed") {
        setScanProgress(100);
      }
    }
  }, [latestUpdate]);

  const loadScan = useCallback(async () => {
    if (!id) {
      setError("Identifiant de scan manquant.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchScanDetails(id);
      setScanStatus(data.status ?? "pending");
      setScanProgress(data.progress ?? 0);
      setScanName(String(data.appInfo?.appName ?? "APK inconnu"));
      setNodeStatuses(data.nodeStatuses ?? {});
      if (data.logs) {
        const lines = String(data.logs)
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        setLatestLogs(lines.slice(-10));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le scan.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadScan();
  }, [loadScan]);

  useEffect(() => {
    fetchBackendConfig()
      .then((config) => {
        setBackendConfig(config);
        setConfigError(null);
      })
      .catch((err) => {
        setConfigError(err instanceof Error ? err.message : "Config backend inaccessible.");
      });
  }, []);

  useEffect(() => {
    if (scanStatus === "completed" || scanStatus === "failed") {
      setN8nHint(null);
      return undefined;
    }

    const interval = window.setInterval(() => {
      loadScan();
    }, 3000);

    const hintTimer = window.setTimeout(async () => {
      if (
        scanStatus !== "completed" &&
        scanStatus !== "failed" &&
        scanProgress >= 70 &&
        !nodeStatuses.Merge &&
        !nodeStatuses.Gotenberg &&
        !nodeStatuses.Gmail
      ) {
        setN8nHint(
          "Étape IA terminée. Il manque les POST n8n : Notify 85 % (node Merge, progress 85) puis Notify 100 % (node Gmail, progress 100, completeScan: true)."
        );
        return;
      }
      if (scanStatus !== "completed" && scanStatus !== "failed" && scanProgress <= 20) {
        try {
          const config = await fetchBackendConfig();
          if (!config.publicApiUrl) {
            setN8nHint(
              "Définissez PUBLIC_API_URL dans backend/.env (votre tunnel Cloudflare) puis redémarrez le backend."
            );
          } else {
            setN8nHint(
              "n8n tourne mais l’app ne reçoit aucun POST. Après le Google Drive Trigger : nœud HTTP GET « Get Scan Context » puis, à chaque étape, HTTP POST vers callbackUrl avec scanId, node, status, progress, logs (Send Body activé)."
            );
          }
        } catch {
          setN8nHint(
            "Aucune mise à jour reçue depuis n8n. Vérifiez les nœuds HTTP Request vers /api/scan/update-status dans votre workflow."
          );
        }
      }
    }, 15000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(hintTimer);
    };
  }, [loadScan, scanStatus, scanProgress]);

  const gmailDone = useMemo(() => isGmailPhaseDone(nodeStatuses), [nodeStatuses]);

  const displayProgress = useMemo(() => {
    if (scanStatus === "completed" && gmailDone) {
      return 100;
    }
    const fromPhases = workflowNodes.map((node) =>
      normalizeNodeStatus(
        nodeStatuses,
        node.key,
        node.subNodes,
        node.aliases,
        "maxProgress" in node ? node.maxProgress : undefined
      ).progress
    );
    return Math.min(99, Math.max(scanProgress, ...fromPhases, 0));
  }, [scanStatus, scanProgress, nodeStatuses, gmailDone]);

  const reportReady = scanStatus === "completed" && gmailDone;
  const callbackUrl = backendConfig?.callbackExample ?? null;
  const byDriveUrlTemplate =
    backendConfig?.byDriveExample?.replace("DRIVE_FILE_ID", "{{ $json.id }}") ??
    (callbackUrl
      ? `${callbackUrl.replace("/api/scan/update-status", "")}/api/scan/by-drive/{{ $json.id }}`
      : null);

  const handleTestCallback = async () => {
    if (!id) return;
    try {
      setTestingCallback(true);
      await postWorkflowProgress({
        scanId: id,
        node: "Scanner",
        status: "running",
        progress: Math.max(scanProgress, 25),
        logs: "Test callback depuis l’app (le backend répond).",
      });
      await loadScan();
      setN8nHint(null);
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : "Échec du test callback.");
    } finally {
      setTestingCallback(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 text-slate-100">
      <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Workflow n8n</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">Suivi du scan {id}</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Suivi en direct du pipeline de sécurité mobile. Chaque nœud de votre workflow remonte son état vers le backend.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-4">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Statut global</p>
            <p className="mt-2 text-xl font-semibold text-white">{scanStatus}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-4">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Progression</p>
            <p className="mt-2 text-xl font-semibold text-white">{displayProgress}%</p>
          </div>
        </div>
      </div>

      {reportReady ? (
        <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-emerald-500/40 bg-emerald-950/40 px-5 py-4 text-sm text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
          <p>Scan terminé. Vous pouvez maintenant accéder aux résultats.</p>
          <Button type="button" size="sm" className="border-emerald-400/50 bg-emerald-900/50 text-emerald-50" onClick={goToReport}>
            Accéder aux résultats <ArrowRight className="ml-2" />
          </Button>
        </div>
      ) : null}

      {n8nHint ? (
        <div className="mb-6 space-y-2 rounded-3xl border border-amber-500/40 bg-amber-950/30 px-5 py-4 text-sm text-amber-100">
          <p>{n8nHint}</p>
          {configError ? (
            <p className="text-xs text-rose-200">{configError}</p>
          ) : null}
          {callbackUrl ? (
            <p className="break-all text-xs text-amber-200/80">
              URL de callback pour n8n (depuis backend/.env) :{" "}
              <span className="font-mono">{callbackUrl}</span>
            </p>
          ) : (
            <p className="text-xs text-rose-200">
              PUBLIC_API_URL absent — redémarrez le backend avec le tunnel Cloudflare dans .env
            </p>
          )}
          {backendConfig?.driveTriggerOnly ? (
            <p className="text-xs text-emerald-200/90">
              Mode Drive actif : n8n démarre via Google Drive Trigger (webhook backend désactivé au scan).
            </p>
          ) : (
            <p className="text-xs text-amber-200/70">
              Mode webhook actif — ajoutez N8N_TRIGGER_MODE=drive dans backend/.env puis redémarrez le backend.
            </p>
          )}
          <p className="break-all text-xs text-amber-200/80">
            scanId pour le body JSON : <span className="font-mono">{id}</span>
          </p>
          {byDriveUrlTemplate ? (
            <p className="break-all text-xs text-amber-200/70">
              Get Scan Context (GET) : <span className="font-mono">{byDriveUrlTemplate}</span>
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 border-amber-500/50 text-amber-100"
            disabled={testingCallback || !id}
            onClick={handleTestCallback}
          >
            {testingCallback ? "Test en cours…" : "Tester le callback (simuler n8n)"}
          </Button>
        </div>
      ) : null}

      <section className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <div className="grid gap-4 lg:grid-cols-[1.75fr_1fr]">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-cyan-400" />
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Pipeline</p>
              </div>
              <div className="space-y-4">
                {workflowNodes.map((node) => {
                  const phaseMax =
                    "maxProgress" in node && typeof node.maxProgress === "number"
                      ? node.maxProgress
                      : UI_PHASE_MAX[node.key] ?? 100;
                  const status = normalizeNodeStatus(
                    nodeStatuses,
                    node.key,
                    node.subNodes,
                    node.aliases,
                    phaseMax
                  );
                  const barFill =
                    status.status === "completed"
                      ? 100
                      : Math.min(100, Math.round((status.progress / phaseMax) * 100));
                  return (
                    <div
                      key={node.key}
                      className={`group overflow-hidden rounded-3xl border px-5 py-4 transition ${statusClasses[status.status as keyof typeof statusClasses]} ${status.status === "running" ? "ring-2 ring-sky-500/30" : "ring-1 ring-white/10"}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <node.icon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-base font-semibold">{node.label}</p>
                            <p className="text-sm text-slate-200">{status.status === "pending" ? "En attente" : status.status === "running" ? "En cours" : status.status === "completed" ? "Terminé" : status.status === "failed" ? "Erreur" : status.status}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">
                          {status.status === "completed" ? phaseMax : status.progress}%
                        </span>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-white" style={{ width: `${barFill}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Live Logs</p>
                  <p className="mt-2 text-sm text-slate-300">Derniers messages des nœuds n8n.</p>
                </div>
                {reportReady ? (
                  <Button onClick={() => router.push(`/scan/${encodeURIComponent(id)}`)}>
                    Accéder au rapport <ArrowRight className="ml-2" />
                  </Button>
                ) : null}
              </div>
              <div className="mt-5 min-h-[240px] overflow-y-auto rounded-3xl bg-slate-900/90 p-4 text-sm text-slate-200 shadow-inner shadow-slate-950/30">
                {loading ? (
                  <p className="text-slate-400">Chargement initial...</p>
                ) : latestLogs.length === 0 ? (
                  <p className="text-slate-500">Aucun log reçu pour l’instant.</p>
                ) : (
                  <ul className="space-y-3">
                    {[...latestLogs].reverse().map((line, index) => (
                      <li key={index} className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-white/10 bg-slate-900/80">
            <CardHeader>
              <CardTitle>Statut du workflow</CardTitle>
              <CardDescription>Connexion et état des événements temps réel.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-400">Connexion Socket</p>
                  <p className={`mt-2 text-lg font-semibold ${isConnected ? "text-emerald-300" : "text-rose-300"}`}>
                    {isConnected ? "Connecté" : "Déconnecté"}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-400">Application</p>
                  <p className="mt-2 text-lg font-semibold text-white">{scanName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-slate-900/80">
            <CardHeader>
              <CardTitle>Flux de progression</CardTitle>
              <CardDescription>Vue d’ensemble avec les étapes parallèles et le nœud actif.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-3xl bg-slate-950/80 p-4">
                <p className="text-sm text-slate-400">Nœud actuel</p>
                <p className="mt-2 text-lg font-semibold text-white">{latestUpdate?.node ?? "Aucun nœud actif"}</p>
                <p className="mt-3 text-sm text-slate-300">Progression globale : {displayProgress}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
