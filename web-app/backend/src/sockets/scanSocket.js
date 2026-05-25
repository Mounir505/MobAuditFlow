const initializeScanSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`Socket.IO client connected: ${socket.id}`);

    socket.on("joinScan", ({ scanId }) => {
      if (typeof scanId === "string" && scanId.length > 0) {
        socket.join(scanId);
        socket.emit("scan:joined", { scanId });
      }
    });

    socket.on("leaveScan", ({ scanId }) => {
      if (typeof scanId === "string" && scanId.length > 0) {
        socket.leave(scanId);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket.IO client disconnected: ${socket.id}`);
    });
  });
};

const emitScanUpdate = (io, scanId, payload) => {
  if (!scanId || typeof scanId !== "string") {
    return;
  }
  io.to(scanId).emit("scan:update", payload);
  io.emit("scan:broadcast", { scanId, ...payload });
};

module.exports = {
  initializeScanSocket,
  emitScanUpdate,
};
