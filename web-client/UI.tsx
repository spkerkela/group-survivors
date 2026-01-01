import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useState,
} from "react";
import { spellDB } from "../common/data";
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

function Upgrade() {
  const { choices } = useAppSelector((state) => state.upgradeChoices);
  const [selected, setSelected] = useState<(string | null)[]>(() =>
    choices.map(() => null),
  );

  function handleSelect(levelIdx: number, upgradeId: string) {
    setSelected((prev) => {
      const next = [...prev];
      next[levelIdx] = upgradeId;
      return next;
    });
  }

  function handleConfirm() {
    const selectedChoices = choices.map((choiceGroup, idx) =>
      choiceGroup.find((c) => c.id === selected[idx]),
    );
    if (selectedChoices.every(Boolean) && serverEventSystem) {
      serverEventSystem.dispatchEvent("upgradeSelection", selectedChoices);
    }
  }

  return (
    <div className="upgrade-ui">
      <div className="upgrade-ui-title">UPGRADE</div>
      {choices.map((choiceGroup, levelIdx) => (
        <div key={levelIdx} className="upgrade-level-section">
          <div className="upgrade-level-title">
            Level {levelIdx + 1} Upgrade
          </div>
          <div className="upgrade-choices-row">
            {choiceGroup.map((data) => (
              <div
                key={data.id}
                className={`upgrade-choice-wrapper ${selected[levelIdx] === data.id ? "selected" : ""}`}
                onClick={() => handleSelect(levelIdx, data.id)}
              >
                <SpellPowerUp powerUp={data.powerUp} spellId={data.spellId} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        className="upgrade-confirm-btn"
        disabled={selected.some((s) => !s)}
        onClick={handleConfirm}
      >
        Confirm Upgrades
      </button>
    </div>
  );
}

function JoinGame() {
  const dispatch = useAppDispatch();
  const { input, sanitized, error, isValid } = useAppSelector(
    (state) => state.userName,
  );
  const [isJoinLocked, setIsJoinLocked] = useState(false);

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
      serverEventSystem.dispatchEvent("join", sanitized);
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
    <div className="join-game-container">
      <input
        autoComplete="off"
        id="name"
        data-testid="name"
        type="text"
        placeholder="Name"
        value={input}
        disabled={isJoinLocked}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <div id="error" data-testid="error">
        {error}
      </div>
      <button
        className="button"
        id="start"
        data-testid="start"
        type="button"
        disabled={isStartDisabled}
        onClick={submitJoinRequest}
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
      <ActiveSpells />
    </div>
  );
}

function ActiveSpells() {
  const { spells } = useAppSelector((state) => state.activeSpells);
  return (
    <div className="active-spells">
      {Object.entries(spells).map(([spellId, level]) => {
        const spell = spellDB[spellId];
        if (!spell) return null;
        return (
          <div key={spellId} className="active-spell-card">
            <div className="spell-name">{spell.name}</div>
            <div className="spell-level">Lvl {level}</div>
          </div>
        );
      })}
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
    (state) => state.experience,
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
  const { level, pendingLevels } = useAppSelector((state) => state.level);
  return (
    <div>
      Player Level: {level}
      {pendingLevels > 0 && (
        <span style={{ color: "yellow", marginLeft: "0.5rem" }}>
          (+{pendingLevels})
        </span>
      )}
    </div>
  );
}
function Gold() {
  const gold = useAppSelector((state) => state.gold);
  return <div id="gold">Gold: {gold.gold}</div>;
}
