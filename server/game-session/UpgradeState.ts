import type { State } from "../../common/StateMachine";
import type { UpgradeChoice } from "../../common/types";
import { applyPowerUp } from "../game-logic/player";
import { addSpellToPlayer } from "../game-logic/spells";
import type { ServerScene } from "../ServerScene";
import { EndMatchState } from "./EndMatchState";
import type { StateMachineData } from "./GameSessionStateMachine";
import { MatchState } from "./MatchState";

export class UpgradeState implements State<StateMachineData> {
  countdown: number | null = null;
  private readyPlayers = new Set<string>();
  private upgradeListeners: {
    [id: string]: (selected: UpgradeChoice[]) => void;
  } = {};
  private rerollListeners: { [id: string]: (levelIndex: number) => void } = {};
  private readonly REROLL_COST = 5;

  constructor(public wave: number) {}

  private get timeLeft(): number | null {
    return this.countdown === null
      ? null
      : Math.max(0, Math.ceil(this.countdown));
  }

  private sendChoices(scene: ServerScene, id: string) {
    scene.generateUpgradeChoices(id);
    const player = scene.gameState.players.find((p) => p.id === id);
    scene.pushEvent("upgrade", id, {
      choices: scene.getUpgradeChoices(id),
      remaining: player?.pendingLevels ?? 0,
      rerollCost: this.REROLL_COST,
      timeLeft: this.timeLeft,
    });
  }

  private applyChoice(scene: ServerScene, id: string, choice: UpgradeChoice) {
    const player = scene.gameState.players.find((p) => p.id === id);
    if (!player || player.pendingLevels <= 0) return;
    if (choice.powerUp) {
      if (player.spells[choice.spellId] == null) return;
      applyPowerUp(player, choice.spellId, choice.powerUp);
      player.spells[choice.spellId]++;
    } else if (!addSpellToPlayer(choice.spellId, player)) {
      return;
    }
    player.level++;
    player.pendingLevels--;
    scene.clearUpgradeChoices(id);
    scene.pushEvent("level", id, { playerId: id, player });
    if (player.pendingLevels === 0) this.readyPlayers.add(id);
  }

  update(
    dt: number,
    { levelData, scene }: StateMachineData,
  ): State<StateMachineData> {
    const playerIds = Object.keys(this.upgradeListeners).filter(
      (id) => scene.eventSystems.connectionSystems[id],
    );
    const previousTimeLeft = this.timeLeft;
    if (playerIds.length <= 1) this.countdown = null;
    else if (this.countdown !== null) this.countdown -= dt;
    if (this.timeLeft !== previousTimeLeft) {
      playerIds.forEach((id) => {
        scene.pushEvent("upgradeTimeLeft", id, this.timeLeft);
      });
    }
    if (this.countdown !== null && this.countdown <= 0) {
      for (const id of playerIds) {
        // Generate each fallback after applying the last: ownership and caps stay current.
        while (!this.readyPlayers.has(id)) {
          scene.generateUpgradeChoices(id);
          const choice = scene.getUpgradeChoices(id)[0]?.[0];
          if (!choice) {
            this.readyPlayers.add(id);
            break;
          }
          this.applyChoice(scene, id, choice);
        }
      }
    }
    scene.sendEvents();
    if (playerIds.every((id) => this.readyPlayers.has(id))) {
      return this.wave + 1 >= levelData.waves
        ? new EndMatchState()
        : new MatchState(this.wave + 1);
    }
    return this;
  }

  enter({ scene }: StateMachineData) {
    const playerIds = scene
      .connectionIds()
      .filter((id) =>
        scene.gameState.players.some((player) => player.id === id),
      );
    this.countdown = playerIds.length > 1 ? 60 : null;
    for (const id of playerIds) {
      this.sendChoices(scene, id);
      this.upgradeListeners[id] = (selected) => {
        if (this.readyPlayers.has(id) || !Array.isArray(selected)) return;
        const groups = scene.getUpgradeChoices(id);
        if (!groups.length && !selected.length) {
          this.readyPlayers.add(id);
          return;
        }
        if (selected.length !== 1) return;
        // Trust only the ID. Never apply stats or weapon IDs supplied by a client.
        const choice = groups[0]?.find((c) => c.id === selected[0]?.id);
        if (!choice) return;
        this.applyChoice(scene, id, choice);
        if (!this.readyPlayers.has(id)) this.sendChoices(scene, id);
      };
      this.rerollListeners[id] = (levelIndex) => {
        const player = scene.gameState.players.find((p) => p.id === id);
        if (
          !player ||
          this.readyPlayers.has(id) ||
          levelIndex !== 0 ||
          !scene.getUpgradeChoices(id).length
        )
          return;
        if (player.gold >= this.REROLL_COST) {
          player.gold -= this.REROLL_COST;
          scene.clearUpgradeChoices(id);
        }
        // Refresh even an unaffordable request to unlock the client's controls.
        this.sendChoices(scene, id);
        scene.pushEvent("level", id, { playerId: id, player });
      };
      const connection = scene.eventSystems.connectionSystems[id];
      connection.addEventListener(
        "upgradeSelection",
        this.upgradeListeners[id],
      );
      connection.addEventListener("upgradeReroll", this.rerollListeners[id]);
    }
  }

  exit({ scene }: StateMachineData) {
    for (const id of Object.keys(this.upgradeListeners)) {
      const connection = scene.eventSystems.connectionSystems[id];
      connection?.removeEventListener(
        "upgradeSelection",
        this.upgradeListeners[id],
      );
      connection?.removeEventListener(
        "upgradeReroll",
        this.rerollListeners[id],
      );
      scene.clearUpgradeChoices(id);
    }
    scene.gameState.players.forEach((player) => {
      scene.saveMatchState(player);
      if (!scene.readyToJoin.some((ready) => ready.id === player.id)) {
        scene.readyToJoin.push({
          id: player.id,
          screenName: player.screenName,
        });
      }
    });
    this.readyPlayers.clear();
    this.upgradeListeners = {};
    this.rerollListeners = {};
  }
}
