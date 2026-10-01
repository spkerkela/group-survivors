# Bounded TLA+ checks

These are **hand-written models of selected behavior**, not a proof of the
TypeScript implementation or of the whole game. TLC exhaustively explores the
finite configurations below, including permitted event/frame interleavings.
There is no automatic translation or refinement check linking the models to code.

## Run

Requires Java (tested with Java 19) and the official TLA+ tools. No npm dependency
or global installation is needed:

```sh
curl -fL https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar \
  -o /tmp/tla2tools-1.7.4.jar
# Compare with the checksum published in the v1.7.4 release:
shasum /tmp/tla2tools-1.7.4.jar
# bee4a54f3ee3d4afc347c3240ec2d9e93b075104
export TLA2TOOLS_JAR=/tmp/tla2tools-1.7.4.jar
npm run verify:tla
```

**The full command currently exits 1: Client has real counterexamples.** The
runner checks all three models even if one fails; it never treats an expected
counterexample as a verification pass. TLC's trace is printed to stdout.

```sh
npm run verify:tla -- GameSession Spell  # currently passes
npm run verify:tla -- Client             # currently fails
node --import tsx --test formal/client-counterexamples.test.ts
```

The last command replays three failing traces against the actual client class.
Those are **characterization checks of existing defects**, not passing checks of
desired behavior. When fixing a defect, update the model to match the code and
replace its characterization with a regression asserting the desired state.

## Models and source mapping

### GameSession.tla

Maps `server/game-session/{PreMatch,Match,Upgrade,EndMatch}State.ts` and the
start guard in `server/ServerScene.ts` into a control-flow model:

- `PreTick`: enough connected, joined players start wave zero.
- `MatchTick`: the strict `timer > waveLength` branch takes priority over combat;
  otherwise an arbitrary subset survives, and a wipe enters EndMatch.
- `Choose`: one valid upgrade selection consumes one pending level; an explicit
  empty confirmation handles zero pending levels.
- `UpgradeTick`: only the entry-time participants still connected block progress.
  Multiplayer timeout applies remaining choices; dropping to solo cancels the
  timer before timeout processing. Completion advances one wave or ends the game.
- `EndTick`: timeout or no connections returns to PreMatch.

Checks phase/wave transition guards, level conservation, ready players having no
pending choices, and eventual exit from Match, Upgrade, and EndMatch.

Default bounds: two player IDs, one required to start, two waves, at most two
pending levels per player per upgrade. Timers use small integer ticks (2/2/1),
**not** the production durations. Nonparticipants act as spectators during upgrade.

Assumptions and exclusions:

- Server ticks keep occurring (weak fairness). A solo player eventually confirms
  each choice; otherwise indefinite waiting is intentional. Multiplayer progress
  does not assume cooperation while two participants remain connected.
- A fixed connection universe; joins only in PreMatch and disconnects only in
  Upgrade. No reconnects, mid-match joins/disconnects, or bots are verified.
- Match entry and player creation are collapsed. Combat, XP earning, and saved
  player state are abstracted; survivor sets and pending-level budgets are
  nondeterministic. This does **not** verify respawning or persistence.
- Generated choices are valid and applicable until pending levels reach zero.
  Timeout's synchronous fallback loop is one atomic step. Invalid/stale selections,
  choice generation, reroll gold accounting, and fallback-loop termination are
  outside this model. Rerolls that affect only choices/gold are stuttering steps.
- State transitions plus enter/exit hooks are atomic, as in one synchronous
  `common/StateMachine.ts` update. Upgrade bookkeeping is retained after exit for
  assertions, then reset on the next upgrade entry.

### Spell.tla

Maps `server/state-machines/{CastSpellState,SpellCooldownState}.ts`: cast count is
latched on entry, at most one cast attempt occurs per update, and the update
**after** the last cast enters cooldown. Cooldown expiry enters a fresh cast
state without casting on that same update.

Checks the three-cast cap, aura single-cast behavior, completion of a burst before
cooldown, cast-step safety, and repeated cycles under fair positive-time updates.
Bounds include zero-delta updates, deltas exceeding cooldown, additional-cast
upgrades beyond the cap, and positive cooldowns of 1–4 abstract ticks. The owner
is assumed alive and the spell keeps receiving updates. The cooldown formula,
floating-point time, targeting, damage, and projectile generation are not verified.

### Client.tla

Maps listeners, latched flags, transition priorities, and frame updates in
`web-client/ClientStateMachine.ts`. Event delivery and animation frames are
separate actions. Messages retain order but multiple messages may arrive before
a frame. Delivery and frames are weakly fair; there is no maximum frame delay.

Each scenario establishes a normal joined/match state, delivers a finite suffix,
then checks eventual convergence to the expected state. Rendering and the separate
Redux handlers in `GameContainer.tsx` are not modeled. In particular, a Redux
screen update does not establish that the Phaser state machine transitioned.
This is not a composed server/network/client proof; protocol scripts are explicit
inputs. To isolate a trace, set `Scenarios` in `Client.cfg` to one scenario name.

## Findings in the current code

| Scenario | Event suffix before the next frame | Expected | Actual |
| --- | --- | --- | --- |
| `disconnect` | `disconnect` | Disconnected | GameLoop |
| `gameOver` | `endMatch`, `gameOver` | Connected | GameLoop |
| `upgradeResume` | `endMatch`, `upgrade`, `beginMatch` | GameLoop | Upgrade |

`GameLoopState` does not register disconnect/gameOver listeners; its
`endMatchCallback` is defined but never registered. In the third trace,
`beginMatch` arrives before a frame installs UpgradeState's listener, so it is
lost. This can matter when animation frames are delayed across a server phase
change. Further frames alone cannot recover any of these three traces.

Observed with TLC 1.7.4: GameSession passed over **5,288** distinct states; Spell
passed over **101**. Client explored **31** states and failed convergence. All
three scenarios also failed individually and were reproduced against TypeScript.
The 20 focused existing state-machine/upgrade/spell tests passed. Temporary model
mutations (dropping an awarded level and removing the cast cap) were rejected by
ConservedLevels and TypeOK respectively.

## Extending verification

Keep model actions aligned with the source when changing transitions/listeners.
Write the property first, run TLC, replay any counterexample in TypeScript, then
fix the implementation and model together. Do not weaken a property just to turn
the check green. Increase `.cfg` bounds for broader finite checks; that is still
not an unbounded proof. Next coverage priorities are reconnect/mid-match join
behavior and a composed server/client event queue model.
