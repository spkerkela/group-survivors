import Phaser from "phaser";
import type EventSystem from "../common/EventSystem";
import {
	GAME_HEIGHT,
	GAME_WIDTH,
	INVULNERABILITY_SECONDS,
	NUMBER_SCALE,
	SCREEN_HEIGHT,
	SCREEN_WIDTH,
} from "../common/constants";
import { chooseRandom, randomBetweenExclusive } from "../common/random";
import type {
	ClientGameState,
	DamageEvent,
	Enemy,
	LevelEvent,
	PickUp,
	Player,
	Position,
	Projectile,
	SpellDamageEvent,
	StaticObject,
} from "../common/types";
import { assets, sounds, spriteSheets } from "./assets";
import { globalEventSystem } from "./eventSystems";
import {
	type Middleware,
	destroyPlayer,
	instantiateEnemy,
	instantiatePickUp,
	instantiatePlayer,
	instantiateProjectile,
	instantiateStaticObject,
	removeInvalidGameObjects,
	updateGameObject,
	updateMiddleWare,
	updatePlayer,
} from "./middleware";
import { colorFromDamageType } from "./phaser-middleware";

export class GameScene extends Phaser.Scene implements Middleware {
	serverEventSystem: EventSystem;
	inputKeys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
	constructor(serverEventSystem: EventSystem) {
		super({ key: "Game", active: false });
		this.serverEventSystem = serverEventSystem;
	}
	restartGame(data: { gameState: ClientGameState }) {
		this.scene.restart(data);
	}
	updateEnemy(enemy: Enemy): void {
		updateGameObject(this, enemy.id, enemy, instantiateEnemy);
	}
	updatePickUp(gem: PickUp): void {
		updateGameObject(this, gem.id, gem, instantiatePickUp);
	}
	updateStaticObject(staticObject: StaticObject): void {
		updateGameObject(
			this,
			staticObject.id,
			staticObject,
			instantiateStaticObject,
		);
	}
	updatePlayerLevel(player: Player): void {
		this.updateLevel(player);
	}
	instantiatePlayer(player: Player): void {
		instantiatePlayer(this, player);
	}
	updatePlayer(player: Player): void {
		updateGameObject(this, player.id, player, instantiatePlayer, updatePlayer);
	}
	destroyPlayer(playerId: string): void {
		const player = this.children.getByName(playerId);
		if (player instanceof Phaser.GameObjects.Sprite) {
			destroyPlayer(player);
		}
	}
	instantiateEnemy(enemy: Enemy): void {
		instantiateEnemy(this, enemy);
	}
	instantiatePickUp(gem: PickUp): void {
		instantiatePickUp(this, gem);
	}
	instantiateProjectile(projectile: Projectile): void {
		instantiateProjectile(this, projectile);
	}
	updateProjectile(projectile: Projectile): void {
		updateGameObject(this, projectile.id, projectile, instantiateProjectile);
	}
	instantiateStaticObject(staticObject: StaticObject): void {
		updateGameObject(
			this,
			staticObject.id,
			staticObject,
			instantiateStaticObject,
		);
	}
	removeInvalidGameObjects(type: string, validIds: string[]): void {
		if (type === "player") {
			removeInvalidGameObjects(this, type, validIds, destroyPlayer);
		}
		removeInvalidGameObjects(this, type, validIds);
	}

	preload() {
		assets.forEach(({ id, url }) => {
			this.load.image(id, url);
		});
		spriteSheets.forEach(({ id, url, frameWidth = 16, frameHeight = 16 }) => {
			this.load.spritesheet(id, url, { frameWidth, frameHeight });
		});
		sounds.forEach(({ id, url }) => {
			this.load.audio(id, url);
		});
	}

	setupCamera() {
		if (this.data.get("cameraSet")) {
			return;
		}
		try {
			this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
			this.cameras.main.setZoom(3);
			this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
			this.data.set("cameraSet", true);
		} catch (e) {
			console.error(e);
		}
	}

	create(data: { gameState: ClientGameState }) {
		this.data.set("gameState", data.gameState);
		this.data.set("cameraSet", false);
		if (this.cameras.main != null) {
			this.setupCamera();
			this.cameras.main.fadeFrom(900, 0, 0, 0);
		}
		spriteSheets.forEach(({ id }) => {
			this.anims.create({
				key: id,
				frames: this.anims.generateFrameNumbers(id, {
					start: 0,
					end: 1,
				}),
				frameRate: 4,
			});
		});
		this.inputKeys = this.input.keyboard.addKeys({
			up: Phaser.Input.Keyboard.KeyCodes.W,
			down: Phaser.Input.Keyboard.KeyCodes.S,
			left: Phaser.Input.Keyboard.KeyCodes.A,
			right: Phaser.Input.Keyboard.KeyCodes.D,
		}) as { [key: string]: Phaser.Input.Keyboard.Key };

		const background = this.add
			.tileSprite(
				GAME_WIDTH / 2,
				GAME_HEIGHT / 2,
				SCREEN_WIDTH,
				SCREEN_HEIGHT,
				"background",
			)
			.setName("background");
		background.setDepth(-2);

		data.gameState.players.forEach((p) => {
			const instantiated = instantiatePlayer(this, p);
			if (p.id === data.gameState.id) {
				this.cameras.main.startFollow(instantiated);
			}
		});
		const damageCallback: (data: DamageEvent) => void = ({
			amount,
			damageType,
		}) => {
			const gameState = this.data.get("gameState") as ClientGameState;
			const player = gameState.players.find((p) => p.id === gameState.id);
			if (!player) return;
			const color = colorFromDamageType(damageType);
			this.showDamage(amount, player, color);
			this.flashWhite(player.id);
			this.cameras.main.flash(150, 255, 255, 255);
			this.cameras.main.shake(150, 0.01);
			this.sound.play("hit", {
				volume: 0.8,
				detune: randomBetweenExclusive(0, 1000),
			});
		};
		this.serverEventSystem.addEventListener("damage", damageCallback);

		const spellCallBack: (s: SpellDamageEvent) => void = (data) => {
			const color = colorFromDamageType(data.damageType);
			this.spellEffect(data.spellId);
			this.showDamageToTarget(data.targetId, data.damage, color);
			this.flashWhite(data.targetId);
			this.sound.play("hit", {
				volume: 0.5,
				detune: randomBetweenExclusive(0, 1000),
			});
		};
		this.serverEventSystem.addEventListener("spell", spellCallBack);
		const levelCallback: (e: LevelEvent) => void = (data) => {
			const gameState = this.data.get("gameState") as ClientGameState;
			if (data.playerId !== gameState.id) return;
			globalEventSystem.dispatchEvent("level", data.player.level);
			this.updateLevel(data.player);
		};
		const cleanup = () => {
			this.serverEventSystem.removeEventListener("level", levelCallback);
			this.serverEventSystem.removeEventListener("spell", spellCallBack);
			this.serverEventSystem.removeEventListener("damage", damageCallback);
		};
		this.serverEventSystem.addEventListener("level", levelCallback);
		this.events.on("destroy", cleanup);
		this.events.on("shutdown", cleanup);
		this.sound.add("hit");
	}

	update() {
		const gameState = this.data.get("gameState") as ClientGameState;
		const inputState = this.getInputState();
		this.serverEventSystem.dispatchEvent("move", {
			...inputState,
			id: gameState.id,
		});
		updateMiddleWare(gameState, this);
		const background = this.children.getByName("background");
		const player = this.getActivePlayer();
		if (
			background instanceof Phaser.GameObjects.TileSprite &&
			player instanceof Phaser.GameObjects.Container
		) {
			background.setPosition(player.x, player.y);
			background.tilePositionX = player.x;
			background.tilePositionY = player.y;
			this.setupCamera();
			this.cameras.main.startFollow(player);
		}
	}
	spellEffect(spellId: string) {
		if (spellId === "damageAura") {
		}
	}
	showDamageToTarget(targetId: string, amount: number, color = "red") {
		const target = this.children.getByName(targetId);
		if (target instanceof Phaser.GameObjects.Sprite) {
			this.showDamage(amount, target, color);
			target.emit("takeDamage", amount);
		}
	}
	showDamage(amount: number, position: Position, color = "red") {
		const amountWithScale = Math.round(amount * NUMBER_SCALE);
		const text = this.add.text(
			position.x,
			position.y,
			`${amountWithScale.toLocaleString()}`,
			{
				color: color,
				fontFamily: "Arial",
				fontStyle: "bold",
				fontSize: `${amountWithScale > 1000000 ? 12 : 16}px`,
				stroke: "#000000",
				strokeThickness: amountWithScale > 1000000 ? 2 : 3,
			},
		);
		text.setOrigin(0.5, 0.5);
		this.tweens.add({
			targets: text,
			y: position.y - chooseRandom([20, 50, 75]),
			x: position.x + chooseRandom([-10, 0, 10]),
			alpha: 0,
			duration: 1000,
			ease: "Power1",
			onComplete: () => {
				text.destroy();
			},
		});
	}
	getInputState() {
		const up = this.inputKeys.up.isDown;
		const down = this.inputKeys.down.isDown;
		const left = this.inputKeys.left.isDown;
		const right = this.inputKeys.right.isDown;
		return { up, down, left, right };
	}
	flashWhite(id: string) {
		const target = this.children.getByName(id);
		if (target instanceof Phaser.GameObjects.Sprite) {
			target.setTintFill(0xffffff);
			this.tweens.add({
				targets: target,
				alpha: 0,
				duration: INVULNERABILITY_SECONDS * 1000,
				ease: "Linear",
				onComplete: () => {
					target.clearTint();
					target.setAlpha(1);
				},
			});
		}
	}

	private getActivePlayer(): Phaser.GameObjects.GameObject | null {
		return this.children.getByName(this.data.get("gameState").id);
	}

	updateLevel(serverPlayer: Player) {}
}
