import { io } from "socket.io-client";
import { GameState } from "../common/types";
import Game from "./Game";
const playersId = document.getElementById("players");
const canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const socket = io();

let gameState: GameState = {
  players: [],
  id: "",
};

let game: Game | null = null;

socket.on("connect", () => {
  console.log("connected");
});

socket.on("begin", (newGameState: GameState) => {
  gameState = newGameState;
  new Game(canvasElement, gameState);
});

socket.on("disconnected", (disconnectedIds: string[]) => {
  gameState.players = gameState.players.filter(
    (p) => !disconnectedIds.includes(p.id)
  );
  disconnectedIds.forEach((id) => {
    if (game) {
      game.removePlayer(id);
    }
  });
});

socket.on("players", (data) => {
  playersId!.innerHTML = JSON.stringify(data.map((p) => p.id));
  gameState.players = data;
});
