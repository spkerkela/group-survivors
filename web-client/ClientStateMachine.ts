import StateMachine, { State } from "../common/StateMachine";
import EventSystem from "../common/EventSystem";
import { GameState } from "../common/types";
import { GameFrontend } from "./middleware";

interface ClientState {
  id: string;
  serverEvents: EventSystem;
  frontend: GameFrontend;
}

class DisconnectedState implements State<ClientState> {
  id: string = "";
  update(dt: number, _: ClientState): State<ClientState> {
    if (this.id !== "") {
      return new ConnectedState(this.id);
    }
    return this;
  }
  setId: (state: GameState) => void;

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

class ConnectedState implements State<ClientState> {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
  receivedMatchBegin: boolean = false;
  receivedDisconnect: boolean = false;
  update(dt: number, data: ClientState): State<ClientState> {
    if (this.receivedDisconnect) {
      return new DisconnectedState();
    }
    if (this.receivedMatchBegin) {
      return new GameLoopState(this.id);
    }
    return this;
  }
  updatesCalled: number = 0;
  updateCallback = () => {
    this.updatesCalled++;
  };
  beginMatchCallback = () => {
    this.receivedMatchBegin = true;
  };
  enter({ serverEvents }: ClientState): void {
    serverEvents.addEventListener("disconnect", () => {
      this.receivedDisconnect = true;
    });
    serverEvents.addEventListener("beginMatch", this.beginMatchCallback);
    serverEvents.addEventListener("update", this.updateCallback);
  }
  exit({ serverEvents }: ClientState): void {
    serverEvents.removeEventListener("update", this.updateCallback);
    serverEvents.removeEventListener("beginMatch", this.beginMatchCallback);
  }
}

class GameLoopState implements State<ClientState> {
  id: string;
  gameState: GameState;
  endMatchCalled: boolean = false;
  constructor(id: string) {
    this.id = id;
  }

  update(dt: number, data: ClientState): State<ClientState> {
    if (this.endMatchCalled) {
      return new ConnectedState(this.id);
    }
    if (!this.gameState) {
      return this;
    }
    data.frontend.update(this.gameState);
    return this;
  }
  updateCallback: (data: GameState) => void = (data) => {
    this.gameState = data;
  };
  endMatchCallback: () => void;
  enter({ frontend, serverEvents }: ClientState) {
    this.endMatchCallback = () => {
      this.endMatchCalled = true;
      frontend.restart(this.gameState);
    };
    serverEvents.addEventListener("update", this.updateCallback);
    serverEvents.addEventListener("endMatch", this.endMatchCallback);
  }
  exit({ serverEvents }: ClientState) {
    serverEvents.removeEventListener("update", this.updateCallback);
    serverEvents.removeEventListener("endMatch", this.endMatchCallback);
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
