"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, ShieldCheck, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchGoogleDriveStatus,
  getGoogleDriveConnectUrl,
  triggerScan,
  type GoogleDriveStatus,
} from "@/services/api";

export default function Home() {
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadDriveStatus = async () => {
      try {
        const status = await fetchGoogleDriveStatus();
        setDriveStatus(status);
      } catch {
        setDriveStatus(null);
      }
    };

    loadDriveStatus();

    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const driveParam = params.get("drive");
    if (driveParam === "connected") {
      setMessage("Compte Google Drive connecté. Vous pouvez lancer un scan.");
      loadDriveStatus();
    }
    if (driveParam === "error") {
      const detail = params.get("message");
      setError(detail ? `Connexion Drive échouée : ${detail}` : "Connexion Google Drive échouée.");
    }
  }, []);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setMessage(null);
    setApkFile(file);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) {
      setApkFile(file);
      setError(null);
      setMessage(null);
    }
  };

  const mustConnectDrive = driveStatus?.configured && !driveStatus.connected;

  const onUpload = async () => {
    if (!apkFile) {
      setError("Veuillez sélectionner un fichier APK.");
      return;
    }

    if (mustConnectDrive) {
      setError("Connectez Google Drive avant de lancer le scan.");
      return;
    }

    setLoading(true);
    setProgress(0);
    setError(null);
    setMessage(null);

    try {
      const response = await triggerScan(apkFile, setProgress);
      if (response.driveUploaded && response.driveFileLink) {
        setMessage(`Scan déclenché : ${response.scanId} — APK sur Google Drive.`);
      } else if (response.driveError) {
        setError(`Scan lancé, mais Google Drive a échoué : ${response.driveError}`);
        setMessage(`Scan ID : ${response.scanId}`);
      } else {
        setMessage(`Scan déclenché : ${response.scanId}`);
      }
      router.push(`/workflow/${encodeURIComponent(response.scanId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue lors de l’upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 bg-slate-950 px-6 py-10 text-slate-100">
      <Card className="border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">MobAuditFlow</p>
            <CardTitle className="mt-2 text-4xl font-semibold tracking-tight text-white">Scan mobile sécurisé</CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-slate-300">
              Déposez un APK pour lancer un workflow de sécurité automatisé avec n8n, MobSF, agents IA et génération de rapport PDF.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 rounded-3xl bg-slate-800/80 px-5 py-4 ring-1 ring-white/10">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Statut</p>
              <p className="font-medium text-white">Prêt à scanner</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div
            className="mt-8 flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-cyan-500/40 bg-slate-950/70 px-6 py-12 text-center transition hover:bg-slate-900"
            onDrop={onDrop}
            onDragOver={(event) => event.preventDefault()}
          >
            <UploadCloud className="h-14 w-14 text-cyan-400" />
            <p className="max-w-xl text-lg text-slate-300">
              Glissez-déposez votre APK ici ou sélectionnez-le manuellement.
            </p>
            <label className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10">
              Sélectionner un fichier
              <input
                type="file"
                accept=".apk"
                className="sr-only"
                onChange={onFileChange}
              />
            </label>
            {apkFile ? (
              <p className="mt-2 text-sm text-slate-300">Fichier sélectionné : {apkFile.name}</p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button
              onClick={onUpload}
              disabled={loading || mustConnectDrive}
              className="rounded-2xl px-6 py-3 text-sm font-semibold text-slate-950 bg-cyan-500 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Lancement du scan…" : mustConnectDrive ? "Connectez Drive d’abord" : "Lancer le scan"}
            </Button>
            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-cyan-400" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      {driveStatus?.configured ? (
        <Card className="border border-white/10 bg-slate-900/80 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <HardDrive className="mt-1 h-6 w-6 shrink-0 text-cyan-400" />
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Google Drive (Gmail)</p>
                {driveStatus.connected ? (
                  <>
                    <p className="mt-2 font-medium text-emerald-300">Connecté — {driveStatus.email ?? "compte Gmail"}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Les APK seront déposés dans votre dossier Drive à chaque scan.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 font-medium text-amber-300">Non connecté</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Connectez votre Gmail une fois pour remplir le dossier Audit_APK automatiquement.
                    </p>
                  </>
                )}
              </div>
            </div>
            {!driveStatus.connected ? (
              <Button
                type="button"
                className="shrink-0 rounded-2xl bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                onClick={() => {
                  window.location.href = getGoogleDriveConnectUrl();
                }}
              >
                Connecter Google Drive
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Workflow</p>
          <h2 className="mt-4 text-xl font-semibold text-white">n8n orchestration</h2>
          <p className="mt-2 text-slate-300">Trigger mobile security workflows and track progress in real time with Socket.IO.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Analyse</p>
          <h2 className="mt-4 text-xl font-semibold text-white">MobSF & IA</h2>
          <p className="mt-2 text-slate-300">Static/dynamic analysis et agents IA pour les permissions, vulnérabilités et recommandations.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Rapport</p>
          <h2 className="mt-4 text-xl font-semibold text-white">PDF automatisé</h2>
          <p className="mt-2 text-slate-300">Génération de rapport PDF via Gotenberg avec résumé de sécurité et actions recommandées.</p>
        </div>
      </section>
    </main>
  );
}
