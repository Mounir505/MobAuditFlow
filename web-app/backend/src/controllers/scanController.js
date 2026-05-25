const path = require("path");
const fs = require("fs");
const axios = require("axios");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Scan = require("../models/Scan");
const { createPdfStream } = require("../services/gotenbergService");
const {
  canUploadToDrive,
  requireDriveReady,
  uploadApkToDrive,
} = require("../services/driveUploadService");
const { hasOAuthDriveConfig, isOAuthConnected, getAuthUrl } = require("../services/googleOAuthDriveService");

const {
  N8N_WEBHOOK_URL,
  PORT = 5000,
  PUBLIC_API_URL,
  N8N_TRIGGER_MODE = "webhook",
} = process.env;

const useDriveTriggerForN8n = String(N8N_TRIGGER_MODE).toLowerCase() === "drive";

const getPublicApiBase = (req) => {
  const configured = typeof PUBLIC_API_URL === "string" ? PUBLIC_API_URL.trim().replace(/\/$/, "") : "";
  if (configured) {
    return configured;
  }
  return `${req.protocol}://${req.get("host")}`;
};

const buildCallbackUrl = (req) => `${getPublicApiBase(req)}/api/scan/update-status`;

const enrichScanResponse = (scan, req) => {
  const doc = scan.toObject ? scan.toObject() : { ...scan };
  doc.callbackUrl = buildCallbackUrl(req);
  return doc;
};

const allowedStatuses = [
  "pending",
  "running",
  "scanning",
  "ai_analyzing",
  "completed",
  "failed",
];

const normalizeWorkflowStatus = (raw) => {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const value = String(raw).trim().toLowerCase();
  if (!value) {
    return undefined;
  }
  const aliases = {
    success: "completed",
    complete: "completed",
    completed: "completed",
    done: "completed",
    ok: "completed",
    error: "failed",
    failure: "failed",
    failed: "failed",
    in_progress: "running",
    processing: "running",
    active: "running",
    scan: "scanning",
    scanning: "scanning",
    ai: "ai_analyzing",
    analyzing: "ai_analyzing",
  };
  const mapped = aliases[value] ?? value;
  if (allowedStatuses.includes(mapped)) {
    return mapped;
  }
  return "running";
};

/** Jalons alignés sur l’UI (100 % = rapport envoyé par e-mail). */
const PIPELINE_STAGES = [
  { keys: ["Uploader", "Upload APK"], progress: 25 },
  { keys: ["Scanner", "MobSF Scanner"], progress: 40 },
  { keys: ["Ollama"], progress: 55 },
  { keys: ["AI_Agent_Network", "AI Agent Network"], progress: 60 },
  { keys: ["AI_Agent_Manifest", "AI Agent Manifest"], progress: 70 },
  { keys: ["AI_Agent_Resource", "AI Agent Resource"], progress: 75 },
  { keys: ["CVSS"], progress: 80 },
  { keys: ["Code"], progress: 82 },
  { keys: ["Merge", "Merge & PDF Generation", "Gotenberg"], progress: 85 },
  { keys: ["Gmail", "Email", "Send Email"], progress: 100 },
];

const FINAL_STAGE_INDEX = PIPELINE_STAGES.length - 1;

const resolvePipelineStageIndex = (nodeKey) => {
  const normalized = String(nodeKey).trim().toLowerCase();
  const direct = PIPELINE_STAGES.findIndex((stage) =>
    stage.keys.some((key) => key.toLowerCase() === normalized)
  );
  if (direct >= 0) {
    return direct;
  }

  const progressFromName = normalized.match(/(\d{2,3})\s*%?/);
  if (progressFromName) {
    const hint = Number(progressFromName[1]);
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < PIPELINE_STAGES.length; i += 1) {
      const diff = Math.abs(PIPELINE_STAGES[i].progress - hint);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestDiff <= 8) {
      return bestIdx;
    }
  }

  if (/resource/.test(normalized)) {
    return PIPELINE_STAGES.findIndex((s) => s.keys.includes("AI_Agent_Resource"));
  }
  if (/manifest/.test(normalized)) {
    return PIPELINE_STAGES.findIndex((s) => s.keys.includes("AI_Agent_Manifest"));
  }
  if (/network/.test(normalized)) {
    return PIPELINE_STAGES.findIndex((s) => s.keys.includes("AI_Agent_Network"));
  }

  if (
    /gmail|e-?mail|send.*mail|send\s*a\s*message|notify\s*100|message\s*sent/i.test(
      normalized
    )
  ) {
    return PIPELINE_STAGES.length - 1;
  }
  if (/gotenberg|pdf/.test(normalized)) {
    return PIPELINE_STAGES.findIndex((s) => s.keys.includes("Merge"));
  }
  if (/merge|fusion/.test(normalized)) {
    return PIPELINE_STAGES.findIndex((s) => s.keys.includes("Merge"));
  }
  if (/ollama/.test(normalized)) {
    return PIPELINE_STAGES.findIndex((s) => s.keys.includes("Ollama"));
  }
  if (/scanner|mobsf/.test(normalized)) {
    return PIPELINE_STAGES.findIndex((s) => s.keys.includes("Scanner"));
  }
  if (/upload|uploader/.test(normalized)) {
    return 0;
  }

  return -1;
};

const upsertNodeStatus = (nodeStatuses, nodeKey, { status, progress, logs }) => {
  const milestone = getMilestoneProgressForNode(nodeKey) ?? progress ?? 0;
  const capped = capProgressToMilestone(nodeKey, progress ?? milestone) ?? milestone;
  nodeStatuses[nodeKey] = {
    status: status || "running",
    progress: capped,
    logs: logs ?? nodeStatuses[nodeKey]?.logs ?? "",
    updatedAt: new Date(),
  };
};

/** Déduit les phases à partir des logs quand n8n n’envoie pas Notify Merge/Gotenberg/Gmail. */
const inferStagesFromLogs = (scan, nodeStatuses) => {
  const logText = String(scan.logs || "");
  if (!logText.trim()) {
    return;
  }

  const rules = [
    { pattern: /Uploader:.*termin|upload termin/i, key: "Uploader", progress: 25, status: "completed" },
    { pattern: /Scanner:.*termin|mobsf.*termin|scorecard termin/i, key: "Scanner", progress: 40, status: "completed" },
    { pattern: /Ollama:.*termin/i, key: "Ollama", progress: 55, status: "completed" },
    {
      pattern: /AI_Agent|agent.*termin|ollama:.*termin/i,
      key: "AI_Agent_Network",
      progress: 75,
      status: "completed",
    },
    { pattern: /CVSS|Code:|Merge:|fusion|Gotenberg:|PDF généré|pdf termin/i, key: "Merge", progress: 85, status: "completed" },
    {
      pattern:
        /Gmail:|rapport envoy|mail envoy|message sent|email sent|notify\s*100|send\s*a\s*message/i,
      key: "Gmail",
      progress: 100,
      status: "completed",
      completeScan: true,
    },
  ];

  for (const rule of rules) {
    if (!rule.pattern.test(logText)) {
      continue;
    }
    upsertNodeStatus(nodeStatuses, rule.key, {
      status: rule.status,
      progress: rule.progress,
      logs: nodeStatuses[rule.key]?.logs,
    });
    if (rule.key === "Ollama") {
      upsertNodeStatus(nodeStatuses, "AI_Agent_Network", {
        status: "completed",
        progress: 75,
        logs: "",
      });
      upsertNodeStatus(nodeStatuses, "AI_Agent_Manifest", {
        status: "completed",
        progress: 75,
        logs: "",
      });
    }
    if (rule.completeScan) {
      scan.status = "completed";
      scan.progress = 100;
    }
  }
};

const getMilestoneProgressForNode = (nodeKey) => {
  const idx = resolvePipelineStageIndex(nodeKey);
  return idx >= 0 ? PIPELINE_STAGES[idx].progress : undefined;
};

/** 100 % et statut completed : uniquement après envoi e-mail (Gmail). */
const isFinalStageNode = (nodeKey) => resolvePipelineStageIndex(nodeKey) === FINAL_STAGE_INDEX;

/** n8n envoie parfois progress: 100 sur Ollama — on plafonne au jalon de la phase. */
const capProgressToMilestone = (nodeKey, rawProgress) => {
  const milestone = getMilestoneProgressForNode(nodeKey);
  if (milestone === undefined) {
    return typeof rawProgress === "number" ? Math.min(100, Math.max(0, rawProgress)) : undefined;
  }
  if (typeof rawProgress !== "number") {
    return milestone;
  }
  if (isFinalStageNode(nodeKey)) {
    return Math.min(100, Math.max(0, rawProgress));
  }
  return Math.min(rawProgress, milestone);
};

const reconcileScanProgress = (scan) => {
  const nodeStatuses = { ...(scan.nodeStatuses || {}) };
  inferStagesFromLogs(scan, nodeStatuses);

  let maxStage = -1;
  let maxProgress = scan.progress ?? 0;

  for (const [key, value] of Object.entries(nodeStatuses)) {
    const idx = resolvePipelineStageIndex(key);
    if (idx > maxStage) {
      maxStage = idx;
    }
    const capped = capProgressToMilestone(key, value?.progress) ?? getMilestoneProgressForNode(key) ?? 0;
    maxProgress = Math.max(maxProgress, capped);
  }

  if (maxStage > 0) {
    for (let i = 0; i < maxStage; i += 1) {
      const prior = PIPELINE_STAGES[i];
      const priorKey = prior.keys[0];
      nodeStatuses[priorKey] = {
        status: "completed",
        progress: prior.progress,
        logs: nodeStatuses[priorKey]?.logs ?? "",
        updatedAt: new Date(),
      };
    }
  }

  if (maxStage >= 0) {
    const currentKey = PIPELINE_STAGES[maxStage].keys[0];
    const current = nodeStatuses[currentKey];
    if (current && current.status === "scanning" && maxStage < PIPELINE_STAGES.length - 1) {
      const hasLaterNode = Object.keys(nodeStatuses).some(
        (key) => resolvePipelineStageIndex(key) > maxStage
      );
      if (hasLaterNode) {
        nodeStatuses[currentKey] = {
          ...current,
          status: "completed",
          progress: PIPELINE_STAGES[maxStage].progress,
          updatedAt: new Date(),
        };
      }
    }
  }

  const scanCompleteDone = ["Gmail", "Email", "Send Email"].some((name) => {
    const entry = nodeStatuses[name];
    return entry?.status === "completed";
  });
  if (scanCompleteDone) {
    upsertNodeStatus(nodeStatuses, "Merge", {
      status: "completed",
      progress: 85,
      logs: nodeStatuses.Merge?.logs ?? "",
    });
    upsertNodeStatus(nodeStatuses, "Gotenberg", {
      status: "completed",
      progress: 85,
      logs: nodeStatuses.Gotenberg?.logs ?? "",
    });
  }

  const ollamaDone =
    nodeStatuses.Ollama?.status === "completed" ||
    /Ollama:.*termin/i.test(String(scan.logs || ""));
  const mergeStageIdx = PIPELINE_STAGES.findIndex((s) => s.keys.includes("Merge"));
  if (ollamaDone && maxStage < mergeStageIdx) {
    upsertNodeStatus(nodeStatuses, "Ollama", {
      status: "completed",
      progress: 55,
      logs: nodeStatuses.Ollama?.logs,
    });
    ["AI_Agent_Network", "AI_Agent_Manifest"].forEach((key) => {
      upsertNodeStatus(nodeStatuses, key, {
        status: "completed",
        progress: 75,
        logs: nodeStatuses[key]?.logs ?? "",
      });
    });
    maxProgress = Math.max(maxProgress, 75);
    maxStage = Math.max(maxStage, PIPELINE_STAGES.findIndex((s) => s.keys.includes("AI_Agent_Manifest")));
  }

  scan.progress = scanCompleteDone ? 100 : Math.min(maxProgress, 99);
  scan.nodeStatuses = nodeStatuses;
  if (scanCompleteDone) {
    scan.status = "completed";
    scan.progress = 100;
  } else if (scan.status === "completed" && !scanCompleteDone) {
    scan.status = "running";
    scan.progress = Math.min(maxProgress, 99);
  }
};

const applyWorkflowUpdate = async (scan, { node, status, progress, logs }) => {
  const nodeKey = node.trim();
  const milestone = getMilestoneProgressForNode(nodeKey);
  const incomingProgress =
    typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : undefined;
  const cappedIncoming = capProgressToMilestone(nodeKey, incomingProgress);
  const cappedMilestone = milestone ?? 0;
  let progressValue = Math.max(cappedIncoming ?? 0, cappedMilestone, scan.progress ?? 0);
  if (!isFinalStageNode(nodeKey)) {
    progressValue = Math.min(progressValue, 99);
  }

  let nodeStatus = status || scan.status;
  if (logs && /termin[eé]|finished|complete|done/i.test(logs)) {
    nodeStatus = nodeStatus === "failed" ? nodeStatus : "completed";
  }
  if (isFinalStageNode(nodeKey) && (cappedIncoming >= 100 || progressValue >= 100)) {
    nodeStatus = "completed";
    progressValue = 100;
  }

  const stageIndex = resolvePipelineStageIndex(nodeKey);
  const nodeStatuses = { ...(scan.nodeStatuses || {}) };

  if (stageIndex > 0) {
    for (let i = 0; i < stageIndex; i += 1) {
      const prior = PIPELINE_STAGES[i];
      const priorKey = prior.keys[0];
      nodeStatuses[priorKey] = {
        status: "completed",
        progress: prior.progress,
        logs: nodeStatuses[priorKey]?.logs ?? "",
        updatedAt: new Date(),
      };
    }
  }

  const priorNodeProgress = nodeStatuses[nodeKey]?.progress ?? 0;
  const nodeProgress = Math.max(
    priorNodeProgress,
    cappedIncoming ?? cappedMilestone,
    cappedMilestone
  );
  nodeStatuses[nodeKey] = {
    status: nodeStatus,
    progress: capProgressToMilestone(nodeKey, nodeProgress) ?? cappedMilestone,
    logs: typeof logs === "string" ? logs : "",
    updatedAt: new Date(),
  };

  if (isFinalStageNode(nodeKey) && nodeStatus === "completed") {
    scan.status = "completed";
    progressValue = 100;
  } else if (status && scan.status !== "completed") {
    scan.status = nodeStatus === "completed" && !isFinalStageNode(nodeKey) ? "running" : nodeStatus;
  }

  scan.latestNode = nodeKey;
  scan.progress = progressValue;
  scan.nodeStatuses = nodeStatuses;

  if (logs && typeof logs === "string") {
    const timestamp = new Date().toISOString();
    scan.logs = `${scan.logs ? `${scan.logs}\n` : ""}[${timestamp}] ${nodeKey}: ${logs}`;
  }

  reconcileScanProgress(scan);
  await scan.save();

  return {
    scanId: scan.scanId,
    node: nodeKey,
    status: scan.status,
    nodeStatus: nodeStatuses[nodeKey]?.status ?? status ?? scan.status,
    progress: scan.progress,
    logs: logs ?? null,
    scanStatus: scan.status,
    latestNode: scan.latestNode,
    reportUrl: scan.reportUrl,
    nodeStatuses: scan.nodeStatuses,
    updatedAt: new Date().toISOString(),
  };
};

const emitWorkflowUpdate = (io, payload) => {
  if (!io) {
    return;
  }
  io.emit("workflow-update", payload);
  io.to(payload.scanId).emit("scan:update", payload);
};

// autoriser les noms de nœuds dynamiques venant de n8n sans filtrage strict
const isValidNodeName = (value) => typeof value === "string" && value.trim().length > 0;

const resolveNodeName = (body) => {
  const candidates = [body.node, body.step, body.latestNode, body.nodeName];
  for (const candidate of candidates) {
    if (!isValidNodeName(candidate)) {
      continue;
    }
    const name = String(candidate).trim();
    const stageIdx = resolvePipelineStageIndex(name);
    if (stageIdx >= 0) {
      return PIPELINE_STAGES[stageIdx].keys[0];
    }
    return name;
  }

  const rawProgress = body.progress;
  const progressNum =
    typeof rawProgress === "number"
      ? rawProgress
      : typeof rawProgress === "string" && rawProgress.trim() !== "" && !Number.isNaN(Number(rawProgress))
        ? Number(rawProgress)
        : undefined;
  if (progressNum !== undefined) {
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < PIPELINE_STAGES.length; i += 1) {
      const diff = Math.abs(PIPELINE_STAGES[i].progress - progressNum);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestDiff <= 8) {
      return PIPELINE_STAGES[bestIdx].keys[0];
    }
  }

  return "Workflow";
};

const triggerScan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier APK reçu." });
    }

    const scanId = crypto.randomUUID();
    const publicBase = getPublicApiBase(req);
    const fileUrl = `${publicBase}/uploads/${req.file.filename}`;
    const callbackUrl = `${publicBase}/api/scan/update-status`;

    const scanDoc = await Scan.create({
      scanId,
      status: "pending",
      callbackUrl,
      reportUrl: "",
      appInfo: {},
      mobsf: {},
      aiAnalysis: {},
      finalData: {},
      nodeStatuses: {},
      latestNode: "",
      progress: 0,
      logs: "",
    });

    if (N8N_WEBHOOK_URL && !PUBLIC_API_URL && publicBase.includes("localhost")) {
      console.warn(
        "⚠ n8n cloud ne peut pas rappeler localhost. Définissez PUBLIC_API_URL (ex. ngrok) dans backend/.env"
      );
    }
    let driveData = null;
    let driveUploadError = null;

    if (hasOAuthDriveConfig && !(await isOAuthConnected())) {
      return res.status(401).json({
        error: "Connectez Google Drive avant de lancer un scan.",
        connectUrl: `${req.protocol}://${req.get("host")}/api/auth/google`,
        authUrl: getAuthUrl(),
      });
    }

    if (canUploadToDrive()) {
      try {
        const localFilePath = path.join(__dirname, "../../uploads", req.file.filename);
        driveData = await uploadApkToDrive({
          filePath: localFilePath,
          mimeType: req.file.mimetype,
          fileName: `scan-${scanId}-${req.file.originalname}`,
          scanId,
        });
        scanDoc.driveFileId = driveData.id ?? "";
        scanDoc.driveFileLink = driveData.webViewLink || driveData.webContentLink || "";
        await scanDoc.save();
      } catch (driveError) {
        driveUploadError = driveError.message || "Erreur Drive";
        console.error("Erreur upload Drive:", driveUploadError);
        if (!N8N_WEBHOOK_URL) {
          scanDoc.status = "failed";
          scanDoc.errorMessage = driveUploadError;
          await scanDoc.save();
          return res.status(502).json({
            error: "Impossible de transférer l’APK vers Google Drive.",
            details: driveUploadError,
          });
        }
        console.warn("Repli sur le webhook n8n après échec Drive.");
      }
    }

    let workflowTriggered = false;

    if (N8N_WEBHOOK_URL && !useDriveTriggerForN8n) {
      const n8nPayload = {
        scanId,
        fileName: req.file.filename,
        fileUrl,
        callbackUrl,
        driveFileId: driveData?.id ?? scanDoc.driveFileId ?? null,
        driveFileLink:
          driveData?.webViewLink ?? driveData?.webContentLink ?? scanDoc.driveFileLink ?? null,
      };

      try {
        await axios.post(N8N_WEBHOOK_URL, n8nPayload, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 20000,
        });
        workflowTriggered = true;

        scanDoc.status = "running";
        const io = req.app.get("io");
        const initialPayload = await applyWorkflowUpdate(scanDoc, {
          node: "Uploader",
          status: "running",
          progress: 15,
          logs: "APK reçu. Workflow n8n démarré.",
        });
        emitWorkflowUpdate(io, initialPayload);
      } catch (externalError) {
        console.error("Erreur appel n8n:", externalError.message || externalError);
        scanDoc.status = "failed";
        scanDoc.errorMessage = externalError.message || "Erreur n8n";
        await scanDoc.save();
        return res.status(502).json({
          error: "Impossible d’initier le workflow n8n.",
          details: externalError.message || "Erreur externe",
        });
      }
    } else if (!driveData && !useDriveTriggerForN8n) {
      scanDoc.status = "failed";
      await scanDoc.save();
      return res.status(502).json({
        error: "Aucun canal de déclenchement configuré (n8n ou Drive).",
      });
    }

    if (useDriveTriggerForN8n && driveData) {
      console.log(
        `Scan ${scanId} — APK sur Drive (${driveData.id}). Workflow n8n via Google Drive Trigger.`
      );
      scanDoc.status = "running";
      scanDoc.callbackUrl = callbackUrl;
      const io = req.app.get("io");
      const initialPayload = await applyWorkflowUpdate(scanDoc, {
        node: "Uploader",
        status: "running",
        progress: 15,
        logs: "APK sur Drive. En attente des callbacks n8n (POST update-status).",
      });
      emitWorkflowUpdate(io, initialPayload);
      workflowTriggered = true;
    }

    const messageParts = [];
    if (workflowTriggered) {
      messageParts.push("Workflow n8n démarré");
    }
    if (driveData) {
      messageParts.push("APK sur Google Drive");
    }
    if (driveUploadError) {
      messageParts.push(`Drive : ${driveUploadError}`);
    }

    return res.status(201).json({
      message:
        messageParts.length > 0
          ? `Scan déclenché — ${messageParts.join(" · ")}.`
          : "Scan déclenché avec succès.",
      scanId,
      fileUrl,
      callbackUrl,
      workflowTriggered,
      driveUploaded: Boolean(driveData),
      driveFileLink: driveData?.webViewLink ?? driveData?.webContentLink ?? null,
      driveError: driveUploadError,
    });
  } catch (error) {
    console.error("triggerScan error:", error.message || error);
    return res.status(500).json({ error: "Impossible de démarrer le scan." });
  }
};

const updateScanStatus = async (req, res) => {
  try {
    console.log("[update-status]", new Date().toISOString(), JSON.stringify(req.body));
    const {
      scanId,
      node,
      status,
      progress,
      logs,
      finalData,
      step,
      appInfo,
      mobsf,
      aiAnalysis,
      reportUrl,
      errorMessage,
    } = req.body;

    if (!scanId || typeof scanId !== "string") {
      return res.status(400).json({ error: "scanId est requis." });
    }

    const normalizedStatus = normalizeWorkflowStatus(status);

    const objectId = mongoose.Types.ObjectId.isValid(scanId) ? scanId : null;
    const query = objectId
      ? { $or: [{ scanId }, { _id: objectId }] }
      : { scanId };

    const scan = await Scan.findOne(query);
    if (!scan) {
      return res.status(404).json({ error: "Scan introuvable." });
    }

    const nodeKey = resolveNodeName(req.body);
    const progressValue =
      typeof progress === "number"
        ? progress
        : typeof progress === "string" && progress.trim() !== "" && !Number.isNaN(Number(progress))
          ? Number(progress)
          : undefined;

    if (appInfo && typeof appInfo === "object") {
      scan.appInfo = { ...scan.appInfo, ...appInfo };
    }
    if (mobsf && typeof mobsf === "object") {
      scan.mobsf = { ...scan.mobsf, ...mobsf };
    }
    if (aiAnalysis && typeof aiAnalysis === "object") {
      scan.aiAnalysis = { ...scan.aiAnalysis, ...aiAnalysis };
    }
    if (reportUrl && typeof reportUrl === "string") {
      scan.reportUrl = reportUrl;
    }

    if (finalData && typeof finalData === "object") {
      scan.finalData = { ...scan.finalData, ...finalData };
      if (finalData.appInfo && typeof finalData.appInfo === "object") {
        scan.appInfo = { ...scan.appInfo, ...finalData.appInfo };
      }
      if (finalData.mobsf && typeof finalData.mobsf === "object") {
        scan.mobsf = { ...scan.mobsf, ...finalData.mobsf };
      }
      if (finalData.aiAnalysis && typeof finalData.aiAnalysis === "object") {
        scan.aiAnalysis = { ...scan.aiAnalysis, ...finalData.aiAnalysis };
      }
      if (finalData.reportUrl && typeof finalData.reportUrl === "string") {
        scan.reportUrl = finalData.reportUrl;
      }
    }

    if (errorMessage && typeof errorMessage === "string") {
      scan.errorMessage = errorMessage;
      scan.status = "failed";
    }

    const resolvedIsFinal = isFinalStageNode(nodeKey);
    const forceComplete =
      req.body.completeScan === true ||
      req.body.workflowComplete === true ||
      (progressValue >= 100 && resolvedIsFinal);

    const workflowPayload = await applyWorkflowUpdate(scan, {
      node: forceComplete ? "Gmail" : nodeKey,
      status: forceComplete ? "completed" : normalizedStatus || scan.status,
      progress: forceComplete ? 100 : progressValue,
      logs:
        logs ||
        (forceComplete
          ? "Rapport envoyé par e-mail — workflow terminé"
          : undefined),
    });
    workflowPayload.finalData = finalData || null;
    workflowPayload.redirectToReport = scan.status === "completed";

    emitWorkflowUpdate(req.app.get("io"), workflowPayload);

    return res.status(200).json({
      message: "Statut du scan mis à jour.",
      scanId,
      status: scan.status,
      progress: scan.progress,
      redirectToReport: scan.status === "completed",
    });
  } catch (error) {
    console.error("updateScanStatus error:", error.message || error);
    return res.status(500).json({ error: "Impossible de mettre à jour le statut du scan." });
  }
};

const getScanByDriveFile = async (req, res) => {
  try {
    const { driveFileId } = req.params;
    if (!driveFileId || !String(driveFileId).trim()) {
      return res.status(400).json({ error: "driveFileId manquant." });
    }

    const scan = await Scan.findOne({ driveFileId: String(driveFileId).trim() });
    if (!scan) {
      return res.status(404).json({
        error: "Aucun scan associé à ce fichier Drive.",
        driveFileId,
      });
    }

    return res.status(200).json({
      scanId: scan.scanId,
      callbackUrl: buildCallbackUrl(req),
    });
  } catch (error) {
    console.error("getScanByDriveFile error:", error.message || error);
    return res.status(500).json({ error: "Impossible de retrouver le scan Drive." });
  }
};

const getScanDetails = async (req, res) => {
  try {
    const { scanId } = req.params;
    const scan = await Scan.findOne({ scanId });
    if (!scan) {
      return res.status(404).json({ error: "Scan introuvable." });
    }
    const freshCallback = buildCallbackUrl(req);
    let shouldSave = false;
    if (scan.callbackUrl !== freshCallback) {
      scan.callbackUrl = freshCallback;
      shouldSave = true;
    }
    reconcileScanProgress(scan);
    shouldSave = true;
    if (shouldSave) {
      await scan.save();
    }
    return res.status(200).json(enrichScanResponse(scan, req));
  } catch (error) {
    console.error("getScanDetails error:", error.message || error);
    return res.status(500).json({ error: "Impossible de récupérer le scan." });
  }
};

const getScanHistory = async (req, res) => {
  try {
    const scans = await Scan.find().sort({ createdAt: -1 });
    return res.status(200).json(scans);
  } catch (error) {
    console.error("getScanHistory error:", error.message || error);
    return res.status(500).json({ error: "Impossible de récupérer l’historique." });
  }
};

const renderScanReportHtml = (scan) => {
  const appInfo = scan.appInfo ?? {};
  const permissions = Array.isArray(scan.mobsf?.permissions) ? scan.mobsf.permissions : [];
  const vulnerabilities = scan.mobsf?.vulnerabilities ?? {};

  const permissionList = permissions
    .map((permission) => `<li>${String(permission.name ?? permission)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rapport MobAuditFlow ${scan.scanId}</title>
  <style>
    body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; color: #0f172a; background: #f8fafc; }
    .container { max-width: 900px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 24px; }
    h1 { margin-bottom: 0.5rem; font-size: 2rem; color: #0f172a; }
    h2 { margin-top: 2rem; color: #0f172a; }
    p, li { line-height: 1.6; }
    .badge { display: inline-block; margin-right: 0.5rem; padding: 0.35rem 0.65rem; border-radius: 9999px; background: #0ea5e9; color: white; font-size: 0.85rem; }
    .section { margin-top: 1.25rem; }
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .card { background: #f8fafc; padding: 1rem; border-radius: 1rem; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem 0.5rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Rapport de scan MobAuditFlow</h1>
    <p>ID de scan : <strong>${scan.scanId}</strong></p>
    <div class="grid section">
      <div class="card">
        <h2>Informations de l’application</h2>
        <p>Nom : ${String(appInfo.appName ?? "N/A")}</p>
        <p>Package : ${String(appInfo.packageName ?? "N/A")}</p>
        <p>Version : ${String(appInfo.version ?? "N/A")}</p>
        <p>Score : ${String(appInfo.score ?? "N/A")}</p>
      </div>
      <div class="card">
        <h2>Statut du scan</h2>
        <p>${String(scan.status)}</p>
        <p>Créé le : ${new Date(scan.createdAt).toLocaleString("fr-FR")}</p>
      </div>
    </div>

    <div class="section">
      <h2>Permissions détectées</h2>
      <ul>${permissionList || "<li>Aucune permission détectée.</li>"}</ul>
    </div>

    <div class="section">
      <h2>Vulnérabilités</h2>
      <table>
        <thead>
          <tr><th>Severité</th><th>Nombre</th></tr>
        </thead>
        <tbody>
          <tr><td>High</td><td>${String(vulnerabilities.high ?? 0)}</td></tr>
          <tr><td>Medium</td><td>${String(vulnerabilities.medium ?? 0)}</td></tr>
          <tr><td>Low</td><td>${String(vulnerabilities.low ?? 0)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Analyse IA</h2>
      <pre>${JSON.stringify(scan.aiAnalysis ?? {}, null, 2)}</pre>
    </div>
  </div>
</body>
</html>`;
};

const downloadReport = async (req, res) => {
  try {
    const { scanId } = req.params;
    const scan = await Scan.findOne({ scanId });
    if (!scan) {
      return res.status(404).json({ error: "Scan introuvable." });
    }

    if (scan.reportUrl) {
      const safeToFetchRemote = (() => {
        try {
          const url = new URL(scan.reportUrl);
          if (url.hostname.includes("mail.google.com")) {
            return false;
          }
          return true;
        } catch {
          return false;
        }
      })();

      if (safeToFetchRemote) {
        const response = await axios.get(scan.reportUrl, {
          responseType: "stream",
          timeout: 30000,
          maxRedirects: 3,
          validateStatus: (status) => status >= 200 && status < 400,
        });

        const contentType = String(response.headers["content-type"] ?? "");
        if (/application\/pdf/i.test(contentType)) {
          res.setHeader("Content-Type", "application/pdf");
          if (response.headers["content-disposition"]) {
            res.setHeader("Content-Disposition", response.headers["content-disposition"]);
          } else {
            res.setHeader("Content-Disposition", `attachment; filename=report-${scanId}.pdf`);
          }
          return response.data.pipe(res);
        }

        // Not a PDF (often an HTML redirect/login page). Fall back to local generation.
        if (response.data && typeof response.data.destroy === "function") {
          response.data.destroy();
        }
      }
    }

    const html = renderScanReportHtml(scan);
    const pdfStream = await createPdfStream(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=report-${scanId}.pdf`);
    return pdfStream.pipe(res);
  } catch (error) {
    console.error("downloadReport error:", error.message || error);
    return res.status(502).json({ error: "Impossible de récupérer le rapport PDF." });
  }
};

module.exports = {
  triggerScan,
  updateScanStatus,
  getScanByDriveFile,
  getScanDetails,
  getScanHistory,
  downloadReport,
};
