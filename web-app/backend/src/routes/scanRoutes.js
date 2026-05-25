const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  triggerScan,
  updateScanStatus,
  getScanByDriveFile,
  getScanDetails,
  getScanHistory,
  downloadReport,
} = require("../controllers/scanController");

const router = express.Router();

const uploadsFolder = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsFolder);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${timestamp}-${safeName}`);
  },
});

const apkFilter = (req, file, cb) => {
  if (file.mimetype === "application/vnd.android.package-archive" || file.originalname.endsWith(".apk")) {
    cb(null, true);
  } else {
    cb(new Error("Le fichier doit être un APK Android (.apk)."), false);
  }
};

const upload = multer({
  storage,
  fileFilter: apkFilter,
  limits: {
    fileSize: 250 * 1024 * 1024,
  },
});

router.post("/trigger", upload.single("apk"), triggerScan);
router.post("/update-status", updateScanStatus);
router.get("/history", getScanHistory);
router.get("/by-drive/:driveFileId", getScanByDriveFile);
router.get("/:scanId/report", downloadReport);
router.get("/:scanId", getScanDetails);

module.exports = router;
