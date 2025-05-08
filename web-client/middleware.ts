import { SERVER_UPDATE_RATE } from "../common/constants";
import { spellDB } from "../common/data";
import EventSystem from "../common/EventSystem";
import {
	Enemy,
	ClientGameState,
	PickUp,
	Player,
	Position,
	Projectile,
	StaticObject,
} from "../common/types";

function setupSpellEmitters(
	p: Player,
	instantiated: Phaser.GameObjects.GameObject,
) {
	const emitter = instantiated.getData(
		"auraEmitter",
	) as Phaser.GameObjects.Particles.ParticleEmitter;

	if (emitter) {
		emitter.stop();
	}
	Object.keys(p.spells).forEach((spellId) => {
		if (spellId === "damageAura") {
			const spelldata = spellDB[spellId];
			const emitter = instantiated.getData(
				"auraEmitter",
			) as Phaser.GameObjects.Particles.ParticleEmitter;
			if (emitter) {
				emitter.setEmitZone({
					source: new Phaser.Geom.Circle(0, 0, spelldata.range),
					type: "edge",
					quantity: 48,
				});
				emitter.start();
			}
		}
	});
}

export function instantiatePlayer(
	scene: Phaser.Scene,
	player: Player,
): Phaser.GameObjects.GameObject {
	const playerContainer = scene.add
		.container(player.x, player.y)
		.setName(player.id);
	const playerSprite = scene.add.sprite(0, 0, "player").setOrigin(0.5, 0.5);
	playerSprite.play({ key: "player", repeat: -1 });
	playerContainer.add(playerSprite);
	const playerText = scene.add
		.text(0, -32, player.screenName, {
			font: "24x Arial",
			stroke: "#000000",
			strokeThickness: 2,
		})
		.setOrigin(0.5, 0.5)
		.setShadow(2, 2, "#333333", 2, true, true);
	playerContainer.add(playerText);
	playerContainer.setData("text", playerText);
	playerContainer.setData("type", "player");
	let damageAuraParticles = scene.children.getByName(
		particleObjectName,
	) as Phaser.GameObjects.Particles.ParticleEmitterManager;
	if (!damageAuraParticles) {
		damageAuraParticles = scene.add
			.particles("projectile")
			.setName(particleObjectName);
	}

	const emitter = damageAuraParticles.createEmitter({
		blendMode: "ADD",
		alpha: { start: 1, end: 0 },
		scale: { start: 1, end: 0 },
		follow: playerContainer,
		tint: 0x0044ff,
		reserve: 100,
	});
	emitter.stop();
	playerContainer.setData("auraEmitter", emitter);

	playerContainer.on("destroy", () => {
		emitter.stop();
	});

	setupSpellEmitters(player, playerContainer);
	return playerContainer;
}

export function updatePlayer(
	player: Phaser.GameObjects.GameObject,
	serverPlayer: Player,
) {
	const scene = player.scene;
	scene.add.tween({
		targets: player,
		x: serverPlayer.x,
		y: serverPlayer.y,
		duration: SERVER_UPDATE_RATE,
		ease: "Power1",
	});
}

export function destroyPlayer(player: Phaser.GameObjects.GameObject) {
	player.getData("bar")?.destroy();
	player.destroy();
}

function getPixelParticle(scene: Phaser.Scene) {
	let pixelParticle = scene.children.getByName(
		whitePixelObjectName,
	) as Phaser.GameObjects.Particles.ParticleEmitterManager;
	if (!pixelParticle) {
		pixelParticle = scene.add
			.particles("white-pixel")
			.setName(whitePixelObjectName);
	}
	return pixelParticle;
}

export function instantiateEnemy(
	scene: Phaser.Scene,
	enemy: Enemy,
): Phaser.GameObjects.GameObject {
	const pixelParticle = getPixelParticle(scene);
	const emitter = pixelParticle.createEmitter({
		blendMode: "ADD",
		lifespan: 2000,
		speed: { min: 100, max: 200 },
		alpha: { start: 1, end: 0 },
		scale: { min: 1, max: 3 },
		tint: 0xff0000,
		gravityY: 1,
		reserve: 100,
	});
	emitter.stop();

	const newEnemy = scene.add.sprite(enemy.x, enemy.y, enemy.type);
	newEnemy.play({ key: enemy.type, repeat: -1 });
	newEnemy.setData("type", "enemy");
	newEnemy.setName(enemy.id);
	newEnemy.setOrigin(0.5, 0.5);

	newEnemy.addListener("takeDamage", (amount: number) => {
		emitter.explode(Math.min(amount, 100), newEnemy.x, newEnemy.y);
	});
	return newEnemy;
}

export function instantiatePickUp(
	scene: Phaser.Scene,
	pickUp: PickUp,
): Phaser.GameObjects.GameObject {
	const pixelParticle = getPixelParticle(scene);
	const emitter = pixelParticle.createEmitter({
		blendMode: "ADD",
		lifespan: 200,
		speed: { min: 100, max: 200 },
		alpha: { start: 1, end: 0 },
		scale: { start: 3, end: 0 },
		tint: 0x00ccff,
		reserve: 20,
	});
	emitter.stop();
	const newPickUp = scene.add.sprite(pickUp.x, pickUp.y, pickUp.visual);
	newPickUp.setData("type", "pickup");
	newPickUp.setName(pickUp.id);
	newPickUp.setScale(0.5);
	newPickUp.setOrigin(0.5, 0.5);
	newPickUp.on("destroy", () => {
		emitter.explode(20, pickUp.x, pickUp.y);
		emitter.stop();
	});
	return newPickUp;
}

export function updateProjectile(
	projectile: Phaser.GameObjects.Sprite,
	serverProjectile: Projectile,
) {
	projectile.setPosition(serverProjectile.x, serverProjectile.y);
}

const particleObjectName = "projectileParticles";
const whitePixelObjectName = "whitePixel";

export function instantiateProjectile(
	scene: Phaser.Scene,
	projectile: Projectile,
): Phaser.GameObjects.Container {
	const newProjectile = scene.add
		.sprite(0, 0, "projectile")
		.setOrigin(0.5, 0.5);
	let particles = scene.children.getByName(
		particleObjectName,
	) as Phaser.GameObjects.Particles.ParticleEmitterManager;
	if (particles == null) {
		particles = scene.add.particles("projectile").setName(particleObjectName);
	}
	const projectileContainer = scene.add
		.container(projectile.x, projectile.y)
		.setName(projectile.id);
	const emitter = particles.createEmitter({
		speed: [10, 20],
		scale: { start: 1, end: 0 },
		blendMode: "ADD",
		follow: projectileContainer,
		reserve: 100,
	});
	projectileContainer.add(newProjectile);
	projectileContainer.setData("type", "projectile");
	projectileContainer.on("destroy", () => {
		emitter.setSpeed({ min: 50, max: 150 });
		emitter.explode(50, projectileContainer.x, projectileContainer.y);
	});

	return projectileContainer;
}

export function simpleDestroy(gameObject: Phaser.GameObjects.GameObject) {
	gameObject.destroy();
}

export function instantiateStaticObject(
	scene: Phaser.Scene,
	staticObject: StaticObject,
) {
	const newStaticObject = scene.add.sprite(
		staticObject.x,
		staticObject.y,
		staticObject.type,
	);
	newStaticObject.setDepth(-1);
	newStaticObject.setName(staticObject.id);
	newStaticObject.setOrigin(0.5, 0.5);
	newStaticObject.setData("type", "staticObject");
	return newStaticObject;
}

export function simpleUpdate(
	gameObject: Phaser.GameObjects.GameObject,
	obj: Position,
) {
	const scene = gameObject.scene;
	scene.add.tween({
		targets: gameObject,
		x: obj.x,
		y: obj.y,
		duration: SERVER_UPDATE_RATE,
		ease: "Power1",
	});
}

export function updateGameObject<T extends Position>(
	scene: Phaser.Scene,
	id: string,
	obj: T,
	instantiateFn: (scene: Phaser.Scene, obj: T) => Phaser.GameObjects.GameObject,
	updateFn: (
		gameObject: Phaser.GameObjects.GameObject,
		obj: T,
	) => void = simpleUpdate,
): Phaser.GameObjects.GameObject | null {
	const gameObject = scene.children.getByName(id);
	if (gameObject instanceof Phaser.GameObjects.GameObject) {
		updateFn(gameObject, obj);
		return gameObject;
	} else if (gameObject == null) {
		return instantiateFn(scene, obj);
	}
	return null;
}

export function removeInvalidGameObjects(
	scene: Phaser.Scene,
	type: string,
	validIds: string[],
	destroyFn: (
		gameObject: Phaser.GameObjects.GameObject,
	) => void = simpleDestroy,
) {
	scene.children.each((child) => {
		if (
			child instanceof Phaser.GameObjects.GameObject &&
			child.getData("type") === type &&
			!validIds.includes(child.name)
		) {
			destroyFn(child);
		}
	});
}

export function updateMiddleWare(gameState: ClientGameState, mw: Middleware) {
	gameState.players.forEach((p) => {
		mw.updatePlayer(p);
	});

	const playerIds = gameState.players.map((p) => p.id);
	// remove players that are no longer in the game
	mw.removeInvalidGameObjects("player", playerIds);

	gameState.enemies.forEach((e) => mw.updateEnemy(e));
	const enemyIds = gameState.enemies.map((e) => e.id);
	mw.removeInvalidGameObjects("enemy", enemyIds);

	gameState.pickUps.forEach((g) => mw.updatePickUp(g));
	const pickUpIds = gameState.pickUps.map((g) => g.id);
	mw.removeInvalidGameObjects("pickup", pickUpIds);
	gameState.projectiles.forEach((p) => {
		mw.updateProjectile(p);
	});

	const projectileIds = gameState.projectiles.map((p) => p.id);
	mw.removeInvalidGameObjects("projectile", projectileIds);

	gameState.staticObjects.forEach((s) => {
		mw.updateStaticObject(s);
	});

	const staticObjectIds = gameState.staticObjects.map((s) => s.id);
	mw.removeInvalidGameObjects("staticObject", staticObjectIds);
}

export type FrontendGameScene = "lobby" | "match" | "upgrade" | "gameOver";

export interface GameFrontend {
	init(initialGameState: ClientGameState, serverEventSystem: EventSystem): void;

	update(gameState: ClientGameState): void;

	setScene(scene: FrontendGameScene): void;
}

export interface Middleware {
	flashWhite(id: string): void;

	showDamage(amount: number, position: Position, color: string): void;

	showDamageToTarget(targetId: string, amount: number, color: string): void;

	instantiatePlayer(player: Player): void;

	updatePlayer(player: Player): void;

	updatePlayerLevel(player: Player): void;

	destroyPlayer(playerId: string): void;

	instantiateEnemy(enemy: Enemy): void;

	updateEnemy(enemy: Enemy): void;

	instantiatePickUp(pickUp: PickUp): void;

	updatePickUp(pickUp: PickUp): void;

	instantiateProjectile(projectile: Projectile): void;

	updateProjectile(projectile: Projectile): void;

	instantiateStaticObject(staticObject: StaticObject): void;

	updateStaticObject(staticObject: StaticObject): void;

	removeInvalidGameObjects(type: string, validIds: string[]): void;
}
