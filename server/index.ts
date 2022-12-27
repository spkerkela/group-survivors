import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer);
app.use(express.static(path.join(__dirname, "dist")));

const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3000;

let players = 0;
io.on("connection", (socket) => {
  players++;
  console.log("a user connected, players: " + players);
  let interval = setInterval(() => {
    socket.emit("players", players);
  }, 16);
  socket.on("disconnect", () => {
    players--;
    console.log("user disconnected");
    clearInterval(interval);
  });
});

httpServer.listen(port, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
