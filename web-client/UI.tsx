import { spellDB } from "../common/data";
import type { PowerUp } from "../common/types";
import { useAppDispatch, useAppSelector } from "./hooks";
import { set } from "./state/userNameSlice";

export default function UI() {
  const game = useAppSelector((state) => state.game);
  const ui = (() => {
    switch (game.state) {
      case "lobby":
        return <JoinGame />;
      case "match":
        return <MatchUI />;
      case "upgrade":
        return <Upgrade />;
      case "gameOver":
        return <GameOver />;
      default:
        return <JoinGame />;
    }
  })();
  return <div id="ui">{ui}</div>;
}

function GameOver() {
  return <div className="gameOver">Game Over</div>;
}

function SpellPowerUp({
  powerUp,
  spellId,
}: {
  powerUp: PowerUp;
  spellId: string;
}) {
  const spell = spellDB[spellId];
  const powerUpTitle = (() => {
    switch (powerUp.type) {
      case "damage":
        return "Damage";
      case "cooldown":
        return "Cooldown";
      case "range":
        return "Range";
      case "additionalCast":
        return "Additional Cast";
    }
  })();

  const valueAsPercentage = (powerUp.value * 100).toFixed(2);
  const description = ((spellName: string) => {
    switch (powerUp.type) {
      case "damage":
        return `Increases ${spellName} damage by ${valueAsPercentage}%`;
      case "cooldown":
        return `Reduces the cooldown of ${spellName} by ${valueAsPercentage}%`;
      case "range":
        return `Increases the range of ${spellName} by ${valueAsPercentage}%`;
      case "additionalCast":
        return `Increases the number of ${spellName} casts by ${powerUp.value}`;
    }
  })(spell.name);

  return (
    <div className="power-up-card">
      <div className="power-up-card-title">
        {spell.name}-{powerUpTitle}
      </div>
      <div className="power-up-card-description">{description}</div>
    </div>
  );
}

import { useState } from "react";
import { serverEventSystem } from "./serverEventSystem";

function Upgrade() {
  const { choices } = useAppSelector((state) => state.upgradeChoices);
  const [selected, setSelected] = useState<(string | null)[]>(() =>
    choices.map(() => null)
  );

  // Handler for selecting an upgrade for a given level
  function handleSelect(levelIdx: number, upgradeId: string) {
    setSelected((prev) => {
      const next = [...prev];
      next[levelIdx] = upgradeId;
      return next;
    });
  }

  // Confirm button handler
  function handleConfirm() {
    // Gather the selected UpgradeChoice objects
    const selectedChoices = choices.map((choiceGroup, idx) =>
      choiceGroup.find((c) => c.id === selected[idx])
    );
    // Only send if all are selected and serverEventSystem is available
    if (selectedChoices.every(Boolean) && serverEventSystem) {
      serverEventSystem.dispatchEvent("upgradeSelection", selectedChoices);
    }
  }

  // Render each group of choices (one per pending level)
  return (
    <div className="upgrade-ui" style={{ flexDirection: "column" }}>
      {choices.map((choiceGroup, levelIdx) => (
        <div key={levelIdx} style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8, fontWeight: "bold" }}>
            Choose upgrade for Level {levelIdx + 1}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {choiceGroup.map((data) => (
              <div
                key={data.id}
                style={{
                  border:
                    selected[levelIdx] === data.id
                      ? "3px solid #ffff00"
                      : "2px solid #333",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: selected[levelIdx] === data.id ? "#222" : "#111",
                  boxShadow:
                    selected[levelIdx] === data.id
                      ? "0 0 8px 2px #ffff00"
                      : undefined,
                }}
                onClick={() => handleSelect(levelIdx, data.id)}
              >
                <SpellPowerUp powerUp={data.powerUp} spellId={data.spellId} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        className="button"
        style={{ marginTop: 32, fontSize: 28 }}
        disabled={selected.some((s) => !s)}
        onClick={handleConfirm}
      >
        Confirm Upgrades
      </button>
    </div>
  );
}

function JoinGame() {
  const userName = useAppSelector((state) => state.userName);
  const dispatch = useAppDispatch();
  return (
    <div className="join-game-container">
      <input
        autoComplete="off"
        id="name"
        data-testid="name"
        type="text"
        placeholder="Name"
        onChange={(e) => dispatch(set(e.target.value))}
      />
      <div id="error" data-testid="error">
        {userName.error}
      </div>
      <button
        className={"button"}
        id="start"
        data-testid="start"
        disabled={userName.error !== ""}
      >
        Start
      </button>
    </div>
  );
}

function MatchUI() {
  return (
    <div className="match-ui">
      <div className="bars">
        <HealthBar />
        <ExperienceBar />
      </div>
      <MatchStatus />
    </div>
  );
}

function MatchStatus() {
  const game = useAppSelector((state) => state.game);
  return (
    <div className="match-status">
      {game.wave > 0 && (
        <>
          <div id="wave">Wave: {game.wave}</div>
          <div id="timeRemaining">Time remaining: {game.timeLeft}</div>
        </>
      )}
      <PlayerLevel />
      <Gold />
    </div>
  );
}

function Bar({
  current,
  max,
  color,
}: {
  current: number;
  max: number;
  color: string;
}) {
  const percent = Math.round((current / max) * 100);
  return (
    <div className="bar-outer">
      <div className="bar-container-text">
        <div className="bar-container-text-align-center">
          {Math.floor(current)}/{Math.ceil(max)}
        </div>
      </div>
      <div
        className="bar-inner"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  );
}

function HealthBar() {
  const { currentHealth, maxHealth } = useAppSelector((state) => state.health);
  return <Bar current={currentHealth} max={maxHealth} color="#ff0000" />;
}

function ExperienceBar() {
  const { experienceToNextLevel, currentExperience } = useAppSelector(
    (state) => state.experience
  );
  return (
    <Bar
      current={currentExperience}
      max={experienceToNextLevel}
      color="#0000ff"
    />
  );
}

function PlayerLevel() {
  const { level } = useAppSelector((state) => state.level);
  return <div>Player Level: {level}</div>;
}
function Gold() {
  const gold = useAppSelector((state) => state.gold);
  return <div id="gold">Gold: {gold.gold}</div>;
}
