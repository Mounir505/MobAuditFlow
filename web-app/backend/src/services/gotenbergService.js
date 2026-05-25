const axios = require("axios");

const { GOTENBERG_URL } = process.env;

if (!GOTENBERG_URL) {
  console.error("GOTENBERG_URL is required for PDF generation.");
}

const createPdfStream = async (htmlContent) => {
  if (!GOTENBERG_URL) {
    throw new Error("Gotenberg URL non configuré.");
  }

  if (typeof globalThis.FormData === "undefined") {
    throw new Error("FormData global non disponible. Utilisez Node 18+.");
  }

  const form = new globalThis.FormData();
  form.append("files", htmlContent, {
    filename: "report.html",
    contentType: "text/html",
  });
  form.append("waitTimeout", "30");
  form.append("landscape", "false");

  const response = await axios.post(`${GOTENBERG_URL}/forms/chromium`, form, {
    headers: {
      ...form.getHeaders(),
    },
    responseType: "stream",
    timeout: 60000,
  });

  if (response.status !== 200) {
    throw new Error(`Gotenberg responded with status ${response.status}`);
  }

  return response.data;
};

module.exports = {
  createPdfStream,
};
