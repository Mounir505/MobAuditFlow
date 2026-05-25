const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const trimEnv = (value) => {
  if (value == null) return "";
  return String(value).trim().replace(/^["']|["']$/g, "");
};

const GOOGLE_OAUTH_CLIENT_ID = trimEnv(process.env.GOOGLE_OAUTH_CLIENT_ID);
const GOOGLE_OAUTH_CLIENT_SECRET = trimEnv(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
const GOOGLE_OAUTH_REDIRECT_URI = trimEnv(process.env.GOOGLE_OAUTH_REDIRECT_URI);
const GOOGLE_DRIVE_FOLDER_ID = trimEnv(process.env.GOOGLE_DRIVE_FOLDER_ID);
const GOOGLE_OAUTH_SUCCESS_REDIRECT =
  trimEnv(process.env.GOOGLE_OAUTH_SUCCESS_REDIRECT) || "http://localhost:3000/?drive=connected";

// drive.file seul peut empêcher l’écriture dans un dossier existant ; drive couvre le dossier cible.
const OAUTH_SCOPES = ["https://www.googleapis.com/auth/drive"];
const TOKEN_PATH = path.join(__dirname, "../../data/google-oauth-tokens.json");

const hasOAuthDriveConfig = Boolean(
  GOOGLE_OAUTH_CLIENT_ID &&
    GOOGLE_OAUTH_CLIENT_SECRET &&
    GOOGLE_OAUTH_REDIRECT_URI &&
    GOOGLE_DRIVE_FOLDER_ID
);

const ensureDataDir = () => {
  const dir = path.dirname(TOKEN_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const readTokens = () => {
  if (!fs.existsSync(TOKEN_PATH)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  } catch {
    return null;
  }
};

const writeTokens = (tokens) => {
  ensureDataDir();
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf8");
};

const clearTokens = () => {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
  }
};

const createOAuthClient = () => {
  if (!hasOAuthDriveConfig) {
    throw new Error("OAuth Google non configuré (voir backend/.env).");
  }

  return new google.auth.OAuth2(
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URI
  );
};

const getAuthorizedClient = async () => {
  const tokens = readTokens();
  if (!tokens?.refresh_token && !tokens?.access_token) {
    return null;
  }

  const client = createOAuthClient();
  client.setCredentials(tokens);

  client.on("tokens", (newTokens) => {
    const merged = { ...readTokens(), ...newTokens };
    writeTokens(merged);
  });

  return client;
};

const isOAuthConnected = async () => {
  const client = await getAuthorizedClient();
  return Boolean(client);
};

const getAuthUrl = () => {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: OAUTH_SCOPES,
  });
};

const handleOAuthCallback = async (code) => {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  writeTokens(tokens);
  return tokens;
};

const getConnectionStatus = async () => {
  if (!hasOAuthDriveConfig) {
    return {
      configured: false,
      connected: false,
      folderId: GOOGLE_DRIVE_FOLDER_ID || null,
    };
  }

  const client = await getAuthorizedClient();
  if (!client) {
    return {
      configured: true,
      connected: false,
      folderId: GOOGLE_DRIVE_FOLDER_ID,
      authUrl: getAuthUrl(),
    };
  }

  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const profile = await oauth2.userinfo.get();
    return {
      configured: true,
      connected: true,
      folderId: GOOGLE_DRIVE_FOLDER_ID,
      email: profile.data.email ?? null,
    };
  } catch {
    return {
      configured: true,
      connected: true,
      folderId: GOOGLE_DRIVE_FOLDER_ID,
    };
  }
};

const formatDriveError = (error) => {
  return error?.response?.data?.error?.message || error?.message || "Erreur Google Drive";
};

const verifyDriveFolderAccess = async () => {
  const client = await getAuthorizedClient();
  if (!client) {
    throw new Error("Compte Gmail non connecté. Ouvrez /api/auth/google pour autoriser l’accès.");
  }

  const drive = google.drive({ version: "v3", auth: client });
  const folder = await drive.files.get({
    fileId: GOOGLE_DRIVE_FOLDER_ID,
    fields: "id,name,mimeType,capabilities",
  });

  if (folder.data.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID doit être l’ID d’un dossier Drive.");
  }

  if (folder.data.capabilities?.canAddChildren === false) {
    throw new Error(`Pas la permission d’écrire dans le dossier « ${folder.data.name} ».`);
  }

  return {
    ok: true,
    folderId: folder.data.id,
    folderName: folder.data.name,
    mode: "oauth",
  };
};

const uploadFileToDrive = async ({ filePath, mimeType, fileName, scanId }) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier local introuvable: ${filePath}`);
  }

  const client = await getAuthorizedClient();
  if (!client) {
    throw new Error(
      "Connectez votre compte Gmail : ouvrez http://localhost:5000/api/auth/google (ou le bouton dans l’app)."
    );
  }

  await verifyDriveFolderAccess();

  const drive = google.drive({ version: "v3", auth: client });

  try {
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
        appProperties: { scanId },
      },
      media: {
        mimeType,
        body: fs.createReadStream(filePath),
      },
      fields: "id,name,webViewLink,webContentLink",
    });

    return response.data;
  } catch (error) {
    throw new Error(formatDriveError(error));
  }
};

module.exports = {
  hasOAuthDriveConfig,
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_OAUTH_SUCCESS_REDIRECT,
  TOKEN_PATH,
  isOAuthConnected,
  getAuthUrl,
  handleOAuthCallback,
  getConnectionStatus,
  verifyDriveFolderAccess,
  uploadFileToDrive,
  clearTokens,
};
