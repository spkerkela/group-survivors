import StateMachine, { State } from "../common/StateMachine";
import EventSystem from "../common/EventSystem";
import { ClientGameState } from "../common/types";
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
  setId: (state: ClientGameState) => void;

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
  update(dt: number, { frontend }: ClientState): State<ClientState> {
    if (this.receivedDisconnect) {
      frontend.setScene("lobby");
      return new DisconnectedState();
    }
    if (this.receivedMatchBegin) {
      return new GameLoopState(this.id);
    }
    return this;
  }
  beginMatchCallback = () => {
    this.receivedMatchBegin = true;
  };
  disconnectCallback = () => {
    this.receivedDisconnect = true;
  };
  enter({ serverEvents }: ClientState): void {
    serverEvents.addEventListener("disconnect", this.disconnectCallback);
    serverEvents.addEventListener("beginMatch", this.beginMatchCallback);
  }
  exit({ serverEvents }: ClientState): void {
    serverEvents.removeEventListener("disconnect", this.disconnectCallback);
    serverEvents.removeEventListener("beginMatch", this.beginMatchCallback);
  }
}

class GameLoopState implements State<ClientState> {
  id: string;
  gameState: ClientGameState;
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
  updateCallback: (data: ClientGameState) => void = (data) => {
    this.gameState = data;
  };
  endMatchCallback: () => void;
  enter({ frontend, serverEvents }: ClientState) {
    this.endMatchCallback = () => {
      this.endMatchCalled = true;
      frontend.setScene("gameOver");
    };
    serverEvents.addEventListener("update", this.updateCallback);
    serverEvents.addEventListener("endMatch", this.endMatchCallback);
    frontend.setScene("game");
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
