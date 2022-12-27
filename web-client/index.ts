import { io } from "socket.io-client";
const playersId = document.getElementById("players");
const socket = io();
console.log(socket);

socket.on("connect", () => {
  console.log("connected");
});

socket.on("players", (data) => {
  playersId.innerHTML = data;
});
