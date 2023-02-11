import Phaser from "phaser";
import { SCREEN_WIDTH, SCREEN_HEIGHT, NUMBER_SCALE } from "../common/constants";
import EventSystem from "../common/EventSystem";
import { experienceRequiredForLevel } from "../common/shared";
import { ClientGameState, LevelEvent } from "../common/types";
import Bar from "./Bar";

export class UiScene extends Phaser.Scene {
  experienceBar: Bar;
  eventSystem: EventSystem;
  constructor(eventSystem: EventSystem) {
    super({ key: "UI", active: false });
    this.eventSystem = eventSystem;
  }
  init(data: { gameState: ClientGameState }) {
    this.data.set("gameState", data.gameState);
  }
  create(data: { gameState: ClientGameState }) {
    this.data.set("gameState", data.gameState);
    const player = data.gameState.players.find(
      (p) => p.id === data.gameState.id
    );
    this.experienceBar = new Bar(this, {
      position: { x: 10, y: 10 },
      width: SCREEN_WIDTH - 20,
      height: 20,
      colorHex: 0x0000ff,
      value: player
        ? player.experience - experienceRequiredForLevel(player.level)
        : 0,
      maxValue: player
        ? experienceRequiredForLevel(player.level + 1) -
          experienceRequiredForLevel(player.level)
        : experienceRequiredForLevel(2),
    });
    const levelCallback: (data: LevelEvent) => void = ({
      playerId,
      player,
    }) => {
      const gameState = this.data.get("gameState");
      if (playerId !== gameState.id) {
        return;
      }
      this.experienceBar.setUpperBound(
        experienceRequiredForLevel(player.level + 1) -
          experienceRequiredForLevel(player.level)
      );
    };
    this.eventSystem.addEventListener("level", levelCallback);
    this.events.on("destroy", () => {
      this.eventSystem.removeEventListener("level", levelCallback);
    });
    this.events.on("shutdown", () => {
      this.eventSystem.removeEventListener("level", levelCallback);
    });

    this.add
      .text(10, SCREEN_HEIGHT - 20, "Gold: 0", {
        fontSize: "20px",
        color: "yellow",
        fontStyle: "bold",
      })
      .setName("gold");
    this.add
      .text(10, SCREEN_HEIGHT - 41, "Wave: 1", {
        fontSize: "20px",
        color: "lightblue",
        fontStyle: "bold",
      })
      .setName("wave");
    this.add
      .text(10, SCREEN_HEIGHT - 61, "Seconds left: 60", {
        fontSize: "20px",
        color: "lightblue",
        fontStyle: "bold",
      })
      .setName("secondsLeft");
  }

  update() {
    const gameState = this.data.get("gameState") as ClientGameState;
    gameState.players.forEach((p) => {
      if (p.id === gameState.id) {
        const text = this.children.getByName("gold") as Phaser.GameObjects.Text;
        text.setText(`Gold: ${(p.gold * NUMBER_SCALE).toLocaleString()}`);
        this.experienceBar.setValue(
          p.experience - experienceRequiredForLevel(p.level)
        );
      }
    });
    const waveText = this.children.getByName("wave") as Phaser.GameObjects.Text;
    const secondsText = this.children.getByName(
      "secondsLeft"
    ) as Phaser.GameObjects.Text;
    waveText?.setText(`Wave: ${gameState.wave + 1}`);
    secondsText?.setText(
      `Seconds left: ${Math.floor(gameState.waveSecondsRemaining)}`
    );
  }
}
