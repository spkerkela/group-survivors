import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { STARTING_WEAPONS, spellDB } from "../common/data";
import type { PowerUp } from "../common/types";
import { globalEventSystem } from "./eventSystems";
import { useAppDispatch, useAppSelector } from "./hooks";
import { serverEventSystem } from "./serverEventSystem";
import { reset, set } from "./state/userNameSlice";

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
  return (
    <div id="ui" data-screen={game.state}>
      {ui}
    </div>
  );
}

function GameOver() {
  return (
    <section className="screen game-over" aria-labelledby="game-over-title">
      <div className="result-mark" aria-hidden="true">
        ✦
      </div>
      <p className="eyebrow">Until the next run</p>
      <h2 id="game-over-title">Game Over</h2>
      <p className="muted">Every wave makes a survivor.</p>
      <p role="status" className="waiting-note">
        Returning to the lobby shortly…
      </p>
    </section>
  );
}

function formatTime(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function SpellPowerUp({
  powerUp,
  spellId,
}: {
  powerUp: PowerUp | null;
  spellId: string;
}) {
  const spell = spellDB[spellId];
  if (!powerUp) {
    return (
      <span className="power-up-card">
        <span className="power-up-card-spell">{spell.name}</span>
        <span className="power-up-card-title">New weapon</span>
        <span className="power-up-card-value">Unlock</span>
        <span className="power-up-card-description">{spell.description}</span>
      </span>
    );
  }
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

  const valueAsPercentage = Number((powerUp.value * 100).toFixed(2));
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
    <span className="power-up-card">
      <span className="power-up-card-spell">{spell.name}</span>
      <span className="power-up-card-title">{powerUpTitle}</span>
      <span className="power-up-card-value">
        {powerUp.type === "cooldown" ? "−" : "+"}
        {powerUp.type === "additionalCast"
          ? powerUp.value
          : `${valueAsPercentage}%`}
      </span>
      <span className="power-up-card-description">{description}</span>
    </span>
  );
}

function Upgrade() {
  const { choices, remaining, rerollCost, timeLeft } = useAppSelector(
    (state) => state.upgradeChoices,
  );
  const { gold } = useAppSelector((state) => state.gold);
  const [confirmed, setConfirmed] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const focusLevel = useCallback((fieldset: HTMLFieldSetElement | null) => {
    fieldset?.focus();
  }, []);
  const choiceGroup = choices[0];
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setSelected((previous) =>
      choices[0]?.some((choice) => choice.id === previous) ? previous : null,
    );
    setConfirmed(false);
    setRerolling(false);
  }, [choices]);

  function handleSelect(upgradeId: string) {
    if (confirmed || rerolling) return;
    setSelected(upgradeId);
  }

  function handleConfirm() {
    if (confirmed || rerolling || (choices.length > 0 && !selected)) return;
    const selectedChoices = choices.map((group) =>
      group.find((choice) => choice.id === selected),
    );
    if (selectedChoices.every(Boolean) && serverEventSystem) {
      serverEventSystem.dispatchEvent("upgradeSelection", selectedChoices);
      setConfirmed(true);
    }
  }

  function handleReroll() {
    if (
      !confirmed &&
      !rerolling &&
      choiceGroup &&
      serverEventSystem &&
      gold >= rerollCost
    ) {
      setRerolling(true);
      serverEventSystem.dispatchEvent("upgradeReroll", 0);
    }
  }

  return (
    <section className="screen upgrade-ui" aria-labelledby="upgrade-title">
      <header className="upgrade-ui-header">
        <div>
          <p className="eyebrow">Between waves</p>
          <h2 id="upgrade-title">Grow stronger.</h2>
          <p className="muted">
            {choices.length
              ? "Choose one boost, then move to the next level."
              : "No upgrades this round. Ready for another wave?"}
          </p>
        </div>
        {timeLeft !== null && (
          <div
            className="timer-chip"
            role="timer"
            aria-label="Upgrade time remaining"
          >
            <span>Time to choose</span>
            <strong>{formatTime(timeLeft)}</strong>
          </div>
        )}
      </header>
      <div className="upgrade-toolbar">
        <span className="upgrade-ui-gold">Gold: {gold}</span>
        <button
          type="button"
          className="upgrade-reroll-btn secondary-button"
          disabled={
            confirmed || rerolling || gold < rerollCost || choices.length === 0
          }
          onClick={handleReroll}
        >
          {rerolling ? "Rerolling…" : `Reroll · ${rerollCost} Gold`}
        </button>
      </div>
      <div className="upgrade-sets">
        {choiceGroup && (
          <fieldset
            ref={focusLevel}
            tabIndex={-1}
            key={choiceGroup.map((choice) => choice.id).join(",")}
            className="upgrade-level-section"
            disabled={confirmed || rerolling}
          >
            <legend className="upgrade-level-title">
              {remaining} {remaining === 1 ? "upgrade" : "upgrades"} remaining
            </legend>
            <div className="upgrade-choices-row">
              {choiceGroup.map((data) => (
                <label
                  key={data.id}
                  className={`upgrade-choice-wrapper ${selected === data.id ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="upgrade"
                    value={data.id}
                    checked={selected === data.id}
                    onChange={() => handleSelect(data.id)}
                  />
                  <SpellPowerUp powerUp={data.powerUp} spellId={data.spellId} />
                  <span className="choice-state" aria-hidden="true">
                    {selected === data.id ? "✓ Selected" : "Select boost"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>
      <footer className="upgrade-footer">
        <div role="status" className="waiting-note">
          {confirmed &&
            (remaining > 1
              ? "Loading next upgrade…"
              : "Waiting for other players…")}
        </div>
        <button
          type="button"
          className="upgrade-confirm-btn button"
          disabled={confirmed || rerolling || (choices.length > 0 && !selected)}
          onClick={handleConfirm}
        >
          {confirmed
            ? remaining > 1
              ? "Applying upgrade…"
              : "Upgrades Confirmed"
            : remaining > 1
              ? "Next level"
              : choices.length
                ? "Confirm Upgrades"
                : "Continue"}
        </button>
      </footer>
    </section>
  );
}

function JoinGame() {
  const dispatch = useAppDispatch();
  const { input, sanitized, error, isValid } = useAppSelector(
    (state) => state.userName,
  );
  const [isJoinLocked, setIsJoinLocked] = useState(false);
  const [startingWeapon, setStartingWeapon] = useState(STARTING_WEAPONS[0]);

  useEffect(() => {
    const handleDisable = () => {
      setIsJoinLocked(true);
    };
    const handleEnable = () => {
      setIsJoinLocked(false);
      dispatch(reset());
    };

    globalEventSystem.addEventListener("disableJoinUI", handleDisable);
    globalEventSystem.addEventListener("enableJoinUI", handleEnable);

    return () => {
      globalEventSystem.removeEventListener("disableJoinUI", handleDisable);
      globalEventSystem.removeEventListener("enableJoinUI", handleEnable);
    };
  }, [dispatch]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch(set(event.target.value));
  };

  const submitJoinRequest = () => {
    if (!isValid || isJoinLocked || sanitized === "") {
      return;
    }

    if (serverEventSystem) {
      serverEventSystem.dispatchEvent("join", sanitized, startingWeapon);
      globalEventSystem.dispatchEvent("disableJoinUI");
      setIsJoinLocked(true);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitJoinRequest();
    }
  };

  const isStartDisabled = !isValid || isJoinLocked;

  return (
    <section className="screen lobby" aria-labelledby="lobby-title">
      <div className="lobby-intro">
        <p className="eyebrow">Co-op survival</p>
        <h2 id="lobby-title">
          Stand together.
          <br />
          <em>Survive the swarm.</em>
        </h2>
        <p className="muted">
          Gather your group, take on the horde, and build a little more power
          with every wave.
        </p>
      </div>
      <div className="join-game-container">
        <label htmlFor="name">Your survivor name</label>
        <input
          autoComplete="off"
          spellCheck={false}
          id="name"
          data-testid="name"
          type="text"
          placeholder="Enter your name"
          value={input}
          disabled={isJoinLocked}
          aria-invalid={input.length > 0 && !isValid}
          aria-describedby="error"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <div id="error" data-testid="error" aria-live="polite">
          {input.length > 0 && error}
        </div>
        <label htmlFor="starting-weapon">Starting weapon</label>
        <select
          id="starting-weapon"
          value={startingWeapon}
          disabled={isJoinLocked}
          onChange={(event) => setStartingWeapon(event.target.value)}
          aria-describedby="starting-weapon-description"
        >
          {STARTING_WEAPONS.map((id) => (
            <option key={id} value={id}>
              {spellDB[id].name}
            </option>
          ))}
        </select>
        <p id="starting-weapon-description" className="muted">
          {spellDB[startingWeapon].description}
        </p>
        <button
          className="button"
          id="start"
          data-testid="start"
          type="button"
          disabled={isStartDisabled}
          onClick={submitJoinRequest}
        >
          {isJoinLocked ? "Joining…" : "Join the fight"}
        </button>
        <p role="status" className="join-status">
          {isJoinLocked
            ? "Waiting for the game…"
            : "Pick a name. Make it through together."}
        </p>
      </div>
      <section className="how-to-play" aria-label="How to play">
        <div>
          <span className="control-keys">
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd>
          </span>
          <span>Move & evade</span>
        </div>
        <div>
          <strong>Auto-attack</strong>
          <span>Stay close. Spells do the work.</span>
        </div>
        <div>
          <strong>Collect & upgrade</strong>
          <span>Gather gems. Build your power.</span>
        </div>
      </section>
    </section>
  );
}

function MatchUI() {
  const currentHealth = useAppSelector((state) => state.health.currentHealth);
  return (
    <div className="match-ui">
      <div className="hud-top">
        <div className="bars">
          <HealthBar />
          <ExperienceBar />
        </div>
        <MatchStatus />
      </div>
      {currentHealth <= 0 && (
        <div role="status" className="death-notice">
          <span className="eyebrow">Hold on, survivor</span>
          <strong>You fell in battle.</strong>
          <span>Wait for the round to end. Your group fights on.</span>
        </div>
      )}
      <div className="hud-bottom">
        <div className="player-stats">
          <PlayerLevel />
          <Gold />
        </div>
        <ActiveSpells />
      </div>
    </div>
  );
}

function ActiveSpells() {
  const { spells } = useAppSelector((state) => state.activeSpells);
  return (
    <section className="active-spells" aria-label="Active spells">
      {Object.entries(spells).map(([spellId, level]) => {
        const spell = spellDB[spellId];
        if (!spell) return null;
        return (
          <div key={spellId} className="active-spell-card">
            <div className="spell-name">{spell.name}</div>
            <div className="spell-level">Lv. {level}</div>
          </div>
        );
      })}
    </section>
  );
}

function MatchStatus() {
  const game = useAppSelector((state) => state.game);
  return (
    <div className="match-status">
      {game.wave > 0 && (
        <>
          <div id="wave">
            <span className="stat-label">Wave</span>
            <strong>{String(game.wave).padStart(2, "0")}</strong>
          </div>
          <div id="timeRemaining" role="timer" aria-label="Wave time remaining">
            <span className="stat-label">Remaining</span>
            <strong>{formatTime(game.timeLeft)}</strong>
          </div>
        </>
      )}
    </div>
  );
}

function Bar({
  current,
  max,
  label,
  kind,
}: {
  current: number;
  max: number;
  label: string;
  kind: string;
}) {
  const limit = Math.max(0, max);
  const value = Math.max(0, Math.min(current, limit));
  const percent = limit > 0 ? (value / limit) * 100 : 0;
  return (
    <div className={`resource-bar ${kind}`}>
      <div className="bar-label">
        <span>{label}</span>
        <span>
          {Math.floor(value)}/{Math.ceil(limit)}
        </span>
      </div>
      <div
        className="bar-outer"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={value}
      >
        <div className="bar-inner" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function HealthBar() {
  const { currentHealth, maxHealth } = useAppSelector((state) => state.health);
  return (
    <Bar current={currentHealth} max={maxHealth} label="Health" kind="health" />
  );
}

function ExperienceBar() {
  const { experienceToNextLevel, currentExperience } = useAppSelector(
    (state) => state.experience,
  );
  return (
    <Bar
      current={currentExperience}
      max={experienceToNextLevel}
      label="Experience"
      kind="experience"
    />
  );
}

function PlayerLevel() {
  const { level, pendingLevels } = useAppSelector((state) => state.level);
  return (
    <div className="player-level">
      <span className="stat-label">Level</span> <strong>{level}</strong>
      {pendingLevels > 0 && (
        <span
          className="pending-levels"
          title="Upgrades available after this wave"
        >
          +{pendingLevels} pending
        </span>
      )}
    </div>
  );
}
function Gold() {
  const gold = useAppSelector((state) => state.gold);
  return (
    <div id="gold">
      <span className="stat-label">Gold</span> <strong>{gold.gold}</strong>
    </div>
  );
}
