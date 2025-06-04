import { spellDB } from "../common/data";
import {
  chooseRandom,
  randomBetweenExclusive,
  randomPowerUp,
} from "../common/random";
import {
  type ClientGameState,
  type GameObject,
  type Player,
  type PlayerUpdate,
  PowerUp,
  type UpgradeChoice,
  isEnemy,
  isPickUp,
  isPlayer,
  isProjectile,
  isStaticObject,
} from "../common/types";
import type { LevelData } from "./GameServer";
import type { ServerEventSystems } from "./eventSystems";
import { createPlayer } from "./game-logic/player";
import { addSpellToPlayer } from "./game-logic/spells";
import { generateId } from "./id-generator";
import logger from "./logger";
import type { PlayerMatchState, ServerGameState, ServerPlayer } from "./types";
import QuadTree from "../common/QuadTree";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "../common/constants";

export class ServerScene {
  gameObjectQuadTree: QuadTree<GameObject>;
  gameState: ServerGameState;
  updates: {
    moves: { [key: string]: PlayerUpdate };
    newPlayers: { id: string; screenName: string }[];
    playersToRemove: string[];
  };
  private events: {
    [key: string]: { name: string; data: any }[];
  };
  private playerMatchStates: { [key: string]: PlayerMatchState };
  private playerUpgradeChoices: { [key: string]: UpgradeChoice[][] };
  eventSystems: ServerEventSystems;
  lobby: string[];
  readyToJoin: { id: string; screenName: string }[];
  loadedLevel: LevelData | null = null;

  constructor(eventSystems: ServerEventSystems) {
    this.gameObjectQuadTree = new QuadTree(
      { x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT },
      5
    );

    this.gameState = this.newGameState();
    this.updates = { moves: {}, newPlayers: [], playersToRemove: [] };
    this.events = {};
    this.lobby = [];
    this.eventSystems = eventSystems;
    this.readyToJoin = [];
    this.playerMatchStates = {};
    this.playerUpgradeChoices = {};
  }

  clearMatchState() {
    this.playerMatchStates = {};
    this.playerUpgradeChoices = {};
  }

  public clearUpgradeChoices(playerId: string) {
    if (
      this.playerUpgradeChoices &&
      Object.prototype.hasOwnProperty.call(this.playerUpgradeChoices, playerId)
    ) {
      this.playerUpgradeChoices[playerId] = [];
    }
  }

  saveMatchState(player: Player) {
    if (!this.playerMatchStates[player.id]) {
      this.playerMatchStates[player.id] = {
        gold: player.gold,
        experience: player.experience,
        level: player.level,
        pendingLevels: player.pendingLevels,
        spells: player.spells,
        passives: player.passives,
        maxHp: player.maxHp,
        powerUps: player.powerUps,
        globalPowerUps: player.globalPowerUps,
      };
    } else {
      const matchState = this.playerMatchStates[player.id];
      matchState.gold = player.gold;
      matchState.experience = player.experience;
      matchState.level = player.level;
      matchState.pendingLevels = player.pendingLevels;
      matchState.spells = player.spells;
      matchState.passives = player.passives;
      matchState.maxHp = player.maxHp;
      matchState.powerUps = player.powerUps;
      matchState.globalPowerUps = player.globalPowerUps;
    }
  }

  loadMatchState(player: ServerPlayer) {
    const matchState = this.playerMatchStates[player.id];
    if (matchState) {
      player.gold = matchState.gold;
      player.experience = matchState.experience;
      player.level = matchState.level;
      player.pendingLevels = matchState.pendingLevels;
      player.passives = matchState.passives;
      player.maxHp = matchState.maxHp;
      player.hp = matchState.maxHp;
      player.powerUps = matchState.powerUps;
      player.globalPowerUps = matchState.globalPowerUps;

      Object.keys(matchState.spells).forEach((spellId) => {
        logger.info(
          `Adding spell ${spellId} to player ${player.id} from match state`
        );
        addSpellToPlayer(spellId, player);
      });
    }
  }

  generateUpgradeChoices(playerId: string) {
    const player = this.getPlayer(playerId);
    if (!player || player.pendingLevels <= 0) return;
    const choiceCount = 4;
    if (!this.playerUpgradeChoices[playerId]) {
      this.playerUpgradeChoices[playerId] = [];
    }
    for (let lvl = 0; lvl < player.pendingLevels; lvl++) {
      const choices: UpgradeChoice[] = [];
      for (let i = 0; i < choiceCount; i++) {
        const spellId = chooseRandom(Object.keys(spellDB));
        const powerUp = randomPowerUp();
        const id = generateId("upgrade");
        choices.push({
          id: id,
          powerUp,
          spellId,
        });
        logger.info(
          `Generated upgrade choice for player ${playerId}: ${JSON.stringify(choices[i])}`
        );
      }
      this.playerUpgradeChoices[playerId].push(choices);
    }
    // Reset pendingLevels after generating choices
    player.pendingLevels = 0;
  }

  getUpgradeChoices(playerId: string) {
    if (!this.playerUpgradeChoices[playerId]) {
      return [];
    }
    return this.playerUpgradeChoices[playerId];
  }

  newGameState(): ServerGameState {
    return {
      wave: 0,
      waveSecondsRemaining: 0,
      players: [],
      enemies: [],
      pickUps: [],
      projectiles: [],
      staticObjects: [],
    };
  }

  gameCanStart(playersRequired: number): boolean {
    const connected = this.connectionIds().slice().sort();
    const readyToJoin = this.readyToJoin
      .map(({ id }) => id)
      .slice()
      .sort();
    if (
      connected.length === readyToJoin.length &&
      connected.length >= playersRequired
    ) {
      // check if all players are ready to join
      for (let i = 0; i < connected.length; i++) {
        if (connected[i] !== readyToJoin[i]) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  loadLevel(levelData: LevelData) {
    this.loadedLevel = levelData;
    for (let i = 0; i < levelData.bots; i++) {
      const bot = createPlayer(generateId("bot"), `Mr Bot ${i + 1}`, {
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
      });
      const randomSpellToGiveToBot = chooseRandom(Object.keys(spellDB));
      addSpellToPlayer(randomSpellToGiveToBot, bot);
      this.gameState.players.push(bot);
    }
  }

  updateQuadTree() {
    this.gameObjectQuadTree.clear();
    this.gameState.players.forEach((player) => {
      this.gameObjectQuadTree.insert(player);
    });
    this.gameState.enemies.forEach((enemy) => {
      this.gameObjectQuadTree.insert(enemy);
    });
    this.gameState.pickUps.forEach((gem) => {
      this.gameObjectQuadTree.insert(gem);
    });
    this.gameState.projectiles.forEach((projectile) => {
      this.gameObjectQuadTree.insert(projectile);
    });
    this.gameState.staticObjects.forEach((staticObject) => {
      this.gameObjectQuadTree.insert(staticObject);
    });
  }

  pushEvent(name: string, playerId: string, data: any) {
    if (!this.events[playerId]) return;
    this.events[playerId].push({ name, data });
  }

  initializeEvents(playerId: string) {
    this.events[playerId] = [];
  }

  clearEvents(playerId: string) {
    delete this.events[playerId];
  }

  private getPlayer(id: string): ServerPlayer | null {
    return this.gameState.players.find((p) => p.id === id) || null;
  }

  connectionIds(): string[] {
    return Object.keys(this.eventSystems.connectionSystems);
  }

  sendEvents(): void {
    Object.entries(this.eventSystems.connectionSystems).forEach(
      ([id, connection]) => {
        if (this.events[id] != null) {
          this.events[id].forEach((e) => {
            connection.dispatchEvent(e.name, e.data);
          });
        }
        this.events[id] = [];
      }
    );
  }

  createGameStateMessage(id: string): ClientGameState {
    const player = this.getPlayer(id);
    const rectX = player ? player.x : GAME_WIDTH / 2;
    const rectY = player ? player.y : GAME_HEIGHT / 2;

    const visibleRectangle = {
      x: rectX - SCREEN_WIDTH / 2,
      y: rectY - SCREEN_HEIGHT / 2,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    };
    const playerVisibleObjects =
      this.gameObjectQuadTree.retrieve(visibleRectangle);
    const gameState: ClientGameState = {
      wave: this.gameState.wave,
      waveSecondsRemaining: this.gameState.waveSecondsRemaining,
      players: [],
      enemies: [],
      pickUps: [],
      projectiles: [],
      staticObjects: [],
      id: id,
      player: player,
    };
    playerVisibleObjects.forEach((o) => {
      if (isPlayer(o)) {
        gameState.players.push(o);
      } else if (isEnemy(o)) {
        gameState.enemies.push(o);
      } else if (isPickUp(o)) {
        gameState.pickUps.push(o);
      } else if (isProjectile(o)) {
        gameState.projectiles.push(o);
      } else if (isStaticObject(o)) {
        gameState.staticObjects.push(o);
      }
    });
    if (player && !gameState.players.includes(player)) {
      gameState.players.push(player);
    }
    gameState.debug = {
      cullingRect: visibleRectangle,
    };
    return gameState;
  }

  initializeState(wave: number) {
    logger.info(`Initializing game state for wave ${wave}`);
    this.gameState = {
      wave,
      waveSecondsRemaining: this.loadedLevel ? this.loadedLevel.waveLength : 0,
      players: [],
      enemies: [],
      pickUps: [],
      projectiles: [],
      staticObjects: [],
    };
    const rockCount = 100;
    for (let i = 0; i < rockCount; i++) {
      this.gameState.staticObjects.push({
        id: generateId("rock"),
        objectType: "staticObject",
        type: "rock",
        x: randomBetweenExclusive(0, GAME_WIDTH),
        y: randomBetweenExclusive(0, GAME_HEIGHT),
      });
    }
    this.readyToJoin.forEach((p) => {
      this.updates.newPlayers.push(p);
    });
  }
}
