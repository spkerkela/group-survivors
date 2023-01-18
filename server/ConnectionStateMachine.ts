import StateMachine, { State } from "../common/StateMachine";
import { Connector } from "./GameServer";

interface ConnectionData {
  connector: Connector;
  playersRequired: number;
}

export class LobbyState implements State<ConnectionData> {
  update(
    dt: number,
    { connector, playersRequired }: ConnectionData
  ): State<ConnectionData> {
    connector.sendEvents();

    if (connector.gameCanStart(playersRequired)) {
      return new GameUpdateState();
    }

    return this;
  }
  enter(data: ConnectionData): void {}
  exit(data: ConnectionData): void {}
}

export class GameUpdateState implements State<ConnectionData> {
  update(dt: number, { connector }: ConnectionData): State<ConnectionData> {
    connector.sendEvents();
    if (connector.gameState.players.length === 0) {
      return new GameRetrospectiveState();
    }
    return this;
  }
  enter(data: ConnectionData): void {
    data.connector.enableInstantJoin();
    data.connector.readyToJoin.forEach(({ id, screenName }) => {
      data.connector.pushEvent("beginMatch", id, {
        gameState: data.connector.createGameStateMessage(id),
      });
      data.connector.updates.newPlayers.push({
        id,
        screenName,
      });
    });
  }
  exit(data: ConnectionData): void {
    data.connector.disableInstantJoin();
    data.connector.connectionIds().forEach((id) => {
      data.connector.pushEvent("endMatch", id, {});
    });
  }
}

export class GameRetrospectiveState implements State<ConnectionData> {
  time: number;
  update(dt: number, data: ConnectionData): State<ConnectionData> {
    data.connector.sendEvents();
    this.time -= dt;
    if (this.time <= 0) {
      return new LobbyState();
    }
    return this;
  }
  enter(data: ConnectionData): void {
    this.time = 5;
  }
  exit(data: ConnectionData): void {}
}

export default class ConnectionStateMachine {
  stateMachine: StateMachine<ConnectionData>;
  data: ConnectionData;
  constructor(connector: Connector, playersRequired: number = 2) {
    this.data = { connector, playersRequired };
    this.stateMachine = new StateMachine<ConnectionData>(
      new LobbyState(),
      this.data
    );
  }
  update(dt: number) {
    this.stateMachine.update(dt, this.data);
  }
}
