const {
  hasOAuthDriveConfig,
  isOAuthConnected,
  getAuthUrl,
  uploadFileToDrive: uploadViaOAuth,
  verifyDriveFolderAccess: verifyOAuthFolder,
} = require("./googleOAuthDriveService");

const {
  hasDriveCredentials,
  uploadFileToDrive: uploadViaServiceAccount,
  verifyDriveFolderAccess: verifyServiceAccountFolder,
} = require("./googleDriveService");

const canUploadToDrive = () => hasOAuthDriveConfig || hasDriveCredentials;

const requireDriveReady = async () => {
  if (hasOAuthDriveConfig) {
    if (!(await isOAuthConnected())) {
      throw new Error(
        `Google Drive non connecté. Ouvrez ${getAuthUrl()} ou cliquez « Connecter Google Drive » dans l’app.`
      );
    }
    return "oauth";
  }

  if (hasDriveCredentials) {
    return "service_account";
  }

  throw new Error("Google Drive non configuré dans backend/.env.");
};

const uploadApkToDrive = async (params) => {
  const mode = await requireDriveReady();

  if (mode === "oauth") {
    return uploadViaOAuth(params);
  }

  return uploadViaServiceAccount(params);
};

const verifyDriveSetup = async () => {
  const mode = await requireDriveReady();

  if (mode === "oauth") {
    return verifyOAuthFolder();
  }

  return verifyServiceAccountFolder();
};

module.exports = {
  canUploadToDrive,
  requireDriveReady,
  uploadApkToDrive,
  verifyDriveSetup,
};
