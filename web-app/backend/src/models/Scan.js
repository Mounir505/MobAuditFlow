const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema(
  {
    scanId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    appInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    mobsf: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    aiAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    finalData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    nodeStatuses: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    latestNode: {
      type: String,
      default: "",
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    logs: {
      type: String,
      default: "",
    },
    reportUrl: {
      type: String,
      default: "",
    },
    driveFileId: {
      type: String,
      default: "",
    },
    driveFileLink: {
      type: String,
      default: "",
    },
    errorMessage: {
      type: String,
      default: "",
    },
    callbackUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "running", "scanning", "ai_analyzing", "completed", "failed"],
      default: "pending",
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
      immutable: true,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Scan", scanSchema);
