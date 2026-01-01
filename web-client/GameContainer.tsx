import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import parser from "socket.io-msgpack-parser";
import EventSystem from "../common/EventSystem";
import { experienceRequiredForLevel } from "../common/shared";
import type { ClientGameState, LevelEvent, UpgradeEvent } from "../common/types";
import ClientStateMachine from "./ClientStateMachine";
import { initServerEventSystem } from "./eventSystems";
import { useAppDispatch } from "./hooks";
import PhaserMiddleware from "./phaser-middleware";
import { setServerEventSystem } from "./serverEventSystem";
import { setActiveSpells } from "./state/activeSpellsSlice";
import { setExperience } from "./state/experienceSlice";
import { setState, setTimeLeft, setWave } from "./state/gameSlice";
import { setGold } from "./state/goldSlice";
import { setHealth } from "./state/healthSlice";
import { set } from "./state/levelSlice";
import { setUpgradeChoices } from "./state/upgradeChoicesSlice";

export default function GameContainer() {
  const ref = useRef<HTMLCanvasElement>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Skip game initialization if we're in a test environment
    if (typeof window !== "undefined" && (window as any).__PLAYWRIGHT_TEST__) {
      return;
    }

    const socket = io({ parser });

    const serverEventSystem = initServerEventSystem(new EventSystem(), socket);
    setServerEventSystem(serverEventSystem);

    serverEventSystem.addEventListener(
      "update",
      ({ player, wave, waveSecondsRemaining }: ClientGameState) => {
        const timeRemaining = Math.floor(waveSecondsRemaining);
        dispatch(setTimeLeft(timeRemaining));
        dispatch(setWave(wave + 1));
        if (player != null) {
          dispatch(
            set({ level: player.level, pendingLevels: player.pendingLevels }),
          );
          dispatch(setActiveSpells(player.spells));
          const effectiveLevel = player.level + player.pendingLevels;
          const experience =
            player.experience - experienceRequiredForLevel(effectiveLevel);
          const experienceToNextLevel =
            experienceRequiredForLevel(effectiveLevel + 1) -
            experienceRequiredForLevel(effectiveLevel);

          // Clamp experience so the bar never overflows
          const clampedExperience = Math.max(
            0,
            Math.min(experience, experienceToNextLevel),
          );

          dispatch(
            setExperience({
              currentExperience: clampedExperience,
              experienceToNextLevel,
            }),
          );
          dispatch(setGold(player.gold));
          dispatch(
            setHealth({
              currentHealth: player.hp,
              maxHealth: player.maxHp,
            }),
          );
        }
      },
    );
    serverEventSystem.addEventListener("level", (data: LevelEvent) => {
      if (data.player) {
        dispatch(
          set({
            level: data.player.level,
            pendingLevels: data.player.pendingLevels,
          }),
        );
        dispatch(setGold(data.player.gold));
        dispatch(setActiveSpells(data.player.spells));
      }
    });

    serverEventSystem.addEventListener("preMatch", () => {
      dispatch(setState("lobby"));
    });
    serverEventSystem.addEventListener("beginMatch", () => {
      dispatch(setState("match"));
    });
    serverEventSystem.addEventListener("upgrade", (data: UpgradeEvent) => {
      dispatch(setState("upgrade"));
      dispatch(setUpgradeChoices(data));
    });
    serverEventSystem.addEventListener("gameOver", () => {
      dispatch(setState("gameOver"));
    });
    const sm = new ClientStateMachine(
      serverEventSystem,
      new PhaserMiddleware(ref.current!, serverEventSystem),
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
  }, [dispatch]);
  return (
    <canvas
      ref={ref}
      id="canvas"
      data-testid="canvas"
      width="800"
      height="600"
    />
  );
}
