import QuadTree from "../common/QuadTree";
import {
  GameObject,
  ClientGameState,
  isEnemy,
  isPickUp,
  isPlayer,
  isProjectile,
  isStaticObject,
  GameState,
} from "../common/types";
import { createPlayer, PlayerUpdate } from "./game-logic";
import { ServerEventSystems } from "./eventSystems";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "../common/constants";
import { generateId } from "./id-generator";
import { LevelData } from "./GameServer";
import { randomBetweenExclusive } from "../common/random";
import { ServerGameState } from "./types";

export class ServerScene {
  gameObjectQuadTree: QuadTree<GameObject>;
  gameState: ServerGameState;
  updates: {
    moves: { [key: string]: PlayerUpdate };
    newPlayers: { id: string; screenName: string }[];
    playersToRemove: string[];
  };
  events: {
    [key: string]: { name: string; data: any }[];
  };
  eventSystems: ServerEventSystems;
  lobby: string[];
  readyToJoin: { id: string; screenName: string }[];
  loadedLevel: LevelData;

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
  }

  newGameState(): ServerGameState {
    return {
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
      this.gameState.players.push(
        createPlayer(generateId("bot"), `Mr Bot ${i + 1}`, {
          x: Math.random() * GAME_WIDTH,
          y: Math.random() * GAME_HEIGHT,
        })
      );
    }
  }

  updateQuadTree() {
    const scene = this;
    scene.gameObjectQuadTree.clear();
    scene.gameState.players.forEach((player) => {
      scene.gameObjectQuadTree.insert(player);
    });
    scene.gameState.enemies.forEach((enemy) => {
      scene.gameObjectQuadTree.insert(enemy);
    });
    scene.gameState.pickUps.forEach((gem) => {
      scene.gameObjectQuadTree.insert(gem);
    });
    scene.gameState.projectiles.forEach((projectile) => {
      scene.gameObjectQuadTree.insert(projectile);
    });
    scene.gameState.staticObjects.forEach((staticObject) => {
      scene.gameObjectQuadTree.insert(staticObject);
    });
  }

  pushEvent(name: string, playerId: string, data: any) {
    if (!this.events[playerId]) return;
    this.events[playerId].push({ name, data });
  }

  private getPlayer(id: string) {
    return this.gameState.players.find((p) => p.id === id);
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
    let gameState: ClientGameState = {
      players: [],
      enemies: [],
      pickUps: [],
      projectiles: [],
      staticObjects: [],
      id: id,
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

  initializeState() {
    this.gameState = {
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
