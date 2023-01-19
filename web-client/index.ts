import { io, Socket } from "socket.io-client";
import Game from "./Game";

const canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
import parser from "socket.io-msgpack-parser";
import { sanitizeName } from "../common/shared";
import { globalEventSystem, initServerEventSystem } from "./eventSystems";
import EventSystem from "../common/EventSystem";
import PhaserMiddleware from "./phaser-middleware";
import ClientStateMachine from "./ClientStateMachine";

const levelIndicatorDiv = document.getElementById("level");
const socket = io({ parser });

const startButton = document.getElementById("start") as HTMLButtonElement;
const nameInput = document.getElementById("name") as HTMLInputElement;
const errorDiv = document.getElementById("error") as HTMLDivElement;

const serverEventSystem = initServerEventSystem(new EventSystem(), socket);

startButton.onclick = () => {
  if (!nameInput.value || sanitizeName(nameInput.value) === "") {
    errorDiv.innerText = "Please enter a name";
    return;
  }
  errorDiv.innerText = "";
  serverEventSystem.dispatchEvent("join", sanitizeName(nameInput.value));
  globalEventSystem.dispatchEvent("disableJoinUI");
};

globalEventSystem.addEventListener("level", (level: number) => {
  levelIndicatorDiv.innerText = `Level: ${level}`;
});

globalEventSystem.addEventListener("disableJoinUI", () => {
  startButton.disabled = true;
  nameInput.disabled = true;
});

globalEventSystem.addEventListener("enableJoinUI", () => {
  startButton.disabled = false;
  nameInput.disabled = false;
});

const sm = new ClientStateMachine(
  serverEventSystem,
  new PhaserMiddleware(canvasElement)
);
let previousTime = Date.now();
let deltaTime = 0;

function update() {
  const currentTime = Date.now();
  const elapsedTime = currentTime - previousTime;
  previousTime = currentTime;
  deltaTime = elapsedTime / 1000;
  sm.update(deltaTime);
  requestAnimationFrame(update);
}

requestAnimationFrame(update);
/*
const game = new Game(serverEventSystem, new PhaserMiddleware(canvasElement));


 */
