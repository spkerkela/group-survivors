import React, { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import parser from "socket.io-msgpack-parser";
import EventSystem from "../common/EventSystem";
import { experienceRequiredForLevel, sanitizeName } from "../common/shared";
import { ClientGameState } from "../common/types";
import ClientStateMachine from "./ClientStateMachine";
import { initServerEventSystem, globalEventSystem } from "./eventSystems";
import { useAppDispatch } from "./hooks";
import PhaserMiddleware from "./phaser-middleware";
import { setExperience } from "./state/experienceSlice";
import { start, setTimeLeft, setWave, stop } from "./state/gameSlice";
import { setGold } from "./state/goldSlice";
import { setHealth } from "./state/healthSlice";
import { set } from "./state/levelSlice";

export default function GameContainer() {
  const ref = useRef<HTMLCanvasElement>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const socket = io({ parser });

    const startButton = document.getElementById("start") as HTMLButtonElement;
    const nameInput = document.getElementById("name") as HTMLInputElement;

    const serverEventSystem = initServerEventSystem(new EventSystem(), socket);

    startButton.onclick = () => {
      if (!nameInput.value || sanitizeName(nameInput.value) === "") {
        return;
      }
      serverEventSystem.dispatchEvent("join", sanitizeName(nameInput.value));
      globalEventSystem.dispatchEvent("disableJoinUI");
    };

    serverEventSystem.addEventListener(
      "update",
      ({ player, wave, waveSecondsRemaining }: ClientGameState) => {
        const timeRemaining = Math.floor(waveSecondsRemaining);
        dispatch(setTimeLeft(timeRemaining));
        dispatch(setWave(wave + 1));
        if (player != null) {
          dispatch(set(player.level));
          const experience =
            player.experience - experienceRequiredForLevel(player.level);
          const experienceToNextLevel =
            experienceRequiredForLevel(player.level + 1) -
            experienceRequiredForLevel(player.level);

          dispatch(
            setExperience({
              currentExperience: experience,
              experienceToNextLevel,
            })
          );
          dispatch(setGold(player.gold));
          dispatch(
            setHealth({
              currentHealth: player.hp,
              maxHealth: player.maxHp,
            })
          );
        }
      }
    );
    serverEventSystem.addEventListener("beginMatch", () => {
      dispatch(start());
    });
    serverEventSystem.addEventListener("endMatch", () => {
      dispatch(stop());
    });
    const sm = new ClientStateMachine(
      serverEventSystem,
      new PhaserMiddleware(ref.current!, serverEventSystem)
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
  }, [ref]);
  return (
    <canvas
      ref={ref}
      id="canvas"
      data-testid="canvas"
      width="800"
      height="600"
    ></canvas>
  );
}
