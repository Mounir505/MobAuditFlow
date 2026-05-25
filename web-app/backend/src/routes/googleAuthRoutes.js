const express = require("express");
const {
  hasOAuthDriveConfig,
  getAuthUrl,
  handleOAuthCallback,
  getConnectionStatus,
  clearTokens,
  GOOGLE_OAUTH_SUCCESS_REDIRECT,
} = require("../services/googleOAuthDriveService");

const router = express.Router();

router.get("/google", (req, res) => {
  if (!hasOAuthDriveConfig) {
    return res.status(503).send(
      "OAuth Gmail non configuré. Ajoutez GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET et GOOGLE_OAUTH_REDIRECT_URI dans backend/.env"
    );
  }

  return res.redirect(getAuthUrl());
});

router.get("/google/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${GOOGLE_OAUTH_SUCCESS_REDIRECT}&drive=error&message=${encodeURIComponent(String(error))}`);
  }

  if (!code || typeof code !== "string") {
    return res.status(400).send("Code OAuth manquant.");
  }

  try {
    await handleOAuthCallback(code);
    return res.redirect(GOOGLE_OAUTH_SUCCESS_REDIRECT);
  } catch (callbackError) {
    const message = callbackError.message || "Erreur OAuth";
    return res.redirect(
      `${GOOGLE_OAUTH_SUCCESS_REDIRECT}&drive=error&message=${encodeURIComponent(message)}`
    );
  }
});

router.get("/google/status", async (req, res) => {
  try {
    const status = await getConnectionStatus();
    return res.json(status);
  } catch (statusError) {
    return res.status(500).json({ error: statusError.message });
  }
});

router.post("/google/disconnect", (req, res) => {
  clearTokens();
  return res.json({ message: "Compte Google déconnecté." });
});

module.exports = router;
