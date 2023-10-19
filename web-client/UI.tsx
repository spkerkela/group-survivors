import { spellDB } from "../common/data";
import { PowerUp } from "../common/types";
import { useAppSelector, useAppDispatch } from "./hooks";
import { set } from "./state/userNameSlice";

export default function UI() {
  const game = useAppSelector((state) => state.game);
  const ui = (function () {
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
  const powerUpTitle = (function () {
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
  const description = (function (spellName: string) {
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
  const powerUpChoices = choices[0] || [];

  const powerUpList = powerUpChoices.map((data) => (
    <SpellPowerUp key={data.id} powerUp={data.powerUp} spellId={data.spellId} />
  ));
  return <div className="upgrade-ui">{powerUpList}</div>;
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
  const { level } = useAppSelector((state) => state.level);
  return <div>Player Level: {level}</div>;
}
function Gold() {
  const gold = useAppSelector((state) => state.gold);
  return <div id="gold">Gold: {gold.gold}</div>;
}
