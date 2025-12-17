import type { State } from "../../common/StateMachine";
import type { UpgradeChoice } from "../../common/types";
import { applyPowerUp } from "../game-logic/player";
import logger from "../logger";
import type { ServerPlayer } from "../types";
import { EndMatchState } from "./EndMatchState";
import type { StateMachineData } from "./GameSessionStateMachine";
import { MatchState } from "./MatchState";
export class UpgradeState implements State<StateMachineData> {
  wave: number;
  countdown = 30;
  private readyPlayers: Set<string> = new Set();
  private upgradeSelections: { [id: string]: UpgradeChoice[] } = {};
  private upgradeListeners: {
    [id: string]: (selected: UpgradeChoice[]) => void;
  } = {};

  constructor(wave: number) {
    this.wave = wave;
  }

  update(
    dt: number,
    { levelData, scene }: StateMachineData,
  ): State<StateMachineData> {
    scene.sendEvents();
    const playerIds: string[] = scene.connectionIds();
    this.countdown -= dt;
    if (this.readyPlayers.size === playerIds.length || this.countdown <= 0) {
      // For any players who didn't submit, pick random upgrades
      playerIds.forEach((id: string) => {
        if (!this.readyPlayers.has(id)) {
          const choices: UpgradeChoice[][] = scene.getUpgradeChoices(id);
          // Pick first option for each pending level as fallback
          this.upgradeSelections[id] = choices.map(
            (group: UpgradeChoice[]) => group[0],
          );
        }
      });
      playerIds.forEach((id: string) => {
        const selections = this.upgradeSelections[id];
        const player = scene.gameState.players.find(
          (p: ServerPlayer) => p.id === id,
        );
        if (player && selections) {
          selections.forEach((choice: UpgradeChoice) => {
            if (choice?.spellId && choice.powerUp) {
              // Apply the upgrade
              const { spellId, powerUp } = choice;
              // Add spell if not present
              if (!(spellId in player.spells)) {
                player.spells[spellId] = 1;
              }
              // Apply powerup
              applyPowerUp(player, spellId, powerUp);
              // Increment player level for each upgrade spent

              player.level += 1;
              scene.pushEvent("level", id, player);
            }
          });
        }
        // Clear upgrade choices for this player
        scene.clearUpgradeChoices(id);
      });
      // Reset ready state
      this.readyPlayers.clear();
      this.upgradeSelections = {};
      // Advance state
      if (this.wave + 1 >= levelData.waves) {
        return new EndMatchState();
      }
      logger.info("upgrade state finished");
      return new MatchState(this.wave + 1);
    }
    return this;
  }

  enter({ scene }: StateMachineData) {
    logger.info("upgrade state entered");
    // Listen for upgradeSelection from each player
    (scene.connectionIds() as string[]).forEach((id: string) => {
      // Ensure upgrade choices are generated before sending
      scene.generateUpgradeChoices(id);
      const playerUpgradeChoices: UpgradeChoice[][] =
        scene.getUpgradeChoices(id);
      logger.info("upgrade choices", playerUpgradeChoices);
      scene.pushEvent("upgrade", id, {
        choices: playerUpgradeChoices,
      });
      // Remove any previous listener
      if (this.upgradeListeners[id]) {
        scene.eventSystems.connectionSystems[id].removeEventListener(
          "upgradeSelection",
          this.upgradeListeners[id],
        );
      }
      // Register new listener
      this.upgradeListeners[id] = (selected: UpgradeChoice[]) => {
        // Validate selection
        const validChoices: UpgradeChoice[][] = scene.getUpgradeChoices(id);
        if (
          Array.isArray(selected) &&
          selected.length === validChoices.length &&
          selected.every((sel: UpgradeChoice, idx: number) =>
            validChoices[idx].some((c: UpgradeChoice) => c.id === sel.id),
          )
        ) {
          this.upgradeSelections[id] = selected;
          this.readyPlayers.add(id);
        }
      };
      scene.eventSystems.connectionSystems[id].addEventListener(
        "upgradeSelection",
        this.upgradeListeners[id],
      );
    });
  }

  exit({ scene }: StateMachineData) {
    // Clean up listeners
    (scene.connectionIds() as string[]).forEach((id: string) => {
      if (this.upgradeListeners[id]) {
        scene.eventSystems.connectionSystems[id].removeEventListener(
          "upgradeSelection",
          this.upgradeListeners[id],
        );
        delete this.upgradeListeners[id];
      }
    });

    // Save state and move players to readyToJoin for the next wave
    scene.gameState.players.forEach((p) => {
      scene.saveMatchState(p);
      if (!scene.readyToJoin.find((r) => r.id === p.id)) {
        scene.readyToJoin.push({ id: p.id, screenName: p.screenName });
      }
    });

    this.readyPlayers.clear();
    this.upgradeSelections = {};
  }
}
