import QuadTree from "../common/QuadTree";
import {
  GameObject,
  ClientGameState,
  isEnemy,
  isGem,
  isPlayer,
  isProjectile,
  isStaticObject,
  MoveUpdate,
  GameState,
} from "../common/types";
import { createMoveUpdate, createPlayer, PlayerUpdate } from "./game-logic";
import { ServerEventSystems } from "./eventSystems";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "../common/constants";
import { generateId } from "./id-generator";
import EventSystem from "../common/EventSystem";
import { LevelData } from "./GameServer";

export class ServerScene {
  gameObjectQuadTree: QuadTree<GameObject>;
  gameState: GameState;
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

  private instantJoin = false;

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

  newGameState(): ClientGameState {
    return {
      players: [],
      enemies: [],
      gems: [],
      projectiles: [],
      id: "",
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

  enableInstantJoin() {
    this.instantJoin = true;
  }

  disableInstantJoin() {
    this.instantJoin = false;
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
    const connector = this;
    connector.gameObjectQuadTree.clear();
    connector.gameState.players.forEach((player) => {
      connector.gameObjectQuadTree.insert(player);
    });
    connector.gameState.enemies.forEach((enemy) => {
      connector.gameObjectQuadTree.insert(enemy);
    });
    connector.gameState.gems.forEach((gem) => {
      connector.gameObjectQuadTree.insert(gem);
    });
    connector.gameState.projectiles.forEach((projectile) => {
      connector.gameObjectQuadTree.insert(projectile);
    });
    connector.gameState.staticObjects.forEach((staticObject) => {
      connector.gameObjectQuadTree.insert(staticObject);
    });
  }

  pushEvent(name: string, playerId: string, data: any) {
    if (!this.events[playerId]) return;
    this.events[playerId].push({ name, data });
  }

  private getPlayer(id: string) {
    return this.gameState.players.find((p) => p.id === id);
  }
  start(levelData: LevelData) {}

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
      gems: [],
      projectiles: [],
      staticObjects: [],
      id: id,
    };
    playerVisibleObjects.forEach((o) => {
      if (isPlayer(o)) {
        gameState.players.push(o);
      } else if (isEnemy(o)) {
        gameState.enemies.push(o);
      } else if (isGem(o)) {
        gameState.gems.push(o);
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
      gems: [],
      projectiles: [],
      staticObjects: [],
    };
    this.readyToJoin.forEach((p) => {
      this.updates.newPlayers.push(p);
    });
  }
}
