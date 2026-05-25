"use client";

import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import type { ScanStatus } from "@/services/api";

export interface ScanSocketUpdate {
  scanId: string;
  node: string;
  status: ScanStatus;
  nodeStatus?: ScanStatus;
  progress: number;
  logs?: string | null;
  finalData?: Record<string, unknown> | null;
  scanStatus?: ScanStatus;
  latestNode?: string;
  reportUrl?: string;
  appInfo?: Record<string, unknown>;
  mobsf?: Record<string, unknown>;
  aiAnalysis?: Record<string, unknown>;
  nodeStatuses?: Record<string, { status: string; progress: number; logs?: string; updatedAt: string }>;
}

export interface UseSocketResult {
  isConnected: boolean;
  latestUpdate: ScanSocketUpdate | null;
  error: string | null;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export const useSocket = (scanId: string | null): UseSocketResult => {
  const [isConnected, setIsConnected] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<ScanSocketUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socket = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
    });
  }, []);

  useEffect(() => {
    if (!socket) {
      setError("Socket.IO n'est pas initialisé.");
      return undefined;
    }

    const handleConnect = () => {
      setIsConnected(true);
      setError(null);
      if (scanId) {
        socket.emit("joinScan", { scanId });
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleUpdate = (payload: ScanSocketUpdate) => {
      if (scanId && payload.scanId && payload.scanId !== scanId) {
        return;
      }
      setLatestUpdate(payload);
    };

    const handleScanJoined = () => {
      setError(null);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("scan:update", handleUpdate);
    socket.on("workflow-update", handleUpdate);
    socket.on("scan:joined", handleScanJoined);
    socket.on("connect_error", (connectError) => {
      setError(connectError?.message || "Erreur de connexion Socket.IO.");
    });

    socket.connect();

    return () => {
      if (scanId) {
        socket.emit("leaveScan", { scanId });
      }
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("scan:update", handleUpdate);
      socket.off("scan:joined", handleScanJoined);
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [scanId, socket]);

  useEffect(() => {
    if (!socket || !scanId || !isConnected) {
      return undefined;
    }

    socket.emit("joinScan", { scanId });
    return undefined;
  }, [scanId, isConnected, socket]);

  return {
    isConnected,
    latestUpdate,
    error,
  };
};
