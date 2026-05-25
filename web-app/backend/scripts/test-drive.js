const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const fs = require("fs");
const {
  hasDriveCredentials,
  GOOGLE_DRIVE_CLIENT_EMAIL,
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_DRIVE_IMPERSONATE_USER,
  verifyDriveFolderAccess,
  uploadFileToDrive,
} = require("../src/services/googleDriveService");

const main = async () => {
  console.log("=== Test Google Drive MobAuditFlow ===\n");

  if (!hasDriveCredentials) {
    console.error("Variables manquantes dans backend/.env :");
    console.error("  GOOGLE_DRIVE_CLIENT_EMAIL");
    console.error("  GOOGLE_DRIVE_PRIVATE_KEY");
    console.error("  GOOGLE_DRIVE_FOLDER_ID");
    process.exit(1);
  }

  console.log("Compte de service :", GOOGLE_DRIVE_CLIENT_EMAIL);
  console.log("Dossier cible     :", GOOGLE_DRIVE_FOLDER_ID);
  if (GOOGLE_DRIVE_IMPERSONATE_USER) {
    console.log("Impersonation     :", GOOGLE_DRIVE_IMPERSONATE_USER);
  }
  console.log("");

  try {
    const result = await verifyDriveFolderAccess();
    console.log("OK — accès au dossier confirmé.");
    console.log("Nom du dossier   :", result.folderName);

    const testFile = path.join(__dirname, "../uploads/_drive-upload-test.txt");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "MobAuditFlow drive test");

    try {
      const uploaded = await uploadFileToDrive({
        filePath: testFile,
        mimeType: "text/plain",
        fileName: `mobaudit-drive-test-${Date.now()}.txt`,
        scanId: "drive-test",
      });
      console.log("OK — upload test réussi.");
      console.log("Fichier Drive ID :", uploaded.id);
      console.log("Lien             :", uploaded.webViewLink || uploaded.webContentLink || "(aucun)");
      fs.unlinkSync(testFile);
      process.exit(0);
    } catch (uploadError) {
      fs.existsSync(testFile) && fs.unlinkSync(testFile);
      throw uploadError;
    }
  } catch (error) {
    console.error("ÉCHEC —", error.message);
    console.error("\nChecklist :");
    console.error("1. Créez un dossier dans Google Drive (votre compte perso).");
    console.error("2. Ouvrez-le et copiez l’ID depuis l’URL :");
    console.error("   https://drive.google.com/drive/folders/<ID_ICI>");
    console.error("3. Clic droit sur le dossier → Partager → ajoutez :");
    console.error(`   ${GOOGLE_DRIVE_CLIENT_EMAIL}`);
    console.error("   avec le rôle Éditeur.");
    console.error("4. Mettez à jour GOOGLE_DRIVE_FOLDER_ID dans backend/.env");
    console.error("5. Redémarrez le backend : node src/app.js");
    process.exit(1);
  }
};

main();
