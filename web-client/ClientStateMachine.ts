import type EventSystem from "../common/EventSystem";
import StateMachine, { type State } from "../common/StateMachine";
import type { ClientGameState } from "../common/types";
import type { GameFrontend } from "./middleware";

interface ClientState {
  id: string;
  serverEvents: EventSystem;
  frontend: GameFrontend;
}

export class DisconnectedState implements State<ClientState> {
  id = "";
  update(dt: number, _: ClientState): State<ClientState> {
    if (this.id !== "") {
      return new ConnectedState(this.id);
    }
    return this;
  }
  setId!: (state: ClientGameState) => void;

  enter({ serverEvents, frontend }: ClientState): void {
    this.setId = (state) => {
      const { id } = state;
      this.id = id;
      frontend.init(state, serverEvents);
    };
    serverEvents.addEventListener("joined", this.setId);
  }
  exit({ serverEvents }: ClientState): void {
    serverEvents.removeEventListener("joined", this.setId);
  }
}

export class ConnectedState implements State<ClientState> {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
  receivedMatchBegin = false;
  receivedDisconnect = false;
  receivedUpdate = false;
  update(dt: number, { frontend }: ClientState): State<ClientState> {
    if (this.receivedDisconnect) {
      frontend.setScene("lobby");
      return new DisconnectedState();
    }
    if (this.receivedMatchBegin || this.receivedUpdate) {
      return new GameLoopState(this.id);
    }
    return this;
  }
  updateCallback: (data: ClientGameState) => void = (data) => {
    this.receivedUpdate = true;
  };
  beginMatchCallback = () => {
    this.receivedMatchBegin = true;
  };
  disconnectCallback = () => {
    this.receivedDisconnect = true;
  };
  enter({ serverEvents }: ClientState): void {
    serverEvents.addEventListener("disconnect", this.disconnectCallback);
    serverEvents.addEventListener("beginMatch", this.beginMatchCallback);
    serverEvents.addEventListener("update", this.updateCallback);
  }
  exit({ serverEvents }: ClientState): void {
    serverEvents.removeEventListener("disconnect", this.disconnectCallback);
    serverEvents.removeEventListener("beginMatch", this.beginMatchCallback);
    serverEvents.removeEventListener("update", this.updateCallback);
  }
}

export class GameLoopState implements State<ClientState> {
  id: string;
  gameState: ClientGameState | null = null;
  endMatchCalled = false;
  upgradeCalled = false;
  constructor(id: string) {
    this.id = id;
  }

  update(dt: number, data: ClientState): State<ClientState> {
    if (this.upgradeCalled) {
      return new UpgradeState(this.id);
    }
    if (this.endMatchCalled) {
      return new ConnectedState(this.id);
    }
    if (!this.gameState) {
      return this;
    }
    data.frontend.update(this.gameState);
    return this;
  }
  updateCallback: (data: ClientGameState) => void = (data) => {
    this.gameState = data;
  };
  endMatchCallback!: () => void;
  upgradeCallback!: () => void;
  enter({ frontend, serverEvents }: ClientState) {
    this.upgradeCallback = () => {
      this.upgradeCalled = true;
    };
    this.endMatchCallback = () => {
      this.endMatchCalled = true;
      frontend.setScene("gameOver");
    };

    serverEvents.addEventListener("update", this.updateCallback);
    serverEvents.addEventListener("upgrade", this.upgradeCallback);
    frontend.setScene("match");
  }
  exit({ serverEvents }: ClientState) {
    serverEvents.removeEventListener("update", this.updateCallback);
    serverEvents.removeEventListener("upgrade", this.upgradeCallback);
  }
}

export class UpgradeState implements State<ClientState> {
  beginMatchCalled = false;
  gameOverCalled = false;
  gameOverCallback!: () => void;
  beginMatchCallback!: () => void;
  id: string;
  constructor(id: string) {
    this.id = id;
  }
  update(dt: number, { frontend }: ClientState): State<ClientState> {
    if (this.beginMatchCalled) {
      return new GameLoopState(this.id);
    }
    if (this.gameOverCalled) {
      return new ConnectedState(this.id);
    }
    return this;
  }
  enter({ frontend, serverEvents }: ClientState) {
    frontend.setScene("upgrade");
    this.beginMatchCallback = () => {
      this.beginMatchCalled = true;
    };
    this.gameOverCallback = () => {
      this.gameOverCalled = true;
      frontend.setScene("gameOver");
    };
    serverEvents.addEventListener("beginMatch", this.beginMatchCallback);
    serverEvents.addEventListener("gameOver", this.gameOverCallback);
  }

  exit({ frontend, serverEvents }: ClientState) {
    serverEvents.removeEventListener("beginMatch", this.gameOverCallback);
    serverEvents.addEventListener("gameOver", this.gameOverCallback);
  }
}

export default class ClientStateMachine {
  stateMachine: StateMachine<ClientState>;
  data: ClientState;
  constructor(serverEvents: EventSystem, frontend: GameFrontend) {
    this.data = {
      id: "",
      serverEvents,
      frontend,
    };

    this.stateMachine = new StateMachine(new DisconnectedState(), this.data);
  }
  update(dt: number) {
    this.stateMachine.update(dt, this.data);
  }
}
