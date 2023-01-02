import { io } from "socket.io-client";
import { SERVER_UPDATE_RATE } from "../common/constants";
import { GameState } from "../common/types";
import Game from "./Game";
import { sendMoveMessage } from "./messages";

const canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
import parser from "socket.io-msgpack-parser";
import { sanitizeName } from "../common/shared";

const levelIndicatorDiv = document.getElementById("level");
const socket = io({ parser });

const startButton = document.getElementById("start") as HTMLButtonElement;
const nameInput = document.getElementById("name") as HTMLInputElement;
const errorDiv = document.getElementById("error") as HTMLDivElement;

startButton.onclick = () => {
  if (!nameInput.value || sanitizeName(nameInput.value) === "") {
    errorDiv.innerText = "Please enter a name";
    return;
  }
  errorDiv.innerText = "";
  socket.emit("join", sanitizeName(nameInput.value));
};

let gameState: GameState = {
  players: [],
  enemies: [],
  gems: [],
  projectiles: [],
  id: "",
};

let game: Game | null = null;

let inputInterval: NodeJS.Timeout | null = null;

socket.on("begin", (newGameState: GameState) => {
  gameState = newGameState;
  game = new Game(canvasElement, gameState);
  inputInterval = setInterval(() => {
    if (game) {
      const inputState = game.getInputState();
      sendMoveMessage(socket, { ...inputState, id: gameState.id });
    }
  }, SERVER_UPDATE_RATE);
});

const colorFromDamageType = (damageType: string) => {
  switch (damageType) {
    case "fire":
      return "red";
    case "cold":
      return "blue";
    case "poison":
      return "green";
    case "physical":
      return "white";
    default:
      return "white";
  }
};

socket.on("damage", ({ amount, damageType }) => {
  const player = gameState.players.find((p) => p.id === gameState.id);
  const color = colorFromDamageType(damageType);
  game.showDamage(amount, player.x, player.y, color);
  game.flashWhite(player.id);
});

socket.on("disconnect", () => {
  game = null;
  if (inputInterval) {
    clearInterval(inputInterval);
  }
});

socket.on("update", (newState: GameState) => {
  if (newState.id !== gameState.id) return;
  gameState.players = newState.players;
  gameState.enemies = newState.enemies;
  gameState.gems = newState.gems;
  gameState.projectiles = newState.projectiles;
});

socket.on("spell", (data) => {
  const color = colorFromDamageType(data.damageType);
  game.showDamageToTarget(data.targetId, data.damage, color);
  game.flashWhite(data.targetId);
});

socket.on("level", (data) => {
  if (data.playerId !== gameState.id) return;
  levelIndicatorDiv.innerText = `Level ${data.player.level}`;
  game.updateLevel(data.player);
});
