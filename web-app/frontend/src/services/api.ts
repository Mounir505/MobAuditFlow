import axios, { AxiosError } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

export type ScanStatus =
  | "pending"
  | "running"
  | "scanning"
  | "ai_analyzing"
  | "completed"
  | "failed";

export interface ScanSummary {
  scanId: string;
  status: ScanStatus;
  progress?: number;
  latestNode?: string;
  callbackUrl?: string;
  nodeStatuses?: Record<string, { status: string; progress: number; logs?: string; updatedAt: string }>;
  logs?: string;
  createdAt: string;
  reportUrl?: string;
  appInfo?: Record<string, unknown>;
  mobsf?: Record<string, unknown>;
  aiAnalysis?: Record<string, unknown>;
}

export interface ScanUpdatePayload {
  scanId: string;
  status: ScanStatus;
  step?: string | null;
  appInfo?: Record<string, unknown>;
  mobsf?: Record<string, unknown>;
  aiAnalysis?: Record<string, unknown>;
  reportUrl?: string;
  errorMessage?: string | null;
}

export interface TriggerScanResponse {
  message: string;
  scanId: string;
  fileUrl: string;
  workflowTriggered?: boolean;
  driveUploaded?: boolean;
  driveFileLink?: string | null;
  driveError?: string | null;
}

export interface UpdateScanStatusRequest {
  scanId: string;
  status?: ScanStatus;
  step?: string;
  appInfo?: Record<string, unknown>;
  mobsf?: Record<string, unknown>;
  aiAnalysis?: Record<string, unknown>;
  reportUrl?: string;
  errorMessage?: string;
}

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (!error.response && error.message === "Network Error") {
      const base = BASE_URL || "(NEXT_PUBLIC_API_BASE_URL non défini)";
      return `Impossible de joindre le backend (${base}). Vérifiez qu’il est démarré : cd backend && npm start`;
    }
    return error.response?.data?.error || error.message || "Erreur réseau inconnue.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Erreur inconnue.";
};

export const triggerScan = async (
  apkFile: File,
  onUploadProgress?: (progress: number) => void
): Promise<TriggerScanResponse> => {
  const formData = new FormData();
  formData.append("apk", apkFile);

  try {
    const response = await apiClient.post<TriggerScanResponse>("/api/scan/trigger", formData, {
      onUploadProgress: (progressEvent) => {
        if (!onUploadProgress) return;
        const total = progressEvent.total ?? 0;
        const loaded = progressEvent.loaded ?? 0;
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        onUploadProgress(percent);
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const data = error.response.data as { error?: string; connectUrl?: string };
      throw new Error(data.error || "Connectez Google Drive avant de scanner.");
    }
    throw new Error(getErrorMessage(error));
  }
};

export const fetchScanDetails = async (scanId: string): Promise<ScanSummary> => {
  try {
    const response = await apiClient.get<ScanSummary>(`/api/scan/${encodeURIComponent(scanId)}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const fetchScanHistory = async (): Promise<ScanSummary[]> => {
  try {
    const response = await apiClient.get<ScanSummary[]>("/api/scan/history");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const downloadReport = async (scanId: string): Promise<Blob> => {
  try {
    const response = await apiClient.get<Blob>(`/api/scan/${encodeURIComponent(scanId)}/report`, {
      responseType: "blob",
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export interface GoogleDriveStatus {
  configured: boolean;
  connected: boolean;
  folderId?: string | null;
  email?: string | null;
  authUrl?: string;
}

export interface BackendConfig {
  publicApiUrl: string | null;
  n8nWebhookConfigured: boolean;
  n8nTriggerMode?: string;
  driveTriggerOnly?: boolean;
  callbackExample: string | null;
  byDriveExample?: string | null;
}

export interface WorkflowProgressPayload {
  scanId: string;
  node: string;
  status?: ScanStatus;
  progress: number;
  logs?: string;
}

export const postWorkflowProgress = async (payload: WorkflowProgressPayload): Promise<void> => {
  try {
    await apiClient.post("/api/scan/update-status", payload);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const fetchBackendConfig = async (): Promise<BackendConfig> => {
  const response = await apiClient.get<BackendConfig>("/api/health/config");
  return response.data;
};

export const fetchGoogleDriveStatus = async (): Promise<GoogleDriveStatus> => {
  try {
    const response = await apiClient.get<GoogleDriveStatus>("/api/auth/google/status");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getGoogleDriveConnectUrl = (): string => {
  const base = BASE_URL.replace(/\/$/, "");
  return `${base}/api/auth/google`;
};

export const emitScanStatusUpdate = async (payload: UpdateScanStatusRequest): Promise<void> => {
  try {
    await apiClient.post("/api/scan/update-status", payload);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
