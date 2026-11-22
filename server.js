const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 25000,
  pingTimeout: 20000
});

const PORT = process.env.PORT || 3000;
const players = new Map();

app.use(express.static(__dirname));
app.get("/health", (_req, res) => res.json({ ok: true, players: players.size }));

io.on("connection", (socket) => {
  const current = Object.fromEntries(players);
  socket.emit("players:init", current);

  const player = { x: 0, z: 3, ry: 0 };
  players.set(socket.id, player);
  socket.broadcast.emit("player:joined", { id: socket.id, ...player });

  socket.on("player:move", (data) => {
    if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.z) || !Number.isFinite(data.ry)) return;
    // محدوده حرکتی مطابق نقشه بازی؛ از داده‌های نامعتبر جلوگیری می‌کند.
    const safe = {
      x: Math.max(-9.2, Math.min(9.2, data.x)),
      z: Math.max(-8.2, Math.min(13.5, data.z)),
      ry: data.ry
    };
    players.set(socket.id, safe);
    socket.broadcast.emit("player:moved", { id: socket.id, ...safe });
  });

  socket.on("disconnect", () => {
    players.delete(socket.id);
    socket.broadcast.emit("player:left", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Samsari multiplayer server listening on ${PORT}`);
});
