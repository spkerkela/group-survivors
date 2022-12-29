import { io } from "socket.io-client";
import { GameState } from "../common/types";
import Game from "./Game";
const canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const socket = io();

let gameState: GameState = {
  players: [],
  id: "",
};

let game: Game | null = null;

let inputInterval: NodeJS.Timeout | null = null;

function getInputState(game: Game) {
  const { up, down, left, right } = game.getInputState();
  return { up, down, left, right };
}

socket.on("begin", (newGameState: GameState) => {
  gameState = newGameState;
  game = new Game(canvasElement, gameState);
  inputInterval = setInterval(() => {
    if (game) {
      const { up, down, left, right } = getInputState(game);
      socket.emit("move", { up, down, left, right, id: gameState.id });
    }
  }, 16);
});

socket.on("disconnect", () => {
  game = null;
  if (inputInterval) {
    clearInterval(inputInterval);
  }
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

socket.on("update", (newState: GameState) => {
  gameState.players = newState.players;
});
