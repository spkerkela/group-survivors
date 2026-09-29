import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { Server } from "socket.io";
import { io, type Socket } from "socket.io-client";
import parser from "socket.io-msgpack-parser";
import type { ClientGameState } from "../../common/types";
import { initGameEventSystem } from "../../server/eventSystems";
import { GameServer } from "../../server/GameServer";
import { levelData } from "./fixtures";

describe("shared games", () => {
  let server: Server;
  let stopGames: () => void;
  let url: string;
  let clients: Socket[];

  beforeEach(async () => {
    const http = createServer();
    server = new Server(http, { parser });
    stopGames = initGameEventSystem(server, levelData);
    clients = [];
    await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    clients.forEach((client) => {
      client.disconnect();
    });
    stopGames();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    mock.restoreAll();
  });

  function connect(gameId: unknown): Promise<Socket> {
    const client = io(url, {
      parser,
      auth: { gameId },
      forceNew: true,
      reconnection: false,
    });
    clients.push(client);
    return new Promise((resolve, reject) => {
      client.once("connect", () => resolve(client));
      client.once("connect_error", reject);
    });
  }

  function updateWith(client: Socket, name: string): Promise<ClientGameState> {
    return new Promise((resolve) => {
      const onUpdate = (state: ClientGameState) => {
        if (state.players.some((player) => player.screenName === name)) {
          client.off("update", onUpdate);
          resolve(state);
        }
      };
      client.on("update", onUpdate);
    });
  }

  async function disconnect(client: Socket) {
    const disconnected = new Promise<void>((resolve) => {
      server.sockets.sockets
        .get(client.id!)!
        .once("disconnect", () => resolve());
    });
    client.disconnect();
    await disconnected;
  }

  it("shares a game by ID, isolates other IDs, and releases empty games", async () => {
    const start = mock.method(GameServer.prototype, "start");
    const stop = mock.method(GameServer.prototype, "stop");
    const alice = await connect("group-a");
    const aliceJoined = updateWith(alice, "Alice");
    alice.emit("join", "Alice", "dagger");
    assert.deepEqual((await aliceJoined).player?.spells, { dagger: 1 });

    const bob = await connect("group-a");
    const bobJoined = updateWith(bob, "Bob");
    const aliceSeesBob = updateWith(alice, "Bob");
    bob.emit("join", "Bob", "damageAura");
    const names = (state: ClientGameState) =>
      state.players.map((player) => player.screenName).sort();
    const bobState = await bobJoined;
    assert.deepEqual(bobState.player?.spells, { damageAura: 1 });
    assert.deepEqual(names(bobState), ["Alice", "Bob"]);
    assert.deepEqual(names(await aliceSeesBob), ["Alice", "Bob"]);

    const carol = await connect("group-b");
    const carolJoined = updateWith(carol, "Carol");
    carol.emit("join", "Carol");
    assert.deepEqual(names(await carolJoined), ["Carol"]);
    assert.deepEqual(names(await updateWith(alice, "Alice")), ["Alice", "Bob"]);
    assert.equal(start.mock.callCount(), 2);

    await disconnect(alice);
    assert.equal(stop.mock.callCount(), 0);
    await disconnect(bob);
    assert.equal(stop.mock.callCount(), 1);
    const returning = await connect("group-a");
    const returningJoined = updateWith(returning, "Returning");
    returning.emit("join", "Returning");
    assert.deepEqual(names(await returningJoined), ["Returning"]);
    assert.equal(start.mock.callCount(), 3);
    assert.equal(carol.connected, true);
  });

  for (const gameId of [undefined, "", "../game", "x".repeat(65), 123, {}]) {
    it(`rejects an invalid game ID: ${JSON.stringify(gameId)}`, async () => {
      const start = mock.method(GameServer.prototype, "start");
      await assert.rejects(connect(gameId), /Invalid game ID/);
      assert.equal(start.mock.callCount(), 0);
    });
  }
});
