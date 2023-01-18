import {
  GAME_HEIGHT,
  GAME_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  SERVER_UPDATE_RATE,
} from "../common/constants";
import EventSystem from "../common/EventSystem";
import QuadTree from "../common/QuadTree";
import { sanitizeName } from "../common/shared";
import {
  GameObject,
  GameState,
  isEnemy,
  isGem,
  isPlayer,
  isProjectile,
  isStaticObject,
  MoveUpdate,
  StaticObject,
} from "../common/types";
import { serverTimeScale } from "./config";
import ConnectionStateMachine from "./ConnectionStateMachine";
import { ServerEventSystems } from "./eventSystems";

import { createMoveUpdate, PlayerUpdate, createPlayer } from "./game-logic";
import GameSessionStateMachine from "./GameSessionStateMachine";
import { generateId } from "./id-generator";
import Spawner from "./Spawner";

export class Connector {
  gameObjectQuadTree: QuadTree<GameObject>;
  gameState: GameState;
  updates: {
    moves: { [key: string]: PlayerUpdate };
    newPlayers: { id: string; screenName: string }[];
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
    this.updates = { moves: {}, newPlayers: [] };
    this.events = {};
    this.lobby = [];
    this.eventSystems = eventSystems;
    this.readyToJoin = [];
  }

  newGameState(): GameState {
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

  getPlayer(id: string) {
    return this.gameState.players.find((p) => p.id === id);
  }
  private addPlayerToState(
    id: string,
    screenName: string,
    levelData: LevelData
  ) {
    this.lobby = this.lobby.filter((p) => p !== id);
    this.gameState.players = this.gameState.players.filter((p) => p.id !== id);
    this.gameState.players.push(
      createPlayer(id, sanitizeName(screenName), {
        x: levelData.playerStartPosition.x,
        y: levelData.playerStartPosition.y,
      })
    );
  }
  connectReadyPlayers(levelData: LevelData) {
    this.readyToJoin.forEach((player) => {
      this.addPlayerToState(player.id, player.screenName, levelData);
    });
    this.updateQuadTree();
    this.readyToJoin.forEach(({ id }) => {
      const message = this.createGameStateMessage(id);
      this.eventSystems.connectionSystems[id].dispatchEvent("joined", message);
    });
    this.readyToJoin = [];
  }
  start(levelData: LevelData) {
    this.eventSystems.gameEventSystem.addEventListener(
      "connection",
      (id: string, connection: EventSystem) => {
        this.eventSystems.connectionSystems[id] = connection;
        this.lobby.push(id);
        this.events[id] = [];
        connection.addEventListener("join", (screenName: string) => {
          if (this.lobby.includes(id)) {
            if (this.instantJoin) {
              this.events[id].push({
                name: "joined",
                data: this.createGameStateMessage(id),
              });
              this.updates.newPlayers.push({ id, screenName });
            } else {
              this.readyToJoin.push({ id, screenName });
              this.events[id].push({
                name: "joined",
                data: this.createGameStateMessage(id),
              });
              this.events[id].push({
                name: "beginMatch",
                data: this.createGameStateMessage(id),
              });
            }
          }
        });

        connection.addEventListener("disconnect", () => {
          this.gameState.players = this.gameState.players.filter(
            (p) => p.id !== id
          );
          this.lobby = this.lobby.filter((p) => p !== id);
          delete this.events[id];
          delete this.eventSystems.connectionSystems[id];
        });
        connection.addEventListener("move", (data: MoveUpdate) => {
          if (data.id !== id) return;
          if (this.getPlayer(id)) {
            const { up, down, left, right } = data;
            this.updates.moves[id] = createMoveUpdate({
              up,
              down,
              left,
              right,
            });
          }
        });
      }
    );
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
  createGameStateMessage(id: string) {
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
    let gameState: GameState = {
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
    this.gameState.debug = gameState.debug;
    return gameState;
  }
}

export interface LevelData {
  name: string;
  bots: number;
  playerStartPosition: { x: number; y: number };
  enemyTable: { [key: string]: number };
  staticObjects: StaticObject[];
}

export class GameServer {
  connector: Connector;
  levelData: LevelData;
  spawner: Spawner;
  adminEvents: EventSystem;
  deltaTime: number;
  gameStateMachine: GameSessionStateMachine;
  connectionStateMachine: ConnectionStateMachine;

  constructor(connector: Connector, levelData: LevelData) {
    this.connector = connector;
    this.levelData = levelData;
    this.spawner = new Spawner(levelData.enemyTable);
    this.connector.start(this.levelData);
    this.adminEvents = new EventSystem();
    this.adminEvents.addEventListener("spawn", (enemyType: string) => {
      this.spawner.spawnEnemyOfType(this.connector.gameState, enemyType);
    });
    this.adminEvents.addEventListener("killPlayer", (id: string) => {
      const player = this.connector.gameState.players.find((p) => p.id === id);
      if (player) {
        player.hp = 0;
        player.alive = false;
      }
    });
    this.deltaTime = 0;
    this.gameStateMachine = new GameSessionStateMachine(
      connector,
      levelData,
      1
    );
    this.connectionStateMachine = new ConnectionStateMachine(connector, 1);
  }

  update() {
    this.gameStateMachine.update(this.deltaTime);
    this.connectionStateMachine.update(this.deltaTime);
  }

  start() {
    let previousTime = Date.now();
    setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - previousTime;
      previousTime = currentTime;
      this.deltaTime = (elapsedTime / 1000) * serverTimeScale;
      this.update();
    }, SERVER_UPDATE_RATE);
  }
}
