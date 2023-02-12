import { useAppSelector, useAppDispatch } from "./hooks";
import { set } from "./state/userNameSlice";

export default function UI() {
  const { userName, game } = useAppSelector((state) => ({
    userName: state.userName,
    game: state.game,
  }));
  const dispatch = useAppDispatch();
  return (
    <div id="ui">
      {game.running ? (
        <div className="matchUi">
          <div className="bars">
            <HealthBar />
            <ExperienceBar />
          </div>
          <MatchStatus />
        </div>
      ) : (
        <>
          <input
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
            id="start"
            data-testid="start"
            disabled={userName.error !== ""}
          >
            Start
          </button>
        </>
      )}
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

function HealthBar() {
  const { health } = useAppSelector((state) => ({
    health: state.health,
  }));
  const { currentHealth, maxHealth } = health;
  const percentHealth = Math.round((currentHealth / maxHealth) * 100);
  return (
    <>
      <div className="hp-bar-outer">
        <div
          className="hp-bar-inner"
          style={{
            width: `${percentHealth}%`,
          }}
        />
      </div>
    </>
  );
}

function ExperienceBar() {
  const { experience } = useAppSelector((state) => ({
    experience: state.experience,
  }));

  const { experienceToNextLevel, currentExperience } = experience;
  const percentToNextLevel =
    Math.round(currentExperience * 100) / experienceToNextLevel;
  return (
    <>
      <div className="xp-bar-outer">
        <div
          className="xp-bar-inner"
          style={{
            width: `${percentToNextLevel}%`,
          }}
        />
      </div>
    </>
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
