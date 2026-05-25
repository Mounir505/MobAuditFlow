const path = require("path");

const fs = require("fs");

const http = require("http");

const express = require("express");

const cors = require("cors");

const mongoose = require("mongoose");

const { Server } = require("socket.io");

const { initializeScanSocket } = require("./sockets/scanSocket");

const dotenv = require("dotenv");



dotenv.config({ path: path.resolve(__dirname, "../.env") });



const {

  PORT = 5000,

  MONGO_URI,

  N8N_WEBHOOK_URL,

  GOTENBERG_URL,

} = process.env;



const { hasOAuthDriveConfig, getConnectionStatus } = require("./services/googleOAuthDriveService");

const {

  hasDriveCredentials,

  GOOGLE_DRIVE_CLIENT_EMAIL,

} = require("./services/googleDriveService");

const { canUploadToDrive, verifyDriveSetup } = require("./services/driveUploadService");



const hasDriveUploadConfig = hasOAuthDriveConfig || hasDriveCredentials;



if (!MONGO_URI || !GOTENBERG_URL || (!N8N_WEBHOOK_URL && !hasDriveUploadConfig)) {

  console.error(

    "Missing required environment variables. Please check backend/.env"

  );

  process.exit(1);

}



const app = express();

const server = http.createServer(app);

const io = new Server(server, {

  cors: {

    origin: true,

    methods: ["GET", "POST"],

  },

});



app.set("io", io);



app.use(cors({ origin: true }));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));



const uploadsFolder = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadsFolder)) {

  fs.mkdirSync(uploadsFolder, { recursive: true });

}



app.get("/", (req, res) => {

  res.json({

    status: "ok",

    service: "MobAuditFlow Backend",

    env: process.env.NODE_ENV || "development",

  });

});



app.post("/api/health", (req, res) => {

  res.json({ healthy: true, timestamp: new Date().toISOString() });

});

app.get("/api/health/config", (req, res) => {
  const publicApiUrl =
    typeof process.env.PUBLIC_API_URL === "string"
      ? process.env.PUBLIC_API_URL.trim().replace(/\/$/, "")
      : "";
  const n8nTriggerMode = String(process.env.N8N_TRIGGER_MODE || "webhook").toLowerCase();

  res.json({
    publicApiUrl: publicApiUrl || null,
    n8nWebhookConfigured: Boolean(process.env.N8N_WEBHOOK_URL),
    n8nTriggerMode,
    driveTriggerOnly: n8nTriggerMode === "drive",
    callbackExample: publicApiUrl
      ? `${publicApiUrl}/api/scan/update-status`
      : null,
    byDriveExample: publicApiUrl
      ? `${publicApiUrl}/api/scan/by-drive/DRIVE_FILE_ID`
      : null,
  });
});

const googleAuthRoutes = require("./routes/googleAuthRoutes");

app.use("/api/auth", googleAuthRoutes);



const scanRoutes = require("./routes/scanRoutes");



app.get("/api/health/drive", async (req, res) => {

  if (!canUploadToDrive()) {

    return res.status(503).json({

      ok: false,

      error: "Google Drive non configuré dans .env",

    });

  }



  try {

    const folder = await verifyDriveSetup();

    const oauthStatus = hasOAuthDriveConfig ? await getConnectionStatus() : null;

    return res.json({

      ok: true,

      mode: folder.mode ?? (oauthStatus?.connected ? "oauth" : "service_account"),

      folderId: folder.folderId,

      folderName: folder.folderName,

      oauth: oauthStatus,

      serviceAccount: hasDriveCredentials ? GOOGLE_DRIVE_CLIENT_EMAIL : null,

    });

  } catch (error) {

    const oauthStatus = hasOAuthDriveConfig ? await getConnectionStatus() : null;

    return res.status(502).json({

      ok: false,

      error: error.message,

      oauth: oauthStatus,

      connectUrl: oauthStatus?.authUrl ?? null,

    });

  }

});



app.use("/api/scan", scanRoutes);



app.use((err, req, res, next) => {

  console.error("Backend error:", err.message || err);

  if (err && err.name === "MulterError") {

    return res.status(400).json({ error: err.message });

  }

  return res.status(500).json({ error: "Erreur interne du serveur." });

});



initializeScanSocket(io);



const connectDatabase = async () => {

  try {

    await mongoose.connect(MONGO_URI);

    console.log("MongoDB connecté.");

  } catch (error) {

    console.error("Échec de la connexion MongoDB:", error.message || error);

    process.exit(1);

  }

};



const startServer = async () => {

  await connectDatabase();



  server.listen(PORT, async () => {

    console.log(`MobAuditFlow backend démarré sur le port ${PORT}`);

    console.log(`n8n Webhook: ${N8N_WEBHOOK_URL}`);

    console.log(
      `n8n mode: ${String(process.env.N8N_TRIGGER_MODE || "webhook").toLowerCase()} (drive = pas d'appel webhook au trigger)`
    );

    console.log(
      `PUBLIC_API_URL: ${process.env.PUBLIC_API_URL?.trim() || "(non défini — n8n cloud ne pourra pas rappeler l'app)"}`
    );

    console.log(`Gotenberg: ${GOTENBERG_URL}`);



    if (hasOAuthDriveConfig) {

      const oauthStatus = await getConnectionStatus();

      if (oauthStatus.connected) {

        console.log(`Google Drive OAuth — connecté (${oauthStatus.email ?? "Gmail"}).`);

        try {

          const folder = await verifyDriveSetup();

          console.log(`Dossier cible : « ${folder.folderName} »`);

        } catch (driveError) {

          console.warn(`Drive OAuth : ${driveError.message}`);

        }

      } else {

        console.warn("Google Drive OAuth — non connecté.");

        console.warn(`Connectez Gmail : http://localhost:${PORT}/api/auth/google`);

      }

    } else if (hasDriveCredentials) {

      try {

        const folder = await verifyDriveSetup();

        console.log(`Google Drive (compte de service) — dossier « ${folder.folderName} ».`);

      } catch (driveError) {

        console.warn(`Google Drive NON prêt: ${driveError.message}`);

        console.warn(`Partagez le dossier avec ${GOOGLE_DRIVE_CLIENT_EMAIL} (Éditeur).`);

      }

    }

  });

};



startServer();



module.exports = { app, server, io };


