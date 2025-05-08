import Phaser from "phaser";
import type EventSystem from "../common/EventSystem";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../common/constants";
import type { ClientGameState } from "../common/types";
import { GameScene } from "./GameScene";
import type { FrontendGameScene, GameFrontend } from "./middleware";

export const colorFromDamageType = (damageType: string) => {
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

class LobbyScene extends Phaser.Scene {
	constructor() {
		super({ key: "Lobby", active: false });
	}
	create() {
		this.add.text(10, 10, "Lobby");
	}
	update() {}
}

class UpgradeScene extends Phaser.Scene {
	constructor() {
		super({ key: "Upgrade", active: false });
	}

	create() {
		this.add.text(10, 10, "Upgrade");
	}

	update() {}
}

class GameOverScene extends Phaser.Scene {
	constructor() {
		super({ key: "GameOver", active: false });
	}
	create() {
		this.add.text(10, 10, "Game Over");
	}
	update() {}
}

export default class PhaserMiddleware implements GameFrontend {
	phaserInstance: Phaser.Game;
	currentScene: Phaser.Scene | null = null;
	private gameState: ClientGameState | null = null;
	canvas: HTMLCanvasElement;
	constructor(canvas: HTMLCanvasElement, serverEventSystem: EventSystem) {
		this.canvas = canvas;
		this.phaserInstance = new Phaser.Game({
			canvas: this.canvas,
			width: SCREEN_WIDTH,
			height: SCREEN_HEIGHT,
			type: Phaser.WEBGL,
			roundPixels: false,
			pixelArt: true,
			scene: [
				new LobbyScene(),
				new GameScene(serverEventSystem),
				new UpgradeScene(),
				new GameOverScene(),
			],
			backgroundColor: "#170332",
		});

		this.phaserInstance.scene.start("Lobby");
	}

	update(gameState: ClientGameState) {
		this.gameState = gameState;
		if (this.currentScene instanceof GameScene) {
			this.currentScene.data.set("gameState", gameState);
		}
	}

	init(gameState: ClientGameState): void {
		this.gameState = gameState;
		this.currentScene = this.phaserInstance.scene.getScene("Lobby");
	}

	setScene(scene: FrontendGameScene, data?: ClientGameState): void {
		switch (scene) {
			case "lobby":
				this.currentScene?.scene.start("Lobby");
				this.currentScene = this.phaserInstance.scene.getScene("Lobby");
				break;
			case "match":
				this.currentScene?.scene.start("Game", { gameState: this.gameState });
				this.currentScene = this.phaserInstance.scene.getScene("Game");
				break;
			case "upgrade":
				this.currentScene?.scene.start("Upgrade");
				this.currentScene = this.phaserInstance.scene.getScene("Upgrade");
				break;
			case "gameOver":
				this.currentScene?.scene.start("GameOver");
				this.currentScene = this.phaserInstance.scene.getScene("GameOver");
				break;
			default:
				break;
		}
	}
}
