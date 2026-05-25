const fs = require("fs");
const { google } = require("googleapis");

const trimEnv = (value) => {
  if (value == null) return "";
  return String(value).trim().replace(/^["']|["']$/g, "");
};

const GOOGLE_DRIVE_CLIENT_EMAIL = trimEnv(process.env.GOOGLE_DRIVE_CLIENT_EMAIL);
const GOOGLE_DRIVE_PRIVATE_KEY = trimEnv(process.env.GOOGLE_DRIVE_PRIVATE_KEY);
const GOOGLE_DRIVE_FOLDER_ID = trimEnv(process.env.GOOGLE_DRIVE_FOLDER_ID);
const GOOGLE_DRIVE_IMPERSONATE_USER = trimEnv(process.env.GOOGLE_DRIVE_IMPERSONATE_USER);

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];

const hasDriveCredentials = Boolean(
  GOOGLE_DRIVE_CLIENT_EMAIL && GOOGLE_DRIVE_PRIVATE_KEY && GOOGLE_DRIVE_FOLDER_ID
);

let driveClient = null;

const getDriveClient = () => {
  if (!hasDriveCredentials) {
    throw new Error("Google Drive credentials are not configured.");
  }

  if (!driveClient) {
    const auth = new google.auth.JWT({
      email: GOOGLE_DRIVE_CLIENT_EMAIL,
      key: GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: DRIVE_SCOPES,
      subject: GOOGLE_DRIVE_IMPERSONATE_USER || undefined,
    });
    driveClient = google.drive({ version: "v3", auth });
  }

  return driveClient;
};

const formatDriveError = (error) => {
  const apiMessage = error?.response?.data?.error?.message || error?.message || "Erreur Drive inconnue";

  if (/storage quota|do not have storage quota/i.test(apiMessage)) {
    return (
      "Le compte de service ne peut pas stocker de fichiers dans Drive. Solutions : " +
      "(1) ajoutez GOOGLE_DRIVE_IMPERSONATE_USER=votre-email@domaine.com dans .env avec la délégation à domaine entier activée dans Google Workspace, " +
      "(2) ou utilisez un Dossier partagé d’équipe (Shared Drive) et donnez le rôle Contributeur au compte de service."
    );
  }

  if (/file not found/i.test(apiMessage) && GOOGLE_DRIVE_FOLDER_ID && apiMessage.includes(GOOGLE_DRIVE_FOLDER_ID)) {
    return (
      `Dossier Drive introuvable pour le compte de service (${GOOGLE_DRIVE_FOLDER_ID}). ` +
      `Partagez ce dossier avec ${GOOGLE_DRIVE_CLIENT_EMAIL} en tant qu’Éditeur.`
    );
  }

  if (/unauthorized_client|delegation|domain-wide/i.test(apiMessage)) {
    return (
      `Délégation Google Workspace requise pour ${GOOGLE_DRIVE_IMPERSONATE_USER}. ` +
      "Activez la délégation à domaine entier pour le compte de service dans la console admin Google."
    );
  }

  if (/invalid_grant|account not found/i.test(apiMessage)) {
    return "Clé ou e-mail du compte de service invalide. Vérifiez GOOGLE_DRIVE_CLIENT_EMAIL et GOOGLE_DRIVE_PRIVATE_KEY.";
  }

  return apiMessage;
};

const verifyDriveFolderAccess = async () => {
  const drive = getDriveClient();

  try {
    const folder = await drive.files.get({
      fileId: GOOGLE_DRIVE_FOLDER_ID,
      fields: "id,name,mimeType,capabilities,driveId",
      supportsAllDrives: true,
    });

    if (folder.data.mimeType !== "application/vnd.google-apps.folder") {
      throw new Error(
        `GOOGLE_DRIVE_FOLDER_ID ne pointe pas vers un dossier (type: ${folder.data.mimeType}).`
      );
    }

    if (folder.data.capabilities?.canAddChildren === false) {
      throw new Error(
        `Pas la permission d’ajouter des fichiers dans « ${folder.data.name} ». ` +
          `Partagez le dossier avec ${GOOGLE_DRIVE_CLIENT_EMAIL} en Éditeur.`
      );
    }

    return {
      ok: true,
      folderId: folder.data.id,
      folderName: folder.data.name,
      isSharedDrive: Boolean(folder.data.driveId),
      impersonating: GOOGLE_DRIVE_IMPERSONATE_USER || null,
    };
  } catch (error) {
    throw new Error(formatDriveError(error));
  }
};

const uploadFileToDrive = async ({ filePath, mimeType, fileName, scanId }) => {
  if (!hasDriveCredentials) {
    throw new Error("Google Drive credentials are not configured.");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier local introuvable: ${filePath}`);
  }

  await verifyDriveFolderAccess();

  const drive = getDriveClient();
  const fileMetadata = {
    name: fileName,
    parents: [GOOGLE_DRIVE_FOLDER_ID],
    appProperties: {
      scanId,
    },
  };

  const media = {
    mimeType,
    body: fs.createReadStream(filePath),
  };

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id,name,webViewLink,webContentLink,appProperties",
      supportsAllDrives: true,
    });

    return response.data;
  } catch (error) {
    throw new Error(formatDriveError(error));
  }
};

module.exports = {
  hasDriveCredentials,
  GOOGLE_DRIVE_CLIENT_EMAIL,
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_DRIVE_IMPERSONATE_USER,
  verifyDriveFolderAccess,
  uploadFileToDrive,
};
