import { useAppSelector, useAppDispatch } from "./hooks";
import { set } from "./state/userNameSlice";

export default function UI() {
  const { game } = useAppSelector((state) => ({
    game: state.game,
  }));
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

function Upgrade() {
  return <div className="upgrade">Upgrade</div>;
}

function JoinGame() {
  const { userName } = useAppSelector((state) => ({
    userName: state.userName,
  }));
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
      <button id="start" data-testid="start" disabled={userName.error !== ""}>
        Start
      </button>
    </div>
  );
}

function MatchUI() {
  return (
    <div className="matchUi">
      <div className="bars">
        <HealthBar />
        <ExperienceBar />
      </div>
      <MatchStatus />
    </div>
  );
}

function MatchStatus() {
  const { game, level } = useAppSelector((state) => ({
    game: state.game,
    level: state.level,
  }));
  return (
    <div className="matchStatus">
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
  const { health } = useAppSelector((state) => ({
    health: state.health,
  }));
  const { currentHealth, maxHealth } = health;
  return <Bar current={currentHealth} max={maxHealth} color="#ff0000" />;
}

function ExperienceBar() {
  const { experience } = useAppSelector((state) => ({
    experience: state.experience,
  }));

  const { experienceToNextLevel, currentExperience } = experience;
  return (
    <Bar
      current={currentExperience}
      max={experienceToNextLevel}
      color="#0000ff"
    />
  );
}

function PlayerLevel() {
  const { level } = useAppSelector((state) => ({
    level: state.level,
  }));
  return <div>Player Level: {level.level}</div>;
}
function Gold() {
  const { gold } = useAppSelector((state) => ({
    gold: state.gold,
  }));
  return <div id="gold">Gold: {gold.gold}</div>;
}
